import { Hono } from "hono";
import NodeCache from "node-cache";
import type { Feature, FeatureCollection, LineString, Polygon } from "geojson";
import {
  booleanPointInPolygon,
  centroid,
  featureCollection as turfFeatureCollection,
  point as turfPoint,
  pointToLineDistance
} from "@turf/turf";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { env } from "../env.js";
import { buildWfsUrl, ensureBrazilBBOX, parseCSVtoGeoJSON, parseKMLtoGeoJSON } from "../lib/geo.js";
import {
  bearingToToward,
  buildWindCone,
  lineCorridor,
  timeToLineHours,
  riskScore,
  intersectsCorridor,
  estimateWindSpeedAtHeight
} from "../lib/wind.js";
import { getWindData } from "./weather.js";

type FirmsFormat = "geojson" | "csv" | "kml";

type FirmsResponse = FeatureCollection & {
  meta: {
    typenames: string[];
    bbox: string;
    count: number;
    source: string;
    cached: boolean;
    lastFetchedAt: string;
    formatAttempt: FirmsFormat[];
  };
};

const cacheTtl = Number.isFinite(env.FIRMS_CACHE_TTL_SEC) ? env.FIRMS_CACHE_TTL_SEC : 600;
const cache = new NodeCache({ stdTTL: cacheTtl, checkperiod: Math.max(30, Math.floor(cacheTtl / 2)) });

const isFirmsFormat = (value: string): value is FirmsFormat =>
  value === "geojson" || value === "csv" || value === "kml";

const normaliseTypenames = (value?: string | null) =>
  (value ? value.split(",") : env.FIRMS_DEFAULT_TYPENAMES)
    .map((item) => item.trim())
    .filter(Boolean);

const dedupeFeatures = (features: Feature[]): Feature[] => {
  const seen = new Set<string>();
  return features.filter((feature) => {
    const key = JSON.stringify(feature.geometry) + JSON.stringify(feature.properties);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const fetchGeoJson = async (url: string) => {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`WFS respondeu ${response.status}`);
  }
  const data = (await response.json()) as FeatureCollection;
  if (!data?.features) {
    throw new Error("Payload GeoJSON inválido");
  }
  return data;
};

const fetchCsv = async (url: string) => {
  const response = await fetch(url, { headers: { Accept: "text/csv" } });
  if (!response.ok) {
    throw new Error(`WFS CSV respondeu ${response.status}`);
  }
  const text = await response.text();
  return parseCSVtoGeoJSON(text);
};

const fetchKml = async (url: string) => {
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.google-earth.kml+xml, application/xml, text/xml" }
  });
  if (!response.ok) {
    throw new Error(`WFS KML respondeu ${response.status}`);
  }
  const text = await response.text();
  return parseKMLtoGeoJSON(text);
};

const tryFetchWithFallback = async (
  baseUrl: string,
  key: string,
  typename: string,
  bbox: string,
  count: number,
  formats: FirmsFormat[]
) => {
  for (const format of formats) {
    try {
      const url = buildWfsUrl(baseUrl, key, typename, bbox, count, format);
      const loggerMsg = url.replace(key, "***");
      console.info(`[firms] requisitando ${loggerMsg}`);

      if (format === "geojson") {
        return { collection: await fetchGeoJson(url), format };
      }
      if (format === "csv") {
        return { collection: await fetchCsv(url), format };
      }
      return { collection: await fetchKml(url), format };
    } catch (error) {
      console.warn(`[firms] falha ao baixar ${typename} em ${format}:`, error);
    }
  }

  throw new Error(`Não foi possível obter dados para ${typename}`);
};

const loadFirmsCollection = async (
  baseUrl: string,
  key: string,
  typenames: string[],
  bbox: string,
  count: number,
  formats: FirmsFormat[]
) => {
  const aggregated: Feature[] = [];
  const attemptedFormats = new Set<FirmsFormat>();

  for (const typename of typenames) {
    try {
      const { collection, format } = await tryFetchWithFallback(baseUrl, key, typename, bbox, count, formats);
      attemptedFormats.add(format);
      const features = (collection.features ?? [])
        .filter((feature): feature is Feature => Boolean(feature.geometry))
        .map((feature) => ({
          ...feature,
          properties: {
            ...(feature.properties ?? {}),
            typename
          }
        }));
      aggregated.push(...features);
    } catch (error) {
      console.error(`[firms] não foi possível obter ${typename}:`, error);
    }
  }

  if (aggregated.length === 0) {
    throw new Error("Não foi possível obter dados do FIRMS WFS.");
  }

  const deduped = dedupeFeatures(aggregated);
  return { features: deduped, attemptedFormats };
};

