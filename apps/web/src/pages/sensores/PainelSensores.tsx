import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { SensorFiltersBar } from '@/components/sensors/SensorFiltersBar';
import { SensorCard } from '@/components/sensors/SensorCard';
import { useSensorFilters } from '@/hooks/useSensorFilters';
import { Activity } from 'lucide-react';
import MapLibreViewer from '@/components/MapLibreViewer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SENSOR_DB_ENABLED = import.meta.env.VITE_ENABLE_SENSOR_DB === 'true';

const fallbackSensors = [
  {
    id: 'sensor-orla-01',
    name: 'Sensor Microclima - Orla Gonzaga',
    sensor_type: 'Microclima',
    status: 'normal',
    region: 'Santos/SP',
    line_code: 'LT-Santos',
    latitude: -23.9673,
    longitude: -46.3291,
    temperature: 28,
    humidity: 70,
    vibration_level: null,
    noise_level: 45
  },
  {
    id: 'sensor-ponte-02',
    name: 'Sensor Estrutural - Ponte do Mar Pequeno',
    sensor_type: 'Vibração',
    status: 'warning',
    region: 'São Vicente/SP',
    line_code: 'LT-Baixada',
    latitude: -23.9776,
    longitude: -46.3804,
    temperature: 31,
    humidity: 65,
    vibration_level: 4.5,
    noise_level: 60
  }
];

export default function PainelSensores() {
  const { filters, setFilters, regions, lines } = useSensorFilters();
  const [sensors, setSensors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchSensors = useCallback(async () => {
    setLoading(true);
    
    if (!supabase || !SENSOR_DB_ENABLED) {
      setSensors(fallbackSensors);
      setLoading(false);
      return;
    }

    let query = supabase.from('sensors').select('*');
    
    if (filters.region) query = query.eq('region', filters.region);
    if (filters.lineCode) query = query.eq('line_code', filters.lineCode);
    if (filters.sensorType) query = query.eq('sensor_type', filters.sensorType);
    
    const { data, error } = await query;
    
    if (!error && data) {
      const sensorsWithReadings = await Promise.all(
        data.map(async (sensor) => {
          const { data: reading, error: readingError } = await supabase
            .from('sensor_readings')
            .select('*')
            .eq('sensor_id', sensor.id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();
          
          return readingError ? sensor : { ...sensor, ...reading };
        })
      );
      setSensors(sensorsWithReadings);
    } else {
      setSensors(fallbackSensors);
    }
    setLoading(false);
  }, [filters.lineCode, filters.region, filters.sensorType]);

  useEffect(() => {
    fetchSensors();
  }, [fetchSensors]);

  const sensorFeatures = useMemo(() => {
    return sensors
      .filter((sensor) => sensor.longitude && sensor.latitude)
      .map((sensor) => ({
        id: sensor.id,
        geometry: {
          type: 'Point',
          coordinates: [Number(sensor.longitude), Number(sensor.latitude)]
        },
        properties: {
          name: sensor.name,
          status: sensor.status,
          type: sensor.sensor_type
        }
      }));
  }, [sensors]);

  return (
    <AppLayout title="Painel de Sensores" subtitle="Monitoramento em tempo real dos sensores IoT">
      <SensorFiltersBar 
        filters={filters}
        onChange={setFilters}
        regions={regions}
        lines={lines}
      />

      {sensorFeatures.length > 0 && (
        <Card className="mb-6 border border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Distribuição geográfica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MapLibreViewer data={sensorFeatures} height="360px" />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12">Carregando sensores...</div>
      ) : sensors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum sensor encontrado. Configure sensores para começar o monitoramento.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sensors.map(sensor => (
            <SensorCard key={sensor.id} sensor={sensor} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
