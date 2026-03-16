import { useQuery } from "@tanstack/react-query";
import type { FeatureCollection, LineString } from "geojson";

export interface FirmsRiskParams {
  lineId?: string;
  lineName?: string;
  empresa?: string;
  regiao?: string;
  seCode?: string;
  tensaoKv?: string;
  dateFrom?: string;
  dateTo?: string;
  daysBack?: number;
  horizons?: number[];
  count?: number;
  windHeight?: number;
  maxDistanceKm?: number;
  sensors?: string[];
}

export interface WindLevelSample {
  height: number;
  speed: number;
  deg: number;
  dt: number;
}

export interface WindTimelineEntry {
  dt: number;
  isPast?: boolean;
  heights: Record<number, { speed: number; deg: number }>;
}

export interface FirmsRiskMeta {
  generated_at: string;
  horizons: number[];
  source?: string;
  notes?: string[];
  degraded?: boolean;
  corridor?: FeatureCollection<LineString>;
  asset_scope?: {
    count: number;
    line_count: number;
    structure_count: number;
    other_count: number;
    companies: string[];
    regions: string[];
    line_codes: string[];
    se_codes: string[];
    bbox: [number, number, number, number] | null;
  };
  query?: {
    lineId?: string | null;
    lineName?: string | null;
    empresa?: string | null;
    regiao?: string | null;
    seCode?: string | null;
    maxDistanceKm?: number | null;
    bbox?: [number, number, number, number];
    date_from?: string;
    date_to?: string;
    sensors?: string[] | null;
  };
  wind?: {
    location: { lat: number; lon: number };
    height_used_for_risk: number;
    available_heights: number[];
    profile_by_horizon: Record<string, WindLevelSample[]>;
    timeline: WindTimelineEntry[];
  };
  stats?: {
    hotspots_total: number;
    risk_max: number;
    risk_avg: number;
    corridor_count: number;
    frp_sum: number;
  };
}

export interface FirmsRiskFeatureCollection extends GeoJSON.FeatureCollection {
  meta?: FirmsRiskMeta;
}

import { postJSON } from "@/services/api";
import { SHOULD_USE_DEMO_API } from "@/lib/demoApi";
import { demoFirmsResponse } from "@/data/demo/apiFallbacks";

export const useFirmsRisk = (params: FirmsRiskParams) => {
  const defaultHeight = Number(import.meta.env.VITE_WIND_HEIGHT ?? 0) || undefined;
  const body = { ...params } as FirmsRiskParams;
  if (body.windHeight == null && defaultHeight != null) {
    body.windHeight = defaultHeight;
  }

  return useQuery({
    queryKey: ["firms-risk", body],
    queryFn: async () => {
      if (SHOULD_USE_DEMO_API) {
        return demoFirmsResponse as unknown as FirmsRiskFeatureCollection;
      }
      return postJSON<FirmsRiskFeatureCollection>("/firms/risk", body, { timeoutMs: 20000 });
    },
    staleTime: 2 * 60_000,
    retry: 1,
  });
};
