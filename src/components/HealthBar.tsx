import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  error_message?: string;
  last_check: string;
}

export function HealthBar() {
  const { data: healthData } = useQuery({
    queryKey: ['health-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('health_cache')
        .select('*')
        .order('last_check', { ascending: false });
      
      if (error) throw error;
      return data as HealthStatus[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (!healthData || healthData.length === 0) {
    return null;
  }

  const services = {
    openweather: 'OpenWeather',
    firms: 'FIRMS',
    storage: 'Storage',
    database: 'Database'
  };

  const overallHealthy = healthData.every(s => s.status === 'healthy');
  const anyDown = healthData.some(s => s.status === 'down');

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-background/95 backdrop-blur border rounded-lg shadow-lg p-2 min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          {overallHealthy ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : anyDown ? (
            <XCircle className="w-4 h-4 text-red-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-yellow-500" />
          )}
          <span className="text-xs font-medium">
            {overallHealthy ? 'Todos os serviços operacionais' : 'Problemas detectados'}
          </span>
        </div>

        <div className="space-y-1">
          {healthData.map((health) => (
            <div key={health.service} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {services[health.service as keyof typeof services] || health.service}
              </span>
              <div className="flex items-center gap-1">
                {health.status === 'healthy' && (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                )}
                {health.status === 'degraded' && (
                  <AlertCircle className="w-3 h-3 text-yellow-500" />
                )}
                {health.status === 'down' && (
                  <XCircle className="w-3 h-3 text-red-500" />
                )}
                <span 
                  className={`text-xs ${
                    health.status === 'healthy' ? 'text-green-600' :
                    health.status === 'degraded' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}
                >
                  {health.status === 'healthy' ? 'OK' :
                   health.status === 'degraded' ? 'Lento' : 'Fora'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 pt-2 border-t">
          <p className="text-[10px] text-muted-foreground">
            Atualizado há {Math.round((Date.now() - new Date(healthData[0]?.last_check || Date.now()).getTime()) / 1000 / 60)} min
          </p>
        </div>
      </div>
    </div>
  );
}
