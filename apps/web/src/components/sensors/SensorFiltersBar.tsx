import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Clock, MapPin, Activity } from "lucide-react";
import { TimeRange } from "@/hooks/useSensorFilters";

interface Props {
  filters: any;
  onChange: (filters: any) => void;
  regions: string[];
  lines: any[];
}

export function SensorFiltersBar({ filters, onChange, regions, lines }: Props) {
  return (
    <div className="tech-card p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4" />
            Região
          </Label>
          <Select 
            value={filters.region || 'all'} 
            onValueChange={(value) => onChange({ ...filters, region: value === 'all' ? undefined : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas as regiões" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as regiões</SelectItem>
              {regions.map(r => <SelectItem key={r} value={r}>Região {r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4" />
            Linha
          </Label>
          <Select 
            value={filters.lineCode || 'all'} 
            onValueChange={(value) => onChange({ ...filters, lineCode: value === 'all' ? undefined : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas as linhas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as linhas</SelectItem>
              {lines.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4" />
            Período
          </Label>
          <Select 
            value={filters.timeRange} 
            onValueChange={(value) => onChange({ ...filters, timeRange: value as TimeRange })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realtime">Tempo Real</SelectItem>
              <SelectItem value="1h">Última Hora</SelectItem>
              <SelectItem value="6h">Últimas 6 Horas</SelectItem>
              <SelectItem value="24h">Últimas 24 Horas</SelectItem>
              <SelectItem value="7d">Últimos 7 Dias</SelectItem>
              <SelectItem value="30d">Últimos 30 Dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4" />
            Tipo
          </Label>
          <Select 
            value={filters.sensorType || 'all'} 
            onValueChange={(value) => onChange({ ...filters, sensorType: value === 'all' ? undefined : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="meteorological">Meteorológico</SelectItem>
            <SelectItem value="structural">Estrutural</SelectItem>
            <SelectItem value="camera_iot">Câmera + IoT</SelectItem>
            <SelectItem value="corrosion">Corrosão</SelectItem>
            <SelectItem value="temperature">🌡️ Temperatura</SelectItem>
            <SelectItem value="vibration">📳 Vibração</SelectItem>
            <SelectItem value="noise">🔊 Ruído</SelectItem>
            <SelectItem value="perimeter_alarm">🚨 Alarme Perimetral</SelectItem>
            <SelectItem value="presence_camera">👁️ Presença (Câmera)</SelectItem>
            <SelectItem value="short_circuit">⚡ Curto-Circuito</SelectItem>
          </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
