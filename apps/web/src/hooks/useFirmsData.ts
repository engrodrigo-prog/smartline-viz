import { useQuery } from "@tanstack/react-query";
import type { FeatureCollection } from "geojson";

import { getJSON } from "@/services/api";

export type FirmsSensor = "ms:fires_noaa20_24hrs" | "ms:fires_noaa21_24hrs" | "ms:fires_npp_24hrs" | "ms:fires_modis_24hrs";

export type FirmsBBoxMode = "brazil" | "south_america" | "custom";

export interface FirmsMeta {
  typenames: string[];
  bbox: string;
  count: number;
  source: string;
  cached: boolean;
  lastFetchedAt: string;
  formatAttempt: string[];
}

export type FirmsResponse = FeatureCollection & {
  meta: FirmsMeta;
};

export interface FirmsParams {
  typenames?: FirmsSensor[];
  bboxMode?: FirmsBBoxMode;
  bbox?: string;
  count?: number;
  format?: "auto" | "geojson" | "csv" | "kml";
  enabled?: boolean;
}

const DEFAULT_TYPENAMES: FirmsSensor[] = [
  "ms:fires_noaa20_24hrs",
  "ms:fires_noaa21_24hrs",
  "ms:fires_npp_24hrs",
  "ms:fires_modis_24hrs"
];

const toQueryString = (params: FirmsParams) => {
  const searchParams = new URLSearchParams();
  const sensors = params.typenames && params.typenames.length > 0 ? params.typenames : DEFAULT_TYPENAMES;
  searchParams.set("typenames", sensors.join(","));
  if (params.count) {
    searchParams.set("count", params.count.toString());
  }
  const format = params.format ?? "auto";
  searchParams.set("format", format);

  const bboxMode = params.bboxMode ?? "brazil";
  if (bboxMode === "south_america") {
    searchParams.set("bbox", "south_america");
  } else if (bboxMode === "custom" && params.bbox) {
    searchParams.set("bbox", params.bbox);
  }

  return searchParams.toString();
};

export const useFirmsData = (params: FirmsParams = {}) =>
  useQuery<FirmsResponse>({
    queryKey: ["firms:wfs", params],
    queryFn: async () => {
      const query = toQueryString(params);
      return getJSON<FirmsResponse>(`/firms/wfs?${query}`);
    },
    staleTime: 5 * 60_000,
    enabled: params.enabled ?? true
  });
