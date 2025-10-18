import { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { initializeESRIMap } from "@/lib/mapConfig";
import { Loader2 } from "lucide-react";

interface WeatherMapProps {
  center: [number, number];
  zoom?: number;
  weatherData?: any;
}

const WeatherMap = ({ center, zoom = 8, weatherData }: WeatherMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // TODO: Adicionar overlay de dados meteorológicos quando weatherData estiver disponível
  useEffect(() => {
    if (!map.current || !weatherData) return;
    
    // Aqui poderia adicionar camadas de chuva, vento, etc.
    // Por exemplo, usando tiles do OpenWeather ou renderizando heatmaps
  }, [weatherData]);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
    </div>
  );
};

export default WeatherMap;
