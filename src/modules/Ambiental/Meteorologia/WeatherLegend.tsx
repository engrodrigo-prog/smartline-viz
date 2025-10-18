import { Card } from '@/components/ui/card';

interface WeatherLegendProps {
  visibleLayers: string[];
}

export const WeatherLegend = ({ visibleLayers }: WeatherLegendProps) => {
  const legends: Record<string, { title: string; gradient: string; min: string; max: string }> = {
    precipitation: {
      title: 'Precipitação (mm)',
      gradient: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, #a8e6ff 25%, #4fb3ff 50%, #0066cc 75%, #003d7a 100%)',
      min: '0',
      max: '100',
    },
    temperature: {
      title: 'Temperatura (°C)',
      gradient: 'linear-gradient(90deg, #0000ff 0%, #00ffff 25%, #00ff00 50%, #ffff00 75%, #ff0000 100%)',
      min: '-10',
      max: '+40',
    },
    wind: {
      title: 'Vento (km/h)',
      gradient: 'linear-gradient(90deg, #e0f7fa 0%, #80deea 33%, #26c6da 66%, #0097a7 100%)',
      min: '0',
      max: '120',
    },
    clouds: {
      title: 'Nuvens (%)',
      gradient: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, #b0bec5 50%, #607d8b 100%)',
      min: '0',
      max: '100',
    },
    pressure: {
      title: 'Pressão (hPa)',
      gradient: 'linear-gradient(90deg, #ffccbc 0%, #ff8a65 33%, #ff5722 66%, #d32f2f 100%)',
      min: '950',
      max: '1050',
    },
  };

  const activeLegends = visibleLayers.filter(layerId => legends[layerId]);

  if (activeLegends.length === 0) return null;

  return (
    <Card className="absolute bottom-4 right-4 p-4 space-y-3 bg-card/95 backdrop-blur-sm z-10 w-64">
      <h3 className="text-sm font-semibold text-foreground">Legenda</h3>
      {activeLegends.map((layerId) => {
        const legend = legends[layerId];
        return (
          <div key={layerId} className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{legend.title}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{legend.min}</span>
              <div
                className="h-4 flex-1 rounded-sm"
                style={{ background: legend.gradient }}
              />
              <span className="text-xs text-muted-foreground">{legend.max}</span>
            </div>
          </div>
        );
      })}
    </Card>
  );
};
