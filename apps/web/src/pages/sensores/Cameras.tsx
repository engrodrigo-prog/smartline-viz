import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { SensorFiltersBar } from '@/components/sensors/SensorFiltersBar';
import { useSensorFilters } from '@/hooks/useSensorFilters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Play, Clock } from 'lucide-react';

export default function Cameras() {
  const { filters, setFilters, regions, lines } = useSensorFilters();
  const [cameras, setCameras] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'live' | 'historic'>('live');

  useEffect(() => {
    fetchCameras();
  }, [filters]);

  const fetchCameras = async () => {
    let query = supabase.from('cameras').select('*');
    
    if (filters.region) query = query.eq('region', filters.region);
    if (filters.lineCode) query = query.eq('line_code', filters.lineCode);
    
    const { data } = await query;
    if (data) setCameras(data);
  };

  return (
    <AppLayout title="Câmeras" subtitle="Monitoramento visual em tempo real e histórico">
      <SensorFiltersBar 
        filters={filters}
        onChange={setFilters}
        regions={regions}
        lines={lines}
      />

      <div className="tech-card p-4 mb-6">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList>
            <TabsTrigger value="live">
              <Play className="w-4 h-4 mr-2" />
              Tempo Real
            </TabsTrigger>
            <TabsTrigger value="historic">
              <Clock className="w-4 h-4 mr-2" />
              Gravações Históricas
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {cameras.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma câmera encontrada. Configure câmeras para começar o monitoramento visual.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cameras.map(camera => (
            <Card key={camera.id} className="cursor-pointer hover:border-primary/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{camera.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{camera.camera_type}</p>
                  </div>
                  <Badge variant={camera.status === 'online' ? 'default' : 'destructive'}>
                    {camera.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-secondary rounded-lg mb-3 flex items-center justify-center">
                  {camera.thumbnail_url ? (
                    <img src={camera.thumbnail_url} alt={camera.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Camera className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Região {camera.region} • {camera.line_code || 'Sem linha'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
