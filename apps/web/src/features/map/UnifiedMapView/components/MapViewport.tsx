import type { Map as MapLibreMap } from "maplibre-gl";
import type { FeatureCollection, LineString, Point, Polygon } from "geojson";
import { MapLibreUnified } from "@/components/MapLibreUnified";
import { FirmsFootprintsLayer } from "@/components/ambiente/FirmsFootprintsLayer";
import type { Layer } from "@/components/map/LayerSelector";
import type { FiltersState } from "@/context/FiltersContext";
import type { Local3DLayer } from "@/features/map/UnifiedMapView/local3d";

type MapViewportProps = {
  filters: FiltersState;
  layers: Layer[];
  queimadasData?: FeatureCollection | null;
  footprintsData?: FeatureCollection | null;
  customLines?: FeatureCollection<LineString> | null | undefined;
  customPoints?: FeatureCollection<Point> | null | undefined;
  customPolygons?: FeatureCollection<Polygon> | null | undefined;
  local3DLayers: Local3DLayer[];
  shouldShowBrazilMode: boolean;
  initialCenter: { lat: number; lng: number };
  initialZoom: number;
  fitBounds?: [[number, number], [number, number]];
  onMapLoad: (map: MapLibreMap) => void;
  mapInstance: MapLibreMap | null;
};

const MapViewport = ({
  filters,
  layers,
  queimadasData,
  footprintsData,
  customLines,
  customPoints,
  customPolygons,
  local3DLayers,
  shouldShowBrazilMode,
  initialCenter,
  initialZoom,
  fitBounds,
  onMapLoad,
  mapInstance,
}: MapViewportProps) => {
  const showQueimadas = layers.find((layer) => layer.id === "queimadas")?.visible ?? true;
  const showInfrastructure = layers.find((layer) => layer.id === "linhas")?.visible ?? true;
  const footprintsVisible =
    layers.find((layer) => layer.id === "queimadas_footprints")?.visible ?? shouldShowBrazilMode;

  return (
    <div className="flex-1 relative rounded-lg overflow-hidden border border-border bg-card/30 map-smooth">
      <MapLibreUnified
        filterRegiao={filters.regiao}
        filterEmpresa={filters.empresa}
        filterLinha={filters.linha}
        showQueimadas={showQueimadas}
        showInfrastructure={showInfrastructure}
        queimadasData={queimadasData}
        customLines={customLines || undefined}
        customPoints={customPoints || undefined}
        customPolygons={customPolygons || undefined}
        local3DLayers={local3DLayers}
        initialCenter={[initialCenter.lng, initialCenter.lat]}
        initialZoom={initialZoom}
        onMapLoad={onMapLoad}
        initialBasemapId="imagery"
        fallbackBasemapId="imagery"
        fitBounds={fitBounds}
      />

      <FirmsFootprintsLayer map={mapInstance} geojson={footprintsData || null} visible={footprintsVisible} />
    </div>
  );
};

export default MapViewport;
