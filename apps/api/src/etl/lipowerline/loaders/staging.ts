import { existsSync } from "node:fs";
import { basename } from "node:path";
import type { PoolClient } from "@smartline/db";
import { parseKmlFile } from "../parsers/kml.js";
import { parseCsv } from "../parsers/csv.js";
import type { DatasetFilesMap, LipowerlineImportOptions, StageCounters } from "../types.js";

const KML_TABLES = {
  line: "stg_kml_linha",
  structure: "stg_kml_estrutura",
  treated: "stg_kml_tratado",
} as const;

const KML_GEOMETRY_FILTER: Record<keyof typeof KML_TABLES, string[] | null> = {
  line: ["LineString", "MultiLineString"],
  structure: ["Point"],
  treated: null,
};

const CSV_TABLES = {
  vegetation: "stg_csv_vegetacao",
  vegetationRisk: "stg_csv_risco_vegetacao",
  lateralRisk: "stg_csv_queda_lateral",
  crossings: "stg_csv_cruzamentos",
} as const;

export async function createDatasetRecord(client: PoolClient, options: LipowerlineImportOptions, files: DatasetFilesMap) {
  const label = `${options.lineCode} - ${options.scenarioDescription}`;
  const insert = await client.query(
    `INSERT INTO tb_lipowerline_dataset(label, line_code, scenario_hint, source_path, created_by, metadata)
     VALUES ($1, $2, $3, $4, $5, jsonb_build_object('files', $6))
     RETURNING dataset_id`,
    [label, options.lineCode, options.scenarioDescription, options.datasetPath, options.createdBy ?? "etl", JSON.stringify(files)]
  );
  return insert.rows[0].dataset_id as string;
}

export async function updateDatasetStatus(client: PoolClient, datasetId: string, status: string, extra?: Record<string, unknown>) {
  await client.query(
    `UPDATE tb_lipowerline_dataset SET status = $2, metadata = metadata || coalesce($3::jsonb, '{}') WHERE dataset_id = $1`,
    [datasetId, status, extra ? JSON.stringify(extra) : null]
  );
}

interface StageResult {
  counters: StageCounters;
}

const EMPTY_STAGE: StageCounters = {
  lineFeatures: 0,
  structureFeatures: 0,
  treatedFeatures: 0,
  vegetationRows: 0,
  vegetationRiskRows: 0,
  lateralRiskRows: 0,
  crossingRows: 0,
};

export async function stageFiles(client: PoolClient, datasetId: string, files: DatasetFilesMap): Promise<StageResult> {
  const counters: StageCounters = { ...EMPTY_STAGE };

  if (files.lineKml && existsSync(files.lineKml)) {
    counters.lineFeatures = await stageKml(client, datasetId, "line", files.lineKml);
  }
  if (files.structureKml && existsSync(files.structureKml)) {
    counters.structureFeatures = await stageKml(client, datasetId, "structure", files.structureKml);
  } else if (files.lineKml && existsSync(files.lineKml)) {
    // fallback: muitas vezes estruturas estão no mesmo arquivo da linha
    counters.structureFeatures = await stageKml(client, datasetId, "structure", files.lineKml);
  }
  if (files.treatedKml && existsSync(files.treatedKml)) {
    counters.treatedFeatures = await stageKml(client, datasetId, "treated", files.treatedKml);
  }
  if (files.vegetationCsv && existsSync(files.vegetationCsv)) {
    counters.vegetationRows = await stageCsv(client, datasetId, CSV_TABLES.vegetation, files.vegetationCsv);
  }
  if (files.vegetationRiskCsv && existsSync(files.vegetationRiskCsv)) {
    counters.vegetationRiskRows = await stageCsv(client, datasetId, CSV_TABLES.vegetationRisk, files.vegetationRiskCsv);
    if (!files.vegetationCsv) {
      counters.vegetationRows = counters.vegetationRiskRows;
      await copyStagingBetweenTables(client, datasetId, CSV_TABLES.vegetationRisk, CSV_TABLES.vegetation);
    }
  }
  if (files.lateralRiskCsv && existsSync(files.lateralRiskCsv)) {
    counters.lateralRiskRows = await stageCsv(client, datasetId, CSV_TABLES.lateralRisk, files.lateralRiskCsv);
  }
  if (files.crossingsCsv && existsSync(files.crossingsCsv)) {
    counters.crossingRows = await stageCsv(client, datasetId, CSV_TABLES.crossings, files.crossingsCsv);
  }

  return { counters };
}

async function stageKml(client: PoolClient, datasetId: string, type: keyof typeof KML_TABLES, filePath: string) {
  const table = KML_TABLES[type];
  const allowed = KML_GEOMETRY_FILTER[type];
  const features = parseKmlFile(filePath).filter(({ feature }) => {
    if (!allowed) return true;
    if (!feature.geometry) return false;
    return allowed.includes(feature.geometry.type);
  });
  let count = 0;
  for (const { feature, name } of features) {
    const geomJson = feature.geometry ? JSON.stringify(feature.geometry) : null;
    const raw = JSON.stringify({ properties: feature.properties ?? {}, geometry: feature.geometry ?? null });
    await client.query(
      `INSERT INTO ${table} (dataset_id, source_file, feature_name, raw, geom)
       VALUES ($1, $2, $3, $4::jsonb, ${geomJson ? "ST_GeomFromGeoJSON($5)" : "NULL"})`,
      geomJson
        ? [datasetId, basename(filePath), name ?? null, raw, geomJson]
        : [datasetId, basename(filePath), name ?? null, raw]
    );
    count += 1;
  }
  return count;
}

async function stageCsv(client: PoolClient, datasetId: string, table: string, filePath: string) {
  const rows = parseCsv(filePath);
  for (let idx = 0; idx < rows.length; idx += 1) {
    const row = rows[idx];
    await client.query(
      `INSERT INTO ${table} (dataset_id, source_file, row_number, raw)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [datasetId, basename(filePath), idx + 1, JSON.stringify(row)]
    );
  }
  return rows.length;
}

async function copyStagingBetweenTables(client: PoolClient, datasetId: string, source: string, target: string) {
  await client.query(
    `INSERT INTO ${target} (dataset_id, source_file, row_number, raw)
     SELECT dataset_id, source_file, row_number, raw FROM ${source} WHERE dataset_id = $1`,
    [datasetId]
  );
}
