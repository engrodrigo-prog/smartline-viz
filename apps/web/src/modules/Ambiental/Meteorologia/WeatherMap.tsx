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
  const [layerErrors, setLayerErrors] = useState<string[]>([]);
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
    if (!map.current) return;

    const applyLayers = () => {
      const openWeatherTileKey =
        import.meta.env.VITE_OPENWEATHER_TILE_KEY ||
        import.meta.env.VITE_OPENWEATHER_API_KEY ||
        '';
      const rainviewerTileUrl = import.meta.env.VITE_RAINVIEWER_TILE_URL?.trim();

      const newErrors: string[] = [];

      const addError = (message: string) => {
        if (!newErrors.includes(message)) {
          newErrors.push(message);
        }
      };

      enabledLayers.forEach((layer) => {
        const sourceId = `weather-${layer.id}`;
        const layerId = `weather-layer-${layer.id}`;

        if (layer.enabled) {
          // Remover camada existente para garantir atualização
          if (map.current!.getLayer(layerId)) {
            map.current!.removeLayer(layerId);
          }
          if (map.current!.getSource(sourceId)) {
            map.current!.removeSource(sourceId);
          }

          let tileUrl = '';
          if (layer.id === 'precipitation') {
            if (!rainviewerTileUrl) {
              addError(
                'Camada de precipitação indisponível. Defina VITE_RAINVIEWER_TILE_URL com um servidor autorizado (ex.: proxy próprio).' 
              );
              return;
            }
            tileUrl = rainviewerTileUrl;
          } else {
            if (!openWeatherTileKey || openWeatherTileKey === 'demo') {
              addError(
                'Camadas de temperatura, vento, nuvens e pressão requerem VITE_OPENWEATHER_TILE_KEY (ou VITE_OPENWEATHER_API_KEY) válido.'
              );
              return;
            }
            tileUrl = `https://tile.openweathermap.org/map/${layer.url}/{z}/{x}/{y}.png?appid=${openWeatherTileKey}`;
          }

          map.current!.addSource(sourceId, {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: 256,
            attribution:
              layer.id === 'precipitation'
                ? '© RainViewer'
                : '© OpenWeather',
          });

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
          if (map.current!.getLayer(layerId)) {
            map.current!.removeLayer(layerId);
          }
          if (map.current!.getSource(sourceId)) {
            map.current!.removeSource(sourceId);
          }
        }
      });

      setLayerErrors(newErrors);
    };

    if (!map.current.isStyleLoaded()) {
      const handleStyleLoad = () => {
        setIsLoading(false);
        applyLayers();
      };
      map.current.once('style.load', handleStyleLoad);
      return () => {
        try {
          map.current?.off('style.load', handleStyleLoad);
        } catch {
          /* ignore */
        }
      };
    }

    applyLayers();
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
      {layerErrors.length > 0 && (
        <div className="absolute bottom-4 left-4 max-w-sm rounded-md border border-border/70 bg-background/90 backdrop-blur p-3 text-xs text-muted-foreground shadow-lg">
          <strong className="block text-foreground mb-1">Camadas desativadas</strong>
          <ul className="space-y-1 list-disc pl-4">
            {layerErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default WeatherMap;
