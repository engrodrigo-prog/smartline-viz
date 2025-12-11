import { getDbPool, runInTransaction } from "@smartline/db";
import { env } from "../../env.js";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import type { FeatureCollection, Feature, Point } from "geojson";

const MEDIA_ROOT = join(process.cwd(), env.MEDIA_DATA_DIR ?? "apps/api/.data/media");
const MEDIA_META = join(MEDIA_ROOT, "meta");
const MEDIA_FRAMES_DIR = join(MEDIA_ROOT, "derived", "frames");
const pool = getDbPool();

type MediaMetaRecord = {
  id?: string;
  status?: string;
  derived?: {
    frames?: {
      geojson?: string;
      baseDir?: string;
    };
  };
  framesResumo?: Record<string, unknown>;
  processadoEm?: string;
};

type SyncResult = {
  jobId: string;
  status: string;
  inserted: number;
};

const loadMediaMeta = (mediaId: string): MediaMetaRecord | null => {
  const file = join(MEDIA_META, `${mediaId}.json`);
  if (!existsSync(file)) return null;
  try {
    const raw = readFileSync(file, "utf8");
    return JSON.parse(raw) as MediaMetaRecord;
  } catch (error) {
    console.warn(`[media-sync] falha ao ler ${file}`, error);
    return null;
  }
};

const loadFramesGeoJson = (mediaId: string, record: MediaMetaRecord): FeatureCollection | null => {
  const rel = record.derived?.frames?.geojson;
  const fallback = join(MEDIA_FRAMES_DIR, mediaId, "frames.geojson");
  const path = rel ? join(MEDIA_ROOT, rel) : fallback;
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf8");
    return JSON.parse(raw) as FeatureCollection;
  } catch (error) {
    console.warn(`[media-sync] geojson inválido ${path}`, error);
    return null;
  }
};

const normalisePath = (value?: string | null, mediaId?: string, filename?: string) => {
  if (value && typeof value === "string") {
    return value.replace(/\\+/g, "/");
  }
  if (mediaId && filename) {
    return `raw/${mediaId}/${filename}`;
  }
  return undefined;
};

const extractCapturedAt = (properties: Record<string, unknown>) => {
  const captured = properties["captured_at"];
  if (typeof captured === "string") {
    const parsed = new Date(captured);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const timestampMs = properties["timestamp_ms"];
  if (typeof timestampMs === "number" && Number.isFinite(timestampMs)) {
    return new Date(timestampMs);
  }
  return null;
};

export const syncMediaJob = async (jobId: string): Promise<SyncResult> => {
  return runInTransaction(async (client) => {
    const jobRes = await client.query(
      `SELECT job_id, linha_id, cenario_id, status, input_path, output_path, metadata
         FROM tb_media_job
        WHERE job_id = $1
        FOR UPDATE`,
      [jobId]
    );
    if (!jobRes.rowCount) {
      throw new Error(`job ${jobId} não encontrado`);
    }
    const job = jobRes.rows[0] as {
      job_id: string;
      linha_id: string | null;
      cenario_id: string | null;
      status: string;
      input_path: string | null;
      output_path: string | null;
      metadata: Record<string, unknown> | null;
    };
    const metadata = (job.metadata ?? {}) as Record<string, unknown>;
    const mediaId = (metadata["media_id"] ?? metadata["mediaId"]) as string | undefined;
    if (!mediaId) {
      throw new Error(`job ${jobId} sem media_id no metadata`);
    }
    const metaRecord = loadMediaMeta(mediaId);
    if (!metaRecord) {
      return { jobId, status: job.status, inserted: 0 };
    }
    const statusFromFile = metaRecord.status ?? job.status ?? "queued";
    if (statusFromFile === "queued" && job.status !== "queued") {
      await client.query(`UPDATE tb_media_job SET status = 'queued' WHERE job_id = $1`, [jobId]);
      return { jobId, status: "queued", inserted: 0 };
    }
    if (statusFromFile === "processing" && job.status !== "processing") {
      await client.query(`UPDATE tb_media_job SET status = 'processing' WHERE job_id = $1`, [jobId]);
      return { jobId, status: "processing", inserted: 0 };
    }
    if (statusFromFile !== "done") {
      return { jobId, status: statusFromFile, inserted: 0 };
    }

    const fc = loadFramesGeoJson(mediaId, metaRecord);
    if (!fc) {
      return { jobId, status: job.status, inserted: 0 };
    }

    const features = (fc.features ?? []).filter((feat): feat is Feature<Point> => feat.geometry?.type === "Point");
    await client.query(`DELETE FROM tb_media_item WHERE job_id = $1`, [jobId]);

    let inserted = 0;
    for (const feature of features) {
      const geometry = feature.geometry as Point | undefined;
      if (!geometry?.coordinates) continue;
      const [lon, lat] = geometry.coordinates;
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
      const properties = (feature.properties ?? {}) as Record<string, unknown>;
      const tipoMidia = (properties["kind"] ?? properties["tipo"] ?? "frame") as string;
      const filePath = normalisePath(
        (properties["path"] ?? properties["file_path"]) as string | undefined,
        mediaId,
        (properties["filename"] as string | undefined) ?? undefined
      );
      const captura = extractCapturedAt(properties);
      await client.query(
        `INSERT INTO tb_media_item (
           job_id, linha_id, cenario_id, tipo_midia, file_path, thumb_path, geom, capturado_em, metadata
         )
         VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_Point($7, $8), 4326), $9, $10)`,
        [
          jobId,
          job.linha_id,
          job.cenario_id,
          tipoMidia,
          filePath ?? null,
          (properties["thumb_path"] as string | undefined) ?? null,
          lon,
          lat,
          captura,
          properties
        ]
      );
      inserted += 1;
    }

    const finishedAt = metaRecord.processadoEm ? new Date(metaRecord.processadoEm) : new Date();
    const nextMetadata = {
      ...metadata,
      framesResumo: metaRecord.framesResumo ?? metadata["framesResumo"],
      derived: metaRecord.derived ?? metadata["derived"],
      media_id: mediaId
    };
    await client.query(
      `UPDATE tb_media_job
          SET status = 'done',
              output_path = COALESCE($2, output_path),
              finished_at = $3,
              metadata = $4
        WHERE job_id = $1`,
      [jobId, metaRecord.derived?.frames?.baseDir ?? job.output_path ?? null, finishedAt, nextMetadata]
    );

    return { jobId, status: "done", inserted };
  });
};

export const syncPendingMediaJobs = async (jobIds?: string[]): Promise<SyncResult[]> => {
  const ids = jobIds?.length
    ? jobIds
    : (await pool.query<{ job_id: string }>("SELECT job_id FROM tb_media_job WHERE status <> 'done'"))
        .rows
        .map((row) => row.job_id);

  const results: SyncResult[] = [];
  for (const id of ids) {
    try {
      const res = await syncMediaJob(id);
      results.push(res);
    } catch (error) {
      console.error(`[media-sync] falha ao sincronizar job ${id}`, error);
    }
  }
  return results;
};