const LINE_ASSETS: Record<string, string> = {
  ramal_marape: join(process.cwd(), "apps/api/assets/ramal_marape.geojson")
};

const normaliseId = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_");

const loadLineAsset = (lineId: string) => {
  const normalised = normaliseId(lineId);
  const assetPath = LINE_ASSETS[normalised];
  if (!assetPath) {
    throw new Error(`Linha '${lineId}' não cadastrada.`);
  }
  const raw = readFileSync(assetPath, "utf-8");
  const data = JSON.parse(raw) as FeatureCollection;
  return data;
};

const ensureLineFeature = (
  linha: Feature<LineString> | FeatureCollection | null | undefined
): { collection: FeatureCollection; feature: Feature<LineString> } => {
  if (!linha) {
    throw new Error("Linha não informada.");
  }

  const collection =
    (linha as FeatureCollection)?.type === "FeatureCollection"
      ? (linha as FeatureCollection)
      : turfFeatureCollection([linha as Feature<LineString>]);

  const feature = collection.features.find((feat) => feat.geometry?.type === "LineString") as
    | Feature<LineString>
    | undefined;

  if (!feature) {
    throw new Error("Linha inválida ou sem geometria LineString.");
  }

  return { collection, feature };
};

const resolveLineInput = (
  lineId?: string,
  linha?: FeatureCollection | Feature<LineString>
): { collection: FeatureCollection; feature: Feature<LineString> } => {
  if (linha) {
    return ensureLineFeature(linha);
  }
  if (lineId) {
    const asset = loadLineAsset(lineId);
    return ensureLineFeature(asset as FeatureCollection);
  }
  throw new Error("Informe lineId ou linha.");
};

const parseFrp = (properties: Record<string, any>) => {
  const candidate = properties?.frp ?? properties?.FRP ?? properties?.FRP_MW;
  const value = Number(candidate ?? 0);
  return Number.isFinite(value) ? value : 0;
};

const selectWindSample = (
  hours: number,
  weather: Awaited<ReturnType<typeof getWindData>>,
  baseTimestamp: number
) => {
  const fallback = {
    wind_speed: Number(weather.current?.wind_speed ?? 0),
    wind_deg: Number(weather.current?.wind_deg ?? 0),
    dt: Number(weather.current?.dt ?? baseTimestamp)
  };

  if (hours <= 0 || !Array.isArray(weather.hourly) || weather.hourly.length === 0) {
    return fallback;
  }

  const target = baseTimestamp + hours * 3600;
  let best = weather.hourly[0];
  let bestDiff = Math.abs((weather.hourly[0]?.dt ?? target) - target);

  for (const sample of weather.hourly) {
    const diff = Math.abs((sample?.dt ?? target) - target);
    if (diff < bestDiff) {
      best = sample;
      bestDiff = diff;
    }
  }

  return {
    wind_speed: Number(best?.wind_speed ?? fallback.wind_speed ?? 0),
    wind_deg: Number(best?.wind_deg ?? fallback.wind_deg ?? 0),
    dt: Number(best?.dt ?? target)
  };
};

export const firmsRoutes = new Hono();

