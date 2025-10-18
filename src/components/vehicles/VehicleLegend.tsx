import { Card } from '@/components/ui/card';

const SKILL_COLORS = {
  electrician: { bg: 'hsl(217, 91%, 60%)', label: 'Eletricistas', icon: '⚡' },
  technician: { bg: 'hsl(48, 96%, 53%)', label: 'Técnicos', icon: '🔧' },
  leadership: { bg: 'hsl(142, 71%, 45%)', label: 'Liderança', icon: '👨‍💼' },
  support: { bg: 'hsl(271, 91%, 65%)', label: 'Suporte', icon: '🛠️' }
};

export function VehicleLegend() {
  return (
    <Card className="absolute top-4 right-4 p-3 bg-background/95 backdrop-blur z-10 shadow-lg">
      <h3 className="text-xs font-semibold mb-2 text-foreground">Tipos de Equipe</h3>
      <div className="space-y-1.5">
        {Object.entries(SKILL_COLORS).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-sm border border-white"
              style={{ backgroundColor: config.bg }}
            />
            <span className="text-xs text-foreground">
              {config.icon} {config.label}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
