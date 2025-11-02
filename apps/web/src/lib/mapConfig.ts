import maplibregl from "maplibre-gl";

export type BasemapProvider = "esri" | "mapbox";

export interface BasemapOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  provider: BasemapProvider;
  attribution?: string;
  url?: string;
  style?: string;
  enableTerrain?: boolean;
}

export const MAPBOX_BASEMAPS = {
  "mapbox-satellite": {
    id: "mapbox-satellite",
    name: "Satélite (Mapbox)",
    icon: "🛰️",
    description: "Imagens com rótulos e alto relevo",
    provider: "mapbox" as const,
    style: "mapbox/satellite-streets-v12",
    enableTerrain: true,
  },
  "mapbox-streets": {
    id: "mapbox-streets",
    name: "Ruas (Mapbox)",
    icon: "🛣️",
    description: "Mapa vetorial com rodovias e POIs",
    provider: "mapbox" as const,
    style: "mapbox/streets-v12",
    enableTerrain: true,
  },
  "mapbox-outdoors": {
    id: "mapbox-outdoors",
    name: "Outdoor (Mapbox)",
    icon: "⛰️",
    description: "Terreno e trilhas com curvas de nível",
    provider: "mapbox" as const,
    style: "mapbox/outdoors-v12",
    enableTerrain: true,
  },
} satisfies Record<string, BasemapOption>;

export const ESRI_BASEMAPS = {
  imagery: {
    id: "imagery",
    name: "Satélite (ESRI)",
    icon: "🛰️",
    description: "Imagens de alta resolução",
    provider: "esri" as const,
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "© Esri, Maxar, Earthstar Geographics, CNES/Airbus DS, USDA FSA, USGS, Aerogrid, IGN, IGP, and the GIS User Community",
  },
  canvas: {
    id: "canvas",
    name: "Canvas Claro (ESRI)",
    icon: "🗺️",
    description: "Mapa vetorial leve",
    provider: "esri" as const,
    url: "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri",
  },
  terrain: {
    id: "terrain",
    name: "Terreno Base (ESRI)",
    icon: "⛰️",
    description: "Relevo topográfico raster",
    provider: "esri" as const,
    url: "https://services.arcgisonline.com/arcgis/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri",
  },
  hillshade: {
    id: "hillshade",
    name: "Hillshade (ESRI)",
    icon: "🏔️",
    description: "Sombreamento auxiliar",
    provider: "esri" as const,
    url: "https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri",
  },
  topo: {
    id: "topo",
    name: "Topográfico (ESRI)",
    icon: "🧭",
    description: "Mapa topográfico completo",
    provider: "esri" as const,
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri",
  },
  streets: {
    id: "streets",
    name: "Ruas (ESRI)",
    icon: "🚗",
    description: "Mapa de ruas e rodovias",
    provider: "esri" as const,
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri",
  },
  osm: {
    id: "osm",
    name: "OpenStreetMap",
    icon: "🌐",
    description: "Mapa colaborativo mundial (XYZ raster)",
    provider: "esri" as const,
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors"
  },
} satisfies Record<string, BasemapOption>;

// Mapbox desabilitado por padrão para evitar travamentos quando não há token.
export const BASEMAP_GROUPS = [
  {
    id: "esri",
    label: "ESRI / Raster",
    basemaps: Object.values(ESRI_BASEMAPS).filter((bm) => bm.id !== "hillshade"),
  },
] as const;

export type MapboxBasemapId = keyof typeof MAPBOX_BASEMAPS;
export type EsriBasemapId = keyof typeof ESRI_BASEMAPS;
export type BasemapId = MapboxBasemapId | EsriBasemapId;

const DEFAULT_CENTER: [number, number] = [-46.333, -23.96];
const DEFAULT_ZOOM = 12;
// Default to ESRI imagery when no token is configured to avoid flicker
export const DEFAULT_BASEMAP: BasemapId = "imagery";

const CUSTOM_LAYER_PREFIXES = ["infrastructure", "queimadas", "smartline", "alarm"];
const MAPBOX_TERRAIN_SOURCE = "mapbox-dem";
const MAPBOX_TERRAIN_URL =
  "https://api.mapbox.com/v4/mapbox.mapbox-terrain-dem-v1/tiles/256/{z}/{x}/{y}?access_token=";
const MAPBOX_DOMAIN = "https://api.mapbox.com";
const MAP_STATE_KEY = "__smartlineBasemapId";

const shouldPreserve = (id: string) => CUSTOM_LAYER_PREFIXES.some((prefix) => id.startsWith(prefix));

const buildMapboxStyleUrl = (style: string, token: string) => `${MAPBOX_DOMAIN}/styles/v1/${style}?access_token=${token}`;

