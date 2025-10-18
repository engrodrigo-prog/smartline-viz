import { Badge } from '@/components/ui/badge';

interface VehicleMarkerProps {
  vehicle: any;
  onClick?: () => void;
}

const SKILL_COLORS = {
  electrician: { bg: 'hsl(217, 91%, 60%)', label: 'Eletricista', icon: '⚡' },
  technician: { bg: 'hsl(48, 96%, 53%)', label: 'Técnico', icon: '🔧' },
  leadership: { bg: 'hsl(142, 71%, 45%)', label: 'Liderança', icon: '👨‍💼' },
  support: { bg: 'hsl(271, 91%, 65%)', label: 'Suporte', icon: '🛠️' }
};

export function VehicleMarker({ vehicle, onClick }: VehicleMarkerProps) {
  const skillConfig = SKILL_COLORS[vehicle.skill_type as keyof typeof SKILL_COLORS] || SKILL_COLORS.support;
  
  return (
    <div 
      className="cursor-pointer transition-transform hover:scale-125 group relative"
      onClick={onClick}
    >
      <svg width="40" height="40" viewBox="0 0 40 40" className="drop-shadow-lg">
        <rect x="8" y="12" width="24" height="16" rx="2" fill={skillConfig.bg} stroke="white" strokeWidth="1.5"/>
        <rect x="11" y="15" width="8" height="6" rx="1" fill="rgba(255,255,255,0.3)"/>
        <rect x="21" y="15" width="8" height="6" rx="1" fill="rgba(255,255,255,0.3)"/>
        <circle cx="14" cy="30" r="3" fill="hsl(var(--muted-foreground))" stroke="white" strokeWidth="1"/>
        <circle cx="26" cy="30" r="3" fill="hsl(var(--muted-foreground))" stroke="white" strokeWidth="1"/>
        <text x="20" y="24" fontSize="10" textAnchor="middle" fill="white">{skillConfig.icon}</text>
      </svg>
      
      {vehicle.speed_kmh > 0 && (
        <div className="absolute -top-2 -right-2 bg-green-500 rounded-full w-3 h-3 animate-pulse" />
      )}
      
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <div className="bg-popover border border-border rounded-lg p-3 shadow-xl whitespace-nowrap text-xs min-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-base text-foreground">{vehicle.plate}</span>
            <Badge 
              className="text-xs"
              style={{ 
                backgroundColor: skillConfig.bg + '20', 
                color: skillConfig.bg 
              }}
            >
              {skillConfig.label}
            </Badge>
          </div>
          <div className="space-y-1 text-muted-foreground">
            <div className="flex justify-between">
              <span>Velocidade:</span>
              <span className="font-semibold text-foreground">{vehicle.speed_kmh || 0} km/h</span>
            </div>
            <div className="flex justify-between">
              <span>Combustível:</span>
              <span className="font-semibold text-foreground">{vehicle.fuel_level || 0}%</span>
            </div>
            {vehicle.assigned_team?.name && (
              <div className="flex justify-between">
                <span>Equipe:</span>
                <span className="font-semibold text-foreground">{vehicle.assigned_team.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
