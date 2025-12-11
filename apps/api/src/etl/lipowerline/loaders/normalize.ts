import type { PoolClient } from "@smartline/db";
import { pickValue, sanitizeClass, toBoolean, toNumber } from "../utils.js";
import type { LipowerlineImportOptions, NormalizationSummary } from "../types.js";

export async function normalizeDataset(client: PoolClient, datasetId: string, options: LipowerlineImportOptions): Promise<NormalizationSummary> {
  const linhaId = await ensureLine(client, datasetId, options);
  const cenarioId = await ensureScenario(client, linhaId, datasetId, options);
  const estruturasUpserted = await upsertStructures(client, datasetId, linhaId);
  const vaosGerados = await generateVaos(client, linhaId);
  const { arvoresUpsertadas, riscosVegetacao } = await upsertVegetationRisks(client, datasetId, linhaId, cenarioId);
  const tratamentosRegistrados = await upsertTreatments(client, datasetId, linhaId, cenarioId);

  return { linhaId, cenarioId, estruturasUpserted, vaosGerados, arvoresUpsertadas, riscosVegetacao, tratamentosRegistrados };
}

async function ensureLine(client: PoolClient, datasetId: string, options: LipowerlineImportOptions) {
  const geomResult = await client.query(
    `SELECT ST_AsGeoJSON(geom) AS geom_json FROM stg_kml_linha WHERE dataset_id = $1 ORDER BY stg_id DESC LIMIT 1`,
    [datasetId]
  );
  const geomJson = geomResult.rows[0]?.geom_json ?? null;
  const metadata = {
    source_dataset: datasetId,
    scenario_hint: options.scenarioDescription,
  };

  const result = await client.query(
    `INSERT INTO tb_linha (codigo_linha, nome_linha, tensao_kv, concessionaria, regiao, geom, metadata)
     VALUES ($1, $2, $3, $4, $5, CASE WHEN $6::text IS NULL THEN NULL ELSE ST_GeomFromGeoJSON($6::text) END, $7::jsonb)
     ON CONFLICT (codigo_linha)
     DO UPDATE SET
       nome_linha = COALESCE(EXCLUDED.nome_linha, tb_linha.nome_linha),
       tensao_kv = COALESCE(EXCLUDED.tensao_kv, tb_linha.tensao_kv),
       concessionaria = COALESCE(EXCLUDED.concessionaria, tb_linha.concessionaria),
       regiao = COALESCE(EXCLUDED.regiao, tb_linha.regiao),
       geom = COALESCE(EXCLUDED.geom, tb_linha.geom),
       metadata = tb_linha.metadata || EXCLUDED.metadata
     RETURNING linha_id`,
    [
      options.lineCode,
      options.lineName ?? null,
      options.tensaoKV ?? null,
      options.concessionaria ?? null,
      options.regiao ?? null,
      geomJson,
      JSON.stringify(metadata),
    ]
  );

  return result.rows[0].linha_id as string;
}

async function ensureScenario(client: PoolClient, linhaId: string, datasetId: string, options: LipowerlineImportOptions) {
  const result = await client.query(
    `INSERT INTO tb_cenario (linha_id, descricao, data_referencia, tipo_cenario, status, metadata)
     VALUES ($1, $2, $3, $4, $5, jsonb_build_object('dataset_id', $6::text))
     ON CONFLICT (linha_id, descricao)
     DO UPDATE SET
       tipo_cenario = EXCLUDED.tipo_cenario,
       status = EXCLUDED.status,
       data_referencia = COALESCE(EXCLUDED.data_referencia, tb_cenario.data_referencia),
       metadata = tb_cenario.metadata || EXCLUDED.metadata
     RETURNING cenario_id`,
    [
      linhaId,
      options.scenarioDescription,
      options.scenarioDate ?? null,
      options.scenarioType ?? "pre_manejo",
      options.scenarioStatus ?? "ativo",
      datasetId,
    ]
  );
  return result.rows[0].cenario_id as string;
}

