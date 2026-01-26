import { getJSON, postJSON } from "./api";

export type FileAsset = {
  id: string;
  tenant_id?: string | null;
  line_code: string;
  category?: string | null;
  description?: string | null;
  bucket_id: string;
  object_path: string;
  file_name?: string | null;
  original_name?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  created_by?: string | null;
  created_at: string;
  geom?: unknown | null;
  meta?: Record<string, unknown> | null;
  url?: string | null;
};

export const listFileAssets = async (params: { lineCode?: string; format?: "list" | "geojson" } = {}) => {
  const search = new URLSearchParams();
  if (params.lineCode) search.set("line_code", params.lineCode);
  if (params.format) search.set("format", params.format);
  const query = search.toString();
  return getJSON<FileAsset[]>(`/files${query ? `?${query}` : ""}`);
};

export type CreateFileAssetInput = {
  line_code: string;
  category?: string;
  description?: string;
  bucket_id: string;
  object_path: string;
  file_name?: string;
  original_name?: string;
  mime_type?: string;
  size_bytes?: number;
  lat?: number;
  lon?: number;
  meta?: Record<string, unknown>;
};

export const createFileAsset = async (payload: CreateFileAssetInput) => {
  return postJSON<{ success: boolean; data: FileAsset }>(`/files`, payload);
};

