import { Hono } from "hono";
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, createReadStream, statSync } from "node:fs";
import { join, extname, resolve, relative } from "node:path";
import { nanoid } from "nanoid";
import type { FeatureCollection } from "geojson";
import mime from "mime";
import { ZipFile } from "yazl";
import { env } from "../env.js";
import { getDbPool } from "@smartline/db";

const THEMES = [
  "Ocorrências",
  "Fiscalização de Atividades",
  "Inspeção de Segurança",
  "Inspeção de Ativos",
  "Treinamentos",
  "Situações Irregulares"
] as const;

type Tema = (typeof THEMES)[number];

type AssetKind = "foto" | "video" | "srt" | "nuvem" | "outro";

type MediaAsset = {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  tipo: AssetKind;
  temaPrincipal: Tema;
  temas: Tema[];
  meta?: Record<string, unknown>;
};

type MediaRecord = {
  id: string;
  missionId?: string;
  lineId?: string;
  temaPrincipal: Tema;
  temas: Tema[];
  frameInterval: number;
  uploadedAt: string;
  assets: MediaAsset[];
  jobId?: string;
  status: "queued" | "processing" | "done";
  derived?: {
    frames?: {
      geojson: string;
      baseDir: string;
    };
  };
};

type FileMetaEntry = {
  temaPrincipal?: Tema | string;
  temas?: Tema[] | string[];
};

type FileMetaMap = Record<string, FileMetaEntry>;

const MEDIA_ROOT = join(process.cwd(), env.MEDIA_DATA_DIR ?? "apps/api/.data/media");
const MEDIA_RAW = join(MEDIA_ROOT, "raw");
const MEDIA_DERIVED = join(MEDIA_ROOT, "derived");
const MEDIA_META = join(MEDIA_ROOT, "meta");
const MEDIA_FRAMES = join(MEDIA_DERIVED, "frames");

const WORKER_INBOX = join(process.cwd(), "workers/media/inbox");

let mediaDbPool: ReturnType<typeof getDbPool> | null = null;
const db = () => (mediaDbPool ??= getDbPool());

type PersistMediaJobPayload = {
  jobId: string;
  batchId: string;
  linhaId?: string;
  cenarioId?: string;
  tipoInspecao: string;
  frameInterval: number;
  temas: Tema[];
  meta: Record<string, unknown>;
};

const persistMediaJobRecord = async (payload: PersistMediaJobPayload) => {
  const metadata = {
    media_id: payload.batchId,
    temas: payload.temas,
    ...payload.meta
  };
  await db().query(
    `INSERT INTO tb_media_job (job_id, linha_id, cenario_id, tipo_inspecao, status, input_path, options, metadata)
     VALUES ($1, $2, $3, $4, 'queued', $5, $6, $7)
     ON CONFLICT (job_id) DO UPDATE SET
       linha_id = COALESCE(EXCLUDED.linha_id, tb_media_job.linha_id),
       cenario_id = COALESCE(EXCLUDED.cenario_id, tb_media_job.cenario_id),
       tipo_inspecao = EXCLUDED.tipo_inspecao,
       status = EXCLUDED.status,
       input_path = EXCLUDED.input_path,
       options = EXCLUDED.options,
       metadata = EXCLUDED.metadata,
       updated_at = now()`,
    [
      payload.jobId,
      payload.linhaId ?? null,
      payload.cenarioId ?? null,
      payload.tipoInspecao,
      `raw/${payload.batchId}`,
      { frameIntervalSec: payload.frameInterval },
      metadata
    ]
  );
};

const ensureDirectories = () => {
  [MEDIA_ROOT, MEDIA_RAW, MEDIA_DERIVED, MEDIA_META, MEDIA_FRAMES, WORKER_INBOX].forEach((dir) =>
    mkdirSync(dir, { recursive: true })
  );
};

const sanitizeRelativePath = (value: string) => value.replace(/\\+/g, "/").replace(/^\/+/, "");

const resolveMediaPath = (subPath: string) => {
  const cleaned = sanitizeRelativePath(subPath);
  const absolute = resolve(MEDIA_ROOT, cleaned);
  if (!absolute.startsWith(MEDIA_ROOT)) {
    throw new Error("invalid path");
  }
  return absolute;
};

