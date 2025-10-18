import maplibregl from 'maplibre-gl';

export interface ESRIBasemap {
  id: string;
  name: string;
  icon: string;
  description: string;
  url: string;
  attribution: string;
}

export const ESRI_BASEMAPS: Record<string, ESRIBasemap> = {
  imagery: {
    id: 'imagery',
    name: 'Satélite (ESRI)',
    icon: '🛰️',
    description: 'Imagens de alta resolução',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, Maxar, Earthstar Geographics, CNES/Airbus DS, USDA FSA, USGS, Aerogrid, IGN, IGP, and the GIS User Community'
  },
  canvas: {
    id: 'canvas',
    name: 'Canvas Claro',
    icon: '🗺️',
    description: 'Mapa vetorial leve',
    url: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri'
  },
  terrain: {
    id: 'terrain',
    name: 'Terreno Base',
    icon: '⛰️',
    description: 'Relevo topográfico',
    url: 'https://services.arcgisonline.com/arcgis/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri'
  },
  hillshade: {
    id: 'hillshade',
    name: 'Hillshade',
    icon: '🏔️',
    description: 'Sombreamento 3D',
    url: 'https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri'
  },
  topo: {
    id: 'topo',
    name: 'Topográfico',
    icon: '🧭',
    description: 'Mapa topográfico completo',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri'
  },
  streets: {
    id: 'streets',
    name: 'Ruas',
    icon: '🚗',
    description: 'Mapa de ruas e rodovias',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri'
  }
};

export const DEFAULT_CENTER: [number, number] = [-46.333, -23.96]; // Santos/SP
export const DEFAULT_ZOOM = 12;

export function createESRIStyle(basemap: ESRIBasemap, withHillshade = true): maplibregl.StyleSpecification {
  const layers: any[] = [
    {
      id: 'esri-base',
      type: 'raster',
      source: 'esri-base',
      minzoom: 0,
      maxzoom: 22
    }
  ];

  const sources: Record<string, any> = {
    'esri-base': {
      type: 'raster',
      tiles: [basemap.url],
      tileSize: 256,
      attribution: basemap.attribution,
      scheme: 'xyz',
      maxzoom: 19
    }
  };

  // Adicionar hillshade sobre imagery/terrain para efeito 3D
  if (withHillshade && (basemap.id === 'imagery' || basemap.id === 'terrain')) {
    sources['esri-hillshade'] = {
      type: 'raster',
      tiles: [ESRI_BASEMAPS.hillshade.url],
      tileSize: 256,
      scheme: 'xyz'
    };
    layers.push({
      id: 'esri-hillshade',
      type: 'raster',
      source: 'esri-hillshade',
      paint: {
        'raster-opacity': 0.3
      }
    });
  }

  return {
    version: 8,
    name: basemap.name,
    sources,
    layers,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
  };
}

export function initializeESRIMap(
  container: HTMLDivElement,
  options: {
    center?: [number, number];
    zoom?: number;
    basemap?: keyof typeof ESRI_BASEMAPS;
    pitch?: number;
    bearing?: number;
  } = {}
): maplibregl.Map {
  const {
    center = DEFAULT_CENTER,
    zoom = DEFAULT_ZOOM,
    basemap = 'imagery',
    pitch = 0,
    bearing = 0
  } = options;

  const style = createESRIStyle(ESRI_BASEMAPS[basemap]);

  return new maplibregl.Map({
    container,
    style,
    center,
    zoom,
    pitch,
    bearing,
    maxZoom: 19,
    minZoom: 4,
    attributionControl: {
      compact: false
    }
  });
}

export function changeBasemap(map: maplibregl.Map, basemapId: keyof typeof ESRI_BASEMAPS) {
  const basemap = ESRI_BASEMAPS[basemapId];
  const newStyle = createESRIStyle(basemap);
  
  // Preservar layers customizadas antes de trocar style
  const customLayers: any[] = [];
  const customSources: any = {};
  
  if (map.isStyleLoaded()) {
    const style = map.getStyle();
    
    // Salvar layers que não são ESRI
    style.layers.forEach((layer: any) => {
      if (!layer.id.startsWith('esri-')) {
        customLayers.push(layer);
      }
    });
    
    // Salvar sources que não são ESRI
    Object.keys(style.sources).forEach((sourceId) => {
      if (!sourceId.startsWith('esri-')) {
        customSources[sourceId] = style.sources[sourceId];
      }
    });
  }
  
  // Aplicar novo style
  map.setStyle(newStyle);
  
  // Restaurar layers customizadas após style carregar
  map.once('style.load', () => {
    // Restaurar sources
    Object.entries(customSources).forEach(([id, source]) => {
      if (!map.getSource(id)) {
        map.addSource(id, source as any);
      }
    });
    
    // Restaurar layers
    customLayers.forEach((layer) => {
      if (!map.getLayer(layer.id)) {
        map.addLayer(layer);
      }
    });
  });
}
