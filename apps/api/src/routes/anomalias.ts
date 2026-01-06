import { Hono } from "hono";
import { getDbPool } from "@smartline/db";

const router = new Hono();
let poolInstance: ReturnType<typeof getDbPool> | null = null;
const pool = () => (poolInstance ??= getDbPool());

router.get("/", async (c) => {
  const linhaId = c.req.query("linha_id");
  const estruturaId = c.req.query("estrutura_id");
  const vaoId = c.req.query("vao_id");
  const status = c.req.query("status");
  const criticidade = c.req.query("criticidade");
  const tipo = c.req.query("tipo");
  const jobId = c.req.query("job_id");

  const clauses: string[] = [];
  const params: unknown[] = [];
  if (linhaId) {
    params.push(linhaId);
    clauses.push(`a.linha_id = $${params.length}`);
  }
  if (estruturaId) {
    params.push(estruturaId);
    clauses.push(`a.estrutura_id = $${params.length}`);
  }
  if (vaoId) {
    params.push(vaoId);
    clauses.push(`a.vao_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    clauses.push(`a.status = $${params.length}`);
  }
  if (criticidade) {
    params.push(criticidade);
    clauses.push(`a.criticidade = $${params.length}`);
  }
  if (tipo) {
    params.push(tipo);
    clauses.push(`a.tipo_anomalia = $${params.length}`);
  }
  if (jobId) {
    params.push(jobId);
    clauses.push(`mi.job_id = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  try {
    const result = await pool().query(
      `SELECT
         a.anomalia_id,
         a.linha_id,
         a.estrutura_id,
         a.vao_id,
         a.cenario_id,
         a.media_id,
         a.tipo_anomalia,
         a.criticidade,
         a.status,
         a.origem,
         a.descricao,
         a.detectado_em,
         a.atualizado_em,
         a.metadata,
         a.created_at,
         a.updated_at,
         mi.job_id,
         mi.file_path,
         ST_AsGeoJSON(mi.geom) AS media_geom_geojson
       FROM tb_anomalia_eletromecanica a
       LEFT JOIN tb_media_item mi ON mi.media_id = a.media_id
       ${where}
       ORDER BY a.detectado_em DESC NULLS LAST, a.created_at DESC`,
      params
    );
    return c.json(result.rows);
  } catch (error) {
    console.error("[/api/anomalias]", error);
    return c.json({ error: "db_error", message: (error as Error).message }, 500);
  }
});

router.post("/", async (c) => {
  const body = await c.req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return c.json({ error: "invalid_payload" }, 400);
  }
  const linhaId = typeof body["linhaId"] === "string" ? body["linhaId"] : undefined;
  const tipoAnomalia = typeof body["tipo_anomalia"] === "string" ? body["tipo_anomalia"] : undefined;
  const tipoAlt = typeof body["tipoAnomalia"] === "string" ? body["tipoAnomalia"] : undefined;
  const tipoFinal = tipoAnomalia ?? tipoAlt;
  if (!linhaId || !tipoFinal) {
    return c.json({ error: "missing_fields" }, 400);
  }
  const estruturaId = typeof body["estruturaId"] === "string" ? body["estruturaId"] : undefined;
  const vaoId = typeof body["vaoId"] === "string" ? body["vaoId"] : undefined;
  const cenarioId = typeof body["cenarioId"] === "string" ? body["cenarioId"] : undefined;
  const mediaId = typeof body["mediaId"] === "string" ? body["mediaId"] : undefined;
  const criticidade = typeof body["criticidade"] === "string" ? body["criticidade"] : undefined;
  const status = typeof body["status"] === "string" ? body["status"].toLowerCase() : "aberta";
  const descricao = typeof body["descricao"] === "string" ? body["descricao"] : undefined;
  const origem = typeof body["origem"] === "string" ? body["origem"] : undefined;
  const detectadoEm = typeof body["detectadoEm"] === "string" ? new Date(body["detectadoEm"]) : new Date();
  const metadata = typeof body["metadata"] === "object" && body["metadata"] !== null ? body["metadata"] : {};

  try {
    const result = await pool().query(
      `INSERT INTO tb_anomalia_eletromecanica (
         linha_id, estrutura_id, vao_id, cenario_id, media_id,
         tipo_anomalia, criticidade, status, origem, descricao, detectado_em, metadata, atualizado_em
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
       RETURNING *`,
      [
        linhaId,
        estruturaId ?? null,
        vaoId ?? null,
        cenarioId ?? null,
        mediaId ?? null,
        tipoFinal,
        criticidade ?? null,
        status,
        origem ?? null,
        descricao ?? null,
        detectadoEm,
        metadata
      ]
    );
    return c.json(result.rows[0]);
  } catch (error) {
    console.error("[POST /api/anomalias]", error);
    return c.json({ error: "db_error", message: (error as Error).message }, 500);
  }
});

router.patch("/:anomaliaId", async (c) => {
  const anomaliaId = c.req.param("anomaliaId");
  const body = await c.req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return c.json({ error: "invalid_payload" }, 400);
  }
  const sets: string[] = [];
  const params: unknown[] = [];

  if (typeof body["status"] === "string") {
    params.push(body["status"].toLowerCase());
    sets.push(`status = $${params.length}`);
  }
  if (typeof body["criticidade"] === "string") {
    params.push(body["criticidade"]);
    sets.push(`criticidade = $${params.length}`);
  }
  if (typeof body["descricao"] === "string") {
    params.push(body["descricao"]);
    sets.push(`descricao = $${params.length}`);
  }
  if (typeof body["origem"] === "string") {
    params.push(body["origem"]);
    sets.push(`origem = $${params.length}`);
  }
  if (!sets.length) {
    return c.json({ error: "nothing_to_update" }, 400);
  }
  params.push(anomaliaId);
  const setSql = sets.join(", ");

  try {
    const result = await pool().query(
      `UPDATE tb_anomalia_eletromecanica
          SET ${setSql}, atualizado_em = now()
        WHERE anomalia_id = $${params.length}
        RETURNING *`,
      params
    );
    if (!result.rowCount) {
      return c.json({ error: "anomalia_not_found" }, 404);
    }
    return c.json(result.rows[0]);
  } catch (error) {
    console.error("[PATCH /api/anomalias/:id]", error);
    return c.json({ error: "db_error", message: (error as Error).message }, 500);
  }
});

export default router;
