import { useState } from 'react';
import { Layers, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

export interface MapLayer {
  id: string;
  name: string;
  type: 'infrastructure' | 'fires' | 'vegetation' | 'events' | 'zones' | 'estruturas' | 'travessias' | 'erosao' | 'alagadas' | 'emendas';
  visible: boolean;
  color: string;
  source?: string; // Nome do arquivo KML/KMZ de origem
  uploadDate?: string;
  count?: number;
}

interface MapViewSelectorProps {
  layers: MapLayer[];
  onLayerToggle: (layerId: string) => void;
  onLayerVisibilityChange: (layerId: string, visible: boolean) => void;
}

const MapViewSelector = ({ layers, onLayerToggle, onLayerVisibilityChange }: MapViewSelectorProps) => {
  const [open, setOpen] = useState(false);

  const groupedLayers = {
    infrastructure: layers.filter(l => l.type === 'infrastructure'),
    fires: layers.filter(l => l.type === 'fires'),
    vegetation: layers.filter(l => l.type === 'vegetation'),
    events: layers.filter(l => l.type === 'events'),
    zones: layers.filter(l => l.type === 'zones'),
    estruturas: layers.filter(l => l.type === 'estruturas'),
    travessias: layers.filter(l => l.type === 'travessias'),
    erosao: layers.filter(l => l.type === 'erosao'),
    alagadas: layers.filter(l => l.type === 'alagadas'),
    emendas: layers.filter(l => l.type === 'emendas'),
  };

  const typeLabels = {
    infrastructure: '🏗️ Infraestrutura',
    fires: '🔥 Queimadas',
    vegetation: '🌳 Vegetação',
    events: '⚠️ Eventos',
    zones: '🎯 Zonas de Alarme',
    estruturas: '🏗️ Torres',
    travessias: '🌉 Travessias',
    erosao: '⛰️ Erosão',
    alagadas: '💧 Áreas Alagadas',
    emendas: '⚡ Emendas',
  };

  const visibleCount = layers.filter(l => l.visible).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Layers className="w-4 h-4" />
          Camadas ({visibleCount}/{layers.length})
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Gerenciar Camadas do Mapa</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] pr-4 mt-6">
          <div className="space-y-6">
            {Object.entries(groupedLayers).map(([type, layersInGroup]) => {
              if (layersInGroup.length === 0) return null;
              
              return (
                <div key={type} className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">
                    {typeLabels[type as keyof typeof typeLabels]}
                  </h3>
                  
                  <div className="space-y-2">
                    {layersInGroup.map((layer) => (
                      <div
                        key={layer.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          checked={layer.visible}
                          onCheckedChange={(checked) => 
                            onLayerVisibilityChange(layer.id, checked as boolean)
                          }
                          className="mt-1"
                        />
                        
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: layer.color }}
                            />
                            <span className="font-medium text-sm">{layer.name}</span>
                            {layer.count !== undefined && (
                              <Badge variant="secondary" className="text-xs">
                                {layer.count}
                              </Badge>
                            )}
                          </div>
                          
                          {layer.source && (
                            <div className="text-xs text-muted-foreground">
                              📁 Origem: {layer.source}
                            </div>
                          )}
                          
                          {layer.uploadDate && (
                            <div className="text-xs text-muted-foreground">
                              📅 {new Date(layer.uploadDate).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onLayerToggle(layer.id)}
                        >
                          {layer.visible ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                layers.forEach(l => onLayerVisibilityChange(l.id, true));
              }}
              className="flex-1"
            >
              Mostrar Todas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                layers.forEach(l => onLayerVisibilityChange(l.id, false));
              }}
              className="flex-1"
            >
              Ocultar Todas
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MapViewSelector;
