import { describe, expect, it } from "vitest";
import type { Feature, Point, LineString } from "geojson";
import { intersect, withinDistance } from "../spatial.js";

const point = (coordinates: [number, number]): Feature<Point> => ({
  type: "Feature",
  geometry: { type: "Point", coordinates },
  properties: {}
});

const line = (coordinates: [number, number][]): Feature<LineString> => ({
  type: "Feature",
  geometry: { type: "LineString", coordinates },
  properties: {}
});

describe("lib/spatial", () => {
  it("retorna vazio quando não há geometrias válidas", () => {
    const result = intersect(undefined as any, null as any);
    expect(result.type).toBe("FeatureCollection");
    expect(result.features).toHaveLength(0);
  });

  it("filtra pontos dentro de buffer", () => {
    const pontos = {
      type: "FeatureCollection",
      features: [point([-43.1, -22.9]), point([-43.8, -22.2])]
    };

    const linha = {
      type: "FeatureCollection",
      features: [line([[-43.2, -22.9], [-43.0, -22.85]])]
    };

    const result = withinDistance(pontos, linha, 20000);
    expect(result.features).toHaveLength(1);
    expect(result.features[0].geometry).toMatchObject({ type: "Point" });
  });
});
