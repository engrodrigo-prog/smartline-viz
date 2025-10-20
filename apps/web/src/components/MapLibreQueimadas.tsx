import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Loader2 } from 'lucide-react';
import { initializeESRIMap } from '@/lib/mapConfig';
import type { Feature } from 'geojson';

interface MapLibreQueimadasProps {
  geojson: GeoJSON.FeatureCollection;
  onFeatureClick?: (feature: Feature) => void;
  fitBounds?: maplibregl.LngLatBoundsLike | null;
}

const riskColorExpression = [
  "case",
  ["boolean", ["coalesce", ["get", "isFocus"], false], false], "#38bdf8",
  [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "risk_max"], 0],
    0, "#16a34a",
    25, "#84cc16",
    50, "#facc15",
    75, "#f97316",
    90, "#ef4444",
    100, "#b91c1c"
  ]
];

const riskRadiusExpression = [
  "+",
  [
    "interpolate",
    ["linear"],
    ["sqrt", ["coalesce", ["get", "frp"], 0]],
    0, 6,
    4, 10,
    8, 14
  ],
  [
    "case",
    ["boolean", ["coalesce", ["get", "isFocus"], false], false],
    4,
    0
  ]
];

export const MapLibreQueimadas = ({ geojson, onFeatureClick, fitBounds }: MapLibreQueimadasProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      map.current = initializeESRIMap(mapContainer.current, {
        center: [-47.0, -15.8],
        zoom: 5,
        basemap: 'imagery'
      });

      map.current.on('load', () => {
        setIsLoading(false);
        if (!map.current) return;

        map.current.addSource('queimadas', {
          type: 'geojson',
          data: geojson
        });

        map.current.addLayer({
          id: 'risk-points',
          type: 'circle',
          source: 'queimadas',
          paint: {
            'circle-color': riskColorExpression as any,
            'circle-radius': riskRadiusExpression as any,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#0f172a'
          }
        });

        map.current.on('click', 'risk-points', (e) => {
          if (e.features && e.features[0] && onFeatureClick) {
            onFeatureClick(e.features[0] as Feature);
          }
        });

        map.current.on('mouseenter', 'risk-points', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        
        map.current.on('mouseleave', 'risk-points', () => {
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

  useEffect(() => {
    if (map.current && map.current.getSource('queimadas')) {
      (map.current.getSource('queimadas') as maplibregl.GeoJSONSource).setData(geojson);

      if (fitBounds) {
        try {
          map.current.fitBounds(fitBounds, { padding: 60, duration: 800, maxZoom: 11 });
        } catch (error) {
          console.warn('fitBounds (queimadas) failed', error);
        }
      }
    }
  }, [geojson, fitBounds]);

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
