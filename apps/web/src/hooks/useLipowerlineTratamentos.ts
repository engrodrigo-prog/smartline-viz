import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Feature, FeatureCollection, LineString } from "geojson";
import { getTratamentos, type LipTratamentoFeature } from "@/services/lipowerlineApi";
import { SHOULD_USE_DEMO_API } from "@/lib/demoApi";
import { useDatasetData } from "@/context/DatasetContext";
import { emptyLineCollection, fallbackLineFeaturesFromEventos } from "./lipowerlineFallbacks";

const toLineFeatures = (record: LipTratamentoFeature): Feature<LineString>[] => {
  if (!record.geom) return [];
  if (record.geom.type === "LineString") {
    return [
      {
        type: "Feature",
        geometry: record.geom,
        properties: {
          ...record,
          layerType: "tratado",
          color: "#22c55e",
          opacity: 0.8,
          width: 4,
        },
      },
    ];
  }
  if (record.geom.type === "MultiLineString") {
    return record.geom.coordinates.map((coords) => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: {
        ...record,
        layerType: "tratado",
        color: "#22c55e",
        opacity: 0.8,
        width: 4,
      },
    }));
  }
  if (record.geom.type === "Polygon") {
    return [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: record.geom.coordinates[0] ?? [],
        },
        properties: {
          ...record,
          layerType: "tratado",
          color: "#22c55e",
          opacity: 0.8,
          width: 4,
        },
      },
    ];
  }
  return [];
};

export const useLipowerlineTratamentos = (linhaId?: string, cenarioId?: string) => {
  const dataset = useDatasetData((data) => ({ eventos: data.eventos }));
  const shouldQuery = Boolean(linhaId && cenarioId) && !SHOULD_USE_DEMO_API;

  const query = useQuery<LipTratamentoFeature[]>({
    queryKey: ["lipowerline", "tratamentos", linhaId, cenarioId],
    queryFn: () => getTratamentos(linhaId!, cenarioId!),
    enabled: shouldQuery,
    staleTime: 5 * 60 * 1000,
  });

  const data = useMemo<FeatureCollection<LineString>>(() => {
    if (!linhaId) return emptyLineCollection;
    if (query.data && query.data.length) {
      const features = query.data.flatMap(toLineFeatures);
      return { type: "FeatureCollection", features };
    }
    if (SHOULD_USE_DEMO_API) {
      return fallbackLineFeaturesFromEventos(dataset.eventos, linhaId, {
        tipo: "Eventos",
        color: "#22c55e",
      });
    }
    return emptyLineCollection;
  }, [dataset.eventos, linhaId, query.data]);

  return {
    data,
    isLoading: shouldQuery ? query.isLoading : false,
    error: shouldQuery ? query.error : undefined,
    refetch: query.refetch,
    isFallback: SHOULD_USE_DEMO_API,
  };
};
