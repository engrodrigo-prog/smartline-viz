import { Hono } from "hono";
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { nanoid } from "nanoid";
import type { FeatureCollection } from "geojson";
import { env } from "../env.js";

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

const ensureDirectories = () => {
  [MEDIA_ROOT, MEDIA_RAW, MEDIA_DERIVED, MEDIA_META, MEDIA_FRAMES, WORKER_INBOX].forEach((dir) =>
    mkdirSync(dir, { recursive: true })
  );
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
  const frameInterval = Math.max(
    1,
    Number(body["frame_interval_s"] ?? body["frameInterval"] ?? env.VIDEO_FRAME_INTERVAL_S ?? 1)
  );

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

  return c.json({
    id: batchId,
    jobId,
    assets: assets.length,
    mensagem: "Upload recebido. Processamento de frames e metadados será iniciado em breve."
  });
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
