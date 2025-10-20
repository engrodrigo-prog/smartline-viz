import { parse } from "csv-parse/sync";
import type { Feature, FeatureCollection, GeoJsonProperties, Point } from "geojson";
import { DOMParser } from "xmldom";
import { kml } from "@tmcw/togeojson";

const BRAZIL_BBOX = "-34,-74.5,5.5,-28.5";
const SOUTH_AMERICA_BBOX = "-90,-180,90,180";

type CsvRecord = Record<string, string>;

const LATITUDE_KEYS = ["latitude", "lat", "y", "latitud", "lat_dd", "latitude_dd"];
const LONGITUDE_KEYS = ["longitude", "lon", "lng", "long", "x", "longitud", "lon_dd", "longitude_dd"];

const normaliseValue = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : trimmed;
  }
  return value;
};

const buildPointFeature = (
  lon: number,
  lat: number,
  properties: GeoJsonProperties,
  id?: string | number
): Feature<Point> => ({
  type: "Feature",
  id,
  geometry: {
    type: "Point",
    coordinates: [lon, lat]
  },
  properties
});

export const parseCSVtoGeoJSON = (csvText: string): FeatureCollection => {
  const records: CsvRecord[] = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  const features: Feature<Point>[] = [];

  records.forEach((record, index) => {
    const entries = Object.entries(record).reduce<Record<string, unknown>>((acc, [key, value]) => {
      acc[key] = normaliseValue(value);
      return acc;
    }, {});

    const keysLower = Object.keys(record).reduce<Record<string, string>>((acc, key) => {
      acc[key.toLowerCase()] = key;
      return acc;
    }, {});

    const latKey = LATITUDE_KEYS.find((key) => keysLower[key]);
    const lonKey = LONGITUDE_KEYS.find((key) => keysLower[key]);

    if (!latKey || !lonKey) {
      return;
    }

    const rawLat = entries[keysLower[latKey]];
    const rawLon = entries[keysLower[lonKey]];

    const lat = typeof rawLat === "number" ? rawLat : Number(rawLat);
    const lon = typeof rawLon === "number" ? rawLon : Number(rawLon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return;
    }

    const properties = { ...entries };
    delete properties[keysLower[latKey]];
    delete properties[keysLower[lonKey]];

    const feature = buildPointFeature(lon, lat, properties, properties.id ?? `csv-${index}`);
    features.push(feature);
  });

  return {
    type: "FeatureCollection",
    features
  };
};

export const parseKMLtoGeoJSON = (kmlText: string): FeatureCollection => {
  const dom = new DOMParser().parseFromString(kmlText, "text/xml");
  const collection = kml(dom) as FeatureCollection;

  const features = (collection.features ?? [])
    .filter((feature): feature is Feature<Point> => feature.geometry?.type === "Point")
    .map((feature, index) => {
      const coordinates = feature.geometry?.coordinates as [number, number] | undefined;
      if (!coordinates) return null;

      const properties = { ...(feature.properties ?? {}) };
      return buildPointFeature(coordinates[0], coordinates[1], properties, properties.id ?? `kml-${index}`);
    })
    .filter((feature): feature is Feature<Point> => Boolean(feature));

  return {
    type: "FeatureCollection",
    features
  };
};

export const ensureBrazilBBOX = (bbox?: string) => {
  if (!bbox) return BRAZIL_BBOX;
  const trimmed = bbox.trim();
  if (!trimmed) return BRAZIL_BBOX;

  if (trimmed.toLowerCase() === "south_america") {
    return SOUTH_AMERICA_BBOX;
  }

  const parts = trimmed.split(",").map((value) => Number(value.trim()));
  if (parts.length !== 4 || parts.some((value) => Number.isNaN(value))) {
    throw new Error("Formato de bbox inválido. Use latMin,lonMin,latMax,lonMax ou 'south_america'.");
  }

  const [latMin, lonMin, latMax, lonMax] = parts;
  if (latMin >= latMax || lonMin >= lonMax) {
    throw new Error("Valores de bbox inválidos. Verifique a ordem latMin,lonMin,latMax,lonMax.");
  }

  return parts.join(",");
};

const formatToMime = (formatHint: "geojson" | "csv" | "kml") => {
  switch (formatHint) {
    case "geojson":
      return "application/json";
    case "csv":
      return "csv";
    case "kml":
      return "application/vnd.google-earth.kml+xml";
    default:
      return "application/json";
  }
};

const toWfsBbox = (bbox: string) => {
  const [latMin, lonMin, latMax, lonMax] = bbox.split(",").map((value) => Number(value));
  return [lonMin, latMin, lonMax, latMax].join(",");
};

export const buildWfsUrl = (
  base: string,
  key: string | undefined | null,
  typename: string,
  bbox: string,
  count: number,
  formatHint: "geojson" | "csv" | "kml"
) => {
  if (!key) {
    throw new Error("FIRMS_WFS_KEY não configurada. Informe a chave em .env antes de consultar a rota.");
  }

  const sanitizedBase = base.replace(/\/+$/, "");
  const baseWithKey = `${sanitizedBase}/${key.replace(/^\//, "")}`;
  const params = new URLSearchParams({
    SERVICE: "WFS",
    REQUEST: "GetFeature",
    VERSION: "2.0.0",
    SRSNAME: "urn:ogc:def:crs:EPSG::4326",
    TYPENAMES: typename,
    COUNT: String(count),
    BBOX: toWfsBbox(bbox)
  });
  const formatMime = formatToMime(formatHint);
  params.set("outputFormat", formatMime);
  params.set("OUTPUTFORMAT", formatMime);

  return `${baseWithKey}?${params.toString()}`;
};
