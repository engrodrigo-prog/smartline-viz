import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WeatherParams {
  lat: number;
  lon: number;
  roi_id?: string;
}

export interface WeatherData {
  current: {
    temp: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    wind_deg: number;
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    rain?: {
      '1h'?: number;
      '3h'?: number;
    };
  };
  hourly: Array<{
    dt: number;
    temp: number;
    rain?: {
      '1h'?: number;
    };
    wind_speed: number;
    wind_deg: number;
  }>;
  daily: Array<{
    dt: number;
    temp: {
      min: number;
      max: number;
    };
    rain?: number;
    wind_speed: number;
  }>;
}

export const useWeather = ({ lat, lon, roi_id }: WeatherParams) => {
  return useQuery<WeatherData>({
    queryKey: ['weather', lat, lon, roi_id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('weather_fetch', {
        body: { lat, lon, roi_id }
      });

      if (error) throw error;
      return data as WeatherData;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    refetchInterval: 10 * 60 * 1000, // Refetch a cada 10 min
    enabled: !!lat && !!lon,
  });
};
