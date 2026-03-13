import type {
  Feature,
  Geometry,
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
} from "geojson";

export type GeoAssetType = "vector" | "raster";

export type GeoDashboardContext =
  | "dashboard"
  | "ambiental"
  | "vegetacao"
  | "operacao"
  | "estrutura"
  | "mapa";

export type DashboardGeoFeatureRow = {
  layer_source: string;
  source_table: string;
  source_id: string;
  title: string;
  asset_type: GeoAssetType;
  geometry_kind: string;
  dashboard_contexts: string[] | null;
  company_name: string | null;
  region_code: string | null;
  line_code: string | null;
  style_json: Record<string, unknown> | string | null;
  properties: Record<string, unknown> | string | null;
  geom_geojson: Geometry | string | null;
  created_at: string | null;
};

export type DashboardGeoFeature = {
  layerSource: string;
  sourceTable: string;
  sourceId: string;
  title: string;
  assetType: GeoAssetType;
  geometryKind: string;
  dashboardContexts: string[];
  companyName: string | null;
  regionCode: string | null;
  lineCode: string | null;
  style: Record<string, unknown>;
  properties: Record<string, unknown>;
  geometry: Geometry | null;
  createdAt: string | null;
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" ? (value as Record<string, unknown>) : {};
};

const asGeometry = (value: unknown): Geometry | null => {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Geometry;
    } catch {
      return null;
    }
  }
  return typeof value === "object" ? (value as Geometry) : null;
};

const readString = (value: unknown) => (typeof value === "string" && value.trim().length ? value : undefined);

const readNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

const baseProps = (feature: DashboardGeoFeature) => ({
  title: feature.title,
  sourceId: feature.sourceId,
  sourceTable: feature.sourceTable,
  layerSource: feature.layerSource,
  assetType: feature.assetType,
  lineCode: feature.lineCode ?? undefined,
});

export const mapDashboardGeoRow = (row: DashboardGeoFeatureRow): DashboardGeoFeature => ({
  layerSource: row.layer_source,
  sourceTable: row.source_table,
  sourceId: row.source_id,
  title: row.title,
  assetType: row.asset_type,
  geometryKind: row.geometry_kind,
  dashboardContexts: row.dashboard_contexts ?? [],
  companyName: row.company_name,
  regionCode: row.region_code,
  lineCode: row.line_code,
  style: asRecord(row.style_json),
  properties: asRecord(row.properties),
  geometry: asGeometry(row.geom_geojson),
  createdAt: row.created_at,
});

export const explodePointFeatures = (features: DashboardGeoFeature[]): Feature<Point>[] =>
  features.flatMap((feature) => {
    if (!feature.geometry) return [];

    const color =
      readString(feature.style.color) ??
      (feature.assetType === "raster" ? "#15803d" : feature.sourceTable === "estruturas" ? "#2563eb" : "#f97316");
    const size = readNumber(feature.style.radius) ?? (feature.sourceTable === "estruturas" ? 6 : 7);
    const properties = {
      ...baseProps(feature),
      ...feature.properties,
      color,
      size,
    };

    if (feature.geometry.type === "Point") {
      return [{ type: "Feature", geometry: feature.geometry, properties }];
    }

    if (feature.geometry.type === "MultiPoint") {
      return (feature.geometry as MultiPoint).coordinates.map((coordinates) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates },
        properties,
      }));
    }

    return [];
  });

export const explodeLineFeatures = (features: DashboardGeoFeature[]): Feature<LineString>[] =>
  features.flatMap((feature) => {
    if (!feature.geometry) return [];

    const color = readString(feature.style.color) ?? "#0284c7";
    const width = readNumber(feature.style.width) ?? 3;
    const opacity = readNumber(feature.style.opacity) ?? 0.9;
    const properties = {
      ...baseProps(feature),
      ...feature.properties,
      color,
      width,
      opacity,
    };

    if (feature.geometry.type === "LineString") {
      return [{ type: "Feature", geometry: feature.geometry, properties }];
    }

    if (feature.geometry.type === "MultiLineString") {
      return (feature.geometry as MultiLineString).coordinates.map((coordinates) => ({
        type: "Feature" as const,
        geometry: { type: "LineString" as const, coordinates },
        properties,
      }));
    }

    return [];
  });

export const explodePolygonFeatures = (features: DashboardGeoFeature[]): Feature<Polygon>[] =>
  features.flatMap((feature) => {
    if (!feature.geometry) return [];

    const stats = asRecord(feature.properties.stats);
    const ndvi =
      readNumber(feature.properties.ndvi_mean) ??
      readNumber(stats.ndvi_mean) ??
      readNumber(feature.properties.ndvi);
    const color = readString(feature.style.fill) ?? readString(feature.style.color);
    const fillOpacity = readNumber(feature.style.fillOpacity) ?? (feature.assetType === "raster" ? 0.24 : 0.18);
    const strokeColor = readString(feature.style.stroke) ?? "#0f172a";
    const strokeWidth = readNumber(feature.style.strokeWidth) ?? 1.25;
    const properties = {
      ...baseProps(feature),
      ...feature.properties,
      ...(color ? { color } : {}),
      ...(typeof ndvi === "number" ? { ndvi } : {}),
      fillOpacity,
      strokeColor,
      strokeWidth,
    };

    if (feature.geometry.type === "Polygon") {
      return [{ type: "Feature", geometry: feature.geometry, properties }];
    }

    if (feature.geometry.type === "MultiPolygon") {
      return (feature.geometry as MultiPolygon).coordinates.map((coordinates) => ({
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates },
        properties,
      }));
    }

    return [];
  });
