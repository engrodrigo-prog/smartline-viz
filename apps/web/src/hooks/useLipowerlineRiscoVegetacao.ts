import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Feature, FeatureCollection, LineString } from "geojson";
import { getRiscoVegetacao, type LipVegetacaoFeature } from "@/services/lipowerlineApi";
import { SHOULD_USE_DEMO_API } from "@/lib/demoApi";
import { useDatasetData } from "@/context/DatasetContext";
import { emptyLineCollection, fallbackLineFeaturesFromEventos } from "./lipowerlineFallbacks";

const asLineFeatures = (record: LipVegetacaoFeature): Feature<LineString>[] => {
  if (!record.geom) return [];
  if (record.geom.type === "LineString") {
    return [
      {
        type: "Feature",
        geometry: record.geom,
        properties: record,
      },
    ];
  }
  if (record.geom.type === "MultiLineString") {
    return record.geom.coordinates.map((coords) => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: record,
    }));
  }
  return [];
};

const colorByClasse = (classe?: string | null) => {
  if (!classe) return "#3b82f6";
  const normalized = classe.toLowerCase();
  if (normalized.includes("crit")) return "#ef4444";
  if (normalized.includes("alert")) return "#f97316";
  return "#22c55e";
};

export const useLipowerlineRiscoVegetacao = (linhaId?: string, cenarioId?: string) => {
  const dataset = useDatasetData((data) => ({ eventos: data.eventos }));
  const shouldQuery = Boolean(linhaId && cenarioId) && !SHOULD_USE_DEMO_API;

  const query = useQuery<LipVegetacaoFeature[]>({
    queryKey: ["lipowerline", "risco-vegetacao", linhaId, cenarioId],
    queryFn: () => getRiscoVegetacao(linhaId!, cenarioId!),
    enabled: shouldQuery,
    staleTime: 60 * 1000,
  });

  const data = useMemo<FeatureCollection<LineString>>(() => {
    if (!linhaId) return emptyLineCollection;
    if (query.data && query.data.length) {
      const features = query.data.flatMap((record) =>
        asLineFeatures(record).map((feature) => ({
          ...feature,
          properties: {
            ...feature.properties,
            layerType: "vegetacao",
            color: colorByClasse(record.classeRisco),
          },
        })),
      );
      return { type: "FeatureCollection", features };
    }
    return fallbackLineFeaturesFromEventos(dataset.eventos, linhaId, {
      tipo: "Vegetação",
      color: "#16a34a",
    });
  }, [dataset.eventos, linhaId, query.data]);

  return {
    data,
    isLoading: shouldQuery ? query.isLoading : false,
    error: shouldQuery ? query.error : undefined,
    refetch: query.refetch,
    isFallback: SHOULD_USE_DEMO_API || !query.data?.length,
  };
};
