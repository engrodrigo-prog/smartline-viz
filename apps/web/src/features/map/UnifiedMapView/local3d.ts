import type { Feature, FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from "geojson";

export type Local3DGeometry = Polygon | MultiPolygon;

export type Local3DLayer = {
  id: string;
  name: string;
  visible: boolean;
  color: string;
  featureCount: number;
  sourceFileName: string;
  data: FeatureCollection<Local3DGeometry, GeoJsonProperties>;
};

const DEFAULT_HEIGHT = 18;
const DEFAULT_COLOR = "#f97316";
const COLOR_PALETTE = ["#f97316", "#0ea5e9", "#22c55e", "#a855f7", "#eab308", "#ef4444"];
const HEIGHT_KEYS = ["height", "altura", "altura_m", "alturaMax", "extrusionHeight", "z", "h"];
const BASE_KEYS = ["base_height", "min_height", "altura_base", "base", "elevation", "z_base"];
const LEVEL_KEYS = ["levels", "building:levels", "num_floors", "floors", "pavimentos"];
const COLOR_KEYS = ["color", "cor", "fill", "fillColor", "extrusionColor"];

const isPolygonFeature = (feature: Feature): feature is Feature<Local3DGeometry, GeoJsonProperties> =>
  feature.geometry?.type === "Polygon" || feature.geometry?.type === "MultiPolygon";

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = Number(value.replace(",", "."));
    return Number.isFinite(normalized) ? normalized : null;
  }
  return null;
};

const readNumericProperty = (properties: GeoJsonProperties, keys: string[]) => {
  for (const key of keys) {
    const parsed = toNumber(properties?.[key]);
    if (parsed !== null) return parsed;
  }
  return null;
};

const readColorProperty = (properties: GeoJsonProperties) => {
  for (const key of COLOR_KEYS) {
    const value = properties?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const inferHeight = (properties: GeoJsonProperties) => {
  const directHeight = readNumericProperty(properties, HEIGHT_KEYS);
  if (directHeight !== null) return clamp(directHeight, 3, 400);

  const levels = readNumericProperty(properties, LEVEL_KEYS);
  if (levels !== null) return clamp(levels * 3.2, 3, 400);

  return DEFAULT_HEIGHT;
};

const inferBaseHeight = (properties: GeoJsonProperties) => {
  const base = readNumericProperty(properties, BASE_KEYS);
  return base !== null ? clamp(base, 0, 300) : 0;
};

const normalizeProperties = (properties: GeoJsonProperties, fallbackColor: string): GeoJsonProperties => ({
  ...(properties ?? {}),
  extrusionHeight: inferHeight(properties ?? {}),
  baseHeight: inferBaseHeight(properties ?? {}),
  extrusionColor: readColorProperty(properties ?? {}) ?? fallbackColor,
});

const sanitizeId = (raw: string) =>
  raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

const pickColor = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return COLOR_PALETTE[hash % COLOR_PALETTE.length] ?? DEFAULT_COLOR;
};

const normalizeFeatureCollection = (input: unknown): FeatureCollection<Local3DGeometry, GeoJsonProperties> => {
  if (!input || typeof input !== "object") {
    throw new Error("Arquivo inválido. Envie um GeoJSON com FeatureCollection.");
  }

  const candidate = input as FeatureCollection;
  if (candidate.type === "FeatureCollection" && Array.isArray(candidate.features)) {
    const polygonFeatures = candidate.features.filter(isPolygonFeature);
    if (polygonFeatures.length === 0) {
      throw new Error("A camada precisa conter polígonos ou multipolígonos para extrusão 3D.");
    }
    return {
      type: "FeatureCollection",
      features: polygonFeatures,
    };
  }

  if ((input as Feature).type === "Feature" && isPolygonFeature(input as Feature)) {
    return {
      type: "FeatureCollection",
      features: [input as Feature<Local3DGeometry, GeoJsonProperties>],
    };
  }

  throw new Error("GeoJSON não suportado. Use FeatureCollection ou Feature de polígonos.");
};

export const parseLocal3DFile = async (file: File): Promise<Local3DLayer> => {
  const content = await file.text();
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Não foi possível interpretar o arquivo como JSON/GeoJSON.");
  }

  const featureCollection = normalizeFeatureCollection(parsed);
  const fallbackColor = pickColor(file.name);
  const normalizedData: FeatureCollection<Local3DGeometry, GeoJsonProperties> = {
    type: "FeatureCollection",
    features: featureCollection.features.map((feature, index) => ({
      ...feature,
      id: feature.id ?? `${sanitizeId(file.name)}-${index + 1}`,
      properties: normalizeProperties(feature.properties ?? {}, fallbackColor),
    })),
  };

  const sourceName = file.name.replace(/\.(geojson|json)$/i, "");

  return {
    id: `local-3d-${sanitizeId(sourceName)}-${Date.now()}`,
    name: sourceName || "Camada 3D local",
    visible: true,
    color: fallbackColor,
    featureCount: normalizedData.features.length,
    sourceFileName: file.name,
    data: normalizedData,
  };
};