const appendAccessToken = (url: string, token: string) => {
  if (url.includes("access_token")) {
    return url;
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}access_token=${token}`;
};

const createESRIStyle = (basemap: BasemapOption, withHillshade = true): maplibregl.StyleSpecification => {
  const layers: maplibregl.AnyLayer[] = [
    {
      id: "esri-base",
      type: "raster",
      source: "esri-base",
      minzoom: 0,
      maxzoom: 22,
    },
  ];

  const sources: Record<string, any> = {
    "esri-base": {
      type: "raster",
      tiles: [basemap.url],
      tileSize: 256,
      attribution: basemap.attribution,
      scheme: "xyz",
      maxzoom: 19,
    },
  };

  if (withHillshade && (basemap.id === "imagery" || basemap.id === "terrain")) {
    sources["esri-hillshade"] = {
      type: "raster",
      tiles: [ESRI_BASEMAPS.hillshade.url],
      tileSize: 256,
      scheme: "xyz",
    };
    layers.push({
      id: "esri-hillshade",
      type: "raster",
      source: "esri-hillshade",
      paint: {
        "raster-opacity": 0.3,
      },
    });
  }

  return {
    version: 8,
    sources,
    layers,
  };
};

const disableTerrain = (map: maplibregl.Map) => {
  const cleanup = () => {
    try {
      map.setTerrain(null as any);
    } catch (error) {
      /* ignore */
    }

    if (map.getLayer("3d-buildings")) {
      map.removeLayer("3d-buildings");
    }

    if (map.getSource(MAPBOX_TERRAIN_SOURCE)) {
      map.removeSource(MAPBOX_TERRAIN_SOURCE);
    }
  };

  if (map.isStyleLoaded()) {
    cleanup();
  } else {
    map.once("styledata", cleanup);
  }
};

const applyTerrainAndBuildings = (_map: maplibregl.Map, _token?: string) => {}


const preserveCustomSources = (map: maplibregl.Map) => {
  if (!map.isStyleLoaded()) {
    return { layers: [] as maplibregl.AnyLayer[], sources: {} as Record<string, any> };
  }

  const style = map.getStyle();
  const preservedLayers = style.layers.filter((layer) => shouldPreserve(layer.id));
  const preservedSources = Object.fromEntries(
    Object.entries(style.sources).filter(([id]) => shouldPreserve(id)),
  ) as Record<string, any>;

  return { layers: preservedLayers, sources: preservedSources };
};

const restoreCustomSources = (
  map: maplibregl.Map,
  preserved: { layers: maplibregl.AnyLayer[]; sources: Record<string, any> },
) => {
  Object.entries(preserved.sources).forEach(([id, source]) => {
    if (!map.getSource(id)) {
      map.addSource(id, source as any);
    }
  });

  preserved.layers.forEach((layer) => {
    if (!map.getLayer(layer.id)) {
      map.addLayer(layer);
    }
  });
};

const setBasemapState = (map: maplibregl.Map, basemapId: BasemapId) => {
  (map as any)[MAP_STATE_KEY] = basemapId;
};

export const getCurrentBasemap = (map: maplibregl.Map): BasemapId | undefined => (map as any)[MAP_STATE_KEY];

export const resolveBasemapId = (requested: BasemapId | undefined, _token?: string): BasemapId => {
  if (requested && requested in ESRI_BASEMAPS) {
    return requested;
  }

  if (requested && requested in MAPBOX_BASEMAPS) {
    console.warn(`Mapbox basemap "${requested}" não está disponível sem token. Utilizando ESRI imagery.`);
  }

  return "imagery";
};

export const initializeSmartlineMap = (
  container: HTMLDivElement,
  options: {
    center?: [number, number];
    zoom?: number;
    basemap?: BasemapId;
    pitch?: number;
    bearing?: number;
    mapboxToken?: string;
  } = {},
): maplibregl.Map => {
  const {
    center = DEFAULT_CENTER,
    zoom = DEFAULT_ZOOM,
    basemap: requestedBasemap,
    pitch = 0,
    bearing = 0,
  } = options;

  const basemapId = resolveBasemapId(requestedBasemap);
  const basemap = ESRI_BASEMAPS[basemapId] ?? ESRI_BASEMAPS.imagery;
  const style = createESRIStyle(basemap, basemap.id === "imagery");

  const map = new maplibregl.Map({
    container,
    style,
    center,
    zoom,
    fadeDuration: 0,
    pitch,
    bearing,
    maxZoom: 19,
    minZoom: 4,
    antialias: false,
    attributionControl: { compact: false },
    validate: false,
  });

  map.once("load", () => {
    // Garantir ajuste inicial e evitar flicker ao carregar tiles
    map.resize();
  });

  map.on("error", (event) => {
    const message = (event?.error && (event.error as Error).message) || "";
    if (typeof message === "string" && message.includes('unknown property "name"')) {
      return;
    }
    console.warn("[map] erro", event?.error ?? event);
  });

  setBasemapState(map, basemapId);
  return map;
};

export const initializeESRIMap = (
  container: HTMLDivElement,
  options: {
    center?: [number, number];
    zoom?: number;
    basemap?: EsriBasemapId;
    pitch?: number;
    bearing?: number;
  } = {},
) =>
  initializeSmartlineMap(container, {
    ...options,
    basemap: options.basemap ?? "imagery",
  });

export const changeBasemap = (
  map: maplibregl.Map,
  basemapId: BasemapId,
) => {
  const targetBasemap = resolveBasemapId(basemapId);
  const basemap = ESRI_BASEMAPS[targetBasemap] ?? ESRI_BASEMAPS.imagery;
  const current = getCurrentBasemap(map);

  if (current === targetBasemap) {
    return;
  }

  const camera = {
    center: map.getCenter(),
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
    padding: map.getPadding(),
  };

  const preserved = preserveCustomSources(map);
  disableTerrain(map);

  const newStyle = createESRIStyle(basemap, basemap.id === "imagery");

  map.fire("basemap-changing" as any);
  map.setStyle(newStyle as any, { diff: false } as any);

  map.once("style.load", () => {
    restoreCustomSources(map, preserved);
    map.jumpTo(camera);
    setBasemapState(map, targetBasemap);
    map.fire("basemap-changed" as any);
  });
};
