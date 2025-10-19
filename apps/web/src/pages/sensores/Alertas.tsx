import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle } from 'lucide-react';

export default function Alertas() {
  const [alerts] = useState<any[]>([
    {
      id: 1,
      sensor: 'Torre Norte - Setor A',
      type: 'temperature',
      severity: 'warning',
      message: 'Temperatura acima do normal',
      timestamp: new Date(),
      value: 35.2
    },
    {
      id: 2,
      sensor: 'Subestação Central',
      type: 'vibration',
      severity: 'critical',
      message: 'Vibração excessiva detectada',
      timestamp: new Date(),
      value: 8.9
    }
  ]);

  return (
    <AppLayout title="Alertas de Sensores" subtitle="Notificações e eventos críticos">
      {alerts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum alerta registrado no momento.
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => (
            <Card key={alert.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {alert.severity === 'critical' ? (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Bell className="w-5 h-5 text-yellow-500" />
                    )}
                    <div>
                      <CardTitle className="text-base">{alert.sensor}</CardTitle>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                    </div>
                  </div>
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                    {alert.severity}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {alert.timestamp.toLocaleString('pt-BR')}
                  </span>
                  <span className="font-semibold">Valor: {alert.value}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
