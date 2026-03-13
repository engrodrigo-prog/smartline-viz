import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
      if (!supabase) {
        console.warn("[useGeodataQuery] Supabase não configurado; retornando lista vazia de geodados.");
        return [];
      }

      let query = (supabase as any)
        .from("vw_dashboard_geo_features")
        .select("*")
        .order("created_at", { ascending: false });

      if (table !== "all") {
        query = query.eq("source_table", table);
      }

      if (context) {
        query = query.contains("dashboard_contexts", [context]);
      }

      if (filters.empresa) {
        query = query.eq("company_name", filters.empresa);
      }

      if (filters.regiao) {
        query = query.eq("region_code", filters.regiao);
      }

      if (filters.lineCode) {
        query = query.eq("line_code", filters.lineCode);
      }

      if (filters.layerSource) {
        query = query.eq("layer_source", filters.layerSource);
      }

      if (filters.assetType) {
        query = query.eq("asset_type", filters.assetType);
      }

      if (filters.geometryKinds?.length) {
        query = query.in("geometry_kind", filters.geometryKinds);
      }

      if (requireGeometry) {
        query = query.not("geom_geojson", "is", null);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return ((data ?? []) as DashboardGeoFeatureRow[]).map(mapDashboardGeoRow);
    },
  });
}
