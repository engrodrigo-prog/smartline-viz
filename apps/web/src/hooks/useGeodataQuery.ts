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
    lineName?: string;
    tensaoKv?: string;
    dateFrom?: string;
    dateTo?: string;
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
      if (filters.lineName) params.set("lineName", filters.lineName);
      if (filters.tensaoKv) params.set("tensaoKv", filters.tensaoKv);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (filters.layerSource) params.set("layerSource", filters.layerSource);
      if (filters.assetType) params.set("assetType", filters.assetType);
      if (filters.geometryKinds?.length) params.set("geometryKinds", filters.geometryKinds.join(","));
      if (requireGeometry) params.set("requireGeometry", "true");

      const suffix = params.toString();
      const response = await getJSON<GeodataDashboardApiResponse>(
        `/geodata/dashboard${suffix ? `?${suffix}` : ""}`,
      );

      return (response.items ?? [])
        .map(mapDashboardGeoRow)
        .filter((item) => {
          if (filters.lineName && !(item.lineName ?? item.title).toLowerCase().includes(filters.lineName.toLowerCase())) {
            return false;
          }
          if (filters.tensaoKv && (item.voltageKv ?? "") !== filters.tensaoKv) {
            return false;
          }
          if (filters.dateFrom && item.referenceDate) {
            const value = new Date(item.referenceDate);
            const min = new Date(filters.dateFrom);
            if (!Number.isNaN(value.getTime()) && !Number.isNaN(min.getTime()) && value < min) {
              return false;
            }
          }
          if (filters.dateTo && item.referenceDate) {
            const value = new Date(item.referenceDate);
            const max = new Date(filters.dateTo);
            if (!Number.isNaN(value.getTime()) && !Number.isNaN(max.getTime()) && value > max) {
              return false;
            }
          }
          return true;
        });
    },
    retry: false,
  });
}
