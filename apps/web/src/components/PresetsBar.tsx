import { Button } from '@/components/ui/button';
import { RotateCcw, Zap, Leaf, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Preset {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  layers: string[];
}

const PRESETS: Preset[] = [
  {
    id: 'operacao',
    name: 'Operação',
    icon: <Zap className="w-4 h-4" />,
    description: 'Linhas, torres e veículos',
    layers: ['linhas', 'estruturas', 'vehicles']
  },
  {
    id: 'ambiental',
    name: 'Ambiental',
    icon: <Leaf className="w-4 h-4" />,
    description: 'FIRMS, vegetação e limites',
    layers: ['firms', 'vegetacao', 'queimadas_footprints', 'uf', 'municipios', 'ramal_marape']
  },
  {
    id: 'risco',
    name: 'Risco',
    icon: <AlertTriangle className="w-4 h-4" />,
    description: 'Erosão, invasões e corrosão',
    layers: ['erosao', 'invasao_faixa', 'corrosao', 'estruturas']
  }
];

interface PresetsBarProps {
  onPresetSelect?: (preset: Preset) => void;
  onResetDemo?: () => void;
}

export function PresetsBar({ onPresetSelect, onResetDemo }: PresetsBarProps) {
  const handlePresetClick = async (preset: Preset) => {
    // Log telemetry
    await supabase.from('telemetry_events').insert({
      event_type: 'preset_selected',
      event_data: {
        preset_id: preset.id,
        preset_name: preset.name
      }
    });

    toast.success(`Preset "${preset.name}" ativado`, {
      description: preset.description
    });

    if (onPresetSelect) {
      onPresetSelect(preset);
    }
  };

  const handleResetDemo = async () => {
    // Log telemetry
    await supabase.from('telemetry_events').insert({
      event_type: 'demo_reset',
      event_data: {
        timestamp: new Date().toISOString()
      }
    });

    // Reset to Santos/SP demo state
    const santos = { lat: -23.96, lng: -46.333, zoom: 12 };
    
    toast.success('Demo resetado', {
      description: 'Retornando para Santos/SP com camadas padrão'
    });

    if (onResetDemo) {
      onResetDemo();
    } else {
      // Fallback: reload page
      window.location.href = '/?demo=santos';
    }
  };

  return (
    <div className="fixed top-20 left-4 z-40 flex flex-col gap-2 bg-background/95 backdrop-blur p-3 rounded-lg border shadow-lg">
      <div className="text-xs font-medium text-muted-foreground mb-1">
        Presets
      </div>
      
      {PRESETS.map((preset) => (
        <Button
          key={preset.id}
          variant="outline"
          size="sm"
          className="justify-start gap-2 w-full"
          onClick={() => handlePresetClick(preset)}
          title={preset.description}
        >
          {preset.icon}
          <span className="text-xs">{preset.name}</span>
        </Button>
      ))}

      <div className="border-t my-2" />

      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2 w-full text-orange-600 hover:text-orange-700"
        onClick={handleResetDemo}
        title="Restaurar estado de demonstração (Santos/SP)"
      >
        <RotateCcw className="w-4 h-4" />
        <span className="text-xs">Reset Demo</span>
      </Button>
    </div>
  );
}
