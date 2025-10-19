import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Clock, 
  MapPin, 
  Maximize, 
  CheckCircle,
  UserPlus 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Alert {
  id: string;
  ts: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  kind: string;
  message: string;
  description?: string;
  line_code?: string;
  area_affected_m2?: number;
  evidence_url?: string;
  action_json?: {
    recommended_action?: string;
    priority?: string;
    assign_to?: string;
  };
}

interface AlertCardProps {
  alert: Alert;
  onAcknowledge: () => void;
  onGoToPoint: () => void;
}

export function AlertCard({ alert, onAcknowledge, onGoToPoint }: AlertCardProps) {
  const severityConfig = {
    critical: { color: 'text-destructive', bg: 'bg-destructive/20', icon: AlertTriangle },
    high: { color: 'text-orange-500', bg: 'bg-orange-500/20', icon: AlertTriangle },
    medium: { color: 'text-yellow-500', bg: 'bg-yellow-500/20', icon: AlertCircle },
    low: { color: 'text-blue-500', bg: 'bg-blue-500/20', icon: Info }
  };

  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="pt-6">
        <div className="flex gap-4">
          {/* Ícone de Severidade */}
          <div className={`p-3 rounded-lg ${config.bg} h-fit`}>
            <Icon className={`w-6 h-6 ${config.color}`} />
          </div>

          {/* Conteúdo */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg">{alert.message}</h3>
                {alert.description && (
                  <p className="text-sm text-muted-foreground">{alert.description}</p>
                )}
              </div>
              <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                {alert.severity.toUpperCase()}
              </Badge>
            </div>

            {/* Metadados */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(alert.ts), { addSuffix: true, locale: ptBR })}
              </span>
              {alert.line_code && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {alert.line_code}
                </span>
              )}
              {alert.area_affected_m2 && (
                <span className="flex items-center gap-1">
                  <Maximize className="w-3 h-3" />
                  {alert.area_affected_m2.toFixed(0)} m²
                </span>
              )}
            </div>

            {/* Evidência Visual */}
            {alert.evidence_url && (
              <img
                src={alert.evidence_url}
                alt="Evidência"
                className="w-full h-32 object-cover rounded-lg mb-3"
              />
            )}

            {/* Ações */}
            <div className="flex gap-2">
              <Button size="sm" variant="default" onClick={onGoToPoint}>
                <MapPin className="w-4 h-4 mr-2" />
                Ir ao Ponto
              </Button>

              <Button size="sm" variant="outline" onClick={onAcknowledge}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Reconhecer
              </Button>

              {alert.action_json?.assign_to && (
                <Button size="sm" variant="secondary">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Atribuir a {alert.action_json.assign_to}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
