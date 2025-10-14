import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import MapViewSelector, { MapLayer } from './MapViewSelector';

interface MapboxUnifiedProps {
  onFeatureClick?: (feature: any) => void;
  filterRegiao?: string;
  filterEmpresa?: string;
  showQueimadas?: boolean;
  showInfrastructure?: boolean;
  zoneConfig?: {
    critica: number;
    acomp: number;
    obs: number;
  };
}

export const MapboxUnified = ({ 
  onFeatureClick,
  filterRegiao,
  filterEmpresa,
  showQueimadas = false,
  showInfrastructure = true,
  zoneConfig
}: MapboxUnifiedProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layers, setLayers] = useState<MapLayer[]>([]);

  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    if (!token) {
      setError('Token do Mapbox não configurado.');
      setIsLoading(false);
      return;
    }

    if (!mapContainer.current || map.current) return;

    try {
      mapboxgl.accessToken = token;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [-47.0, -15.8],
        zoom: 5,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', async () => {
        setIsLoading(false);
        await loadInfrastructure();
        if (showQueimadas) {
          await loadQueimadas();
        }
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setError('Erro ao carregar mapa.');
        setIsLoading(false);
      });

    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Erro ao inicializar mapa');
      setIsLoading(false);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  const loadInfrastructure = async () => {
    if (!map.current) return;

    try {
      let query = supabase
        .from('infrastructure')
        .select('*');

      if (filterRegiao) {
        query = query.eq('regiao', filterRegiao);
      }
      if (filterEmpresa) {
        query = query.eq('empresa', filterEmpresa);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Agrupar por arquivo de origem (simular pelo nome da linha)
      const grouped = data?.reduce((acc: any, item: any) => {
        const key = item.linha_nome || 'Sem Nome';
        if (!acc[key]) {
          acc[key] = {
            name: key,
            features: [],
            uploadDate: item.created_at,
          };
        }
        acc[key].features.push(item);
        return acc;
      }, {});

      const newLayers: MapLayer[] = [];
      
      Object.entries(grouped || {}).forEach(([name, group]: [string, any], index) => {
        const layerId = `infrastructure-${name.replace(/[^a-zA-Z0-9]/g, '-')}`;
        
        // Adicionar pontos (estruturas)
        const points = group.features.filter((f: any) => f.asset_type === 'structure');
        if (points.length > 0) {
          const geojson: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: points.map((p: any) => ({
              type: 'Feature',
              geometry: p.geometry,
              properties: p,
            }))
          };

          if (!map.current!.getSource(`${layerId}-points`)) {
            map.current!.addSource(`${layerId}-points`, {
              type: 'geojson',
              data: geojson,
            });

            map.current!.addLayer({
              id: `${layerId}-points`,
              type: 'circle',
              source: `${layerId}-points`,
              paint: {
                'circle-radius': 6,
                'circle-color': `hsl(${(index * 60) % 360}, 70%, 50%)`,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
              },
            });

            // Labels
            map.current!.addLayer({
              id: `${layerId}-labels`,
              type: 'symbol',
              source: `${layerId}-points`,
              layout: {
                'text-field': ['get', 'estrutura'],
                'text-size': 10,
                'text-offset': [0, 1.5],
              },
              paint: {
                'text-color': '#ffffff',
                'text-halo-color': '#000000',
                'text-halo-width': 1,
              },
            });
          }

          newLayers.push({
            id: `${layerId}-points`,
            name: `${name} - Estruturas`,
            type: 'infrastructure',
            visible: true,
            color: `hsl(${(index * 60) % 360}, 70%, 50%)`,
            source: name,
            uploadDate: group.uploadDate,
            count: points.length,
          });
        }

        // Adicionar linhas
        const lines = group.features.filter((f: any) => f.asset_type === 'line');
        if (lines.length > 0) {
          const lineGeojson: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: lines.map((l: any) => ({
              type: 'Feature',
              geometry: l.geometry,
              properties: l,
            }))
          };

          if (!map.current!.getSource(`${layerId}-lines`)) {
            map.current!.addSource(`${layerId}-lines`, {
              type: 'geojson',
              data: lineGeojson,
            });

            map.current!.addLayer({
              id: `${layerId}-lines`,
              type: 'line',
              source: `${layerId}-lines`,
              paint: {
                'line-color': `hsl(${(index * 60) % 360}, 70%, 50%)`,
                'line-width': 3,
              },
            });
          }

          newLayers.push({
            id: `${layerId}-lines`,
            name: `${name} - Linha`,
            type: 'infrastructure',
            visible: true,
            color: `hsl(${(index * 60) % 360}, 70%, 50%)`,
            source: name,
            uploadDate: group.uploadDate,
            count: lines.length,
          });
        }
      });

      setLayers(prev => [...prev, ...newLayers]);

      // Ajustar bounds
      if (data && data.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        data.forEach((item: any) => {
          if (item.lon && item.lat) {
            bounds.extend([item.lon, item.lat]);
          }
        });
        map.current?.fitBounds(bounds, { padding: 50 });
      }

    } catch (error) {
      console.error('Erro ao carregar infraestrutura:', error);
    }
  };

  const loadQueimadas = async () => {
    // Implementar carregamento de queimadas se necessário
    // Similar à estrutura acima
  };

  const handleLayerVisibilityChange = (layerId: string, visible: boolean) => {
    if (!map.current) return;

    const layer = map.current.getLayer(layerId);
    if (layer) {
      map.current.setLayoutProperty(
        layerId,
        'visibility',
        visible ? 'visible' : 'none'
      );
    }

    // Update labels if exists
    const labelsId = layerId.replace('-points', '-labels');
    const labelsLayer = map.current.getLayer(labelsId);
    if (labelsLayer) {
      map.current.setLayoutProperty(
        labelsId,
        'visibility',
        visible ? 'visible' : 'none'
      );
    }

    setLayers(prev =>
      prev.map(l =>
        l.id === layerId ? { ...l, visible } : l
      )
    );
  };

  const handleLayerToggle = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      handleLayerVisibilityChange(layerId, !layer.visible);
    }
  };

  if (error) {
    return (
      <div className="w-full h-[600px] rounded-lg border border-border bg-background flex items-center justify-center">
        <div className="text-center p-6">
          <p className="text-destructive mb-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Carregando mapa...</span>
          </div>
        </div>
      )}
      
      <div className="absolute top-4 left-4 z-10">
        <MapViewSelector
          layers={layers}
          onLayerToggle={handleLayerToggle}
          onLayerVisibilityChange={handleLayerVisibilityChange}
        />
      </div>
      
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};
