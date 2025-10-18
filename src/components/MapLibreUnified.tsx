import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Loader2 } from 'lucide-react';
import { initializeESRIMap, changeBasemap } from '@/lib/mapConfig';
import { BasemapSelector } from './BasemapSelector';

interface MapLibreUnifiedProps {
  filterRegiao?: string;
  filterEmpresa?: string;
  filterLinha?: string;
  showQueimadas?: boolean;
  showInfrastructure?: boolean;
  showVegetacao?: boolean;
  showEstruturas?: boolean;
  showTravessias?: boolean;
  showErosao?: boolean;
  showAreasAlagadas?: boolean;
  showEmendas?: boolean;
  initialCenter?: [number, number];
  initialZoom?: number;
  mode?: 'live' | 'archive';
  confiancaMin?: number;
  sateliteFilter?: string;
  focusCoord?: [number, number];
  zoneConfig?: any;
  onFeatureClick?: (feature: any) => void;
  onMapLoad?: (map: maplibregl.Map) => void;
}

export const MapLibreUnified = ({
  filterRegiao,
  filterEmpresa,
  filterLinha,
  showQueimadas = false,
  showInfrastructure = true,
  showVegetacao = false,
  showEstruturas = false,
  showTravessias = false,
  showErosao = false,
  showAreasAlagadas = false,
  showEmendas = false,
  initialCenter,
  initialZoom,
  mode = 'live',
  confiancaMin = 50,
  sateliteFilter,
  focusCoord,
  zoneConfig,
  onFeatureClick,
  onMapLoad
}: MapLibreUnifiedProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentBasemap, setCurrentBasemap] = useState('imagery');

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      map.current = initializeESRIMap(mapContainer.current, {
        center: initialCenter || [-46.333, -23.96],
        zoom: initialZoom || 12,
        basemap: 'imagery',
        pitch: 0,
        bearing: 0
      });

      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.current.addControl(new maplibregl.FullscreenControl(), 'top-right');
      map.current.addControl(new maplibregl.ScaleControl(), 'bottom-right');

      map.current.on('load', () => {
        setIsLoading(false);
        if (onMapLoad && map.current) {
          onMapLoad(map.current);
        }
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setIsLoading(false);
      });

    } catch (err) {
      console.error('Error initializing map:', err);
      setIsLoading(false);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [initialCenter, initialZoom]);

  // Focus on specific coordinates
  useEffect(() => {
    if (map.current && focusCoord) {
      map.current.flyTo({
        center: focusCoord,
        zoom: 16,
        duration: 2000
      });
    }
  }, [focusCoord]);

  // Handle basemap change
  const handleBasemapChange = useCallback((basemapId: string) => {
    if (map.current) {
      changeBasemap(map.current, basemapId as any);
      setCurrentBasemap(basemapId);
    }
  }, []);

  // Load infrastructure layer
  useEffect(() => {
    if (!map.current || !showInfrastructure) return;

    const loadInfrastructure = async () => {
      if (!map.current) return;

      // Remove existing layer if present
      if (map.current.getLayer('infrastructure-layer')) {
        map.current.removeLayer('infrastructure-layer');
      }
      if (map.current.getSource('infrastructure')) {
        map.current.removeSource('infrastructure');
      }

      // In a real implementation, you would fetch data from Supabase
      // For now, we'll add a placeholder
      map.current.addSource('infrastructure', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      map.current.addLayer({
        id: 'infrastructure-layer',
        type: 'circle',
        source: 'infrastructure',
        paint: {
          'circle-radius': 6,
          'circle-color': '#3b82f6',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff'
        }
      });
    };

    if (map.current.isStyleLoaded()) {
      loadInfrastructure();
    } else {
      map.current.once('style.load', loadInfrastructure);
    }
  }, [map.current, showInfrastructure, filterRegiao, filterEmpresa, filterLinha]);

  // Load queimadas layer
  useEffect(() => {
    if (!map.current || !showQueimadas) return;

    const loadQueimadas = async () => {
      if (!map.current) return;

      // Remove existing layers
      ['queimadas-points', 'queimadas-clusters', 'queimadas-cluster-count'].forEach(layerId => {
        if (map.current!.getLayer(layerId)) {
          map.current!.removeLayer(layerId);
        }
      });
      if (map.current.getSource('queimadas')) {
        map.current.removeSource('queimadas');
      }

      // Add source with clustering
      map.current.addSource('queimadas', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      // Cluster circles
      map.current.addLayer({
        id: 'queimadas-clusters',
        type: 'circle',
        source: 'queimadas',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6', 10,
            '#f1f075', 30,
            '#f28cb1', 50,
            '#ff0000'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20, 10,
            30, 30,
            40
          ]
        }
      });

      // Cluster count
      map.current.addLayer({
        id: 'queimadas-cluster-count',
        type: 'symbol',
        source: 'queimadas',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // Individual points
      map.current.addLayer({
        id: 'queimadas-points',
        type: 'circle',
        source: 'queimadas',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#ff4444',
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff'
        }
      });

      // Click handlers
      map.current.on('click', 'queimadas-points', (e) => {
        if (e.features && e.features[0] && onFeatureClick) {
          onFeatureClick(e.features[0].properties);
        }
      });

      map.current.on('mouseenter', 'queimadas-points', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'queimadas-points', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    };

    if (map.current.isStyleLoaded()) {
      loadQueimadas();
    } else {
      map.current.once('style.load', loadQueimadas);
    }
  }, [map.current, showQueimadas, mode, confiancaMin, sateliteFilter, onFeatureClick]);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-foreground">Carregando mapa ESRI...</span>
          </div>
        </div>
      )}
      
      <BasemapSelector value={currentBasemap} onChange={handleBasemapChange} />
      
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};
