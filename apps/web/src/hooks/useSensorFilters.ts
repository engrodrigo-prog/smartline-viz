import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TimeRange = 'realtime' | '1h' | '6h' | '24h' | '7d' | '30d';

interface SensorFilters {
  region?: string;
  lineCode?: string;
  timeRange: TimeRange;
  sensorType?: string;
  status?: string;
}

const SENSOR_DB_ENABLED = import.meta.env.VITE_ENABLE_SENSOR_DB === 'true';
const FALLBACK_REGIONS = ['Santos/SP', 'Praia Grande/SP', 'São Vicente/SP', 'Guarujá/SP'];
const FALLBACK_LINES = [
  { id: 'LT-Santos', name: 'LT-Santos' },
  { id: 'LT-Baixada', name: 'LT-Baixada Santista' },
  { id: 'LT-Litoral-Sul', name: 'LT-Litoral-Sul' },
];

export function useSensorFilters() {
  const [filters, setFilters] = useState<SensorFilters>({
    timeRange: 'realtime'
  });
  
  const [regions, setRegions] = useState<string[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchOptions = async () => {
      if (!supabase || !SENSOR_DB_ENABLED) {
        setRegions(FALLBACK_REGIONS);
        setLines(FALLBACK_LINES);
        return;
      }
      const { data: sensors, error } = await supabase.from('sensors').select('region, line_code');
      if (!error && sensors) {
        const uniqueRegions = [...new Set(sensors.map(s => s.region).filter(Boolean))];
        const uniqueLines = [...new Set(sensors.map(s => s.line_code).filter(Boolean))];
        setRegions(uniqueRegions);
        setLines(uniqueLines.map(code => ({ id: code, name: code })));
      } else {
        setRegions(FALLBACK_REGIONS);
        setLines(FALLBACK_LINES);
      }
    };
    fetchOptions();
  }, []);
  
  return { filters, setFilters, regions, lines };
}
