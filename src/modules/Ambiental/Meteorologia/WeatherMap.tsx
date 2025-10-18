import { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { initializeESRIMap } from "@/lib/mapConfig";
import { Loader2 } from "lucide-react";
import { WeatherLayer } from "./WeatherLayerSelector";
import { motion, AnimatePresence } from "framer-motion";

interface WeatherMapProps {
  center: [number, number];
  zoom?: number;
  weatherData?: any;
  currentTime?: Date;
  intervalValue?: number;
  enabledLayers?: WeatherLayer[];
}

const WeatherMap = ({ 
  center, 
  zoom = 8, 
  weatherData, 
  currentTime,
  enabledLayers = []
}: WeatherMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!mapContainer.current) return;

    const mapInstance = initializeESRIMap(mapContainer.current, {
      center,
      zoom,
    });

    map.current = mapInstance;

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(new maplibregl.FullscreenControl(), 'top-right');

    map.current.on('load', () => {
      setIsLoading(false);
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    });

    // Timeout de segurança: forçar remoção do loading após 5s
    loadTimeoutRef.current = setTimeout(() => {
      if (isLoading) {
        console.warn('Map load timeout - forcing loading state to false');
        setIsLoading(false);
      }
    }, 5000);

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      map.current?.remove();
    };
  }, []);

  // Adicionar camadas meteorológicas
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return;

    // Verificar se o estilo está carregado
    if (!map.current.isStyleLoaded()) {
      map.current.once('style.load', () => {
        // Força re-render após style carregar
        setIsLoading(false);
      });
      return;
    }

    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY || 'demo';

    enabledLayers.forEach((layer) => {
      const sourceId = `weather-${layer.id}`;
      const layerId = `weather-layer-${layer.id}`;

      if (layer.enabled) {
        // Remover camada existente
        if (map.current!.getLayer(layerId)) {
          map.current!.removeLayer(layerId);
        }
        if (map.current!.getSource(sourceId)) {
          map.current!.removeSource(sourceId);
        }

        // URL especial para precipitação (RainViewer gratuito)
        let tileUrl = '';
        if (layer.id === 'precipitation') {
          tileUrl = `https://tilecache.rainviewer.com/v2/radar/0/{z}/{x}/{y}/256/1_1.png`;
        } else {
          tileUrl = `https://tile.openweathermap.org/map/${layer.url}/{z}/{x}/{y}.png?appid=${apiKey}`;
        }

        // Adicionar fonte raster
        map.current!.addSource(sourceId, {
          type: 'raster',
          tiles: [tileUrl],
          tileSize: 256,
          attribution: layer.id === 'precipitation' 
            ? '© RainViewer' 
            : '© OpenWeather',
        });

        // Adicionar camada
        map.current!.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          paint: {
            'raster-opacity': 0.6,
            'raster-fade-duration': 300,
          },
        });
      } else {
        // Remover camada se desativada
        if (map.current!.getLayer(layerId)) {
          map.current!.removeLayer(layerId);
        }
        if (map.current!.getSource(sourceId)) {
          map.current!.removeSource(sourceId);
        }
      }
    });
  }, [enabledLayers]);

  return (
    <div className="relative w-full h-full">
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center bg-background/30 z-10"
          >
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
    </div>
  );
};

export default WeatherMap;
