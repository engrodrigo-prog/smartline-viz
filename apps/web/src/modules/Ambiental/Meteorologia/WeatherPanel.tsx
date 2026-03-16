import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cloud, Wind, Droplets, Gauge, ExternalLink, Info } from "lucide-react";
import TimelineSlider from "./TimelineSlider";
import WeatherMap from "./WeatherMap";
import { useWeather } from "@/hooks/useWeather";
import ModuleLayout from "@/components/ModuleLayout";
import FloatingFiltersBar from "@/components/FloatingFiltersBar";
import { Loader2 } from "lucide-react";
import { WeatherLayerSelector, DEFAULT_WEATHER_LAYERS, WeatherLayer } from "./WeatherLayerSelector";
import { WeatherLegend } from "./WeatherLegend";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type WeatherMode = 'openweather' | 'ventusky';

const WeatherPanel = () => {
  const [mode, setMode] = useState<WeatherMode>(() => {
    const saved = localStorage.getItem('smartline_weather_mode');
    if (saved === 'ventusky') return saved;
    return 'openweather';
  });

  const [intervalValue, setIntervalValue] = useState<'1h' | '3h' | '6h' | '24h'>('1h');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isPlaying, setIsPlaying] = useState(false);
  const [weatherLayers, setWeatherLayers] = useState<WeatherLayer[]>(DEFAULT_WEATHER_LAYERS);

  const handleLayerToggle = (layerId: string) => {
    setWeatherLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, enabled: !layer.enabled } : layer
      )
    );
  };

  const enabledLayerIds = weatherLayers.filter(l => l.enabled).map(l => l.id);

  // Santos, SP como padrão
  const center: [number, number] = [-46.33, -23.96];
  const ventuskyUrl = `https://www.ventusky.com/?p=${center[1]};${center[0]};8`;
  const ventuskyEmbedUrl =
    `https://embed.ventusky.com/?p=${center[1]};${center[0]};8&l=temperature-2m&w=soft&pin=${center[1]};${center[0]};dot;Santos`;
  
  const { data: weatherData, isLoading } = useWeather({
    lat: -23.96,
    lon: -46.33,
  });

  // Range de -7 dias até +72h
  const minTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const maxTime = Date.now() + 72 * 60 * 60 * 1000;

  // Auto-play timeline
  useEffect(() => {
    if (!isPlaying) return;

    const intervalId = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + 60 * 60 * 1000; // +1 hora
        if (next > maxTime) {
          setIsPlaying(false);
          return minTime;
        }
        return next;
      });
    }, 500);

    return () => clearInterval(intervalId);
  }, [isPlaying, maxTime, minTime]);

  const handleModeChange = (newMode: string) => {
    setMode(newMode as WeatherMode);
    localStorage.setItem('smartline_weather_mode', newMode);
  };

  return (
    <ModuleLayout title="Meteorologia" icon={Cloud}>
      <div className="p-6 space-y-4 h-full flex flex-col">
        <FloatingFiltersBar />
        
        {/* Seletor de modo */}
        <div className="flex justify-between items-center">
          <Tabs value={mode} onValueChange={handleModeChange}>
            <TabsList>
              <TabsTrigger value="openweather">OpenWeather API</TabsTrigger>
              <TabsTrigger value="ventusky">Ventusky Embed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Seletor de Camadas */}
        {mode === 'openweather' && (
          <WeatherLayerSelector layers={weatherLayers} onLayerToggle={handleLayerToggle} />
        )}

        {/* Dados meteorológicos atuais */}
        {mode === 'openweather' && weatherData && (
          <div className="grid grid-cols-4 gap-4">
            <div className="tech-card p-4 flex items-center gap-3">
              <Cloud className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{weatherData.current.temp.toFixed(1)}°C</p>
                <p className="text-sm text-muted-foreground">Temperatura</p>
              </div>
            </div>
            <div className="tech-card p-4 flex items-center gap-3">
              <Wind className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{weatherData.current.wind_speed.toFixed(1)} m/s</p>
                <p className="text-sm text-muted-foreground">Vento</p>
              </div>
            </div>
            <div className="tech-card p-4 flex items-center gap-3">
              <Droplets className="w-8 h-8 text-cyan-500" />
              <div>
                <p className="text-2xl font-bold">{weatherData.current.humidity}%</p>
                <p className="text-sm text-muted-foreground">Umidade</p>
              </div>
            </div>
            <div className="tech-card p-4 flex items-center gap-3">
              <Gauge className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">
                  {weatherData.current.rain?.['1h']?.toFixed(1) || 0} mm
                </p>
                <p className="text-sm text-muted-foreground">Chuva (1h)</p>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        {mode === 'openweather' && (
          <TimelineSlider
            minTime={minTime}
            maxTime={maxTime}
            currentTime={currentTime}
            onTimeChange={setCurrentTime}
            interval={intervalValue}
            onIntervalChange={setIntervalValue}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
          />
        )}

        {/* Mapa */}
        <div className="flex-1 min-h-[600px] relative">
          {mode === 'openweather' ? (
            isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <WeatherMap 
                  center={center} 
                  weatherData={weatherData}
                  currentTime={new Date(currentTime)}
                  intervalValue={parseInt(intervalValue)}
                  enabledLayers={weatherLayers}
                />
                <WeatherLegend visibleLayers={enabledLayerIds} />
              </>
            )
          ) : (
            <div className="h-full space-y-4">
              <Alert className="border-border/60 bg-background/80">
                <Info className="h-4 w-4" />
                <AlertTitle>Embed oficial do Ventusky</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <span>
                    Esta visualização usa o endpoint oficial de embed do Ventusky. Se a sua rede
                    corporativa bloquear o conteúdo externo, abra a ferramenta em nova aba.
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <a href={ventuskyUrl} target="_blank" rel="noreferrer">
                      Abrir externo
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </AlertDescription>
              </Alert>

              <iframe
                src={ventuskyEmbedUrl}
                className="h-[calc(100%-72px)] min-h-[600px] w-full rounded-lg border border-border bg-background"
                title="Ventusky Weather Embed"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          )}
        </div>
      </div>
    </ModuleLayout>
  );
};

export default WeatherPanel;
