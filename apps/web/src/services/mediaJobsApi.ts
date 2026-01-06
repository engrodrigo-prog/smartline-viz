import { ENV } from "@/config/env";
import type { FeatureCollection, Point } from "geojson";

const baseUrl = ENV.API_BASE_URL?.replace(/\/+$/, "") ?? "";

type FetchInit = RequestInit & { headers?: Record<string, string> };

const requestJson = async <T>(path: string, init?: FetchInit): Promise<T> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Falha ao consultar API de mídia");
  }
  return (await response.json()) as T;
};

const normaliseGeometry = (value?: string | null) => {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as Point;
  } catch {
    return undefined;
  }
};

export interface MediaJobSummary {
  jobId: string;
  linhaId?: string;
  linhaCodigo?: string;
  linhaNome?: string;
  cenarioId?: string;
  cenarioDescricao?: string;
  tipoInspecao: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  finishedAt?: string;
  totalItens: number;
  itensComGeom: number;
  metadata: Record<string, unknown>;
}

export interface MediaJobDetail extends MediaJobSummary {
  itensPorTipo: { tipo_midia: string; total: number }[];
  amostraItens: MediaItem[];
}

export interface MediaItem {
  mediaId: string;
  jobId: string;
  linhaId?: string;
  cenarioId?: string;
  estruturaId?: string;
  vaoId?: string;
  tipoMidia: string;
  filePath?: string;
  thumbPath?: string;
  capturadoEm?: string;
  metadata: Record<string, unknown>;
  geometry?: Point;
}

export interface MediaItemsResponse {
  items: MediaItem[];
  count: number;
}

export interface AnomaliaRecord {
  anomaliaId: string;
  linhaId: string;
  estruturaId?: string;
  vaoId?: string;
  cenarioId?: string;
  mediaId?: string;
  tipoAnomalia: string;
  criticidade?: string;
  status: string;
  origem?: string;
  descricao?: string;
  detectadoEm?: string;
  atualizadoEm?: string;
  jobId?: string;
  mediaFilePath?: string;
  mediaGeometry?: Point;
  metadata: Record<string, unknown>;
}

export type JobListParams = {
  linhaId?: string;
  tipoInspecao?: string;
  status?: string;
  limit?: number;
};

export type ItemsListParams = {
  linhaId?: string;
  jobId?: string;
  cenarioId?: string;
  estruturaId?: string;
  vaoId?: string;
  tipoMidia?: string;
  hasGeom?: boolean;
  bbox?: string;
  limit?: number;
  offset?: number;
};

export type AnomaliaListParams = {
  linhaId?: string;
  estruturaId?: string;
  vaoId?: string;
  status?: string;
  criticidade?: string;
  tipo?: string;
  jobId?: string;
};

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const str = search.toString();
  return str ? `?${str}` : "";
};

const mapJob = (row: any): MediaJobSummary => ({
  jobId: row.job_id,
  linhaId: row.linha_id ?? undefined,
  linhaCodigo: row.codigo_linha ?? undefined,
  linhaNome: row.nome_linha ?? undefined,
  cenarioId: row.cenario_id ?? undefined,
  cenarioDescricao: row.cenario_descricao ?? undefined,
  tipoInspecao: row.tipo_inspecao,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at ?? undefined,
  finishedAt: row.finished_at ?? undefined,
  totalItens: Number(row.total_itens ?? 0),
  itensComGeom: Number(row.itens_com_geom ?? 0),
  metadata: row.metadata ?? {},
});

const mapMediaItem = (row: any): MediaItem => ({
  mediaId: row.media_id,
  jobId: row.job_id,
  linhaId: row.linha_id ?? undefined,
  cenarioId: row.cenario_id ?? undefined,
  estruturaId: row.estrutura_id ?? undefined,
  vaoId: row.vao_id ?? undefined,
  tipoMidia: row.tipo_midia,
  filePath: row.file_path ?? undefined,
  thumbPath: row.thumb_path ?? undefined,
  capturadoEm: row.capturado_em ?? undefined,
  metadata: row.metadata ?? {},
  geometry: normaliseGeometry(row.geom_geojson),
});

