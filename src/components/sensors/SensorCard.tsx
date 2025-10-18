import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, CheckCircle } from "lucide-react";

interface Props {
  sensor: any;
  onClick?: () => void;
}

export function SensorCard({ sensor, onClick }: Props) {
  const statusConfig = {
    normal: { color: 'text-green-500', bg: 'bg-green-500/20', icon: CheckCircle },
    warning: { color: 'text-yellow-500', bg: 'bg-yellow-500/20', icon: AlertTriangle },
    critical: { color: 'text-red-500', bg: 'bg-red-500/20', icon: AlertTriangle }
  };

  const config = statusConfig[sensor.status as keyof typeof statusConfig] || statusConfig.normal;
  const StatusIcon = config.icon;

  return (
    <Card 
      className="cursor-pointer hover:border-primary/50 transition-all"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{sensor.name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{sensor.sensor_type}</p>
          </div>
          <div className={`p-2 ${config.bg} rounded-lg`}>
            <StatusIcon className={`w-5 h-5 ${config.color}`} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {sensor.temperature && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Temperatura</span>
              <span className="text-sm font-semibold">{sensor.temperature}°C</span>
            </div>
          )}
          {sensor.humidity && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Umidade</span>
              <span className="text-sm font-semibold">{sensor.humidity}%</span>
            </div>
          )}
          {sensor.vibration_level && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Vibração</span>
              <span className="text-sm font-semibold">{sensor.vibration_level} Hz</span>
            </div>
          )}
          
          <Badge variant={sensor.status === 'critical' ? 'destructive' : 'secondary'} className="w-full justify-center">
            {sensor.status === 'normal' && 'Normal'}
            {sensor.status === 'warning' && 'Atenção'}
            {sensor.status === 'critical' && 'Crítico'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
