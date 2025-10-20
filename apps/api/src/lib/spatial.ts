import type { Feature, FeatureCollection, Geometry } from "geojson";
import {
  buffer,
  booleanPointInPolygon,
  featureCollection,
  flattenEach,
  intersect as turfIntersect
} from "@turf/turf";

const toFeatureArray = (input: Feature | FeatureCollection | null | undefined): Feature[] => {
  if (!input) return [];
  if ((input as FeatureCollection).type === "FeatureCollection") {
    return [...((input as FeatureCollection).features ?? [])];
  }
  return [input as Feature];
};

export const intersect = (
  a: Feature | FeatureCollection | null | undefined,
  b: Feature | FeatureCollection | null | undefined
): FeatureCollection => {
  const results: Feature[] = [];

  flattenEach(featureCollection(toFeatureArray(a)), (featureA) => {
    flattenEach(featureCollection(toFeatureArray(b)), (featureB) => {
      if (!featureA.geometry || !featureB.geometry) return;
      const intersection = turfIntersect(featureA as Feature<Geometry>, featureB as Feature<Geometry>);
      if (intersection) {
        results.push(intersection);
      }
    });
  });

  return featureCollection(results);
};

export const withinDistance = (
  points: Feature | FeatureCollection | null | undefined,
  lines: Feature | FeatureCollection | null | undefined,
  meters: number
): FeatureCollection => {
  const result: Feature[] = [];
  if (!Number.isFinite(meters) || meters <= 0) {
    return featureCollection(result);
  }

  const bufferPolygons: Feature[] = [];
  flattenEach(featureCollection(toFeatureArray(lines)), (line) => {
    if (!line.geometry) return;
    const buffered = buffer(line, meters, { units: "meters" });
    if (buffered) {
      bufferPolygons.push(buffered);
    }
  });

  if (!bufferPolygons.length) {
    return featureCollection(result);
  }

  flattenEach(featureCollection(toFeatureArray(points)), (point) => {
    if (point.geometry?.type !== "Point") return;
    const inside = bufferPolygons.some((polygon) => booleanPointInPolygon(point, polygon));
    if (inside) {
      result.push(point);
    }
  });

  return featureCollection(result);
};
