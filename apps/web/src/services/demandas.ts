import { getJSON, postJSON, deleteJSON, putJSON } from "./api";
import { SHOULD_USE_DEMO_API } from "@/lib/demoApi";
import { demoDemandasAnalytics, getDemoDemandasResponse } from "@/data/demo/apiFallbacks";

export const DEMANDA_STATUS = ["Aberta", "Em Execução", "Em Validação", "Concluída"] as const;
export const DEMANDA_EXECUTORES = ["Própria", "Terceiros"] as const;
export const DEMANDA_TEMAS = [
  "Ocorrências",
  "Fiscalização de Atividades",
  "Inspeção de Segurança",
  "Inspeção de Ativos",
  "Treinamentos",
  "Situações Irregulares"
] as const;

export type DemandaStatus = (typeof DEMANDA_STATUS)[number];
export type DemandaExecutor = (typeof DEMANDA_EXECUTORES)[number];
export type DemandaTema = (typeof DEMANDA_TEMAS)[number];

export interface DemandaEvidenciaArquivo {
  id: string;
  filename: string;
  mediaId?: string;
  temaPrincipal?: DemandaTema;
  temas?: DemandaTema[];
}

export interface DemandaEvidence {
  id: string;
  titulo?: string;
  descricao?: string;
  temaPrincipal: DemandaTema;
  temas: DemandaTema[];
  mediaIds?: string[];
  arquivos?: DemandaEvidenciaArquivo[];
  criadoEm: string;
}

export interface Demanda {
  id: string;
  criadoEm: string;
  atualizadoEm: string;
  tipo: string;
  linhaId?: string;
  linhaNome?: string;
  trecho?: string;
  regiao?: string;
  responsavel?: string;
  executora?: string;
  executorTipo: DemandaExecutor;
  custoEstimado?: number | null;
  custoReal?: number | null;
  extensaoKm?: number | null;
  prazoInicio?: string | null;
  prazoFim?: string | null;
  slaDias?: number | null;
  status: DemandaStatus;
  temas: DemandaTema[];
  temaPrincipal?: DemandaTema;
  missoesRelacionadas?: string[];
  evidencias: DemandaEvidence[];
  notas?: string;
  slaSituacao?: "Dentro" | "Fora" | "Sem SLA";
  framesResumo?: {
    quantidade: number;
    distancia_m: number;
  };
}

export interface DemandasResponse {
  items: Demanda[];
  total: number;
  disponiveis: {
    status: DemandaStatus[];
    executorTipos: DemandaExecutor[];
    temas: DemandaTema[];
  };
}

export interface DemandasFilters {
  status?: string;
  executor?: string;
  tipo?: string;
  inicio?: string;
  fim?: string;
  tema?: string;
}

export const fetchDemandas = async (filters: DemandasFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.executor) params.set("executor", filters.executor);
  if (filters.tipo) params.set("tipo", filters.tipo);
  if (filters.inicio) params.set("inicio", filters.inicio);
  if (filters.fim) params.set("fim", filters.fim);
  if (filters.tema) params.set("tema", filters.tema);
  const query = params.toString();
  const path = query ? `/demandas?${query}` : "/demandas";
  if (SHOULD_USE_DEMO_API) {
    return getDemoDemandasResponse(filters);
  }
  return getJSON<DemandasResponse>(path);
};

export const createDemanda = (payload: Partial<Demanda>) => postJSON<Demanda>("/demandas", payload);

export const updateDemanda = (id: string, payload: Partial<Demanda>) =>
  putJSON<Demanda>(`/demandas/${encodeURIComponent(id)}`, payload);

export const deleteDemanda = (id: string) => deleteJSON<{ ok: boolean }>(`/demandas/${encodeURIComponent(id)}`);

export interface DemandasAnalyticsResumo {
  executor: DemandaExecutor;
  custoMedioKm?: number | null;
  tempoMedioDias?: number | null;
  retrabalhoPercentual?: number | null;
  nps?: number | null;
  violacaoSlaPercentual?: number | null;
  estimado: boolean;
  totalOrdens: number;
}

export interface DemandasAnalyticsMapa {
  regiao: string;
  total: number;
  atrasos: number;
  reincidencias: number;
  executor: DemandaExecutor;
}

export interface DemandasAnalytics {
  atualizadoEm: string;
  periodo?: { inicio?: string; fim?: string };
  resumos: DemandasAnalyticsResumo[];
  mapaHeat: DemandasAnalyticsMapa[];
}

export const fetchDemandasAnalytics = () => {
  if (SHOULD_USE_DEMO_API) {
    return Promise.resolve(demoDemandasAnalytics);
  }
  return getJSON<DemandasAnalytics>("/demandas/analytics/comparativo");
};