firmsRoutes.get("/wfs", async (c) => {
  const bboxParam = c.req.query("bbox");
  const typenamesRaw = c.req.query("typenames");
  const countParam = c.req.query("count");
  const formatParam = (c.req.query("format") ?? "auto").toLowerCase();

  let bbox: string;
  try {
    bbox = ensureBrazilBBOX(bboxParam);
  } catch (error: any) {
    return c.json({ error: error?.message ?? "BBox inválido" }, 400);
  }

  const typenames = normaliseTypenames(typenamesRaw);
  if (typenames.length === 0) {
    return c.json({ error: "Informe ao menos um typename." }, 400);
  }

  const count = Math.max(1, Math.min(10000, Number(countParam ?? (env.FIRMS_DEFAULT_COUNT ?? 5000))));
  const formats: FirmsFormat[] =
    formatParam === "auto"
      ? ["geojson", "csv", "kml"]
      : isFirmsFormat(formatParam)
        ? [formatParam]
        : ["geojson", "csv", "kml"];

  if (!env.FIRMS_WFS_KEY) {
    return c.json({ error: "FIRMS_WFS_KEY não configurada. Atualize o .env e reinicie a API." }, 400);
  }

  const cacheKey = `${typenames.sort().join("|")}|${bbox}|${count}`;
  const cached = cache.get<FirmsResponse>(cacheKey);
  if (cached) {
    return c.json({
      ...cached,
      meta: { ...cached.meta, cached: true }
    });
  }

  let deduped: Feature[] = [];
  let attemptedFormats: Set<FirmsFormat> = new Set();
  try {
    const result = await loadFirmsCollection(
      env.FIRMS_WFS_BASE,
      env.FIRMS_WFS_KEY,
      typenames,
      bbox,
      count,
      formats
    );
    deduped = result.features;
    attemptedFormats = result.attemptedFormats;
  } catch (error: any) {
    return c.json(
      {
        error: error?.message ?? "Não foi possível obter dados do FIRMS WFS."
      },
      502
    );
  }

  const response: FirmsResponse = {
    type: "FeatureCollection",
    features: deduped,
    meta: {
      typenames,
      bbox,
      count,
      source: "FIRMS WFS",
      cached: false,
      lastFetchedAt: new Date().toISOString(),
      formatAttempt: Array.from(attemptedFormats)
    }
  };

  cache.set(cacheKey, response);

  return c.json(response);
});

type FirmsRiskBody = {
  lineId?: string;
  linha?: FeatureCollection | Feature<LineString>;
  horizons?: number[];
  count?: number;
  debugCone?: boolean;
  windHeight?: number; // altura desejada para vento (m), ex: 10 ou 100
};

