import { useCallback, useState } from "react";
import { useFilters } from "@/context/FiltersContext";
import LayerPanel from "./components/LayerPanel";
import MapViewport from "./components/MapViewport";
import { useUnifiedMapState } from "./hooks/useUnifiedMapState";
import { toast } from "sonner";
import { parseLocal3DFile, type Local3DLayer } from "./local3d";

const UnifiedMapView = () => {
  const { filters } = useFilters();
  const [local3DLayers, setLocal3DLayers] = useState<Local3DLayer[]>([]);
  const {
    layers,
    baseLayers,
    handleToggleLayer,
    handleToggleBaseLayer,
    loadingLayers,
    shouldShowBrazilMode,
    queimadasData,
    footprintsData,
    customLines,
    customPoints,
    customPolygons,
    mapInstance,
    setMapInstance,
    centerCoords,
    initialZoom,
    fitBounds,
  } = useUnifiedMapState(filters);

  const handleUploadLocal3DFiles = useCallback(async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    const results = await Promise.allSettled(fileList.map((file) => parseLocal3DFile(file)));

    const nextLayers: Local3DLayer[] = [];
    const failedFiles: string[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        nextLayers.push(result.value);
      } else {
        failedFiles.push(`${fileList[index]?.name ?? "arquivo"}: ${result.reason instanceof Error ? result.reason.message : "erro desconhecido"}`);
      }
    });

    if (nextLayers.length > 0) {
      setLocal3DLayers((prev) => [...nextLayers, ...prev]);
      toast.success(`${nextLayers.length} camada(s) 3D local(is) carregada(s).`);
    }

    failedFiles.forEach((message) => toast.error(message));
  }, []);

  const handleToggleLocal3DLayer = useCallback((layerId: string) => {
    setLocal3DLayers((prev) =>
      prev.map((layer) => (layer.id === layerId ? { ...layer, visible: !layer.visible } : layer)),
    );
  }, []);

  const handleRemoveLocal3DLayer = useCallback((layerId: string) => {
    setLocal3DLayers((prev) => prev.filter((layer) => layer.id !== layerId));
  }, []);

  return (
    <div className="flex h-full gap-4">
      <LayerPanel
        layers={layers}
        baseLayers={baseLayers}
        onToggleLayer={handleToggleLayer}
        onToggleBaseLayer={handleToggleBaseLayer}
        local3DLayers={local3DLayers}
        onUploadLocal3DFiles={handleUploadLocal3DFiles}
        onToggleLocal3DLayer={handleToggleLocal3DLayer}
        onRemoveLocal3DLayer={handleRemoveLocal3DLayer}
        loadingLayers={loadingLayers}
        shouldShowBrazilMode={shouldShowBrazilMode}
      />
      <MapViewport
        filters={filters}
        layers={layers}
        queimadasData={queimadasData}
        footprintsData={footprintsData}
        customLines={customLines}
        customPoints={customPoints}
        customPolygons={customPolygons}
        local3DLayers={local3DLayers}
        shouldShowBrazilMode={shouldShowBrazilMode}
        initialCenter={centerCoords}
        initialZoom={initialZoom}
        fitBounds={fitBounds}
        onMapLoad={setMapInstance}
        mapInstance={mapInstance}
      />
    </div>
  );
};

export default UnifiedMapView;
