import JSZip from "jszip";
import { DOMParser } from "xmldom";
import { kml } from "@tmcw/togeojson";
import LRUCache from "lru-cache";
import type { FeatureCollection } from "geojson";

export type FirmsPreset = "12h" | "24h" | "48h" | "7d";

interface FetchResult {
  collection: FeatureCollection;
  cached: boolean;
  live: boolean;
  source: string;
}

const PRESET_TTL: Record<FirmsPreset, number> = {
  "12h": 60,
  "24h": 120,
  "48h": 180,
  "7d": 300
};

const PRESET_FILES: Record<FirmsPreset, string[]> = {
  "12h": [
    "FirespotArea_south_america_noaa-20-viirs-c2_12h.kmz",
    "FirespotArea_south_america_noaa-20-viirs-c2_24h.kmz"
  ],
  "24h": [
    "FirespotArea_south_america_noaa-20-viirs-c2_24h.kmz"
  ],
  "48h": [
    "FirespotArea_south_america_noaa-20-viirs-c2_48h.kmz",
    "FirespotArea_south_america_noaa-20-viirs-c2_24h.kmz"
  ],
  "7d": [
    "FirespotArea_south_america_noaa-20-viirs-c2_7d.kmz",
    "FirespotArea_south_america_noaa-20-viirs-c2_48h.kmz"
  ]
};

const SENSOR_ROOT = "api/kml_fire_footprints/south_america";

const cache = new LRUCache<string, FeatureCollection>({
  max: 8,
  ttl: 1000 * 300
});

const cacheKey = (preset: FirmsPreset) => `firms:${preset}`;

const mockCollection: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-46.334, -23.965]
      },
      properties: {
        id: "mock-1",
        source: "mock",
        confidence: 35,
        brightness: 295.2,
        satellite: "VIIRS",
        detected_at: new Date().toISOString(),
        preset: "24h"
      }
    },
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-46.181, -24.112]
      },
      properties: {
        id: "mock-2",
        source: "mock",
        confidence: 60,
        brightness: 312.6,
        satellite: "NOAA-20",
        detected_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        preset: "24h"
      }
    }
  ]
};

const isKmzResponse = (contentType: string | null, url: string) =>
  Boolean(contentType && contentType.includes("zip")) || url.endsWith(".kmz");

const parseKmlToGeoJson = (kmlString: string, preset: FirmsPreset): FeatureCollection => {
  const dom = new DOMParser().parseFromString(kmlString, "text/xml");
  const geojson = kml(dom) as FeatureCollection;

  const features = (geojson.features || [])
    .filter((feature) => Boolean(feature.geometry))
    .map((feature, index) => ({
      ...feature,
      properties: normaliseProperties(feature.properties ?? {}, preset, index)
    }));

  return {
    type: "FeatureCollection",
    features
  };
};

const parseConfidence = (value: unknown): number | undefined => {
  const candidate =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isFinite(candidate) ? Number(candidate) : undefined;
};

const parseBrightness = (value: unknown): number | undefined => parseConfidence(value);

const parseDateTime = (props: Record<string, unknown>): string => {
  const now = new Date();

  const dateValue =
    props.acq_date ??
    props.ACQ_DATE ??
    props.acqDate ??
    props.detect_date ??
    props.DETECT_DATE ??
    props.date;

  const timeValue =
    props.acq_time ??
    props.ACQ_TIME ??
    props.acqTime ??
    props.detect_time ??
    props.DETECT_TIME ??
    props.time;

  if (typeof dateValue === "string") {
    const normalisedTime =
      typeof timeValue === "number"
        ? timeValue.toString().padStart(4, "0")
        : typeof timeValue === "string"
          ? timeValue.padStart(4, "0")
          : "0000";
    const hours = normalisedTime.slice(0, 2);
    const minutes = normalisedTime.slice(2, 4);

    const iso = new Date(`${dateValue}T${hours}:${minutes}:00Z`);
    if (!Number.isNaN(iso.getTime())) {
      return iso.toISOString();
    }
  }

  if (typeof props.detected_at === "string") {
    const isoCandidate = new Date(props.detected_at);
    if (!Number.isNaN(isoCandidate.getTime())) {
      return isoCandidate.toISOString();
    }
  }

  return now.toISOString();
};

const normaliseProperties = (props: Record<string, unknown>, preset: FirmsPreset, index: number) => {
  const confidence =
    parseConfidence(props.confidence) ??
    parseConfidence(props.CONFIDENCE) ??
    parseConfidence(props.Confidence);

  const brightness =
    parseBrightness(props.brightness) ??
    parseBrightness(props.BRIGHTNESS) ??
    parseBrightness(props.Intensity) ??
    parseBrightness(props.intensity);

  const satellite =
    (props.satellite as string) ??
    (props.Satellite as string) ??
    (props.PLATFORM as string) ??
    (props.platform as string) ??
    (props.Sensor as string) ??
    (props.sensor as string) ??
    "FIRMS";

  return {
    ...props,
    id: (props.id as string) ?? `firms-${preset}-${index}`,
    preset,
    detected_at: parseDateTime(props),
    confidence,
    brightness,
    satellite,
    source: (props.source as string) ?? "FIRMS/NASA"
  };
};

const downloadKmz = async (response: Response) => {
  const buffer = Buffer.from(await response.arrayBuffer());
  const zip = await JSZip.loadAsync(buffer);
  const kmlFile = zip.file(/\.kml$/i)?.[0];
  if (!kmlFile) {
    return null;
  }
  return kmlFile.async("string");
};

const tryDownloadPreset = async (
  preset: FirmsPreset,
  baseUrl: string
): Promise<{ geojson: FeatureCollection; source: string } | null> => {
  const filenames = PRESET_FILES[preset] ?? PRESET_FILES["24h"];
  const sanitizedBase = baseUrl.replace(/\/$/, "");

  for (const filename of filenames) {
    const url = `${sanitizedBase}/${SENSOR_ROOT}/${preset}/${filename}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        continue;
      }

      const contentType = response.headers.get("content-type");
      const payload = isKmzResponse(contentType, url)
        ? await downloadKmz(response)
        : await response.text();

      if (!payload) {
        continue;
      }

      const geojson = parseKmlToGeoJson(payload, preset);
      return { geojson, source: url };
    } catch (error) {
      console.warn(`FIRMS download failed for ${url}:`, error);
    }
  }

  return null;
};

export const fetchFirmsGeoJson = async (
  preset: FirmsPreset,
  baseUrl: string
): Promise<FetchResult> => {
  const key = cacheKey(preset);
  const cached = cache.get(key);
  if (cached) {
    return { collection: cached, cached: true, live: true, source: "cache" };
  }

  const downloaded = await tryDownloadPreset(preset, baseUrl);
  if (downloaded) {
    cache.set(key, downloaded.geojson, { ttl: PRESET_TTL[preset] * 1000 });
    return { collection: downloaded.geojson, cached: false, live: true, source: downloaded.source };
  }

  const mocked = {
    ...mockCollection,
    features: mockCollection.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        preset
      }
    }))
  };

  cache.set(key, mocked, { ttl: PRESET_TTL[preset] * 1000 });
  return { collection: mocked, cached: false, live: false, source: "mock" };
};
