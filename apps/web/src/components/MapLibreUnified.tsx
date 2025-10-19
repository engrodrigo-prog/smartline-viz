import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Loader2 } from "lucide-react";

import {
  changeBasemap,
  DEFAULT_BASEMAP,
  getCurrentBasemap,
  initializeSmartlineMap,
  resolveBasemapId,
  type BasemapId,
} from "@/lib/mapConfig";
import { BasemapSelector } from "./BasemapSelector";

interface MapLibreUnifiedProps {
  filterRegiao?: string;
  filterEmpresa?: string;
  filterLinha?: string;
  showQueimadas?: boolean;
  showInfrastructure?: boolean;
  showVegetacao?: boolean;
  showEstruturas?: boolean;
  showTravessias?: boolean;
  showErosao?: boolean;
  showAreasAlagadas?: boolean;
  showEmendas?: boolean;
  initialCenter?: [number, number];
  initialZoom?: number;
  mode?: "live" | "archive";
  confiancaMin?: number;
  sateliteFilter?: string;
  focusCoord?: [number, number];
  zoneConfig?: any;
  queimadasData?: GeoJSON.FeatureCollection;
  onFeatureClick?: (feature: any) => void;
  onMapLoad?: (map: maplibregl.Map) => void;
}

export const MapLibreUnified = ({
  filterRegiao,
  filterEmpresa,
  filterLinha,
  showQueimadas = false,
  showInfrastructure = true,
  showVegetacao = false,
  showEstruturas = false,
  showTravessias = false,
  showErosao = false,
  showAreasAlagadas = false,
  showEmendas = false,
  initialCenter,
  initialZoom,
  mode = "live",
  confiancaMin = 50,
  sateliteFilter,
  focusCoord,
  zoneConfig,
  queimadasData,
  onFeatureClick,
  onMapLoad,
}: MapLibreUnifiedProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const mapboxAvailable = Boolean(mapboxToken);
  const defaultBasemap = useMemo(() => resolveBasemapId(DEFAULT_BASEMAP, mapboxToken), [mapboxToken]);

  const [isLoading, setIsLoading] = useState(true);
  const [currentBasemap, setCurrentBasemap] = useState<BasemapId>(defaultBasemap);

  useEffect(() => {
    setCurrentBasemap(defaultBasemap);
  }, [defaultBasemap]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    try {
      const instance = initializeSmartlineMap(mapContainer.current, {
        center: initialCenter || [-46.333, -23.96],
        zoom: initialZoom || 12,
        basemap: defaultBasemap,
        mapboxToken,
      });

      instance.addControl(new maplibregl.NavigationControl(), "top-right");
      instance.addControl(new maplibregl.FullscreenControl(), "top-right");
      instance.addControl(new maplibregl.ScaleControl(), "bottom-right");

      instance.on("load", () => {
        setIsLoading(false);
        const resolved = getCurrentBasemap(instance);
        if (resolved) {
          setCurrentBasemap(resolved);
        }
        onMapLoad?.(instance);
      });

      instance.on("error", (error) => {
        console.error("Map error:", error);
        setIsLoading(false);
      });

      mapRef.current = instance;
    } catch (error) {
      console.error("Error initializing map:", error);
      setIsLoading(false);
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [defaultBasemap, initialCenter, initialZoom, mapboxToken, onMapLoad]);

  // Focus on specific coordinates
  useEffect(() => {
    if (mapRef.current && focusCoord) {
      mapRef.current.flyTo({
        center: focusCoord,
        zoom: 16,
        duration: 2000,
      });
    }
  }, [focusCoord]);

  // Handle basemap change
  const handleBasemapChange = useCallback(
    (basemapId: BasemapId) => {
      const mapInstance = mapRef.current;
      if (!mapInstance) return;

      try {
        changeBasemap(mapInstance, basemapId, { mapboxToken });
        setCurrentBasemap(resolveBasemapId(basemapId, mapboxToken));
      } catch (error) {
        console.error("Failed to change basemap", error);
      }
    },
    [mapboxToken],
  );

  // Helper to remove a source/layer pair
  const removeLayerAndSource = useCallback((map: maplibregl.Map, layerId: string, sourceId: string) => {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  }, []);

  // Load infrastructure layer
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || !showInfrastructure) {
      if (mapInstance && !showInfrastructure) {
        removeLayerAndSource(mapInstance, "infrastructure-layer", "infrastructure");
      }
      return;
    }

    const loadInfrastructure = () => {
      removeLayerAndSource(mapInstance, "infrastructure-layer", "infrastructure");

      mapInstance.addSource("infrastructure", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      mapInstance.addLayer({
        id: "infrastructure-layer",
        type: "circle",
        source: "infrastructure",
        paint: {
          "circle-radius": 6,
          "circle-color": "#3b82f6",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });
    };

    if (mapInstance.isStyleLoaded()) {
      loadInfrastructure();
    } else {
      mapInstance.once("style.load", loadInfrastructure);
    }
  }, [
    filterEmpresa,
    filterLinha,
    filterRegiao,
    removeLayerAndSource,
    showInfrastructure,
  ]);

  // Load queimadas layer
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    const clearLayers = () => {
      ["queimadas-points", "queimadas-clusters", "queimadas-cluster-count"].forEach((layerId) => {
        if (mapInstance.getLayer(layerId)) {
          mapInstance.removeLayer(layerId);
        }
      });
      if (mapInstance.getSource("queimadas")) {
        mapInstance.removeSource("queimadas");
      }
    };

    if (!showQueimadas) {
      clearLayers();
      return;
    }

    const handlePointClick = (event: maplibregl.MapLayerMouseEvent) => {
      if (event.features && event.features[0] && onFeatureClick) {
        onFeatureClick(event.features[0].properties);
      }
    };

    const handleMouseEnter = () => {
      mapInstance.getCanvas().style.cursor = "pointer";
    };

    const handleMouseLeave = () => {
      mapInstance.getCanvas().style.cursor = "";
    };

    const loadQueimadas = () => {
      clearLayers();

      mapInstance.addSource("queimadas", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      mapInstance.addLayer({
        id: "queimadas-clusters",
        type: "circle",
        source: "queimadas",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"], "#51bbd6", 10, "#f1f075", 30, "#f28cb1", 50, "#ff0000"],
          "circle-radius": ["step", ["get", "point_count"], 20, 10, 30, 30, 40],
        },
      });

      mapInstance.addLayer({
        id: "queimadas-cluster-count",
        type: "symbol",
        source: "queimadas",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      mapInstance.addLayer({
        id: "queimadas-points",
        type: "circle",
        source: "queimadas",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#ff4444",
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      mapInstance.off("click", "queimadas-points", handlePointClick);
      mapInstance.off("mouseenter", "queimadas-points", handleMouseEnter);
      mapInstance.off("mouseleave", "queimadas-points", handleMouseLeave);

      mapInstance.on("click", "queimadas-points", handlePointClick);
      mapInstance.on("mouseenter", "queimadas-points", handleMouseEnter);
      mapInstance.on("mouseleave", "queimadas-points", handleMouseLeave);
    };

    if (mapInstance.isStyleLoaded()) {
      loadQueimadas();
    } else {
      mapInstance.once("style.load", loadQueimadas);
    }

    return () => {
      mapInstance.off("click", "queimadas-points", handlePointClick);
      mapInstance.off("mouseenter", "queimadas-points", handleMouseEnter);
      mapInstance.off("mouseleave", "queimadas-points", handleMouseLeave);
    };
  }, [
    confiancaMin,
    mode,
    onFeatureClick,
    sateliteFilter,
    showQueimadas,
    zoneConfig,
  ]);

  // Update queimadas data when it changes
  useEffect(() => {
    if (!mapRef.current || !showQueimadas || !queimadasData) return;

    const source = mapRef.current.getSource("queimadas") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(queimadasData);
    }
  }, [queimadasData, showQueimadas]);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-foreground">Carregando mapa...</span>
          </div>
        </div>
      )}

      <BasemapSelector value={currentBasemap} onChange={handleBasemapChange} mapboxAvailable={mapboxAvailable} />

      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};
