import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";
import {
  buffer,
  centroid,
  destination,
  featureCollection,
  lineString,
  point,
  pointToLineDistance,
  polygon,
  booleanPointInPolygon,
  booleanIntersects
} from "@turf/turf";

const RADIUS_DIVISIONS = 12;

export const bearingToToward = (dirFromDeg: number) => {
  if (!Number.isFinite(dirFromDeg)) return 0;
  const normalized = ((dirFromDeg % 360) + 360) % 360;
  return (normalized + 180) % 360;
};

export const buildWindCone = (
  origin: Feature<Point> | [number, number],
  bearingTowardDeg: number,
  radiusMeters: number,
  halfAngleDeg: number
): Feature<Polygon> => {
  const originPoint: Feature<Point> = Array.isArray(origin) ? point(origin) : origin;
  const clampedRadius = Math.max(0, radiusMeters);
  const clampedHalfAngle = Math.max(0, halfAngleDeg);

  if (clampedRadius === 0 || clampedHalfAngle === 0) {
    return polygon([[originPoint.geometry.coordinates, originPoint.geometry.coordinates, originPoint.geometry.coordinates]]);
  }

  const steps = Math.max(2, Math.round((clampedHalfAngle * 2) / 10));
  const coords: number[][] = [originPoint.geometry.coordinates];
  const start = bearingTowardDeg - clampedHalfAngle;
  const end = bearingTowardDeg + clampedHalfAngle;
  const stepSize = (end - start) / steps;

  for (let i = 0; i <= steps; i++) {
    const bearing = start + stepSize * i;
    const dest = destination(originPoint, clampedRadius / 1000, bearing, { units: "kilometers" });
    coords.push(dest.geometry.coordinates);
  }

  coords.push(originPoint.geometry.coordinates);
  return polygon([coords]);
};

export const lineCorridor = (
  linha: Feature<LineString> | FeatureCollection<LineString> | FeatureCollection
, bufferMeters: number
): Feature<Polygon> => {
  const features: FeatureCollection =
    (linha as FeatureCollection)?.type === "FeatureCollection"
      ? (linha as FeatureCollection)
      : featureCollection([linha as Feature<LineString>]);

  const merged = featureCollection(
    features.features
      .filter((f) => f.geometry?.type === "LineString")
      .map((f) => ({ ...f, geometry: f.geometry }))
  );

  if (merged.features.length === 0) {
    throw new Error("Linha sem geometria válida para geração do corredor.");
  }

  const buffered = buffer(merged, Math.max(0, bufferMeters), { units: "meters" });

  if (buffered.type === "FeatureCollection" && buffered.features.length > 0) {
    return buffered.features[0] as Feature<Polygon>;
  }
  if ((buffered as Feature<Polygon>).geometry?.type === "Polygon") {
    return buffered as Feature<Polygon>;
  }
  throw new Error("Falha ao gerar o corredor da linha.");
};

export const timeToLineHours = (
  origin: Feature<Point> | [number, number],
  linha: Feature<LineString> | FeatureCollection,
  windSpeedMs: number
) => {
  if (!Number.isFinite(windSpeedMs) || windSpeedMs <= 0) return null;
  const originPoint: Feature<Point> = Array.isArray(origin) ? point(origin) : origin;
  const lineFeature =
    (linha as FeatureCollection)?.type === "FeatureCollection"
      ? (linha as FeatureCollection).features.find((f) => f.geometry?.type === "LineString") ?? lineString([])
      : (linha as Feature<LineString>);
  const distMeters = pointToLineDistance(originPoint, lineFeature as Feature<LineString>, { units: "meters" });
  return distMeters / (windSpeedMs * 3600);
};

export const riskScore = (
  intersects: boolean,
  distMeters: number,
  radiusMeters: number,
  windSpeedMs: number,
  frp: number
) => {
  const safeRadius = Math.max(radiusMeters, 1);
  const rDist = Math.min(1, Math.max(0, 1 - distMeters / safeRadius));
  const rWind = Math.min(1, Math.max(0, windSpeedMs / 14));
  const rFrp = Math.min(1, Math.max(0, frp / 200));

  const risk = intersects
    ? 100 * (0.45 * rDist + 0.35 * rWind + 0.2 * rFrp)
    : 100 * (0.15 * rFrp);

  return Math.max(0, Math.min(100, risk));
};

export const intersectsCorridor = (
  cone: Feature<Polygon>,
  corridor: Feature<Polygon>,
  hotspot: Feature<Point>
) => {
  if (!cone.geometry || cone.geometry.coordinates.every((ring) => ring.length <= 2)) {
    return booleanPointInPolygon(hotspot, corridor);
  }
  return booleanIntersects(cone, corridor);
};

export const corridorCentroid = (
  linha: Feature<LineString> | FeatureCollection
): Feature<Point> => {
  const center = centroid(linha as any);
  return center;
};

export const pointFeature = (coordinates: [number, number]): Feature<Point> => point(coordinates);
