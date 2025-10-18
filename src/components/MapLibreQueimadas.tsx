import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Loader2 } from 'lucide-react';
import { initializeESRIMap } from '@/lib/mapConfig';

interface MapLibreQueimadasProps {
  geojson: GeoJSON.FeatureCollection;
  onFeatureClick?: (feature: any) => void;
}

export const MapLibreQueimadas = ({ geojson, onFeatureClick }: MapLibreQueimadasProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      map.current = initializeESRIMap(mapContainer.current, {
        center: [-47.0, -15.8], // Centro do Brasil
        zoom: 5,
        basemap: 'imagery'
      });

      map.current.on('load', () => {
        setIsLoading(false);
        if (!map.current) return;

        // Adicionar source das queimadas
        map.current.addSource('queimadas', {
          type: 'geojson',
          data: geojson,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50
        });

        // Clusters
        map.current.addLayer({
          id: 'clusters',
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
          id: 'cluster-count',
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

        // Pontos individuais
        map.current.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'queimadas',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': [
              'case',
              ['>=', ['get', 'confianca'], 80], '#ff0000',
              ['>=', ['get', 'confianca'], 50], '#ff9900',
              '#ffff00'
            ],
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff'
          }
        });

        // Click handler
        map.current.on('click', 'unclustered-point', (e) => {
          if (e.features && e.features[0] && onFeatureClick) {
            onFeatureClick(e.features[0].properties);
          }
        });

        // Cursor pointer
        map.current.on('mouseenter', 'unclustered-point', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', 'unclustered-point', () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });

        // Cluster click to zoom
        map.current.on('click', 'clusters', async (e) => {
          if (!map.current) return;
          const features = map.current.queryRenderedFeatures(e.point, {
            layers: ['clusters']
          });
          const clusterId = features[0].properties?.cluster_id;
          if (clusterId) {
            try {
              const zoom = await (map.current.getSource('queimadas') as maplibregl.GeoJSONSource).getClusterExpansionZoom(clusterId);
              map.current.easeTo({
                center: (features[0].geometry as any).coordinates,
                zoom: zoom
              });
            } catch (err) {
              console.error('Error expanding cluster:', err);
            }
          }
        });

        map.current.on('mouseenter', 'clusters', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', 'clusters', () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });
      });

    } catch (err) {
      console.error('Error initializing map:', err);
      setIsLoading(false);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Atualizar dados quando geojson mudar
  useEffect(() => {
    if (map.current && map.current.getSource('queimadas')) {
      (map.current.getSource('queimadas') as maplibregl.GeoJSONSource).setData(geojson);
    }
  }, [geojson]);

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
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};
