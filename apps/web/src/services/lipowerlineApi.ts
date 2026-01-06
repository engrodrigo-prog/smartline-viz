import { getJSON, postJSON } from "./api";
import type {
  Geometry,
  LineString,
  MultiLineString,
  Polygon,
  MultiPolygon,
  Point,
  MultiPoint,
} from "geojson";

export interface LipLine {
  linhaId: string;
  codigo: string;
  nome?: string;
  tensaoKV?: number | null;
  concessionaria?: string | null;
  regiao?: string | null;
}

export interface LipScenario {
  cenarioId: string;
  linhaId: string;
  descricao: string;
  dataReferencia?: string | null;
  tipo: string;
  status: string;
}

export interface LipKpiResumo {
  linhaId: string;
  codigoLinha: string;
  nomeLinha?: string | null;
  cenarioId?: string | null;
  cenarioDescricao?: string | null;
  tipoCenario?: string | null;
  kmLinha: number;
  totalVaos: number;
  arvoresCriticas: number;
  cruzamentosCriticos: number;
  totalRiscosVegetacao: number;
}

export interface LipVegetacaoFeature {
  vaoId: string;
  linhaId: string;
  cenarioId: string;
  codigoVao?: string | null;
  classeRisco?: string | null;
  distMinCaboM?: number | null;
  distanciaLateralM?: number | null;
  categoriaRisco?: string | null;
  dataProcessamento?: string | null;
  geom?: LineString | MultiLineString | Geometry;
}

export interface LipQuedaFeature {
  riscoQuedaId: string;
  linhaId: string;
  vaoId?: string | null;
  arvoreId?: string | null;
  classeRisco?: string | null;
  alturaArvoreM?: number | null;
  distLateralProjecaoM?: number | null;
  alcanceAteCondutorM?: number | null;
  geom?: Point | MultiPoint | Geometry;
}

export interface LipCruzamentoFeature {
  cruzamentoId: string;
  linhaId: string;
  vaoId?: string | null;
  tipo?: string | null;
  atributos?: Record<string, unknown>;
  classeRisco?: string | null;
  geom?: GeoJSON.Geometry;
}

export interface LipTratamentoFeature {
  tratamentoId: string;
  linhaId: string;
  cenarioId: string;
  tipoServico?: string | null;
  dataExecucao?: string | null;
  origem?: string | null;
  geom?: LineString | MultiLineString | Polygon | MultiPolygon | Geometry;
}

export interface SimulacaoRiscoPayload {
  linhaId: string;
  cenarioId: string;
  vaoIds?: string[];
  topN?: number;
}

export interface SimulacaoRiscoResponse {
  linhaId: string;
  cenarioId: string;
  totalVaos: number;
  totalVaosSelecionados: number;
  riscoAtual: number;
  riscoPosTratamento: number;
  reducaoAbsoluta: number;
  reducaoPercentual: number;
  selecionados?: {
    vaoId: string;
    codigoVao?: string | null;
    riscoEstimado: number;
  }[];
}

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseGeometry = (value: unknown): Geometry | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as GeoJSON.Geometry;
    } catch {
      return undefined;
    }
  }
  if (typeof value === "object") {
    return value as GeoJSON.Geometry;
  }
  return undefined;
};

const mapLine = (row: any): LipLine => ({
  linhaId: row.linha_id ?? row.linhaId,
  codigo: row.codigo_linha ?? row.codigo ?? row.linha_id,
  nome: row.nome_linha ?? row.nome,
  tensaoKV: toNumber(row.tensao_kv),
  concessionaria: row.concessionaria ?? null,
  regiao: row.regiao ?? null,
});

const mapScenario = (row: any): LipScenario => ({
  cenarioId: row.cenario_id ?? row.cenarioId,
  linhaId: row.linha_id ?? row.linhaId,
  descricao: row.descricao ?? row.cenario_descricao ?? "",
  dataReferencia: row.data_referencia ?? row.dataReferencia ?? null,
  tipo: row.tipo_cenario ?? row.tipo,
  status: row.status ?? "ativo",
});

const mapKpi = (row: any): LipKpiResumo => ({
  linhaId: row.linha_id,
  codigoLinha: row.codigo_linha,
  nomeLinha: row.nome_linha,
  cenarioId: row.cenario_id,
  cenarioDescricao: row.cenario_descricao,
  tipoCenario: row.tipo_cenario,
  kmLinha: Number(row.km_linha) || 0,
  totalVaos: Number(row.total_vaos) || 0,
  arvoresCriticas: Number(row.arvores_criticas) || 0,
  cruzamentosCriticos: Number(row.cruzamentos_criticos) || 0,
  totalRiscosVegetacao: Number(row.total_riscos_vegetacao) || 0,
});

