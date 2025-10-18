import { useState } from 'react';
import { CloudRain, Thermometer, Wind, Cloud, Gauge } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';

export interface WeatherLayer {
  id: string;
  name: string;
  icon: typeof CloudRain;
  enabled: boolean;
  url: string;
}

interface WeatherLayerSelectorProps {
  layers: WeatherLayer[];
  onLayerToggle: (layerId: string) => void;
}

export const WeatherLayerSelector = ({ layers, onLayerToggle }: WeatherLayerSelectorProps) => {
  return (
    <Card className="p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground mb-3">Camadas Meteorológicas</h3>
      {layers.map((layer) => {
        const Icon = layer.icon;
        return (
          <div key={layer.id} className="flex items-center gap-3">
            <Checkbox
              id={layer.id}
              checked={layer.enabled}
              onCheckedChange={() => onLayerToggle(layer.id)}
            />
            <Label
              htmlFor={layer.id}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <Icon className="w-4 h-4 text-primary" />
              {layer.name}
            </Label>
          </div>
        );
      })}
    </Card>
  );
};

export const DEFAULT_WEATHER_LAYERS: WeatherLayer[] = [
  { id: 'precipitation', name: 'Precipitação', icon: CloudRain, enabled: true, url: 'precipitation_new' },
  { id: 'temperature', name: 'Temperatura', icon: Thermometer, enabled: false, url: 'temp_new' },
  { id: 'wind', name: 'Vento', icon: Wind, enabled: false, url: 'wind_new' },
  { id: 'clouds', name: 'Nuvens', icon: Cloud, enabled: false, url: 'clouds_new' },
  { id: 'pressure', name: 'Pressão', icon: Gauge, enabled: false, url: 'pressure_new' },
];
