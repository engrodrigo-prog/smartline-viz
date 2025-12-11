import { Hono } from "hono";
import { getDbPool } from "@smartline/db";

let poolInstance: ReturnType<typeof getDbPool> | null = null;
function pool() {
  if (!poolInstance) {
    poolInstance = getDbPool();
  }
  return poolInstance;
}
const router = new Hono();

async function resolveLinhaId(raw: string | null | undefined) {
  if (!raw) return null;
  const result = await pool().query<{ linha_id: string }>(
    `SELECT linha_id FROM tb_linha WHERE linha_id = $1 OR codigo_linha = $1 LIMIT 1`,
    [raw]
  );
  return result.rows[0]?.linha_id ?? null;
}

router.get("/linhas", async (c) => {
  try {
    const result = await pool().query(
      `SELECT linha_id, codigo_linha, nome_linha, tensao_kv, concessionaria, regiao
         FROM tb_linha
        ORDER BY nome_linha NULLS LAST, codigo_linha`
    );
    return c.json(result.rows);
  } catch (err) {
    console.error("[linhas]", err);
    return c.json({ error: "db_error", message: (err as Error).message }, 500);
  }
});

router.get("/cenarios", async (c) => {
  const linhaId = await resolveLinhaId(c.req.query("linha_id"));
  if (!linhaId) return c.json([]);
  try {
    const result = await pool().query(
      `SELECT cenario_id, descricao, data_referencia, tipo_cenario, status
         FROM tb_cenario
        WHERE linha_id = $1
        ORDER BY data_referencia DESC NULLS LAST, descricao`,
      [linhaId]
    );
    return c.json(result.rows);
  } catch (err) {
    console.error("[cenarios]", err);
    return c.json({ error: "db_error", message: (err as Error).message }, 500);
  }
});

router.get("/kpi-linha", async (c) => {
  const linhaId = await resolveLinhaId(c.req.query("linha_id"));
  const cenarioId = c.req.query("cenario_id");
  const clauses: string[] = [];
  const params: any[] = [];
  if (linhaId) {
    params.push(linhaId);
    clauses.push(`linha_id = $${params.length}`);
  }
  if (cenarioId) {
    params.push(cenarioId);
    clauses.push(`cenario_id = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  try {
    const result = await pool().query(`SELECT * FROM vw_kpi_linha ${where}`, params);
    return c.json(result.rows);
  } catch (err) {
    console.error("[kpi-linha]", err);
    return c.json({ error: "db_error", message: (err as Error).message }, 500);
  }
});

router.get("/risco-vegetacao", async (c) => {
  const linhaId = await resolveLinhaId(c.req.query("linha_id"));
  const cenarioId = c.req.query("cenario_id");
  if (!linhaId || !cenarioId) return c.json({ error: "missing_filters" }, 400);
  try {
    const result = await pool().query(
      `SELECT vw.*, ST_AsGeoJSON(vw.geom) AS geom_geojson
         FROM vw_risco_vegetacao_mapa vw
        WHERE vw.linha_id = $1
          AND vw.cenario_id = $2`,
      [linhaId, cenarioId]
    );
    return c.json(result.rows);
  } catch (err) {
    console.error("[risco-vegetacao]", err);
    return c.json({ error: "db_error", message: (err as Error).message }, 500);
  }
});

router.get("/risco-queda", async (c) => {
  const linhaId = await resolveLinhaId(c.req.query("linha_id"));
  if (!linhaId) return c.json({ error: "missing_linha_id" }, 400);
  try {
    const result = await pool().query(
      `SELECT vw.*, ST_AsGeoJSON(vw.geom) AS geom_geojson
         FROM vw_risco_queda_mapa vw
        WHERE vw.linha_id = $1`,
      [linhaId]
    );
    return c.json(result.rows);
  } catch (err) {
    console.error("[risco-queda]", err);
    return c.json({ error: "db_error", message: (err as Error).message }, 500);
  }
});

router.get("/cruzamentos", async (c) => {
  const linhaId = await resolveLinhaId(c.req.query("linha_id"));
  if (!linhaId) return c.json({ error: "missing_linha_id" }, 400);
  const cenarioId = c.req.query("cenario_id");
  try {
    const result = await pool().query(
      `SELECT
          cz.*,
          ST_AsGeoJSON(cz.geom) AS geom_geojson
         FROM tb_cruzamento cz
        WHERE cz.linha_id = $1` + (cenarioId ? " AND cz.metadata->>'cenario_id' = $2" : ""),
      cenarioId ? [linhaId, cenarioId] : [linhaId]
    );
    return c.json(result.rows);
  } catch (err) {
    console.error("[cruzamentos]", err);
    return c.json({ error: "db_error", message: (err as Error).message }, 500);
  }
});

router.get("/tratamentos", async (c) => {
  const linhaId = await resolveLinhaId(c.req.query("linha_id"));
  const cenarioId = c.req.query("cenario_id");
  if (!linhaId || !cenarioId) return c.json({ error: "missing_filters" }, 400);
  try {
    const result = await pool().query(
      `SELECT t.*, ST_AsGeoJSON(t.geom) AS geom_geojson
         FROM vw_tratamento_mapa t
        WHERE t.linha_id = $1
          AND t.cenario_id = $2`,
      [linhaId, cenarioId]
    );
    return c.json(result.rows);
  } catch (err) {
    console.error("[tratamentos]", err);
    return c.json({ error: "db_error", message: (err as Error).message }, 500);
  }
});

export default router;
