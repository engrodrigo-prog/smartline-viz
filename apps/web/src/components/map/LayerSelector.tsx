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
