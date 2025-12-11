import { Hono } from "hono";
import { getDbPool } from "@smartline/db";

const pool = getDbPool();
const router = new Hono();

const parseListParam = (value?: string | null) =>
  value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

router.get("/jobs", async (c) => {
  const linhaId = c.req.query("linha_id");
  const tipoInspecao = c.req.query("tipo_inspecao") ?? c.req.query("tipoInspecao");
  const statusList = parseListParam(c.req.query("status"));
  const limit = Math.min(Number(c.req.query("limit") ?? "200"), 500);

  const clauses: string[] = [];
  const params: unknown[] = [];
  if (linhaId) {
    params.push(linhaId);
    clauses.push(`mj.linha_id = $${params.length}`);
  }
  if (tipoInspecao) {
    params.push(tipoInspecao);
    clauses.push(`mj.tipo_inspecao = $${params.length}`);
  }
  if (statusList?.length) {
    params.push(statusList);
    clauses.push(`mj.status = ANY($${params.length})`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  try {
    const result = await pool.query(
      `SELECT
         mj.job_id,
         mj.linha_id,
         l.codigo_linha,
         l.nome_linha,
         mj.cenario_id,
         c.descricao AS cenario_descricao,
         mj.tipo_inspecao,
         mj.status,
         mj.created_at,
         mj.updated_at,
         mj.started_at,
         mj.finished_at,
         mj.metadata,
         mj.options,
         COALESCE(items.total, 0) AS total_itens,
         COALESCE(items.com_geom, 0) AS itens_com_geom
       FROM tb_media_job mj
       LEFT JOIN tb_linha l ON l.linha_id = mj.linha_id
       LEFT JOIN tb_cenario c ON c.cenario_id = mj.cenario_id
       LEFT JOIN LATERAL (
         SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE geom IS NOT NULL) AS com_geom
           FROM tb_media_item mi
          WHERE mi.job_id = mj.job_id
       ) items ON true
       ${where}
       ORDER BY mj.created_at DESC
       LIMIT ${limit}`,
      params
    );
    return c.json(result.rows);
  } catch (error) {
    console.error("[/api/media/jobs]", error);
    return c.json({ error: "db_error", message: (error as Error).message }, 500);
  }
});

router.get("/jobs/:jobId", async (c) => {
  const jobId = c.req.param("jobId");
  try {
    const jobRes = await pool.query(
      `SELECT
         mj.job_id,
         mj.linha_id,
         l.codigo_linha,
         l.nome_linha,
         mj.cenario_id,
         c.descricao AS cenario_descricao,
         mj.tipo_inspecao,
         mj.status,
         mj.created_at,
         mj.updated_at,
         mj.started_at,
         mj.finished_at,
         mj.metadata,
         mj.options,
         COALESCE(items.total, 0) AS total_itens,
         COALESCE(items.com_geom, 0) AS itens_com_geom
       FROM tb_media_job mj
       LEFT JOIN tb_linha l ON l.linha_id = mj.linha_id
       LEFT JOIN tb_cenario c ON c.cenario_id = mj.cenario_id
       LEFT JOIN LATERAL (
         SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE geom IS NOT NULL) AS com_geom
           FROM tb_media_item mi
          WHERE mi.job_id = mj.job_id
       ) items ON true
       WHERE mj.job_id = $1`,
      [jobId]
    );
    if (!jobRes.rowCount) {
      return c.json({ error: "job_not_found" }, 404);
    }
    const job = jobRes.rows[0];
    const tiposRes = await pool.query(
      `SELECT tipo_midia, COUNT(*) AS total
         FROM tb_media_item
        WHERE job_id = $1
        GROUP BY tipo_midia`,
      [jobId]
    );
    const sampleRes = await pool.query(
      `SELECT media_id, tipo_midia, file_path, thumb_path, capturado_em, metadata, ST_AsGeoJSON(geom) AS geom_geojson
         FROM tb_media_item
        WHERE job_id = $1
        ORDER BY capturado_em DESC NULLS LAST, created_at DESC
        LIMIT 12`,
      [jobId]
    );
    return c.json({
      ...job,
      itens_por_tipo: tiposRes.rows,
      amostra_itens: sampleRes.rows
    });
  } catch (error) {
    console.error("[/api/media/jobs/:jobId]", error);
    return c.json({ error: "db_error", message: (error as Error).message }, 500);
  }
});

router.get("/items", async (c) => {
  const linhaId = c.req.query("linha_id");
  const jobId = c.req.query("job_id");
  const cenarioId = c.req.query("cenario_id");
  const estruturaId = c.req.query("estrutura_id");
  const vaoId = c.req.query("vao_id");
  const tipoMidia = c.req.query("tipo_midia");
  const hasGeom = c.req.query("has_geom");
  const bbox = c.req.query("bbox");
  const limit = Math.min(Number(c.req.query("limit") ?? "500"), 2000);
  const offset = Math.max(Number(c.req.query("offset") ?? "0"), 0);

  const clauses: string[] = [];
  const params: unknown[] = [];
  if (linhaId) {
    params.push(linhaId);
    clauses.push(`mi.linha_id = $${params.length}`);
  }
  if (jobId) {
    params.push(jobId);
    clauses.push(`mi.job_id = $${params.length}`);
  }
  if (cenarioId) {
    params.push(cenarioId);
    clauses.push(`mi.cenario_id = $${params.length}`);
  }
  if (estruturaId) {
    params.push(estruturaId);
    clauses.push(`mi.estrutura_id = $${params.length}`);
  }
  if (vaoId) {
    params.push(vaoId);
    clauses.push(`mi.vao_id = $${params.length}`);
  }
  if (tipoMidia) {
    params.push(tipoMidia);
    clauses.push(`mi.tipo_midia = $${params.length}`);
  }
  if (hasGeom === "true") {
    clauses.push("mi.geom IS NOT NULL");
  }
  if (bbox) {
    const parts = bbox.split(",").map((part) => Number(part.trim()));
    if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
      params.push(parts[0], parts[1], parts[2], parts[3]);
      const idx = params.length;
      clauses.push(`mi.geom && ST_MakeEnvelope($${idx - 3}, $${idx - 2}, $${idx - 1}, $${idx}, 4326)`);
    }
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  try {
    const result = await pool.query(
      `SELECT
         mi.media_id,
         mi.job_id,
         mi.linha_id,
         mi.cenario_id,
         mi.estrutura_id,
         mi.vao_id,
         mi.tipo_midia,
         mi.file_path,
         mi.thumb_path,
         mi.capturado_em,
         mi.metadata,
         ST_AsGeoJSON(mi.geom) AS geom_geojson
       FROM tb_media_item mi
       ${where}
       ORDER BY mi.capturado_em DESC NULLS LAST, mi.created_at DESC
       LIMIT ${limit}
       OFFSET ${offset}`,
      params
    );
    return c.json({ items: result.rows, count: result.rowCount });
  } catch (error) {
    console.error("[/api/media/items]", error);
    return c.json({ error: "db_error", message: (error as Error).message }, 500);
  }
});

export default router;
