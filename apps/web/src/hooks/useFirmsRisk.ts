import { useQuery } from "@tanstack/react-query";

export interface FirmsRiskParams {
  lineId?: string;
  linha?: unknown;
  horizons?: number[];
  count?: number;
  windHeight?: number;
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

export const useFirmsRisk = (params: FirmsRiskParams) => {
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
  const defaultHeight = Number(import.meta.env.VITE_WIND_HEIGHT ?? 0) || undefined;
  const body = { ...params } as FirmsRiskParams;
  if (body.windHeight == null && defaultHeight != null) {
    body.windHeight = defaultHeight;
  }

  return useQuery({
    queryKey: ["firms-risk", params],
    queryFn: async () => {
      const resp = await fetch(`${base}/firms/risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!resp.ok) {
        throw new Error("FIRMS risk indisponível");
      }
      return resp.json() as Promise<FirmsRiskFeatureCollection>;
    },
    staleTime: 60_000
  });
};