firmsRoutes.post("/risk", async (c) => {
  const body = (await c.req.json().catch(() => null)) as FirmsRiskBody | null;

  const horizonsRaw = Array.isArray(body?.horizons) ? body?.horizons ?? [] : [];
  const uniqueHorizons = Array.from(
    new Set(
      (horizonsRaw.length ? horizonsRaw : [0, 3, 6, 24])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value >= 0)
    )
  ).sort((a, b) => a - b);

  if (uniqueHorizons.length === 0) {
    uniqueHorizons.push(0, 3, 6, 24);
  }

  const count = Math.max(1, Math.min(10000, Number(body?.count ?? env.FIRMS_DEFAULT_COUNT ?? 2000)));
  const typenames = env.FIRMS_DEFAULT_TYPENAMES;
  const bbox = ensureBrazilBBOX(undefined);
  const formats: FirmsFormat[] = ["geojson", "csv", "kml"];

  if (!env.FIRMS_WFS_KEY) {
    return c.json({ error: "FIRMS_WFS_KEY não configurada." }, 400);
  }

  let lineInfo;
  try {
    lineInfo = resolveLineInput(body?.lineId ?? "ramal_marape", body?.linha as any);
  } catch (error: any) {
    return c.json({ error: error?.message ?? "Linha inválida." }, 400);
  }

  const bufferMeters = Number.isFinite(env.QUEIMADAS_LINE_BUFFER_M) ? env.QUEIMADAS_LINE_BUFFER_M : 200;
  const coneHalfAngle = Number.isFinite(env.QUEIMADAS_CONE_HALF_ANGLE_DEG)
    ? env.QUEIMADAS_CONE_HALF_ANGLE_DEG
    : 30;

  const cacheKey = `${typenames.sort().join("|")}|${bbox}|${count}`;
  let baseFeatures: Feature[] = [];

  const cached = cache.get<FirmsResponse>(cacheKey);
  if (cached?.features?.length) {
    baseFeatures = cached.features.slice(0, count);
  } else {
    try {
      const result = await loadFirmsCollection(env.FIRMS_WFS_BASE, env.FIRMS_WFS_KEY, typenames, bbox, count, formats);
      baseFeatures = result.features;
    } catch (error: any) {
      return c.json({ error: error?.message ?? "Não foi possível obter dados do FIRMS." }, 502);
    }
  }

  const corridor = lineCorridor(lineInfo.collection, bufferMeters);
  const lineFeature = lineInfo.feature;
  const center = centroid(lineInfo.collection as any);
  const [centerLon, centerLat] = center.geometry.coordinates as [number, number];

  const requestedHeightRaw = Number(body?.windHeight);
  const requestedHeight = Number.isFinite(requestedHeightRaw) && requestedHeightRaw > 0 ? requestedHeightRaw : undefined;
  const riskHeight = requestedHeight ?? 100;

  const fetchHeights = new Set<number>([10, 100, riskHeight]);
  const weatherByHeight = new Map<number, Awaited<ReturnType<typeof getWindData>>>();

  for (const height of Array.from(fetchHeights).sort((a, b) => a - b)) {
    try {
      const weatherPayload = await getWindData(centerLat, centerLon, height);
      weatherByHeight.set(height, weatherPayload);
    } catch (error: any) {
      console.warn(`[firms] falha ao buscar vento para altura ${height}m:`, error?.message ?? error);
    }
  }

  if (weatherByHeight.size === 0) {
    return c.json({ error: "Não foi possível obter dados de vento para a localização informada." }, 502);
  }

  const riskWeather =
    weatherByHeight.get(riskHeight) ??
    weatherByHeight.get(100) ??
    weatherByHeight.get(10) ??
    weatherByHeight.values().next().value;

  if (!riskWeather) {
    return c.json({ error: "Dados de vento indisponíveis." }, 502);
  }

  const riskBaseTimestamp = Number(riskWeather.current?.dt ?? Math.floor(Date.now() / 1000));

  const windByHorizon = new Map<number, { speed: number; deg: number; toward: number; dt: number }>();
  const profileRecorder = new Map<number, Map<number, { wind_speed: number; wind_deg: number; dt: number }>>();

  const ensureProfileMap = (horizon: number) => {
    if (!profileRecorder.has(horizon)) {
      profileRecorder.set(horizon, new Map());
    }
    return profileRecorder.get(horizon)!;
  };

  for (const horizon of uniqueHorizons) {
    const riskSample = selectWindSample(horizon, riskWeather, riskBaseTimestamp);
    const toward = bearingToToward(riskSample.wind_deg ?? 0);
    windByHorizon.set(horizon, {
      speed: Number(riskSample.wind_speed ?? 0),
      deg: Number(riskSample.wind_deg ?? 0),
      toward,
      dt: Number(riskSample.dt ?? riskBaseTimestamp)
    });

    for (const [height, weatherPayload] of weatherByHeight.entries()) {
      const baseTs = Number(weatherPayload.current?.dt ?? riskBaseTimestamp);
      const sample = selectWindSample(horizon, weatherPayload, baseTs);
      ensureProfileMap(horizon).set(height, {
        wind_speed: Number(sample.wind_speed ?? 0),
        wind_deg: Number(sample.wind_deg ?? 0),
        dt: Number(sample.dt ?? baseTs)
      });
    }

    const derivedMap = ensureProfileMap(horizon);
    const availableHeights = Array.from(derivedMap.keys());

    const derivedTargets = [50, 200];
    for (const targetHeight of derivedTargets) {
      if (derivedMap.has(targetHeight)) continue;

      let referenceHeight = targetHeight <= 70 ? 10 : 100;
      let referenceSample = derivedMap.get(referenceHeight);

      if (!referenceSample && availableHeights.length) {
        referenceHeight = availableHeights[0];
        referenceSample = derivedMap.get(referenceHeight);
      }

      if (!referenceSample) continue;

      const speed = estimateWindSpeedAtHeight(
        Number(referenceSample.wind_speed ?? 0),
        referenceHeight,
        targetHeight
      );

      derivedMap.set(targetHeight, {
        wind_speed: speed,
        wind_deg: Number(referenceSample.wind_deg ?? 0),
        dt: Number(referenceSample.dt ?? riskBaseTimestamp)
      });
    }
  }

  const featuresWithRisk: Feature[] = [];

  for (const feature of baseFeatures) {
    if (feature.geometry?.type !== "Point") continue;

    const hotspotPoint = turfPoint(feature.geometry.coordinates as [number, number]);
    const frp = parseFrp((feature.properties ?? {}) as Record<string, any>);
    const distMeters = pointToLineDistance(hotspotPoint, lineFeature, { units: "meters" });

    let maxRisk = 0;
    let intersectsAny = false;
    const riskProperties: Record<string, number> = {};
    const debugGeometries: Feature<Polygon>[] = [];

    for (const horizon of uniqueHorizons) {
      const wind = windByHorizon.get(horizon) ?? { speed: 0, deg: 0, toward: 0, dt: riskBaseTimestamp };
      const rawRadius = Math.max(0, wind.speed * 3600 * horizon);
      const radiusMeters = horizon === 0 ? Math.max(rawRadius, bufferMeters) : rawRadius;

      let intersects = false;
      let cone: Feature<Polygon> | null = null;

      if (radiusMeters > 0 && wind.speed > 0) {
        cone = buildWindCone(hotspotPoint, wind.toward, radiusMeters, coneHalfAngle);
        intersects = intersectsCorridor(cone, corridor, hotspotPoint);
      } else {
        intersects = booleanPointInPolygon(hotspotPoint, corridor);
      }

      const risk = riskScore(intersects, distMeters, Math.max(radiusMeters, bufferMeters), wind.speed, frp);
      const key = `risk_h${String(horizon).padStart(2, "0")}`;
      riskProperties[key] = Number(risk.toFixed(2));
      maxRisk = Math.max(maxRisk, risk);
      intersectsAny = intersectsAny || intersects;

      if (body?.debugCone && cone) {
        debugGeometries.push(cone);
      }
    }

    const windNow = windByHorizon.get(0) ?? { speed: 0, deg: 0, toward: 0, dt: riskBaseTimestamp };
    const eta = windNow.speed > 0 ? timeToLineHours(hotspotPoint, lineInfo.collection, windNow.speed) : null;

    const currentProfileMap = profileRecorder.get(0);
    const windProfile =
      currentProfileMap && currentProfileMap.size
        ? Object.fromEntries(
            Array.from(currentProfileMap.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([height, sample]) => [
                String(height),
                {
                  speed_ms: Number(Number(sample.wind_speed ?? 0).toFixed(2)),
                  speed_kmh: Number((Number(sample.wind_speed ?? 0) * 3.6).toFixed(1)),
                  deg_from: Number(sample.wind_deg ?? 0),
                  dt: Number(sample.dt ?? riskBaseTimestamp)
                }
              ])
          )
        : undefined;

    const updatedFeature: Feature = {
      type: feature.type,
      geometry: feature.geometry,
      properties: {
        ...(feature.properties ?? {}),
        frp,
        ...riskProperties,
        risk_max: Number(maxRisk.toFixed(2)),
        eta_h: eta !== null && Number.isFinite(eta) ? Number(eta.toFixed(2)) : null,
        wind_speed_ms: Number(windNow.speed.toFixed(2)),
        wind_dir_from_deg: windNow.deg,
        wind_dir_toward_deg: windNow.toward,
        distance_to_line_m: Number(distMeters.toFixed(1)),
        intersects_corridor: intersectsAny,
        ...(windProfile ? { wind_profile: windProfile } : {})
      }
    };

    if (body?.debugCone && debugGeometries.length > 0) {
      (updatedFeature.properties as Record<string, unknown>).debug_cones = debugGeometries.map((geom) => geom.geometry);
    }

    featuresWithRisk.push(updatedFeature);
  }

  const riskValues = featuresWithRisk
    .map((feature) => Number(((feature.properties ?? {}) as Record<string, unknown>).risk_max ?? 0))
    .filter((value) => Number.isFinite(value));
  const frpValues = featuresWithRisk
    .map((feature) => Number(((feature.properties ?? {}) as Record<string, unknown>).frp ?? 0))
    .filter((value) => Number.isFinite(value));

  const totalHotspots = featuresWithRisk.length;
  const maxRisk = riskValues.length ? Math.max(...riskValues) : 0;
  const avgRisk = riskValues.length ? riskValues.reduce((acc, value) => acc + value, 0) / riskValues.length : 0;
  const corridorCount = featuresWithRisk.filter(
    (feature) => Boolean(((feature.properties ?? {}) as Record<string, unknown>).intersects_corridor)
  ).length;
  const frpSum = frpValues.length ? frpValues.reduce((acc, value) => acc + value, 0) : 0;

  const profileByHorizon = Object.fromEntries(
    Array.from(profileRecorder.entries()).map(([horizon, map]) => [
      String(horizon),
      Array.from(map.entries())
        .map(([height, sample]) => ({
          height,
          speed: Number(Number(sample.wind_speed ?? 0).toFixed(2)),
          deg: Number(sample.wind_deg ?? 0),
          dt: Number(sample.dt ?? riskBaseTimestamp)
        }))
        .sort((a, b) => a.height - b.height)
    ])
  );

  const nowEpoch = Math.floor(Date.now() / 1000);
  const has10m = weatherByHeight.has(10);
  const timelineBaseHeight = has10m ? 10 : riskHeight;
  const timelineSource = has10m ? weatherByHeight.get(10) : riskWeather;
  const height100Data = weatherByHeight.get(100);

  const timeline: Array<{ dt: number; isPast: boolean; heights: Record<number, { speed: number; deg: number }> }> = [];
  const timelineLength = timelineSource?.hourly?.length ?? 0;

  for (let i = 0; i < timelineLength; i++) {
    const baseSample = timelineSource?.hourly?.[i];
    if (!baseSample) continue;
    const dt = Number(baseSample.dt ?? 0);
    if (!dt) continue;

    const heightsRecord: Record<number, { speed: number; deg: number }> = {};
    const speedBase = Number(baseSample.wind_speed ?? 0);
    const degBase = Number(baseSample.wind_deg ?? 0);

    heightsRecord[timelineBaseHeight] = {
      speed: Number(speedBase.toFixed(2)),
      deg: degBase
    };

    const sample100 = height100Data?.hourly?.[i];
    let referenceHeightFor200 = timelineBaseHeight;
    let referenceSpeedFor200 = speedBase;
    let referenceDegFor200 = degBase;

    if (sample100) {
      const speed100 = Number(sample100.wind_speed ?? 0);
      const deg100 = Number(sample100.wind_deg ?? degBase);
      heightsRecord[100] = {
        speed: Number(speed100.toFixed(2)),
        deg: deg100
      };
      referenceHeightFor200 = 100;
      referenceSpeedFor200 = speed100;
      referenceDegFor200 = deg100;
    } else {
      const derived100 = estimateWindSpeedAtHeight(speedBase, timelineBaseHeight, 100);
      heightsRecord[100] = {
        speed: Number(derived100.toFixed(2)),
        deg: degBase
      };
      referenceHeightFor200 = 100;
      referenceSpeedFor200 = derived100;
      referenceDegFor200 = degBase;
    }

    const speed50 = estimateWindSpeedAtHeight(speedBase, timelineBaseHeight, 50);
    heightsRecord[50] = {
      speed: Number(speed50.toFixed(2)),
      deg: degBase
    };

    const speed200 = estimateWindSpeedAtHeight(referenceSpeedFor200, referenceHeightFor200, 200);
    heightsRecord[200] = {
      speed: Number(speed200.toFixed(2)),
      deg: referenceDegFor200
    };

    heightsRecord[10] ??= {
      speed: Number(estimateWindSpeedAtHeight(speedBase, timelineBaseHeight, 10).toFixed(2)),
      deg: degBase
    };

    timeline.push({
      dt,
      isPast: dt < nowEpoch,
      heights: heightsRecord
    });
  }

  const meta = {
    generated_at: new Date().toISOString(),
    horizons: uniqueHorizons,
    wind: {
      location: { lat: centerLat, lon: centerLon },
      height_used_for_risk: riskHeight,
      available_heights: Array.from(weatherByHeight.keys()).sort((a, b) => a - b),
      profile_by_horizon: profileByHorizon,
      timeline
    },
    stats: {
      hotspots_total: totalHotspots,
      risk_max: Number(maxRisk.toFixed(2)),
      risk_avg: Number(avgRisk.toFixed(2)),
      corridor_count: corridorCount,
      frp_sum: Number(frpSum.toFixed(2))
    }
  };

  return c.json({ type: "FeatureCollection", features: featuresWithRisk, meta });
});
