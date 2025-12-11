import { Hono } from "hono";
import { getDbPool } from "@smartline/db";
import { ZipFile } from "yazl";

const pool = getDbPool();
const router = new Hono();

type RowWithGeom = Record<string, unknown> & { geom_geojson?: string | null };

const toFeatureCollection = (rows: RowWithGeom[]) => ({
  type: "FeatureCollection",
  features: rows
    .map((row) => {
      if (!row.geom_geojson) return null;
      try {
        const geometry = JSON.parse(row.geom_geojson as string);
        const properties = Object.fromEntries(
          Object.entries(row).filter(([key]) => key !== "geom_geojson")
        );
        return { type: "Feature", geometry, properties };
      } catch {
        return null;
      }
    })
    .filter((feature): feature is { type: string; geometry: unknown; properties: Record<string, unknown> } => Boolean(feature))
});

const addJsonFile = (zip: ZipFile, name: string, data: unknown) => {
  zip.addBuffer(Buffer.from(JSON.stringify(data, null, 2), "utf8"), name);
};

const addCsvFile = (zip: ZipFile, name: string, rows: Record<string, unknown>[]) => {
  if (!rows.length) {
    zip.addBuffer(Buffer.from("", "utf8"), name);
    return;
  }
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    const values = headers.map((key) => {
      const value = row[key];
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes("\n") || str.includes("\"")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    lines.push(values.join(","));
  });
  zip.addBuffer(Buffer.from(lines.join("\n"), "utf8"), name);
};

router.get("/linha/:linhaId.zip", async (c) => {
  const linhaId = c.req.param("linhaId");
  const cenarioId = c.req.query("cenario_id");
  if (!linhaId) {
    return c.json({ error: "missing_linha_id" }, 400);
  }
  try {
    const linhaPromise = pool.query<RowWithGeom>(
      `SELECT linha_id, codigo_linha, nome_linha, tensao_kv, concessionaria, regiao, ST_AsGeoJSON(geom) AS geom_geojson
         FROM tb_linha
        WHERE linha_id = $1`,
      [linhaId]
    );
    const vaoPromise = pool.query<RowWithGeom>(
      `SELECT vao_id, codigo_vao, comprimento_m, ST_AsGeoJSON(geom) AS geom_geojson
         FROM tb_vao
        WHERE linha_id = $1`,
      [linhaId]
    );
    const riscoVegPromise = cenarioId
      ? pool.query<RowWithGeom>(
          `SELECT *, ST_AsGeoJSON(geom) AS geom_geojson
             FROM vw_risco_vegetacao_mapa
            WHERE linha_id = $1 AND cenario_id = $2`,
          [linhaId, cenarioId]
        )
      : pool.query<RowWithGeom>(
          `SELECT *, ST_AsGeoJSON(geom) AS geom_geojson
             FROM vw_risco_vegetacao_mapa
            WHERE linha_id = $1`,
          [linhaId]
        );
    const riscoQuedaPromise = pool.query<RowWithGeom>(
      `SELECT *, ST_AsGeoJSON(geom) AS geom_geojson
         FROM vw_risco_queda_mapa
        WHERE linha_id = $1`,
      [linhaId]
    );
    const cruzamentosPromise = pool.query<RowWithGeom>(
      `SELECT *, ST_AsGeoJSON(geom) AS geom_geojson
         FROM tb_cruzamento
        WHERE linha_id = $1`,
      [linhaId]
    );
    const tratamentosPromise = cenarioId
      ? pool.query<RowWithGeom>(
          `SELECT *, ST_AsGeoJSON(geom) AS geom_geojson
             FROM vw_tratamento_mapa
            WHERE linha_id = $1 AND cenario_id = $2`,
          [linhaId, cenarioId]
        )
      : pool.query<RowWithGeom>(
          `SELECT *, ST_AsGeoJSON(geom) AS geom_geojson
             FROM vw_tratamento_mapa
            WHERE linha_id = $1`,
          [linhaId]
        );

    const [linha, vaos, riscoVeg, riscoQueda, cruzamentos, tratamentos] = await Promise.all([
      linhaPromise,
      vaoPromise,
      riscoVegPromise,
      riscoQuedaPromise,
      cruzamentosPromise,
      tratamentosPromise
    ]);

    const zip = new ZipFile();
    addJsonFile(zip, "linha.geojson", toFeatureCollection(linha.rows));
    addJsonFile(zip, "vaos.geojson", toFeatureCollection(vaos.rows));
    addJsonFile(zip, "risco_vegetacao.geojson", toFeatureCollection(riscoVeg.rows));
    addJsonFile(zip, "risco_queda.geojson", toFeatureCollection(riscoQueda.rows));
    addJsonFile(zip, "cruzamentos.geojson", toFeatureCollection(cruzamentos.rows));
    addJsonFile(zip, "tratamentos.geojson", toFeatureCollection(tratamentos.rows));

    zip.end();
    const filename = `linha-${linhaId}.zip`;
    return new Response(zip.outputStream as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
      }
    });
  } catch (error) {
    console.error("[/api/export/linha]", error);
    return c.json({ error: "export_error", message: (error as Error).message }, 500);
  }
});

