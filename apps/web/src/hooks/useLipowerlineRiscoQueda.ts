import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Feature, FeatureCollection, Point } from "geojson";
import { getRiscoQueda, type LipQuedaFeature } from "@/services/lipowerlineApi";
import { SHOULD_USE_DEMO_API } from "@/lib/demoApi";
import { useDatasetData } from "@/context/DatasetContext";
import { emptyPointCollection, fallbackPointFeaturesFromEventos } from "./lipowerlineFallbacks";

const toPointFeature = (record: LipQuedaFeature): Feature<Point> | null => {
  if (!record.geom || record.geom.type !== "Point") return null;
  return {
    type: "Feature",
    geometry: record.geom,
    properties: {
      ...record,
      layerType: "queda",
      color: "#f97316",
    },
  };
};

export const useLipowerlineRiscoQueda = (linhaId?: string, cenarioId?: string) => {
  const dataset = useDatasetData((data) => ({ eventos: data.eventos }));
  const shouldQuery = Boolean(linhaId && cenarioId) && !SHOULD_USE_DEMO_API;

  const query = useQuery<LipQuedaFeature[]>({
    queryKey: ["lipowerline", "risco-queda", linhaId, cenarioId],
    queryFn: () => getRiscoQueda(linhaId!, cenarioId!),
    enabled: shouldQuery,
    staleTime: 60 * 1000,
  });

  const data = useMemo<FeatureCollection<Point>>(() => {
    if (!linhaId) return emptyPointCollection;
    if (query.data && query.data.length) {
      const features = query.data
        .map(toPointFeature)
        .filter((feature): feature is Feature<Point> => Boolean(feature));
      return { type: "FeatureCollection", features };
    }
    return fallbackPointFeaturesFromEventos(dataset.eventos, linhaId, {
      tipo: "Vegetação",
      color: "#f97316",
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