async function upsertStructures(client: PoolClient, datasetId: string, linhaId: string) {
  const rows = await client.query(
    `SELECT stg_id, feature_name, raw, ST_AsGeoJSON(geom) AS geom_json,
            ST_X(geom) AS longitude, ST_Y(geom) AS latitude
       FROM stg_kml_estrutura
      WHERE dataset_id = $1
      ORDER BY stg_id`,
    [datasetId]
  );

  let count = 0;
  for (const row of rows.rows) {
    const raw = row.raw?.properties ?? row.raw ?? {};
    const codigo = (pickValue<string>(raw, ["codigo", "structure_id", "estrutura", "id"]) ?? row.feature_name ?? `estrutura_${row.stg_id}`).trim();
    const tipo = pickValue<string>(raw, ["tipo", "type", "class"]);
    const nCircuitos = toNumber(pickValue(raw, ["n_circuitos", "circuitos", "circuit" ]));
    const altura = toNumber(pickValue(raw, ["altura", "height_m", "height"]));
    const metadata = {
      source_dataset: datasetId,
      stg_id: row.stg_id,
      stg_order: row.stg_id,
    };
    const geomJson = row.geom_json ?? null;

    await client.query(
      `INSERT INTO tb_estrutura (linha_id, codigo_estrutura, tipo_estrutura, n_circuitos, altura_m, latitude, longitude, geom, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $8::text IS NULL THEN NULL ELSE ST_GeomFromGeoJSON($8::text) END, $9::jsonb)
       ON CONFLICT (linha_id, codigo_estrutura)
       DO UPDATE SET
         tipo_estrutura = COALESCE(EXCLUDED.tipo_estrutura, tb_estrutura.tipo_estrutura),
         n_circuitos = COALESCE(EXCLUDED.n_circuitos, tb_estrutura.n_circuitos),
         altura_m = COALESCE(EXCLUDED.altura_m, tb_estrutura.altura_m),
         latitude = COALESCE(EXCLUDED.latitude, tb_estrutura.latitude),
         longitude = COALESCE(EXCLUDED.longitude, tb_estrutura.longitude),
         geom = COALESCE(EXCLUDED.geom, tb_estrutura.geom),
         metadata = tb_estrutura.metadata || EXCLUDED.metadata`,
      [
        linhaId,
        codigo,
        tipo ?? null,
        nCircuitos,
        altura,
        row.latitude ?? null,
        row.longitude ?? null,
        geomJson,
        JSON.stringify(metadata),
      ]
    );
    count += 1;
  }
  return count;
}

async function generateVaos(client: PoolClient, linhaId: string) {
  const result = await client.query(
    `WITH ordered AS (
        SELECT e.*, COALESCE((e.metadata->>'stg_order')::int, row_number() OVER (ORDER BY e.created_at)) AS ordem
          FROM tb_estrutura e
         WHERE e.linha_id = $1
      ), pairs AS (
        SELECT
          linha_id,
          estrutura_id,
          lead(estrutura_id) OVER (ORDER BY ordem) AS estrutura_fim_id,
          codigo_estrutura,
          lead(codigo_estrutura) OVER (ORDER BY ordem) AS codigo_fim,
          geom,
          lead(geom) OVER (ORDER BY ordem) AS geom_fim
        FROM ordered
      )
      INSERT INTO tb_vao (linha_id, estrutura_ini_id, estrutura_fim_id, codigo_vao, comprimento_m, geom, metadata)
      SELECT
        linha_id,
        estrutura_id,
        estrutura_fim_id,
        concat_ws(' - ', codigo_estrutura, codigo_fim) AS codigo,
        CASE WHEN geom IS NOT NULL AND geom_fim IS NOT NULL THEN ST_Length(ST_MakeLine(geom, geom_fim)::geography) ELSE NULL END,
        CASE WHEN geom IS NOT NULL AND geom_fim IS NOT NULL THEN ST_MakeLine(geom, geom_fim) ELSE NULL END,
        jsonb_build_object('source', 'auto', 'generated_at', now())
      FROM pairs
      WHERE estrutura_fim_id IS NOT NULL
      ON CONFLICT (linha_id, codigo_vao)
      DO UPDATE SET
        estrutura_ini_id = EXCLUDED.estrutura_ini_id,
        estrutura_fim_id = EXCLUDED.estrutura_fim_id,
        geom = COALESCE(EXCLUDED.geom, tb_vao.geom),
        comprimento_m = COALESCE(EXCLUDED.comprimento_m, tb_vao.comprimento_m),
        metadata = tb_vao.metadata || EXCLUDED.metadata
      RETURNING vao_id`,
    [linhaId]
  );
  return result.rowCount ?? 0;
}