router.get("/inspecao/:jobId.zip", async (c) => {
  const jobId = c.req.param("jobId");
  if (!jobId) return c.json({ error: "missing_job_id" }, 400);
  try {
    const jobRes = await pool.query(
      `SELECT job_id, linha_id, cenario_id, tipo_inspecao, status, metadata, created_at, finished_at
         FROM tb_media_job
        WHERE job_id = $1`,
      [jobId]
    );
    if (!jobRes.rowCount) {
      return c.json({ error: "job_not_found" }, 404);
    }
    const job = jobRes.rows[0];
    const itemsRes = await pool.query<RowWithGeom>(
      `SELECT media_id, job_id, linha_id, cenario_id, tipo_midia, file_path, thumb_path, capturado_em, metadata,
              ST_AsGeoJSON(geom) AS geom_geojson
         FROM tb_media_item
        WHERE job_id = $1`,
      [jobId]
    );
    const anomaliasRes = await pool.query(
      `SELECT a.anomalia_id, a.tipo_anomalia, a.criticidade, a.status, a.descricao, a.detectado_em, a.media_id, mi.file_path
         FROM tb_anomalia_eletromecanica a
         LEFT JOIN tb_media_item mi ON mi.media_id = a.media_id
        WHERE a.media_id IN (SELECT media_id FROM tb_media_item WHERE job_id = $1)`,
      [jobId]
    );

    const zip = new ZipFile();
    addJsonFile(zip, "job.json", job);
    addJsonFile(zip, "media_items.geojson", toFeatureCollection(itemsRes.rows));

    const manifestRows = itemsRes.rows.map((row) => ({
      media_id: row.media_id,
      tipo_midia: row.tipo_midia,
      file_path: row.file_path,
      capturado_em: row.capturado_em
    }));
    addCsvFile(zip, "media_manifest.csv", manifestRows as Record<string, unknown>[]);
    addCsvFile(zip, "anomalias.csv", anomaliasRes.rows as Record<string, unknown>[]);

    const readme = `Pacote de inspeção ${jobId}\nArquivos de mídia são referenciados por caminho relativo (coluna file_path).\nUse /media/files/<path> para baixar arquivos individuais.`;
    zip.addBuffer(Buffer.from(readme, "utf8"), "README.txt");

    zip.end();
    const filename = `inspecao-${jobId}.zip`;
    return new Response(zip.outputStream as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
      }
    });
  } catch (error) {
    console.error("[/api/export/inspecao]", error);
    return c.json({ error: "export_error", message: (error as Error).message }, 500);
  }
});

export default router;
