import { useState, useMemo } from "react";
import { MapPin, ZoomIn, ZoomOut, Layers } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MapItem {
  id: string;
  nome: string;
  coords: [number, number];
  [key: string]: any;
}

interface MapViewGenericProps {
  items: MapItem[];
  markerIcon?: LucideIcon;
  colorBy?: string;
  onMarkerClick?: (item: MapItem) => void;
  clusterEnabled?: boolean;
  height?: string;
}

const MapViewGeneric = ({
  items,
  markerIcon: MarkerIcon = MapPin,
  colorBy,
  onMarkerClick,
  clusterEnabled = true,
  height = "600px",
}: MapViewGenericProps) => {
  const [zoom, setZoom] = useState(1);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Calculate bounds for all items
  const bounds = useMemo(() => {
    if (items.length === 0) return { minLat: -23.55, maxLat: -23.55, minLng: -46.63, maxLng: -46.63 };
    
    const lats = items.map(item => item.coords[0]);
    const lngs = items.map(item => item.coords[1]);
    
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [items]);

  const getMarkerColor = (item: MapItem) => {
    if (!colorBy) return "text-primary";
    
    const value = item[colorBy];
    
    // Common color mappings
    if (colorBy === 'nivelRisco' || colorBy === 'criticidade') {
      if (value === 'Alto' || value === 'Alta') return "text-destructive";
      if (value === 'Médio' || value === 'Média') return "text-secondary";
      return "text-primary";
    }
    
    if (colorBy === 'statusTermico') {
      if (value === 'Crítico') return "text-destructive";
      if (value === 'Atenção') return "text-secondary";
      return "text-green-500";
    }
    
    if (colorBy === 'status') {
      if (value === 'Crítico' || value === 'Offline') return "text-destructive";
      if (value === 'Alerta' || value === 'Manutenção') return "text-secondary";
      return "text-green-500";
    }
    
    return "text-primary";
  };

  const getMarkerBgColor = (item: MapItem) => {
    if (!colorBy) return "bg-primary/20";
    
    const value = item[colorBy];
    
    if (colorBy === 'nivelRisco' || colorBy === 'criticidade') {
      if (value === 'Alto' || value === 'Alta') return "bg-destructive/20";
      if (value === 'Médio' || value === 'Média') return "bg-secondary/20";
      return "bg-primary/20";
    }
    
    if (colorBy === 'statusTermico') {
      if (value === 'Crítico') return "bg-destructive/20";
      if (value === 'Atenção') return "bg-secondary/20";
      return "bg-green-500/20";
    }
    
    if (colorBy === 'status') {
      if (value === 'Crítico' || value === 'Offline') return "bg-destructive/20";
      if (value === 'Alerta' || value === 'Manutenção') return "bg-secondary/20";
      return "bg-green-500/20";
    }
    
    return "bg-primary/20";
  };

  return (
    <div className="tech-card p-4" style={{ height }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <span className="font-semibold">{items.length} itens no mapa</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`p-2 rounded-lg border transition-colors ${
              showHeatmap ? 'bg-primary/20 border-primary' : 'border-border hover:bg-muted/50'
            }`}
            title={showHeatmap ? "Desativar Heatmap" : "Ativar Heatmap"}
          >
            <Layers className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setZoom(Math.min(zoom + 0.2, 3))}
            className="p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            title="Aumentar Zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))}
            className="p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            title="Diminuir Zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Simplified Map Visualization */}
      <div className="relative w-full h-[calc(100%-60px)] bg-muted/20 rounded-lg border border-border overflow-hidden">
        <div 
          className="absolute inset-0 transition-transform duration-300"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Grid background */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            opacity: 0.3,
          }} />

          {/* Markers */}
          <div className="relative w-full h-full">
            {items.map((item, index) => {
              // Normalize coordinates to percentage
              const latRange = bounds.maxLat - bounds.minLat || 1;
              const lngRange = bounds.maxLng - bounds.minLng || 1;
              
              const top = ((bounds.maxLat - item.coords[0]) / latRange) * 100;
              const left = ((item.coords[1] - bounds.minLng) / lngRange) * 100;
              
              return (
                <div
                  key={item.id}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-125 group`}
                  style={{ 
                    top: `${top}%`, 
                    left: `${left}%`,
                    zIndex: 10 + index,
                  }}
                  onClick={() => onMarkerClick?.(item)}
                >
                  <div className={`p-2 rounded-full ${getMarkerBgColor(item)} backdrop-blur-sm border border-current/20`}>
                    <MarkerIcon className={`w-4 h-4 ${getMarkerColor(item)}`} />
                  </div>
                  
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-popover border border-border rounded-lg p-2 shadow-lg whitespace-nowrap text-xs">
                      <div className="font-semibold">{item.nome}</div>
                      {colorBy && item[colorBy] && (
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          {item[colorBy]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Heatmap overlay (simplified) */}
          {showHeatmap && (
            <div className="absolute inset-0 pointer-events-none">
              {items.map((item) => {
                const latRange = bounds.maxLat - bounds.minLat || 1;
                const lngRange = bounds.maxLng - bounds.minLng || 1;
                
                const top = ((bounds.maxLat - item.coords[0]) / latRange) * 100;
                const left = ((item.coords[1] - bounds.minLng) / lngRange) * 100;
                
                return (
                  <div
                    key={`heat-${item.id}`}
                    className="absolute rounded-full"
                    style={{
                      top: `${top}%`,
                      left: `${left}%`,
                      width: '100px',
                      height: '100px',
                      background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapViewGeneric;