const enumerateFiles = (dir: string, baseDir = dir): { abs: string; rel: string }[] => {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: { abs: string; rel: string }[] = [];
  for (const entry of entries) {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...enumerateFiles(entryPath, baseDir));
    } else if (entry.isFile()) {
      const relPath = relative(baseDir, entryPath).replace(/\\+/g, "/");
      files.push({ abs: entryPath, rel: relPath });
    }
  }
  return files;
};

const temaFromValue = (value: unknown): Tema | undefined => {
  if (!value || typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return THEMES.find((tema) => tema.toLowerCase() === trimmed.toLowerCase() || tema === trimmed);
};

const sanitizeTemas = (value: unknown, fallback: Tema[]): Tema[] => {
  if (!value) return fallback;
  if (Array.isArray(value)) {
    const temas = value
      .map((item) => temaFromValue(item))
      .filter((tema): tema is Tema => Boolean(tema));
    return temas.length ? temas : fallback;
  }
  if (typeof value === "string") {
    const temas = value
      .split(/[;,]+/)
      .map((item) => temaFromValue(item))
      .filter((tema): tema is Tema => Boolean(tema));
    return temas.length ? temas : fallback;
  }
  return fallback;
};

const assetKindFromExt = (filename: string): AssetKind => {
  const ext = extname(filename).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".tif", ".tiff"].includes(ext)) return "foto";
  if ([".mp4", ".mov", ".m4v", ".avi", ".mkv"].includes(ext)) return "video";
  if (ext === ".srt") return "srt";
  if ([".las", ".laz"].includes(ext)) return "nuvem";
  return "outro";
};

const loadMeta = (id: string): MediaRecord | null => {
  const file = join(MEDIA_META, `${id}.json`);
  if (!existsSync(file)) return null;
  try {
    const raw = readFileSync(file, "utf8");
    return JSON.parse(raw) as MediaRecord;
  } catch (error) {
    console.warn(`[media] falha ao ler ${file}`, error);
    return null;
  }
};

const saveMeta = (record: MediaRecord) => {
  ensureDirectories();
  const file = join(MEDIA_META, `${record.id}.json`);
  writeFileSync(file, JSON.stringify(record, null, 2), "utf8");
};

const enqueueWorkerJob = (payload: Record<string, unknown>) => {
  ensureDirectories();
  const jobId = typeof payload.id === "string" ? payload.id : `job_${nanoid(10)}`;
  const job = { id: jobId, ...payload };
  writeFileSync(join(WORKER_INBOX, `${jobId}.json`), JSON.stringify(job, null, 2), "utf8");
  return jobId;
};

const listRecords = () => {
  ensureDirectories();
  return readdirSync(MEDIA_META)
    .filter((filename) => filename.endsWith(".json"))
    .map((filename) => loadMeta(filename.replace(/\.json$/, "")))
    .filter((record): record is MediaRecord => Boolean(record));
};

const buildSearchResponse = (record: MediaRecord) => ({
  id: record.id,
  missionId: record.missionId,
  lineId: record.lineId,
  temaPrincipal: record.temaPrincipal,
  temas: record.temas,
  uploadedAt: record.uploadedAt,
  status: record.status,
  assetsResumo: record.assets.map((asset) => ({
    id: asset.id,
    tipo: asset.tipo,
    filename: asset.filename,
    originalName: asset.originalName,
    temaPrincipal: asset.temaPrincipal,
    temas: asset.temas,
    size: asset.size
  }))
});

export const mediaRoutes = new Hono();