const mapVegFeature = (row: any): LipVegetacaoFeature => ({
  vaoId: row.vao_id,
  linhaId: row.linha_id,
  cenarioId: row.cenario_id,
  codigoVao: row.codigo_vao,
  classeRisco: row.classe_risco_clearance,
  distMinCaboM: row.dist_min_cabo_m ? Number(row.dist_min_cabo_m) : null,
  distanciaLateralM: row.distancia_lateral_m ? Number(row.distancia_lateral_m) : null,
  categoriaRisco: row.categoria_risco,
  dataProcessamento: row.data_processamento,
  geom: parseGeometry(row.geom || row.geom_geojson),
});

const mapQuedaFeature = (row: any): LipQuedaFeature => ({
  riscoQuedaId: row.risco_queda_id,
  linhaId: row.linha_id,
  vaoId: row.vao_id,
  arvoreId: row.arvore_id,
  classeRisco: row.classe_risco_queda,
  alturaArvoreM: row.altura_arvore_m ? Number(row.altura_arvore_m) : null,
  distLateralProjecaoM: row.dist_lateral_projecao_m ? Number(row.dist_lateral_projecao_m) : null,
  alcanceAteCondutorM: row.alcance_ate_condutor_m ? Number(row.alcance_ate_condutor_m) : null,
  geom: parseGeometry(row.geom || row.geom_geojson),
});

const mapCruzamento = (row: any): LipCruzamentoFeature => ({
  cruzamentoId: row.cruzamento_id,
  linhaId: row.linha_id,
  vaoId: row.vao_id,
  tipo: row.tipo_cruzamento,
  atributos: typeof row.atributos === "string" ? safeParseJson(row.atributos) : row.atributos,
  classeRisco: row.classe_risco_cruzamento,
  geom: parseGeometry(row.geom || row.geom_geojson),
});

const mapTratamento = (row: any): LipTratamentoFeature => ({
  tratamentoId: row.tratamento_id,
  linhaId: row.linha_id,
  cenarioId: row.cenario_id,
  tipoServico: row.tipo_servico,
  dataExecucao: row.data_execucao,
  origem: row.origem,
  geom: parseGeometry(row.geom || row.geom_geojson),
});

const safeParseJson = (value: string | null | undefined) => {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

export const listLinhas = async () => {
  const rows = await getJSON<any[]>("/linhas");
  return rows.map(mapLine);
};

export const listCenarios = async (linhaId: string) => {
  const rows = await getJSON<any[]>(`/cenarios?linha_id=${encodeURIComponent(linhaId)}`);
  return rows.map((row) => mapScenario({ ...row, linha_id: linhaId }));
};

export const getKpiLinha = async (linhaId: string, cenarioId?: string | null) => {
  const params = new URLSearchParams();
  params.set("linha_id", linhaId);
  if (cenarioId) params.set("cenario_id", cenarioId);
  const rows = await getJSON<any[]>(`/kpi-linha?${params.toString()}`);
  const mapped = rows.map(mapKpi);
  return mapped[0] ?? null;
};

export const getRiscoVegetacao = async (linhaId: string, cenarioId: string) => {
  const params = new URLSearchParams({ linha_id: linhaId, cenario_id: cenarioId });
  const rows = await getJSON<any[]>(`/risco-vegetacao?${params.toString()}`);
  return rows.map(mapVegFeature);
};

export const getRiscoQueda = async (linhaId: string, cenarioId?: string) => {
  const params = new URLSearchParams({ linha_id: linhaId });
  if (cenarioId) params.set("cenario_id", cenarioId);
  const rows = await getJSON<any[]>(`/risco-queda?${params.toString()}`);
  return rows.map(mapQuedaFeature);
};

export const getCruzamentos = async (linhaId: string, cenarioId?: string | null) => {
  const params = new URLSearchParams({ linha_id: linhaId });
  if (cenarioId) params.set("cenario_id", cenarioId);
  const rows = await getJSON<any[]>(`/cruzamentos?${params.toString()}`);
  return rows.map(mapCruzamento);
};

export const getTratamentos = async (linhaId: string, cenarioId: string) => {
  const params = new URLSearchParams({ linha_id: linhaId, cenario_id: cenarioId });
  const rows = await getJSON<any[]>(`/tratamentos?${params.toString()}`);
  return rows.map(mapTratamento);
};

export const simulateRisco = async (payload: SimulacaoRiscoPayload) => {
  const response = await postJSON<SimulacaoRiscoResponse>("/simulacoes/riscos", payload);
  return response;
};
