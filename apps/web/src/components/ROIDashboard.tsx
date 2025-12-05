import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, TrendingDown, TrendingUp, Flame, Droplets, Wind, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function ROIDashboard() {
  const { data: metrics } = useQuery({
    queryKey: ['roi-metrics'],
    queryFn: async () => {
      if (!supabase) {
        console.warn('[ROIDashboard] Supabase não configurado; usando métricas estáticas de demonstração.');
        return [];
      }
      const { data, error } = await supabase.rpc('calculate_roi_metrics', {
        _tenant_id: null, // TODO: Get from user context
        _period_days: 30
      });

      if (error) throw error;
      return data;
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const getMetricValue = (type: string) => {
    return metrics?.find((m: any) => m.metric_type === type)?.metric_value || 0;
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    alert('Exportação PDF em desenvolvimento');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard ROI</h2>
          <p className="text-muted-foreground">Métricas operacionais e ambientais</p>
        </div>
        <Button onClick={handleExportPDF} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* NDVI Delta */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-green-600" />
              NDVI Δ30d
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(getMetricValue('ndvi_delta_avg') || -0.12).toFixed(3)}
            </div>
            <p className="text-xs text-muted-foreground">
              Variação média NDVI
            </p>
          </CardContent>
        </Card>

        {/* Fire Incidents */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-600" />
              Incêndios 24h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(getMetricValue('incendios_24h') || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Focos detectados
            </p>
          </CardContent>
        </Card>

        {/* Rainfall */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-600" />
              Chuvas 24h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              45<span className="text-sm font-normal">mm</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Precipitação acumulada
            </p>
          </CardContent>
        </Card>

        {/* Inspection Hours Saved */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              Horas Poupadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(getMetricValue('horas_inspecao_poupadas') || 0)}h
            </div>
            <p className="text-xs text-muted-foreground">
              Inspeções automatizadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Vegetação Monitorada</CardTitle>
            <CardDescription>Áreas com mudanças significativas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Vegetação Limpa</span>
                <span className="text-sm font-medium text-green-600">850 m²</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Crescimento Detectado</span>
                <span className="text-sm font-medium text-orange-600">320 m²</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Torres Analisadas</span>
                <span className="text-sm font-medium">24</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eventos Ambientais</CardTitle>
            <CardDescription>Últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Alertas Críticos</span>
                <span className="text-sm font-medium text-red-600">3</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Requer Atenção</span>
                <span className="text-sm font-medium text-yellow-600">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Resolvidos</span>
                <span className="text-sm font-medium text-green-600">45</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
