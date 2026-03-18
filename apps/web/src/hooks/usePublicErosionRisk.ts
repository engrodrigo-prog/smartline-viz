import { useQuery } from "@tanstack/react-query";
import { postJSON } from "@/services/api";

export type PublicErosionRiskLinePayload = {
  id?: string;
  lineCode?: string | null;
  lineName?: string | null;
  companyName?: string | null;
  regionCode?: string | null;
  voltageKv?: string | null;
  coordinates: Array<[number, number]>;
};

export type PublicErosionSoilSamplePayload = {
  latitude: number;
  longitude: number;
  soilType: string;
  depth?: number;
  cohesion?: number;
  permeability?: number;
  moisture?: number;
  notes?: string;
};

export type PublicErosionRiskResponse = {
  generatedAt: string;
  bufferMeters: number;
  sampleSpacingMeters: number;
  soilMode: "actionable" | "visual";
  source: {
    precipitation: string;
    terrain: string;
    soil: string;
  };
  degraded: boolean;
  notes: string[];
  stats: {
    linesEvaluated: number;
    samplesEvaluated: number;
    segmentsEvaluated: number;
    highRiskSegments: number;
    maxRain7dMm: number;
    maxSlopePercent: number;
    soilBackedSamples: number;
  };
  bounds: [number, number, number, number] | null;
  corridors: GeoJSON.FeatureCollection<GeoJSON.Polygon>;
  segments: GeoJSON.FeatureCollection<GeoJSON.LineString>;
  hotspots: GeoJSON.FeatureCollection<GeoJSON.Point>;
  soilPoints: GeoJSON.FeatureCollection<GeoJSON.Point>;
};

interface UsePublicErosionRiskOptions {
  lines: PublicErosionRiskLinePayload[];
  soilSamples?: PublicErosionSoilSamplePayload[];
  soilMode?: "actionable" | "visual";
  bufferMeters?: number;
  sampleSpacingMeters?: number;
  enabled?: boolean;
}

export const usePublicErosionRisk = ({
  lines,
  soilSamples = [],
  soilMode = "actionable",
  bufferMeters = 50,
  sampleSpacingMeters = 1200,
  enabled = true,
}: UsePublicErosionRiskOptions) =>
  useQuery<PublicErosionRiskResponse>({
    queryKey: ["erosao-public-risk", lines, soilSamples, soilMode, bufferMeters, sampleSpacingMeters],
    enabled: enabled && lines.length > 0,
    staleTime: 30 * 60 * 1000,
    retry: false,
    queryFn: () =>
      postJSON<PublicErosionRiskResponse>("/erosao/public-risk", {
        lines,
        soilSamples,
        soilMode,
        bufferMeters,
        sampleSpacingMeters,
      }),
  });
