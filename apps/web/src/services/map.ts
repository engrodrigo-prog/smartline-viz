import maplibregl from "maplibre-gl";
import type { FeatureCollection, LngLatBoundsLike } from "geojson";

import { ESRI_BASEMAPS, type BasemapId, type BasemapOption, resolveBasemapId } from "@/lib/mapConfig";
const buildRasterStyle = (basemap: BasemapOption): maplibregl.StyleSpecification => ({
  version: 8,
  sources: {
    [basemap.id]: {
      type: "raster",
      tiles: [basemap.url!],
      tileSize: 256,
      attribution: basemap.attribution,
      maxzoom: 19
    }
  },
  layers: [
    {
      id: `${basemap.id}-layer`,
      type: "raster",
      source: basemap.id,
      minzoom: 0,
      maxzoom: 22
    }
  ]
});

// Always return an ESRI raster style (no Mapbox dependency/token required)
export const buildStyleForBasemap = (basemapId: BasemapId): maplibregl.StyleSpecification => {
  const rasterBasemap = ESRI_BASEMAPS[basemapId as keyof typeof ESRI_BASEMAPS] ?? ESRI_BASEMAPS.imagery;
  return buildRasterStyle(rasterBasemap);
};

// No-op on MapLibre + ESRI setup (kept for compatibility)
export const applyTerrainAndBuildings = (_map: maplibregl.Map) => {};

export const resetTerrain = (_map: maplibregl.Map) => {};

export const addOrUpdateGeoJsonSource = (
  map: maplibregl.Map,
  sourceId: string,
  data: FeatureCollection,
  options: Omit<maplibregl.GeoJSONSourceSpecification, "type" | "data"> = {}
) => {
  if (map.getSource(sourceId)) {
    const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
    source.setData(data);
    return;
  }

  map.addSource(sourceId, {
    type: "geojson",
    data,
    ...options
  });
};

export const addClusterLayers = (
  map: maplibregl.Map,
  sourceId: string,
  options: { circleColor?: string; circleRadius?: [number, number][] } = {}
) => {
  const circleColor = options.circleColor ?? "#ff4444";

  if (!map.getLayer(`${sourceId}-clusters`)) {
    map.addLayer({
      id: `${sourceId}-clusters`,
      type: "circle",
      source: sourceId,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step",
          ["get", "point_count"],
          "#51bbd6",
          10,
          "#f1f075",
          30,
          "#f28cb1",
          50,
          "#ff0000"
        ],
        "circle-radius": [
          "step",
          ["get", "point_count"],
          20,
          10,
          30,
          30,
          40
        ]
      }
    });
  }

  if (!map.getLayer(`${sourceId}-cluster-count`)) {
    map.addLayer({
      id: `${sourceId}-cluster-count`,
      type: "symbol",
      source: sourceId,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-size": 12
      },
      paint: {
        "text-color": "#ffffff"
      }
    });
  }

  if (!map.getLayer(`${sourceId}-points`)) {
    map.addLayer({
      id: `${sourceId}-points`,
      type: "circle",
      source: sourceId,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": circleColor,
        "circle-radius": 8,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff"
      }
    });
  }
};

export const fitBoundsToCollection = (map: maplibregl.Map, collection: FeatureCollection, padding = 40) => {
  if (!collection.features.length) {
    return;
  }

  const bounds = collection.features.reduce((acc, feature) => {
    if (feature.geometry?.type === "Point") {
      const [lng, lat] = feature.geometry.coordinates as [number, number];
      acc.extend([lng, lat]);
    } else if (feature.geometry?.type === "Polygon") {
      feature.geometry.coordinates[0].forEach(([lng, lat]) => acc.extend([lng, lat]));
    }
    return acc;
  }, new maplibregl.LngLatBounds(collection.features[0].geometry?.type === "Point"
    ? (collection.features[0].geometry.coordinates as [number, number])
    : [0, 0]));

  map.fitBounds(bounds as LngLatBoundsLike, { padding, duration: 1200, pitch: map.getPitch() });
};

export const basemapIds = (): BasemapId[] => {
  const rasterKeys = (Object.keys(ESRI_BASEMAPS) as BasemapId[]).filter((id) => id !== "hillshade");
  return rasterKeys;
};

export const selectBasemap = (current: BasemapId | undefined, token?: string): BasemapId =>
  resolveBasemapId(current, token);