async function upsertVegetationRisks(client: PoolClient, datasetId: string, linhaId: string, cenarioId: string) {
  const vaoRows = await client.query(
    `SELECT v.vao_id, v.codigo_vao, ini.codigo_estrutura AS ini_codigo, fim.codigo_estrutura AS fim_codigo
       FROM tb_vao v
  LEFT JOIN tb_estrutura ini ON ini.estrutura_id = v.estrutura_ini_id
  LEFT JOIN tb_estrutura fim ON fim.estrutura_id = v.estrutura_fim_id
      WHERE v.linha_id = $1`,
    [linhaId]
  );

  const vaoMap = new Map<string, string>();
  for (const row of vaoRows.rows) {
    const keys = [row.codigo_vao, `${row.ini_codigo ?? ""}-${row.fim_codigo ?? ""}`];
    for (const key of keys) {
      if (!key) continue;
      vaoMap.set(normalizeSpanKey(key), row.vao_id);
    }
  }

  await client.query(`DELETE FROM tb_risco_vegetacao_vao WHERE cenario_id = $1`, [cenarioId]);

  const riskRows = await client.query(`SELECT row_number, raw FROM stg_csv_risco_vegetacao WHERE dataset_id = $1 ORDER BY row_number`, [datasetId]);
  const vegetationRows = await client.query(`SELECT row_number, raw FROM stg_csv_vegetacao WHERE dataset_id = $1 ORDER BY row_number`, [datasetId]);
  const vegetationMap = new Map<number, Record<string, any>>();
  for (const row of vegetationRows.rows) {
    vegetationMap.set(row.row_number, row.raw);
  }

  let arborCount = 0;
  let riskCount = 0;

  for (const row of riskRows.rows) {
    const baseRecord = row.raw ?? {};
    const vegetationRecord = vegetationMap.get(row.row_number) ?? baseRecord;
    const arvoreCode = (pickValue<string>(vegetationRecord, ["tree_id", "arvore_id", "id"]) ?? `tree_${row.row_number}`).trim();
    const spanValue = pickValue<string>(baseRecord, ["vao", "vao_codigo", "span", "span_id", "span_code"]);
    const spanKey = spanValue ? normalizeSpanKey(spanValue) : undefined;
    let vaoId = spanKey ? vaoMap.get(spanKey) : undefined;

    if (!vaoId) {
      const start = pickValue<string>(baseRecord, ["estrutura_ini", "structure_ini", "tower_start"]);
      const end = pickValue<string>(baseRecord, ["estrutura_fim", "structure_fim", "tower_end"]);
      if (start && end) {
        vaoId = vaoMap.get(normalizeSpanKey(`${start}-${end}`));
      }
    }

    const lat = toNumber(pickValue(vegetationRecord, ["lat", "latitude", "y"]));
    const lon = toNumber(pickValue(vegetationRecord, ["lon", "longitude", "x"]));
    const geom = lat !== null && lon !== null ? JSON.stringify({ type: "Point", coordinates: [lon, lat] }) : null;
    const altura = toNumber(pickValue(vegetationRecord, ["altura", "height", "height_m"]));
    const tipoVegetacao = pickValue<string>(vegetationRecord, ["tipo", "vegetation_type", "class"]);
    const emApp = toBoolean(pickValue(vegetationRecord, ["em_app", "riparian", "app"]));

    const arvoreResult = await client.query(
      `INSERT INTO tb_elemento_vegetacao (linha_id, vao_id, codigo_externo, geom, altura_m, tipo_vegetacao, em_app, metadata)
       VALUES ($1, $2, $3, CASE WHEN $4::text IS NULL THEN NULL ELSE ST_GeomFromGeoJSON($4::text) END, $5, $6, $7, jsonb_build_object('dataset_id', $8::text, 'row_number', $9::int))
       ON CONFLICT (linha_id, codigo_externo)
       DO UPDATE SET
         vao_id = COALESCE(EXCLUDED.vao_id, tb_elemento_vegetacao.vao_id),
         geom = COALESCE(EXCLUDED.geom, tb_elemento_vegetacao.geom),
         altura_m = COALESCE(EXCLUDED.altura_m, tb_elemento_vegetacao.altura_m),
         tipo_vegetacao = COALESCE(EXCLUDED.tipo_vegetacao, tb_elemento_vegetacao.tipo_vegetacao),
         em_app = COALESCE(EXCLUDED.em_app, tb_elemento_vegetacao.em_app),
         metadata = tb_elemento_vegetacao.metadata || EXCLUDED.metadata
       RETURNING arvore_id`,
      [linhaId, vaoId ?? null, arvoreCode, geom, altura, tipoVegetacao ?? null, emApp ?? null, datasetId, row.row_number]
    );
    const arvoreId = arvoreResult.rows[0].arvore_id as string;
    arborCount += 1;

    const distMin = toNumber(pickValue(baseRecord, ["dist_min_cabo_m", "distancia_min", "clearance_m", "distance_to_conductor_m"]));
    const distLat = toNumber(pickValue(baseRecord, ["distancia_lateral_m", "lateral_distance", "offset_m"]));
    const categoria = pickValue<string>(baseRecord, ["categoria", "risk_category", "classificacao"]);
    const classe = sanitizeClass(pickValue<string>(baseRecord, ["classe_risco", "risk_class", "clearance_class"]));
    const dataProc = pickValue<string>(baseRecord, ["data_processamento", "processed_at", "date"]);

    await client.query(
      `INSERT INTO tb_risco_vegetacao_vao (vao_id, arvore_id, cenario_id, dist_min_cabo_m, classe_risco_clearance, distancia_lateral_m, categoria_risco, data_processamento, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, jsonb_build_object('dataset_id', $9::text, 'row_number', $10::int))`,
      [vaoId ?? null, arvoreId, cenarioId, distMin, classe ?? null, distLat, categoria ?? null, dataProc ?? null, datasetId, row.row_number]
    );
    riskCount += 1;
  }

  return { arvoresUpsertadas: arborCount, riscosVegetacao: riskCount };
}