mediaRoutes.post("/upload", async (c) => {
  const body = await c.req.parseBody();
  ensureDirectories();

  const temaPrincipal = temaFromValue(body["temaPrincipal"]);
  if (!temaPrincipal) {
    return c.json({ error: "Campo temaPrincipal é obrigatório e deve ser um valor válido." }, 400);
  }

  const temas = sanitizeTemas(body["temas"], [temaPrincipal]);
  const missionId = typeof body["missionId"] === "string" ? body["missionId"].trim() : undefined;
  const lineId = typeof body["lineId"] === "string" ? body["lineId"].trim() : undefined;
  const cenarioId = typeof body["cenarioId"] === "string" ? body["cenarioId"].trim() : undefined;
  const frameInterval = Math.max(
    1,
    Number(body["frame_interval_s"] ?? body["frameInterval"] ?? env.VIDEO_FRAME_INTERVAL_S ?? 1)
  );
  const tipoInspecaoRaw =
    typeof body["tipo_inspecao"] === "string"
      ? body["tipo_inspecao"]
      : typeof body["tipoInspecao"] === "string"
      ? body["tipoInspecao"]
      : undefined;

  let fileMetaMap: FileMetaMap = {};
  const rawMeta = body["fileMeta"];
  if (isFile(rawMeta)) {
    try {
      fileMetaMap = JSON.parse(await rawMeta.text());
    } catch {
      fileMetaMap = {};
    }
  } else if (typeof rawMeta === "string") {
    try {
      fileMetaMap = JSON.parse(rawMeta) as FileMetaMap;
    } catch {
      fileMetaMap = {};
    }
  }

  const files: UploadFile[] = [];
  Object.entries(body).forEach(([key, value]) => {
    if (isFile(value) && key !== "fileMeta") {
      files.push(value);
    } else if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (isFile(entry) && key !== "fileMeta") {
          files.push(entry);
        }
      });
    }
  });

  if (!files.length) {
    return c.json({ error: "Envie ao menos um arquivo de mídia." }, 400);
  }

  const batchId = `med_${nanoid(10)}`;
  const batchDir = join(MEDIA_RAW, batchId);
  mkdirSync(batchDir, { recursive: true });

  const assets: MediaAsset[] = [];

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = extname(file.name) || "";
    const storedName = `${nanoid(12)}${ext}`;
    const destino = join(batchDir, storedName);
    writeFileSync(destino, buffer);

    const metaOverride = fileMetaMap[file.name] ?? fileMetaMap[storedName];
    const assetTemaPrincipal =
      temaFromValue(metaOverride?.temaPrincipal) ??
      (metaOverride?.temaPrincipal && typeof metaOverride?.temaPrincipal === "string"
        ? temaFromValue(metaOverride.temaPrincipal)
        : undefined) ??
      temaPrincipal;
    const assetTemas = sanitizeTemas(metaOverride?.temas, assetTemaPrincipal ? [assetTemaPrincipal] : temas);

    assets.push({
      id: `asset_${nanoid(10)}`,
      filename: storedName,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: buffer.length,
      tipo: assetKindFromExt(file.name),
      temaPrincipal: assetTemaPrincipal,
      temas: assetTemas,
      meta: {
        originalField: file.name
      }
    });
  }

  const record: MediaRecord = {
    id: batchId,
    missionId,
    lineId,
    temaPrincipal,
    temas,
    frameInterval,
    uploadedAt: new Date().toISOString(),
    assets,
    status: "queued"
  };

  const jobId = enqueueWorkerJob({
    id: `job_${nanoid(10)}`,
    type: "media_processing",
    mediaId: batchId,
    frameInterval,
    temaPrincipal,
    temas,
    missionId,
    lineId,
    assets: assets.map((asset) => ({
      id: asset.id,
      filename: asset.filename,
      originalName: asset.originalName,
      tipo: asset.tipo,
      temaPrincipal: asset.temaPrincipal,
      temas: asset.temas
    }))
  });

  record.jobId = jobId;
  saveMeta(record);
  try {
    await persistMediaJobRecord({
      jobId,
      batchId,
      linhaId: lineId,
      cenarioId,
      tipoInspecao: (tipoInspecaoRaw ?? temaPrincipal ?? "inspecao_desconhecida") as string,
      frameInterval,
      temas,
      meta: {
        mission_id: missionId,
        tema_principal: temaPrincipal,
        asset_count: assets.length
      }
    });
  } catch (error) {
    console.error("[media] falha ao registrar job no banco", error);
    return c.json({ error: "db_error" }, 500);
  }

  return c.json({
    id: batchId,
    jobId,
    assets: assets.length,
    mensagem: "Upload recebido. Processamento de frames e metadados será iniciado em breve."
  });
});

