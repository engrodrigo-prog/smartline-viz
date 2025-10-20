import { Hono } from "hono";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { join } from "node:path";

const BASE_DIR = join(process.cwd(), "apps/api/.data/status");
const ALLOWED_LAYERS = ["travessias", "ocupacoes", "anomalias-estruturais"] as const;

type AllowedLayer = (typeof ALLOWED_LAYERS)[number];

const STATUS_BY_LAYER: Record<AllowedLayer, string[]> = {
  travessias: ["Identificada", "Notificada", "Judicializada", "Regularizada"],
  ocupacoes: ["Identificada", "Notificada", "Judicializada", "Regularizada"],
  "anomalias-estruturais": ["Registrada", "Notificada", "Dentro do prazo", "Fora do prazo", "Regularizada"]
};

type StatusRecord = {
  id: string;
  status: string;
  notes?: string;
  cameraUrl?: string;
  updatedAt: string;
};

const ensureLayer = (layer: string): AllowedLayer => {
  if ((ALLOWED_LAYERS as readonly string[]).includes(layer)) {
    return layer as AllowedLayer;
  }
  throw new Error("Layer inválida");
};

const sanitizeId = (id: string) => {
  if (!id || /[^a-zA-Z0-9_\-]/.test(id)) {
    throw new Error("ID inválido. Use apenas letras, números, hífen ou underscore.");
  }
  return id;
};

const ensureDir = (layer: AllowedLayer) => {
  const dir = join(BASE_DIR, layer);
  mkdirSync(dir, { recursive: true });
  return dir;
};

const readStatus = (layer: AllowedLayer, id: string): StatusRecord | null => {
  const file = join(BASE_DIR, layer, `${id}.json`);
  if (!existsSync(file)) return null;
  try {
    const raw = readFileSync(file, "utf8");
    return JSON.parse(raw) as StatusRecord;
  } catch (error) {
    console.warn(`[status] falha ao ler ${file}:`, error);
    return null;
  }
};

const writeStatus = (layer: AllowedLayer, record: StatusRecord) => {
  const dir = ensureDir(layer);
  const file = join(dir, `${record.id}.json`);
  writeFileSync(file, JSON.stringify(record, null, 2), "utf8");
};

export const statusRoutes = new Hono();

statusRoutes.get("/:layer", (c) => {
  try {
    const layer = ensureLayer(c.req.param("layer"));
    const idParam = c.req.query("id");
    if (!idParam) {
      return c.json({ error: "Informe o parâmetro id" }, 400);
    }
    const id = sanitizeId(idParam);
    const record = readStatus(layer, id);
    if (!record) {
      return c.json({ error: "Status não encontrado" }, 404);
    }
    return c.json(record);
  } catch (error: any) {
    return c.json({ error: error?.message ?? "Requisição inválida" }, 400);
  }
});

statusRoutes.get("/:layer/bulk", (c) => {
  try {
    const layer = ensureLayer(c.req.param("layer"));
    const idsParam = c.req.query("ids");
    if (!idsParam) {
      return c.json([]);
    }
    const ids = idsParam.split(",").map((id) => {
      try {
        return sanitizeId(id.trim());
      } catch {
        return null;
      }
    });
    const records = ids
      .filter((id): id is string => Boolean(id))
      .map((id) => readStatus(layer, id))
      .filter((record): record is StatusRecord => Boolean(record));
    return c.json(records);
  } catch (error: any) {
    return c.json({ error: error?.message ?? "Requisição inválida" }, 400);
  }
});

statusRoutes.post("/:layer", async (c) => {
  try {
    const layer = ensureLayer(c.req.param("layer"));
    const payload = (await c.req.json()) as Partial<StatusRecord>;
    if (!payload?.id) {
      return c.json({ error: "Campo id é obrigatório" }, 400);
    }
    if (!payload?.status) {
      return c.json({ error: "Campo status é obrigatório" }, 400);
    }

    const id = sanitizeId(payload.id);
    const allowedStatuses = STATUS_BY_LAYER[layer];
    if (!allowedStatuses.includes(payload.status)) {
      return c.json({ error: `Status inválido. Use: ${allowedStatuses.join(", ")}` }, 400);
    }

    const record: StatusRecord = {
      id,
      status: payload.status,
      notes: payload.notes?.slice(0, 1000),
      cameraUrl: payload.cameraUrl?.slice(0, 2048),
      updatedAt: new Date().toISOString()
    };

    writeStatus(layer, record);
    return c.json(record);
  } catch (error: any) {
    return c.json({ error: error?.message ?? "Erro ao salvar status" }, 400);
  }
});
