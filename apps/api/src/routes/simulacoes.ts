import { Hono } from "hono";
import { getDbPool } from "@smartline/db";

const router = new Hono();
const pool = getDbPool();

router.post("/riscos", async (c) => {
  const payload = await c.req.json().catch(() => null);
  const linhaId = payload?.linhaId as string | undefined;
  const cenarioId = payload?.cenarioId as string | undefined;
  const vaoIds = Array.isArray(payload?.vaoIds) ? (payload.vaoIds as string[]) : undefined;
  const topN = typeof payload?.topN === "number" ? Math.max(1, Math.floor(payload.topN)) : undefined;

  if (!linhaId || !cenarioId) {
    return c.json({ error: "missing_params", message: "linhaId e cenarioId são obrigatórios" }, 400);
  }

  try {
    const baseQuery = await pool.query(
      `WITH veg AS (
         SELECT vao_id,
                SUM(CASE
                      WHEN classe_risco_clearance ILIKE 'crit%' THEN 3
                      WHEN classe_risco_clearance ILIKE 'alert%' THEN 2
                      ELSE 1
                    END) AS veg_score
           FROM tb_risco_vegetacao_vao
          WHERE cenario_id = $1
          GROUP BY vao_id
        ),
        queda AS (
          SELECT vao_id,
                 COUNT(*) AS queda_score
            FROM tb_risco_queda_lateral
           WHERE linha_id = $2
           GROUP BY vao_id
        ),
        cruz AS (
          SELECT vao_id,
                 SUM(CASE
                       WHEN classe_risco_cruzamento ILIKE 'crit%' THEN 2
                       WHEN classe_risco_cruzamento ILIKE 'alert%' THEN 1
                       ELSE 0
                     END) AS cruz_score
            FROM tb_cruzamento
           WHERE linha_id = $2
           GROUP BY vao_id
        )
        SELECT v.vao_id,
               v.codigo_vao,
               COALESCE(veg.veg_score, 0) AS veg_score,
               COALESCE(queda.queda_score, 0) AS queda_score,
               COALESCE(cruz.cruz_score, 0) AS cruz_score
          FROM tb_vao v
          LEFT JOIN veg ON veg.vao_id = v.vao_id
          LEFT JOIN queda ON queda.vao_id = v.vao_id
          LEFT JOIN cruz ON cruz.vao_id = v.vao_id
         WHERE v.linha_id = $2`,
      [cenarioId, linhaId]
    );

    let vaos: { vao_id: string; codigo_vao: string | null; veg_score: number; queda_score: number; cruz_score: number; risco_total: number }[] =
      baseQuery.rows.map((row) => ({
        ...row,
        risco_total: Number(row.veg_score || 0) + Number(row.queda_score || 0) + Number(row.cruz_score || 0),
      }));

    if (vaoIds && vaoIds.length) {
      const idSet = new Set(vaoIds);
      vaos = vaos.filter((vao) => idSet.has(vao.vao_id));
    } else if (topN) {
      vaos = vaos
        .filter((vao) => vao.risco_total > 0)
        .sort((a, b) => b.risco_total - a.risco_total)
        .slice(0, topN);
    }

    const totalVaos = baseQuery.rows.length;
    const riscoAtual = baseQuery.rows.reduce((sum, row) => {
      const risco = Number(row.veg_score || 0) + Number(row.queda_score || 0) + Number(row.cruz_score || 0);
      return sum + risco;
    }, 0);

    const riscoSelecionado = vaos.reduce((sum, row) => sum + row.risco_total, 0);
    const riscoPosTratamento = Math.max(riscoAtual - riscoSelecionado, 0);

    return c.json({
      linhaId,
      cenarioId,
      totalVaos,
      totalVaosSelecionados: vaos.length,
      riscoAtual,
      riscoPosTratamento,
      reducaoAbsoluta: riscoAtual - riscoPosTratamento,
      reducaoPercentual: riscoAtual > 0 ? ((riscoAtual - riscoPosTratamento) / riscoAtual) * 100 : 0,
      selecionados: vaos.map((vao) => ({
        vaoId: vao.vao_id,
        codigoVao: vao.codigo_vao,
        riscoEstimado: vao.risco_total,
      })),
    });
  } catch (err) {
    console.error("[simulacoes]", err);
    return c.json({ error: "db_error", message: (err as Error).message }, 500);
  }
});

export default router;
