import { useQuery } from "@tanstack/react-query";
import type { FeatureCollection } from "geojson";

import { api } from "@/services/api";

export type FirmsPreset = "12h" | "24h" | "48h" | "7d";

export interface FirmsGeoJson extends FeatureCollection {
  metadata?: {
    preset: FirmsPreset;
    cached: boolean;
    live: boolean;
    source: string;
  };
}

export const useFirmsData = (preset: FirmsPreset) =>
  useQuery<FirmsGeoJson>({
    queryKey: ["firms", preset],
    queryFn: async () => {
      return api.get<FirmsGeoJson>(`/firms?preset=${preset}`);
    },
    staleTime: 60_000,
    refetchInterval: preset === "12h" || preset === "24h" ? 120_000 : 300_000
  });