mediaRoutes.get("/files/*", (c) => {
  const requestedPath = c.req.param("*");
  if (!requestedPath) {
    return c.json({ error: "Caminho requerido." }, 400);
  }
  try {
    const filePath = resolveMediaPath(requestedPath);
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      return c.json({ error: "Arquivo não encontrado." }, 404);
    }
    const type = mime.getType(filePath) ?? "application/octet-stream";
    const filename = requestedPath.split("/").pop() ?? "arquivo";
    return new Response(createReadStream(filePath) as any, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(filename)}`
      }
    });
  } catch {
    return c.json({ error: "Caminho inválido." }, 400);
  }
});

mediaRoutes.get("/:id/frames/archive", (c) => {
  const id = c.req.param("id");
  const record = loadMeta(id);
  if (!record) {
    return c.json({ error: "Mídia não encontrada." }, 404);
  }
  const baseDirRel = record.derived?.frames?.baseDir;
  if (!baseDirRel) {
    return c.json({ error: "Frames ainda não disponíveis." }, 404);
  }
  try {
    const framesDir = resolveMediaPath(baseDirRel);
    if (!existsSync(framesDir) || !statSync(framesDir).isDirectory()) {
      return c.json({ error: "Frames indisponíveis." }, 404);
    }
    const files = enumerateFiles(framesDir);
    if (!files.length) {
      return c.json({ error: "Nenhum frame encontrado." }, 404);
    }
    const zip = new ZipFile();
    const zipRoot = `${id}-frames`;
    for (const file of files) {
      const zipPath = `${zipRoot}/${file.rel}`.replace(/\\+/g, "/");
      zip.addFile(file.abs, zipPath);
    }
    zip.end();
    const filename = `${id}-frames.zip`;
    return new Response(zip.outputStream as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
      }
    });
  } catch (error) {
    console.warn("[media] falha ao gerar zip de frames", error);
    return c.json({ error: "Falha ao preparar arquivos." }, 500);
  }
});

mediaRoutes.get("/:id/assets", (c) => {
  const record = loadMeta(c.req.param("id"));
  if (!record) {
    return c.json({ error: "Lote de mídia não encontrado." }, 404);
  }
  return c.json(record);
});

mediaRoutes.get("/:id/frames", (c) => {
  const id = c.req.param("id");
  const framesFile = join(MEDIA_FRAMES, id, "frames.geojson");
  if (!existsSync(framesFile)) {
    return c.json({ error: "Frames ainda não disponíveis." }, 404);
  }
  try {
    const raw = readFileSync(framesFile, "utf8");
    const data = JSON.parse(raw) as FeatureCollection;
    return c.json(data);
  } catch (error) {
    return c.json({ error: "Frames inválidos ou corrompidos." }, 500);
  }
});

mediaRoutes.get("/search", (c) => {
  const { tema, periodoInicio, periodoFim, lineId, missionId } = c.req.query();
  const temaFiltro = temaFromValue(tema);

  const inicio = periodoInicio ? new Date(periodoInicio) : null;
  const fim = periodoFim ? new Date(periodoFim) : null;

  const records = listRecords().filter((record) => {
    if (temaFiltro && !record.temas.includes(temaFiltro) && record.temaPrincipal !== temaFiltro) return false;
    if (lineId && record.lineId !== lineId) return false;
    if (missionId && record.missionId !== missionId) return false;
    if (inicio && new Date(record.uploadedAt) < inicio) return false;
    if (fim && new Date(record.uploadedAt) > fim) return false;
    return true;
  });

  return c.json({
    total: records.length,
    items: records.map((record) => buildSearchResponse(record))
  });
});
type UploadFile = {
  name: string;
  type?: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
  text: () => Promise<string>;
};

const isFile = (value: unknown): value is UploadFile =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as any).name === "string" &&
      typeof (value as any).arrayBuffer === "function" &&
      typeof (value as any).size === "number"
  );
