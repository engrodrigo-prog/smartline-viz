import { Zap, Radio, Activity, AlertTriangle, Trees, Home, Building2, Flame, MapPin } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { Checkbox as CheckboxUI } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export interface Layer {
  id: string;
  name: string;
  icon: LucideIcon;
  visible: boolean;
  count?: number;
  filename?: string; // Para camadas base (IBGE)
}

interface LayerSelectorProps {
  layers: Layer[];
  onToggleLayer: (layerId: string) => void;
  baseLayers?: Layer[];
  onToggleBaseLayer?: (layerId: string) => void;
}

const LayerSelector = ({ layers, onToggleLayer, baseLayers, onToggleBaseLayer }: LayerSelectorProps) => {
  return (
    <div className="tech-card p-4 space-y-3">
      <h3 className="text-lg font-semibold mb-4">Camadas Operacionais</h3>
      
      {layers.map((layer) => {
        const Icon = layer.icon;
        return (
          <div
            key={layer.id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => onToggleLayer(layer.id)}
          >
            <div className="flex items-center gap-3 flex-1">
              <CheckboxUI 
                checked={layer.visible} 
                onCheckedChange={() => onToggleLayer(layer.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{layer.name}</span>
            </div>
            
            {layer.count !== undefined && (
              <Badge variant="secondary" className="ml-2">
                {layer.count}
              </Badge>
            )}
          </div>
        );
      })}

      {baseLayers && baseLayers.length > 0 && onToggleBaseLayer && (
        <>
          <Separator className="my-4" />
          <h3 className="text-lg font-semibold mb-4">Camadas Base (IBGE)</h3>
          {baseLayers.map((layer) => {
            const Icon = layer.icon;
            return (
              <div
                key={layer.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => onToggleBaseLayer(layer.id)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <CheckboxUI
                    checked={layer.visible}
                    onCheckedChange={() => onToggleBaseLayer(layer.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{layer.name}</span>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default LayerSelector;

export const DEFAULT_LAYERS: Layer[] = [
  { id: 'linhas', name: 'Linhas de Transmissão', icon: Zap, visible: true },
  { id: 'torres', name: 'Torres/Apoios', icon: Radio, visible: true },
  { id: 'sensores', name: 'Sensores', icon: Activity, visible: false },
  { id: 'eventos', name: 'Eventos', icon: AlertTriangle, visible: false },
  { id: 'vegetacao', name: 'Vegetação Crítica', icon: Trees, visible: false },
  { id: 'ocupacoes', name: 'Ocupações de Faixa', icon: Home, visible: false },
  { id: 'travessias', name: 'Travessias', icon: Building2, visible: false },
  { id: 'queimadas', name: 'Queimadas (FIRMS)', icon: Flame, visible: true },
];

export const BASE_LAYERS: Layer[] = [
  { id: 'ufs', name: 'Estados (UFs)', icon: MapPin, visible: false, filename: 'BR_UF_2024.zip' },
  { id: 'municipios_rs', name: 'Municípios RS', icon: MapPin, visible: false, filename: 'RS_Municipios_2024.zip' },
  { id: 'municipios_sp', name: 'Municípios SP', icon: MapPin, visible: false, filename: 'SP_Municipios_2024.zip' },
  { id: 'biomas', name: 'Biomas Brasileiros', icon: Trees, visible: false, filename: 'BR_Biomas.geojson' },
];
