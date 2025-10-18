import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Map } from "lucide-react";
import { ESRI_BASEMAPS } from "@/lib/mapConfig";

interface BasemapSelectorProps {
  value: string;
  onChange: (basemapId: string) => void;
}

export const BasemapSelector = ({ value, onChange }: BasemapSelectorProps) => {
  const basemaps = Object.values(ESRI_BASEMAPS);
  
  return (
    <div className="absolute top-4 left-4 z-10 bg-background/95 backdrop-blur rounded-lg shadow-lg border border-border p-3 min-w-[220px]">
      <div className="flex items-center gap-2 mb-2">
        <Map className="w-4 h-4 text-muted-foreground" />
        <label className="text-xs font-medium text-foreground">Mapa Base (ESRI)</label>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {basemaps.map(basemap => (
            <SelectItem key={basemap.id} value={basemap.id} className="text-xs">
              <div className="flex flex-col">
                <span className="flex items-center gap-2">
                  <span>{basemap.icon}</span>
                  <span className="font-medium">{basemap.name}</span>
                </span>
                <span className="text-[10px] text-muted-foreground">{basemap.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
