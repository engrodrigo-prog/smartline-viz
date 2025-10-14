import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Map } from "lucide-react";

interface BasemapSelectorProps {
  value: string;
  onChange: (style: string) => void;
}

export const BasemapSelector = ({ value, onChange }: BasemapSelectorProps) => {
  const styles = [
    { 
      id: 'satellite-streets-v12', 
      name: 'Satélite + Rodovias', 
      icon: '🛰️🛣️',
      description: 'Completo' 
    },
    { 
      id: 'satellite-v9', 
      name: 'Satélite Puro', 
      icon: '🛰️',
      description: 'Sem rodovias' 
    },
    { 
      id: 'streets-v12', 
      name: 'Ruas', 
      icon: '🗺️',
      description: 'Vetorial' 
    },
    { 
      id: 'outdoors-v12', 
      name: 'Topográfico', 
      icon: '⛰️',
      description: 'Relevo' 
    },
    { 
      id: 'dark-v11', 
      name: 'Escuro', 
      icon: '🌙',
      description: 'Modo noturno' 
    },
    { 
      id: 'light-v11', 
      name: 'Claro', 
      icon: '☀️',
      description: 'Modo diurno' 
    }
  ];
  
  return (
    <div className="absolute top-4 left-4 z-10 bg-background/95 backdrop-blur rounded-lg shadow-lg border border-border p-3 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <Map className="w-4 h-4 text-muted-foreground" />
        <label className="text-xs font-medium text-foreground">Estilo do Mapa</label>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {styles.map(style => (
            <SelectItem key={style.id} value={style.id} className="text-xs">
              <div className="flex flex-col">
                <span className="flex items-center gap-2">
                  <span>{style.icon}</span>
                  <span className="font-medium">{style.name}</span>
                </span>
                <span className="text-[10px] text-muted-foreground">{style.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