async function upsertTreatments(client: PoolClient, datasetId: string, linhaId: string, cenarioId: string) {
  const rows = await client.query(
    `SELECT stg_id, raw, ST_AsGeoJSON(geom) AS geom_json
       FROM stg_kml_tratado WHERE dataset_id = $1`,
    [datasetId]
  );
  if (!rows.rowCount) return 0;

  await client.query(`DELETE FROM tb_tratamento_vegetacao WHERE cenario_id = $1`, [cenarioId]);

  for (const row of rows.rows) {
    const props = row.raw?.properties ?? row.raw ?? {};
    const tipo = pickValue<string>(props, ["tipo", "service", "servico"]);
    const dataExecucao = pickValue<string>(props, ["data", "data_execucao", "executed_at"]);
    await client.query(
      `INSERT INTO tb_tratamento_vegetacao (cenario_id, linha_id, vao_id, geom, tipo_servico, data_execucao, origem, metadata)
       VALUES ($1, $2, NULL, CASE WHEN $3 IS NULL THEN NULL ELSE ST_GeomFromGeoJSON($3) END, $4, $5, 'LiPowerline', jsonb_build_object('dataset_id', $6, 'stg_id', $7))`,
      [cenarioId, linhaId, row.geom_json ?? null, tipo ?? null, dataExecucao ?? null, datasetId, row.stg_id]
    );
  }
  return rows.rowCount ?? 0;
}

function normalizeSpanKey(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}
