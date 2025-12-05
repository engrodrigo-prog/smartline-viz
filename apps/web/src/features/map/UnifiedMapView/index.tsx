import { useFilters } from "@/context/FiltersContext";
import LayerPanel from "./components/LayerPanel";
import MapViewport from "./components/MapViewport";
import { useUnifiedMapState } from "./hooks/useUnifiedMapState";

const UnifiedMapView = () => {
  const { filters } = useFilters();
  const {
    layers,
    baseLayers,
    handleToggleLayer,
    handleToggleBaseLayer,
    loadingLayers,
    shouldShowBrazilMode,
    queimadasData,
    footprintsData,
    mapInstance,
    setMapInstance,
    centerCoords,
    initialZoom,
    fitBounds,
  } = useUnifiedMapState(filters);

  return (
    <div className="flex h-full gap-4">
      <LayerPanel
        layers={layers}
        baseLayers={baseLayers}
        onToggleLayer={handleToggleLayer}
        onToggleBaseLayer={handleToggleBaseLayer}
        loadingLayers={loadingLayers}
        shouldShowBrazilMode={shouldShowBrazilMode}
      />
      <MapViewport
        filters={filters}
        layers={layers}
        queimadasData={queimadasData}
        footprintsData={footprintsData}
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
