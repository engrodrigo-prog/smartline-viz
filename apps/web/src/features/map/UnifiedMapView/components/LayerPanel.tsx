import LayerSelector, { type Layer } from "@/components/map/LayerSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Globe, Loader2 } from "lucide-react";
import Local3DLayerManager from "./Local3DLayerManager";
import type { Local3DLayer } from "@/features/map/UnifiedMapView/local3d";

type LayerPanelProps = {
  layers: Layer[];
  baseLayers: Layer[];
  onToggleLayer: (layerId: string) => void;
  onToggleBaseLayer: (layerId: string) => void;
  local3DLayers: Local3DLayer[];
  onUploadLocal3DFiles: (files: FileList | File[]) => void;
  onToggleLocal3DLayer: (layerId: string) => void;
  onRemoveLocal3DLayer: (layerId: string) => void;
  loadingLayers: Set<string>;
  shouldShowBrazilMode: boolean;
};

const LayerPanel = ({
  layers,
  baseLayers,
  onToggleLayer,
  onToggleBaseLayer,
  local3DLayers,
  onUploadLocal3DFiles,
  onToggleLocal3DLayer,
  onRemoveLocal3DLayer,
  loadingLayers,
  shouldShowBrazilMode,
}: LayerPanelProps) => (
  <div className="w-80 flex-shrink-0 overflow-y-auto">
    <LayerSelector layers={layers} onToggleLayer={onToggleLayer} baseLayers={baseLayers} onToggleBaseLayer={onToggleBaseLayer} />

    <Local3DLayerManager
      layers={local3DLayers}
      onUploadFiles={onUploadLocal3DFiles}
      onToggleLayer={onToggleLocal3DLayer}
      onRemoveLayer={onRemoveLocal3DLayer}
    />

    {loadingLayers.size > 0 && (
      <Alert className="mt-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        <AlertDescription>Carregando camadas...</AlertDescription>
      </Alert>
    )}

    {shouldShowBrazilMode && (
      <Alert className="mt-4">
        <Globe className="w-4 h-4" />
        <AlertDescription>
          🌎 <strong>Modo Brasil</strong> - Exibindo todos os focos de incêndio ativos no país (últimas 24h)
        </AlertDescription>
      </Alert>
    )}
  </div>
);

export default LayerPanel;
