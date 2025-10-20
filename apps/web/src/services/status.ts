import { getJSON, postJSON } from "./api";

export type FeatureStatus = {
  id: string;
  status: string;
  notes?: string;
  cameraUrl?: string;
  updatedAt: string;
};

export const fetchStatus = async (layer: string, id: string) =>
  getJSON<FeatureStatus>(`/status/${layer}?id=${encodeURIComponent(id)}`);

export const fetchStatusBulk = async (layer: string, ids: string[]) => {
  if (ids.length === 0) return [] as FeatureStatus[];
  const query = ids.map((id) => encodeURIComponent(id)).join(",");
  return getJSON<FeatureStatus[]>(`/status/${layer}/bulk?ids=${query}`);
};

export const saveStatus = async (
  layer: string,
  payload: { id: string; status: string; notes?: string; cameraUrl?: string }
) => postJSON<FeatureStatus>(`/status/${layer}`, payload);
