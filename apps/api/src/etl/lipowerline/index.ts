import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { getDbPool } from "@smartline/db";
import { autodetectDatasetFiles } from "./utils.js";
import { createDatasetRecord, stageFiles, updateDatasetStatus } from "./loaders/staging.js";
import { normalizeDataset } from "./loaders/normalize.js";
import type { LipowerlineImportOptions, LipowerlineImportResult } from "./types.js";

export async function runLipowerlineImport(options: LipowerlineImportOptions): Promise<LipowerlineImportResult> {
  const datasetPath = resolve(options.datasetPath);
  if (!existsSync(datasetPath) || !statSync(datasetPath).isDirectory()) {
    throw new Error(`Pasta do dataset não encontrada: ${datasetPath}`);
  }

  const files = autodetectDatasetFiles(datasetPath, options.inputFiles);
  const pool = getDbPool();
  const client = await pool.connect();
  let datasetId: string | undefined;

  try {
    await client.query("BEGIN");
    datasetId = await createDatasetRecord(client, { ...options, datasetPath }, files);
    const stageResult = await stageFiles(client, datasetId, files);
    const normalization = await normalizeDataset(client, datasetId, options);
    await updateDatasetStatus(client, datasetId, "completed", {
      stage: stageResult.counters,
      normalize: normalization,
    });
    await client.query("COMMIT");

    return {
      datasetId,
      stage: stageResult.counters,
      normalize: normalization,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    if (datasetId) {
      await updateDatasetStatus(client, datasetId, "failed", { error: (err as Error).message });
    }
    throw err;
  } finally {
    client.release();
  }
}
