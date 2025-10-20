import { Hono } from "hono";
import { promises as fs } from "node:fs";
import { mkdirSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { v4 as uuidv4 } from "uuid";
import type { Feature, FeatureCollection, LineString } from "geojson";

import { env } from "../env.js";

const BASE_DIR = join(process.cwd(), env.POINTCLOUD_DATA_DIR);
mkdirSync(BASE_DIR, { recursive: true });

type UploadBody = {
  lineId?: string;
};

type IndexJob = {
  id: string;
  type: "index";
  inputFile: string;
  createdAt: string;
};

type ProfileJob = {
  id: string;
  type: "profile";
  inputFile: string;
  line: Feature<LineString>;
  buffer_m: number;
  step_m: number;
  classes?: number[];
  max_points_per_plan: number;
  createdAt: string;
};

const isLineFeature = (value: any): value is Feature<LineString> =>
  value &&
  typeof value === "object" &&
  value.type === "Feature" &&
  value.geometry &&
  value.geometry.type === "LineString" &&
  Array.isArray(value.geometry.coordinates);

const isFeatureCollection = (value: any): value is FeatureCollection =>
  value && typeof value === "object" && value.type === "FeatureCollection" && Array.isArray(value.features);

const ensurePointcloudDir = (id: string) => {
  const dir = join(BASE_DIR, id);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, "queue"), { recursive: true });
  mkdirSync(join(dir, "products"), { recursive: true });
  return dir;
};

const saveBufferToFile = async (filePath: string, buffer: Buffer) => {
  await fs.writeFile(filePath, buffer);
};

const writeJobFile = async (id: string, payload: IndexJob | ProfileJob) => {
  const dir = ensurePointcloudDir(id);
  const filename = `${payload.type}-${Date.now()}.json`;
  const filePath = join(dir, "queue", filename);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
};

const parseClasses = (classes?: any): number[] | undefined => {
  if (!Array.isArray(classes)) return undefined;
  const parsed = classes
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  return parsed.length ? parsed : undefined;
};

export const pointcloudRoutes = new Hono();

pointcloudRoutes.post("/upload", async (c) => {
  const formData = await c.req.parseBody<UploadBody>();
  const fileEntry = formData["file"];
  if (!(fileEntry instanceof File)) {
    return c.json({ error: "Arquivo .las ou .laz obrigatório" }, 400);
  }

  const originalName = fileEntry.name || "pointcloud.las";
  const ext = extname(originalName).toLowerCase();
  if (![".las", ".laz"].includes(ext)) {
    return c.json({ error: "Formato inválido. Envie arquivos .las ou .laz." }, 400);
  }

  const arrayBuffer = await fileEntry.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length === 0) {
    return c.json({ error: "Arquivo vazio." }, 400);
  }

  const id = uuidv4();
  const dir = ensurePointcloudDir(id);
  const filePath = join(dir, `raw${ext}`);

  await saveBufferToFile(filePath, buffer);

  const meta = {
    id,
    lineId: formData.lineId ?? null,
    originalName,
    uploadedAt: new Date().toISOString(),
    size: buffer.length,
    file: filePath.replace(`${process.cwd()}/`, "")
  };

  await fs.writeFile(join(dir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");

  return c.json({ id, lineId: formData.lineId ?? null });
});

pointcloudRoutes.post("/index", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) {
    return c.json({ error: "Informe o id do pointcloud." }, 400);
  }
  const dir = ensurePointcloudDir(body.id);
  const fileLas = [".las", ".laz"]
    .map((ext) => join(dir, `raw${ext}`))
    .find((file) => existsSync(file));
  if (!fileLas) {
    return c.json({ error: "Arquivo base não encontrado para este id." }, 404);
  }

  const job: IndexJob = {
    id: body.id,
    type: "index",
    inputFile: fileLas,
    createdAt: new Date().toISOString()
  };
  await writeJobFile(body.id, job);
  return c.json({ id: body.id, status: "queued" });
});

pointcloudRoutes.post("/profile", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    id?: string;
    line?: Feature<LineString>;
    buffer_m?: number;
    step_m?: number;
    classes?: number[];
  } | null;

  if (!body?.id || !body.line) {
    return c.json({ error: "Campos id e line são obrigatórios." }, 400);
  }
  if (!isLineFeature(body.line)) {
    return c.json({ error: "Line deve ser um Feature<LineString> válido." }, 400);
  }

  const dir = ensurePointcloudDir(body.id);
  const fileLas = [".las", ".laz"]
    .map((ext) => join(dir, `raw${ext}`))
    .find((file) => existsSync(file));
  if (!fileLas) {
    return c.json({ error: "Arquivo base não encontrado para este id." }, 404);
  }

  const bufferMeters =
    Number.isFinite(body.buffer_m) && Number(body.buffer_m) > 0
      ? Number(body.buffer_m)
      : env.POINTCLOUD_CORRIDOR_BUFFER_M;
  const stepMeters =
    Number.isFinite(body.step_m) && Number(body.step_m) > 0 ? Number(body.step_m) : env.POINTCLOUD_PROFILE_STEP_M;

  const job: ProfileJob = {
    id: body.id,
    type: "profile",
    inputFile: fileLas,
    line: body.line,
    buffer_m: bufferMeters,
    step_m: stepMeters,
    classes: parseClasses(body.classes),
    max_points_per_plan: env.POINTCLOUD_MAX_POINTS_PER_PLAN,
    createdAt: new Date().toISOString()
  };

  await writeJobFile(body.id, job);
  return c.json({ id: body.id, status: "queued" });
});

pointcloudRoutes.get("/:id/index", async (c) => {
  const id = c.req.param("id");
  const file = join(BASE_DIR, id, "index.json");
  if (!existsSync(file)) {
    return c.json({ error: "Index ainda não disponível." }, 404);
  }
  const data = JSON.parse(await fs.readFile(file, "utf8"));
  return c.json(data);
});

pointcloudRoutes.get("/:id/plan", async (c) => {
  const id = c.req.param("id");
  const file = join(BASE_DIR, id, "products", "plan_points.geojson");
  if (!existsSync(file)) {
    return c.json({ error: "Planta ainda não disponível." }, 404);
  }
  const data = JSON.parse(await fs.readFile(file, "utf8"));
  if (!isFeatureCollection(data)) {
    return c.json({ error: "Planta inválida." }, 500);
  }
  return c.json(data);
});

pointcloudRoutes.get("/:id/profile", async (c) => {
  const id = c.req.param("id");
  const file = join(BASE_DIR, id, "products", "profile.json");
  if (!existsSync(file)) {
    return c.json({ error: "Perfil ainda não disponível." }, 404);
  }
  const data = JSON.parse(await fs.readFile(file, "utf8"));
  return c.json(data);
});
