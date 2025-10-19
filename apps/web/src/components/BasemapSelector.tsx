import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BASEMAP_GROUPS, type BasemapId } from "@/lib/mapConfig";
import { Map } from "lucide-react";

interface BasemapSelectorProps {
  value: BasemapId;
  onChange: (basemapId: BasemapId) => void;
  mapboxAvailable?: boolean;
}

export const BasemapSelector = ({ value, onChange, mapboxAvailable = false }: BasemapSelectorProps) => {
  return (
    <div className="absolute top-4 left-4 z-10 bg-background/95 backdrop-blur rounded-lg shadow-lg border border-border p-3 min-w-[240px]">
      <div className="flex items-center gap-2 mb-2">
        <Map className="w-4 h-4 text-muted-foreground" />
        <label className="text-xs font-medium text-foreground">Mapa Base</label>
      </div>
      <Select value={value} onValueChange={(id) => onChange(id as BasemapId)}>
        <SelectTrigger className="w-full h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="w-72">
          {BASEMAP_GROUPS.map((group, index) => (
            <SelectGroup key={group.id}>
              <SelectLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {group.label}
                {group.id === "mapbox" && !mapboxAvailable ? " · requer VITE_MAPBOX_TOKEN" : ""}
              </SelectLabel>
              {group.basemaps.map((basemap) => {
                const disabled = basemap.provider === "mapbox" && !mapboxAvailable;

                return (
                  <SelectItem key={basemap.id} value={basemap.id} disabled={disabled} className="text-xs py-2">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-2 text-sm">
                        <span>{basemap.icon}</span>
                        <span className="font-medium">{basemap.name}</span>
                        {basemap.enableTerrain && (
                          <span className="text-[9px] font-semibold uppercase tracking-[0.08em] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            3D
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{basemap.description}</span>
                    </div>
                  </SelectItem>
                );
              })}
              {index < BASEMAP_GROUPS.length - 1 && <SelectSeparator />}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
