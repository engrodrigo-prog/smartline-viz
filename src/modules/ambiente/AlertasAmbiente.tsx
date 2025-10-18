import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCard } from '@/components/ambiente/AlertCard';
import { useAmbienteAlerts, useAcknowledgeAlert } from '@/hooks/useAmbienteAlerts';
import { Bell, AlertTriangle } from 'lucide-react';

export default function AlertasAmbiente() {
  const { data: alerts = [], isLoading } = useAmbienteAlerts({ status: 'open' });
  const { mutate: acknowledgeAlert } = useAcknowledgeAlert();

  const criticalCount = alerts.filter((a: any) => a.severity === 'critical').length;
  const highCount = alerts.filter((a: any) => a.severity === 'high').length;

  return (
    <div className="space-y-6">
      {/* Contador de Alertas */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Total Abertos</div>
                <div className="text-3xl font-bold">{alerts.length}</div>
              </div>
              <Bell className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Críticos</div>
                <div className="text-3xl font-bold text-red-500">{criticalCount}</div>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Alta Prioridade</div>
                <div className="text-3xl font-bold text-orange-500">{highCount}</div>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Alertas */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando alertas...</p>
          ) : alerts.length === 0 ? (
            <p className="text-muted-foreground">Nenhum alerta em aberto</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert: any) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={() => acknowledgeAlert({ alertId: alert.id })}
                  onGoToPoint={() => console.log('Go to point:', alert.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
