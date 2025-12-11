import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Feature, FeatureCollection, Point } from "geojson";
import { getCruzamentos, type LipCruzamentoFeature } from "@/services/lipowerlineApi";
import { SHOULD_USE_DEMO_API } from "@/lib/demoApi";
import { useDatasetData } from "@/context/DatasetContext";
import { emptyPointCollection, fallbackPointFeaturesFromEventos } from "./lipowerlineFallbacks";

const toPointFeature = (record: LipCruzamentoFeature): Feature<Point> | null => {
  if (!record.geom) return null;
  if (record.geom.type === "Point") {
    return {
      type: "Feature",
      geometry: record.geom,
      properties: {
        ...record,
        layerType: "cruzamento",
        color: "#0ea5e9",
      },
    };
  }
  if (record.geom.type === "MultiLineString" || record.geom.type === "LineString") {
    const coords = record.geom.coordinates;
    const first = Array.isArray(coords[0]) ? coords[0][0] : coords[0];
    if (!first) return null;
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: first as [number, number] },
      properties: {
        ...record,
        layerType: "cruzamento",
        color: "#0ea5e9",
      },
    };
  }
  return null;
};

export const useLipowerlineCruzamentos = (linhaId?: string, cenarioId?: string) => {
  const dataset = useDatasetData((data) => ({ eventos: data.eventos }));
  const shouldQuery = Boolean(linhaId) && !SHOULD_USE_DEMO_API;

  const query = useQuery<LipCruzamentoFeature[]>({
    queryKey: ["lipowerline", "cruzamentos", linhaId, cenarioId],
    queryFn: () => getCruzamentos(linhaId!, cenarioId),
    enabled: shouldQuery,
    staleTime: 5 * 60 * 1000,
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
      tipo: "Travessias",
      color: "#0ea5e9",
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