const mapAnomalia = (row: any): AnomaliaRecord => ({
  anomaliaId: row.anomalia_id,
  linhaId: row.linha_id,
  estruturaId: row.estrutura_id ?? undefined,
  vaoId: row.vao_id ?? undefined,
  cenarioId: row.cenario_id ?? undefined,
  mediaId: row.media_id ?? undefined,
  tipoAnomalia: row.tipo_anomalia,
  criticidade: row.criticidade ?? undefined,
  status: row.status,
  origem: row.origem ?? undefined,
  descricao: row.descricao ?? undefined,
  detectadoEm: row.detectado_em ?? undefined,
  atualizadoEm: row.atualizado_em ?? undefined,
  metadata: row.metadata ?? {},
  jobId: row.job_id ?? undefined,
  mediaFilePath: row.file_path ?? undefined,
  mediaGeometry: normaliseGeometry(row.media_geom_geojson),
});

export const listMediaJobs = async (params: JobListParams = {}): Promise<MediaJobSummary[]> => {
  const query = buildQuery({
    linha_id: params.linhaId,
    tipo_inspecao: params.tipoInspecao,
    status: params.status,
    limit: params.limit,
  });
  const rows = await requestJson<any[]>(`/media/jobs${query}`);
  return rows.map(mapJob);
};

export const getMediaJob = async (jobId: string): Promise<MediaJobDetail> => {
  const row = await requestJson<any>(`/media/jobs/${encodeURIComponent(jobId)}`);
  return {
    ...mapJob(row),
    itensPorTipo: row.itens_por_tipo ?? [],
    amostraItens: Array.isArray(row.amostra_itens) ? row.amostra_itens.map(mapMediaItem) : [],
  };
};

export const listMediaItems = async (params: ItemsListParams = {}): Promise<MediaItemsResponse> => {
  const query = buildQuery({
    linha_id: params.linhaId,
    job_id: params.jobId,
    cenario_id: params.cenarioId,
    estrutura_id: params.estruturaId,
    vao_id: params.vaoId,
    tipo_midia: params.tipoMidia,
    has_geom: params.hasGeom ? "true" : undefined,
    bbox: params.bbox,
    limit: params.limit,
    offset: params.offset,
  });
  const payload = await requestJson<{ items: any[]; count: number }>(`/media/items${query}`);
  return {
    items: payload.items.map(mapMediaItem),
    count: payload.count,
  };
};

export const listAnomalias = async (params: AnomaliaListParams = {}): Promise<AnomaliaRecord[]> => {
  const query = buildQuery({
    linha_id: params.linhaId,
    estrutura_id: params.estruturaId,
    vao_id: params.vaoId,
    status: params.status,
    criticidade: params.criticidade,
    tipo: params.tipo,
    job_id: params.jobId,
  });
  const rows = await requestJson<any[]>(`/anomalias${query}`);
  return rows.map(mapAnomalia);
};

export const createAnomalia = async (payload: {
  linhaId: string;
  tipoAnomalia: string;
  estruturaId?: string;
  vaoId?: string;
  cenarioId?: string;
  mediaId?: string;
  criticidade?: string;
  status?: string;
  descricao?: string;
  origem?: string;
  detectadoEm?: string;
  metadata?: Record<string, unknown>;
}) => {
  const body = {
    linhaId: payload.linhaId,
    tipo_anomalia: payload.tipoAnomalia,
    estruturaId: payload.estruturaId,
    vaoId: payload.vaoId,
    cenarioId: payload.cenarioId,
    mediaId: payload.mediaId,
    criticidade: payload.criticidade,
    status: payload.status,
    descricao: payload.descricao,
    origem: payload.origem,
    detectadoEm: payload.detectadoEm,
    metadata: payload.metadata ?? {},
  };
  const row = await requestJson<any>("/anomalias", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return mapAnomalia(row);
};

export const updateAnomalia = async (anomaliaId: string, patch: Partial<{ status: string; criticidade: string; descricao: string; origem: string }>) => {
  const row = await requestJson<any>(`/anomalias/${encodeURIComponent(anomaliaId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return mapAnomalia(row);
};

export const getLinhaExportUrl = (linhaId: string, cenarioId?: string) => {
  const search = cenarioId ? `?${new URLSearchParams({ cenario_id: cenarioId }).toString()}` : "";
  return `${baseUrl}/export/linha/${encodeURIComponent(linhaId)}.zip${search}`;
};

export const getInspecaoExportUrl = (jobId: string) => `${baseUrl}/export/inspecao/${encodeURIComponent(jobId)}.zip`;
