import { ENV } from "@/config/env";
import { getJSON, postJSON } from "./api";

export interface PointcloudUploadResponse {
  id: string;
  lineId?: string | null;
}

export interface PointcloudIndex {
  id: string;
  pointsTotal: number;
  bbox_native: {
    min: number[];
    max: number[];
  };
  bbox_wgs84?: {
    min: number[];
    max: number[];
  } | null;
  classes: Record<string, number>;
  coordinate_system?: string | null;
  updatedAt: string;
}

export const uploadPointcloud = async (file: File, lineId?: string) => {
  const base = ENV.API_BASE_URL?.replace(/\/+$/, "") ?? "";
  const formData = new FormData();
  formData.append("file", file);
  if (lineId) formData.append("lineId", lineId);

  const response = await fetch(`${base}/pointclouds/upload`, {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Falha ao enviar nuvem de pontos");
  }
  return (await response.json()) as PointcloudUploadResponse;
};

export const indexPointcloud = (id: string) => postJSON<{ id: string; status: string }>("/pointclouds/index", { id });

export const profilePointcloud = (payload: {
  id: string;
  line: GeoJSON.Feature<GeoJSON.LineString>;
  buffer_m?: number;
  step_m?: number;
  classes?: number[];
}) => postJSON<{ id: string; status: string }>("/pointclouds/profile", payload);

export const fetchPointcloudIndex = (id: string) =>
  getJSON<PointcloudIndex>(`/pointclouds/${encodeURIComponent(id)}/index`);

export const fetchPointcloudPlan = (id: string) =>
  getJSON<GeoJSON.FeatureCollection>(`/pointclouds/${encodeURIComponent(id)}/plan`);

export const fetchPointcloudProfile = (id: string) =>
  getJSON<any>(`/pointclouds/${encodeURIComponent(id)}/profile`);
