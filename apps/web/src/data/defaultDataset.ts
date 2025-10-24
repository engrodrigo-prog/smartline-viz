import {
  areasAlagadas,
  cameras,
  checklists,
  emendas,
  equipes,
  erosoes,
  escalas,
  eventos,
  extensoesLinhas,
  kpiData,
  linhas,
  membrosEquipe,
  missoesDrones,
  mockAssets,
  mockChartData,
  mockSensors,
  ndviJundiai,
  ocupacoesFaixa,
  protecoesPássaros,
  queimadas,
  regioes,
  uploads,
  veiculos,
} from "@/lib/mockData";

/**
 * Dataset structure used across the SmartLine demo experience.
 * Each field maps to the mock data collections but can be fully replaced
 * by importing a JSON dataset at runtime.
 */
export const defaultDataset = {
  regioes,
  linhas,
  eventos,
  uploads,
  missoesDrones,
  extensoesLinhas,
  kpiData,
  mockSensors,
  mockAssets,
  mockChartData,
  areasAlagadas,
  ocupacoesFaixa,
  protecoesPassaros: protecoesPássaros,
  emendas,
  erosoes,
  ndviJundiai,
  queimadas,
  cameras,
  membrosEquipe,
  equipes,
  escalas,
  veiculos,
  checklists,
} as const;

export type Dataset = typeof defaultDataset;
export type DatasetPartial = Partial<Dataset>;
