import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Trash2, Building2, Cuboid } from "lucide-react";
import type { Local3DLayer } from "@/features/map/UnifiedMapView/local3d";

type Local3DLayerManagerProps = {
  layers: Local3DLayer[];
  onUploadFiles: (files: FileList | File[]) => void;
  onToggleLayer: (layerId: string) => void;
  onRemoveLayer: (layerId: string) => void;
};

const Local3DLayerManager = ({
  layers,
  onUploadFiles,
  onToggleLayer,
  onRemoveLayer,
}: Local3DLayerManagerProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="tech-card mt-4 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Cuboid className="h-4 w-4" />
            Camadas 3D Locais
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Importe GeoJSON de prédios, subestações ou volumes locais. Alturas são lidas de
            <code className="mx-1">height</code>,
            <code className="mx-1">altura</code> ou
            <code className="ml-1">levels</code>.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          Importar
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".geojson,.json,application/geo+json,application/json"
        multiple
        className="hidden"
        onChange={(event) => {
          if (!event.target.files?.length) return;
          onUploadFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {layers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
          Nenhuma camada 3D local carregada.
        </div>
      ) : (
        <div className="space-y-2">
          {layers.map((layer) => (
            <div
              key={layer.id}
              className="rounded-lg border border-border/60 bg-background/40 p-3 transition-colors hover:bg-accent/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex min-w-0 flex-1 items-start gap-3 cursor-pointer"
                  onClick={() => onToggleLayer(layer.id)}
                >
                  <Checkbox
                    checked={layer.visible}
                    onCheckedChange={() => onToggleLayer(layer.id)}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <span className="truncate text-sm font-medium">{layer.name}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{layer.featureCount} volumes</Badge>
                      <Badge variant="outline">{layer.sourceFileName}</Badge>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-white/50"
                          style={{ backgroundColor: layer.color }}
                        />
                        extrusão ativa
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => onRemoveLayer(layer.id)}
                  aria-label={`Remover camada ${layer.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Local3DLayerManager;
