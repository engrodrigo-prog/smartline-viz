#!/usr/bin/env tsx
import { runLipowerlineImport } from "../etl/lipowerline/index.js";
import type { ScenarioStatus, ScenarioType } from "../etl/lipowerline/types.js";

interface CliArgs {
  dataset?: string;
  line?: string;
  lineName?: string;
  concessionaria?: string;
  regiao?: string;
  tensao?: number;
  scenario?: string;
  scenarioType?: ScenarioType;
  scenarioStatus?: ScenarioStatus;
  scenarioDate?: string;
  createdBy?: string;
  files: Record<string, string>;
}

function parseArgs(): CliArgs {
  const rawArgs = process.argv.slice(2);
  const parsed: Record<string, string> = {};
  for (let idx = 0; idx < rawArgs.length; idx += 1) {
    const token = rawArgs[idx];
    if (!token.startsWith("--")) continue;
    const key = token.replace(/^--/, "");
    const next = rawArgs[idx + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
      continue;
    }
    parsed[key] = next;
    idx += 1;
  }

  const files: Record<string, string> = {};
  const fileFlags: Record<string, keyof Record<string, string>> = {
    "file-line-kml": "lineKml",
    "file-structures-kml": "structureKml",
    "file-treated-kml": "treatedKml",
    "file-vegetacao-csv": "vegetationCsv",
    "file-risco-csv": "vegetationRiskCsv",
    "file-queda-csv": "lateralRiskCsv",
    "file-cruzamento-csv": "crossingsCsv",
  };
  for (const [flag, key] of Object.entries(fileFlags)) {
    if (parsed[flag]) {
      files[key] = parsed[flag];
    }
  }

  return {
    dataset: parsed.dataset,
    line: parsed.line,
    lineName: parsed["line-name"],
    concessionaria: parsed.concessionaria,
    regiao: parsed.regiao,
    tensao: parsed.tensao ? Number(parsed.tensao) : undefined,
    scenario: parsed.cenario ?? parsed.scenario,
    scenarioType: (parsed["cenario-type"] ?? parsed["scenario-type"]) as ScenarioType | undefined,
    scenarioStatus: (parsed["cenario-status"] ?? parsed["scenario-status"]) as ScenarioStatus | undefined,
    scenarioDate: parsed["cenario-date"] ?? parsed["scenario-date"],
    createdBy: parsed["created-by"],
    files,
  };
}

async function main() {
  const args = parseArgs();
  if (!args.dataset || !args.line || !args.scenario) {
    console.error("Uso: pnpm -C apps/api tsx src/scripts/import-lipowerline.ts --dataset <pasta> --line <codigo> --cenario <descricao>");
    process.exit(1);
  }

  console.info(`Iniciando ETL LiPowerline para ${args.line} (${args.scenario})`);
  const result = await runLipowerlineImport({
    datasetPath: args.dataset,
    lineCode: args.line,
    lineName: args.lineName,
    concessionaria: args.concessionaria,
    regiao: args.regiao,
    tensaoKV: args.tensao,
    scenarioDescription: args.scenario,
    scenarioType: args.scenarioType,
    scenarioStatus: args.scenarioStatus,
    scenarioDate: args.scenarioDate,
    createdBy: args.createdBy,
    inputFiles: args.files,
  });

  console.info("Stage:", result.stage);
  console.info("Normalize:", result.normalize);
  console.info(`Dataset ${result.datasetId} processado com sucesso.`);
}

main().catch((err) => {
  console.error("Falha ao importar dataset LiPowerline", err);
  process.exit(1);
});
