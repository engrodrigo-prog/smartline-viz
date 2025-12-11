export type ScenarioType = "pre_manejo" | "pos_manejo" | "simulado";
export type ScenarioStatus = "ativo" | "arquivado";

export interface DatasetFilesMap {
  lineKml?: string;
  structureKml?: string;
  treatedKml?: string;
  vegetationCsv?: string;
  vegetationRiskCsv?: string;
  lateralRiskCsv?: string;
  crossingsCsv?: string;
}

export interface LipowerlineImportOptions {
  datasetPath: string;
  lineCode: string;
  lineName?: string;
  concessionaria?: string;
  regiao?: string;
  tensaoKV?: number;
  scenarioDescription: string;
  scenarioType?: ScenarioType;
  scenarioStatus?: ScenarioStatus;
  scenarioDate?: string;
  createdBy?: string;
  inputFiles?: Partial<DatasetFilesMap>;
}

export interface StageCounters {
  lineFeatures: number;
  structureFeatures: number;
  treatedFeatures: number;
  vegetationRows: number;
  vegetationRiskRows: number;
  lateralRiskRows: number;
  crossingRows: number;
}

export interface NormalizationSummary {
  linhaId: string;
  cenarioId: string;
  estruturasUpserted: number;
  vaosGerados: number;
  arvoresUpsertadas: number;
  riscosVegetacao: number;
  tratamentosRegistrados: number;
}

export interface LipowerlineImportResult {
  datasetId: string;
  stage: StageCounters;
  normalize: NormalizationSummary;
}
