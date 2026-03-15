import { useQuery } from "@tanstack/react-query";
import { getJSON } from "@/services/api";
import {
  mapDashboardGeoRow,
  type DashboardGeoFeature,
  type DashboardGeoFeatureRow,
  type GeoAssetType,
  type GeoDashboardContext,
} from "@/lib/geodata";

type GeodataTable =
  | "all"
  | "estruturas"
  | "linhas_transmissao"
  | "concessoes_geo"
  | "eventos_geo"
  | "geodata_outros"
  | "rasters";

interface UseGeodataQueryOptions {
  table?: GeodataTable;
  context?: GeoDashboardContext;
  filters?: {
    empresa?: string;
    regiao?: string;
    lineCode?: string;
    layerSource?: string;
    assetType?: GeoAssetType;
    geometryKinds?: string[];
  };
  enabled?: boolean;
  requireGeometry?: boolean;
}

type GeodataDashboardApiResponse = {
  items: DashboardGeoFeatureRow[];
  degraded?: boolean;
  source?: string;
};

export function useGeodataQuery({
  table = "all",
  context,
  filters = {},
  enabled = true,
  requireGeometry = false,
}: UseGeodataQueryOptions) {
  return useQuery<DashboardGeoFeature[]>({
    queryKey: ["dashboard-geodata", table, context, filters, requireGeometry],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams();

      if (table !== "all") params.set("table", table);
      if (context) params.set("context", context);
      if (filters.empresa) params.set("empresa", filters.empresa);
      if (filters.regiao) params.set("regiao", filters.regiao);
      if (filters.lineCode) params.set("lineCode", filters.lineCode);
      if (filters.layerSource) params.set("layerSource", filters.layerSource);
      if (filters.assetType) params.set("assetType", filters.assetType);
      if (filters.geometryKinds?.length) params.set("geometryKinds", filters.geometryKinds.join(","));
      if (requireGeometry) params.set("requireGeometry", "true");

      const suffix = params.toString();
      const response = await getJSON<GeodataDashboardApiResponse>(
        `/geodata/dashboard${suffix ? `?${suffix}` : ""}`,
      );

      return (response.items ?? []).map(mapDashboardGeoRow);
    },
    retry: false,
  });
}
