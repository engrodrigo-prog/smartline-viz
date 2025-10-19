import mapboxgl from "mapbox-gl";
import type { FeatureCollection, LngLatBoundsLike } from "geojson";

import {
  MAPBOX_BASEMAPS,
  ESRI_BASEMAPS,
  type BasemapId,
  type BasemapOption,
  resolveBasemapId
} from "@/lib/mapConfig";

const MAPBOX_TERRAIN_SOURCE = "mapbox-dem";

const buildRasterStyle = (basemap: BasemapOption): mapboxgl.Style => ({
  version: 8,
  name: basemap.name,
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

export const buildStyleForBasemap = (basemapId: BasemapId, token?: string): mapboxgl.Style | string => {
  const mapboxBasemap = MAPBOX_BASEMAPS[basemapId as keyof typeof MAPBOX_BASEMAPS];
  if (mapboxBasemap && token) {
    return `mapbox://styles/${mapboxBasemap.style}`;
  }

  const rasterBasemap = ESRI_BASEMAPS[basemapId as keyof typeof ESRI_BASEMAPS];
  return buildRasterStyle(rasterBasemap ?? ESRI_BASEMAPS.imagery);
};

export const applyTerrainAndBuildings = (map: mapboxgl.Map, token?: string) => {
  if (!token) {
    return;
  }

  if (!map.getSource(MAPBOX_TERRAIN_SOURCE)) {
    map.addSource(MAPBOX_TERRAIN_SOURCE, {
      type: "raster-dem",
      url: "mapbox://mapbox.terrain-rgb",
      tileSize: 512,
      maxzoom: 14
    });
  }

  map.setTerrain({ source: MAPBOX_TERRAIN_SOURCE, exaggeration: 1.4 });

  const layers = map.getStyle()?.layers ?? [];
  const labelLayerId = layers.find((layer) => layer.type === "symbol" && layer.layout && "text-field" in layer.layout)?.id;

  if (!map.getLayer("3d-buildings") && map.getSource("composite")) {
    map.addLayer(
      {
        id: "3d-buildings",
        source: "composite",
        "source-layer": "building",
        type: "fill-extrusion",
        minzoom: 15,
        paint: {
          "fill-extrusion-color": "#aaa",
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "min_height"],
          "fill-extrusion-opacity": 0.6
        }
      },
      labelLayerId
    );
  }
};

export const resetTerrain = (map: mapboxgl.Map) => {
  try {
    // @ts-expect-error - null terrain supported at runtime
    map.setTerrain(null);
  } catch (error) {
    // ignore
  }

  if (map.getLayer(\"3d-buildings\")) {
    map.removeLayer(\"3d-buildings\");
  }

  if (map.getSource(MAPBOX_TERRAIN_SOURCE)) {
    map.removeSource(MAPBOX_TERRAIN_SOURCE);
  }
};

export const addOrUpdateGeoJsonSource = (
  map: mapboxgl.Map,
  sourceId: string,
  data: FeatureCollection,
  options: Omit<mapboxgl.GeoJSONSourceSpecification, "type" | "data"> = {}
) => {
  if (map.getSource(sourceId)) {
    const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
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
  map: mapboxgl.Map,
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

export const fitBoundsToCollection = (map: mapboxgl.Map, collection: FeatureCollection, padding = 40) => {
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
  }, new mapboxgl.LngLatBounds(collection.features[0].geometry?.type === "Point"
    ? (collection.features[0].geometry.coordinates as [number, number])
    : [0, 0]));

  map.fitBounds(bounds as LngLatBoundsLike, { padding, duration: 1200, pitch: map.getPitch() });
};

export const basemapIds = (): BasemapId[] => {
  const mapboxKeys = Object.keys(MAPBOX_BASEMAPS) as BasemapId[];
  const rasterKeys = (Object.keys(ESRI_BASEMAPS) as BasemapId[]).filter((id) => id !== "hillshade");
  return Array.from(new Set([...mapboxKeys, ...rasterKeys]));
};

export const selectBasemap = (current: BasemapId | undefined, token?: string): BasemapId =>
  resolveBasemapId(current, token);
