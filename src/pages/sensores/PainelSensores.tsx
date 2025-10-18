import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { SensorFiltersBar } from '@/components/sensors/SensorFiltersBar';
import { SensorCard } from '@/components/sensors/SensorCard';
import { useSensorFilters } from '@/hooks/useSensorFilters';
import { Activity } from 'lucide-react';

export default function PainelSensores() {
  const { filters, setFilters, regions, lines } = useSensorFilters();
  const [sensors, setSensors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSensors();
  }, [filters]);

  const fetchSensors = async () => {
    setLoading(true);
    
    let query = supabase.from('sensors').select('*');
    
    if (filters.region) query = query.eq('region', filters.region);
    if (filters.lineCode) query = query.eq('line_code', filters.lineCode);
    if (filters.sensorType) query = query.eq('sensor_type', filters.sensorType);
    
    const { data, error } = await query;
    
    if (!error && data) {
      const sensorsWithReadings = await Promise.all(
        data.map(async (sensor) => {
          const { data: reading } = await supabase
            .from('sensor_readings')
            .select('*')
            .eq('sensor_id', sensor.id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();
          
          return { ...sensor, ...reading };
        })
      );
      setSensors(sensorsWithReadings);
    }
    
    setLoading(false);
  };

  return (
    <AppLayout title="Painel de Sensores" subtitle="Monitoramento em tempo real dos sensores IoT">
      <SensorFiltersBar 
        filters={filters}
        onChange={setFilters}
        regions={regions}
        lines={lines}
      />

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
