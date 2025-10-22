import { ENV } from "@/config/env";
import type { FeatureCollection } from "geojson";

export type MediaTema =
  | "Ocorrências"
  | "Fiscalização de Atividades"
  | "Inspeção de Segurança"
  | "Inspeção de Ativos"
  | "Treinamentos"
  | "Situações Irregulares";

export type MediaAssetTipo = "foto" | "video" | "srt" | "nuvem" | "outro";

export interface MediaAsset {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  tipo: MediaAssetTipo;
  temaPrincipal: MediaTema;
  temas: MediaTema[];
  meta?: Record<string, unknown>;
}

export interface MediaRecord {
  id: string;
  missionId?: string;
  lineId?: string;
  temaPrincipal: MediaTema;
  temas: MediaTema[];
  frameInterval: number;
  uploadedAt: string;
  status: "queued" | "processing" | "done";
  assets: MediaAsset[];
  derived?: {
    frames?: {
      geojson: string;
      baseDir: string;
    };
  };
  framesResumo?: {
    quantidade: number;
    distancia_m: number;
  };
}

export interface MediaUploadResponse {
  id: string;
  jobId: string;
  assets: number;
  mensagem: string;
}

export interface MediaSearchItem {
  id: string;
  missionId?: string;
  lineId?: string;
  temaPrincipal: MediaTema;
  temas: MediaTema[];
  uploadedAt: string;
  status: string;
  assetsResumo: {
    id: string;
    tipo: MediaAssetTipo;
    filename: string;
    originalName: string;
    temaPrincipal: MediaTema;
    temas: MediaTema[];
    size: number;
  }[];
}

export interface MediaSearchResponse {
  total: number;
  items: MediaSearchItem[];
}

const baseUrl = ENV.API_BASE_URL?.replace(/\/+$/, "") ?? "";

const encodePathSegments = (path: string) =>
  path
    .split(/[\\/]+/)
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

export const uploadMedia = async (formData: FormData): Promise<MediaUploadResponse> => {
  const response = await fetch(`${baseUrl}/media/upload`, {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Falha no upload de mídia");
  }
  return (await response.json()) as MediaUploadResponse;
};

export const fetchMediaRecord = async (id: string) => {
  const response = await fetch(`${baseUrl}/media/${encodeURIComponent(id)}/assets`);
  if (!response.ok) {
    throw new Error("Mídia não encontrada");
  }
  return (await response.json()) as MediaRecord;
};

export const fetchMediaFrames = async (id: string): Promise<FeatureCollection> => {
  const response = await fetch(`${baseUrl}/media/${encodeURIComponent(id)}/frames`);
  if (!response.ok) {
    throw new Error("Frames indisponíveis");
  }
  return (await response.json()) as FeatureCollection;
};

export const searchMedia = async (params: { tema?: string; periodoInicio?: string; periodoFim?: string; lineId?: string; missionId?: string }) => {
  const search = new URLSearchParams();
  if (params.tema) search.set("tema", params.tema);
  if (params.periodoInicio) search.set("periodoInicio", params.periodoInicio);
  if (params.periodoFim) search.set("periodoFim", params.periodoFim);
  if (params.lineId) search.set("lineId", params.lineId);
  if (params.missionId) search.set("missionId", params.missionId);
  const query = search.toString();
  const response = await fetch(`${baseUrl}/media/search${query ? `?${query}` : ""}`);
  if (!response.ok) {
    throw new Error("Não foi possível consultar mídias");
  }
  return (await response.json()) as MediaSearchResponse;
};

export const getMediaFileUrl = (relativePath: string) =>
  `${baseUrl}/media/files/${encodePathSegments(relativePath)}`;

export const getMediaFramesArchiveUrl = (mediaId: string) =>
  `${baseUrl}/media/${encodeURIComponent(mediaId)}/frames/archive`;

export const getMediaFramesGeoJsonUrl = (mediaId: string) =>
  `${baseUrl}/media/${encodeURIComponent(mediaId)}/frames`;
