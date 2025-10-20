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
import type { FeatureCollection, Geometry } from "geojson";

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
  erosionData?: FeatureCollection | null;
  soilData?: FeatureCollection | null;
  layerOrder?: string[];
  onFeatureClick?: (feature: any) => void;
  onMapLoad?: (map: maplibregl.Map) => void;
  customPoints?: FeatureCollection<Geometry, { color?: string; isFocus?: boolean; size?: number }>;
  fitBounds?: maplibregl.LngLatBoundsLike | null;
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
  erosionData,
  soilData,
  layerOrder,
  onFeatureClick,
  onMapLoad,
  customPoints,
  fitBounds,
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
        const message = (error?.error && (error.error as Error).message) || "";
        if (typeof message === "string" && message.includes('unknown property "name"')) {
          return;
        }
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

  // Custom points layer for case analytics overlays
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    const sourceId = "custom-points";
    const layerId = "custom-points";

    if (!customPoints || customPoints.features.length === 0) {
      removeLayerAndSource(mapInstance, layerId, sourceId);
      return;
    }

    const data: FeatureCollection = {
      type: "FeatureCollection",
      features: customPoints.features.map((feature) => ({
        type: "Feature",
        geometry: feature.geometry,
        properties: {
          ...(feature.properties ?? {}),
          color: feature.properties?.color ?? "#38bdf8",
          isFocus: Boolean(feature.properties?.isFocus),
          size: feature.properties?.size ?? 8,
        },
      })),
    };

    const addOrUpdateLayer = () => {
      if (mapInstance.getSource(sourceId)) {
        (mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
        return;
      }

      mapInstance.addSource(sourceId, { type: "geojson", data });
      mapInstance.addLayer({
        id: layerId,
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": [
            "case",
            ["boolean", ["get", "isFocus"], false],
            11,
            ["coalesce", ["get", "size"], 8],
          ],
          "circle-color": ["coalesce", ["get", "color"], "#38bdf8"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#0f172a",
          "circle-opacity": [
            "case",
            ["boolean", ["get", "isFocus"], false],
            0.95,
            0.7,
          ],
        },
      });
    };

    if (mapInstance.isStyleLoaded()) {
      addOrUpdateLayer();
    } else {
      mapInstance.once("style.load", addOrUpdateLayer);
    }
  }, [customPoints, removeLayerAndSource]);

  // Erosion occurrences layer
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    const sourceId = "erosao";
    const layerId = "erosao-points";

    if (!showErosao || !erosionData || erosionData.features.length === 0) {
      removeLayerAndSource(mapInstance, layerId, sourceId);
      return;
    }

    const load = () => {
      if (mapInstance.getSource(sourceId)) {
        (mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource).setData(erosionData);
      } else {
        mapInstance.addSource(sourceId, { type: "geojson", data: erosionData });
        mapInstance.addLayer({
          id: layerId,
          type: "circle",
          source: sourceId,
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["coalesce", ["get", "area"], 0],
              0,
              6,
              5000,
              18
            ],
            "circle-color": [
              "match",
              ["get", "severity"],
              "Crítica",
              "#ef4444",
              "Alta",
              "#f97316",
              "Média",
              "#facc15",
              "#22c55e"
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#0b1120",
            "circle-opacity": 0.85
          }
        });
      }
    };

    if (mapInstance.isStyleLoaded()) {
      load();
    } else {
      mapInstance.once("style.load", load);
    }
  }, [erosionData, removeLayerAndSource, showErosao]);

  // Soil samples layer
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    const sourceId = "soil-samples";
    const layerId = "soil-samples";

    if (!soilData || soilData.features.length === 0) {
      removeLayerAndSource(mapInstance, layerId, sourceId);
      return;
    }

    const load = () => {
      if (mapInstance.getSource(sourceId)) {
        (mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource).setData(soilData);
      } else {
        mapInstance.addSource(sourceId, { type: "geojson", data: soilData });
        mapInstance.addLayer({
          id: layerId,
          type: "symbol",
          source: sourceId,
          layout: {
            "icon-image": "triangle-11",
            "icon-size": 1.2,
            "icon-allow-overlap": true,
            "text-field": ["coalesce", ["get", "soilType"], "Solo"],
            "text-size": 11,
            "text-offset": [0, 1.2],
            "text-allow-overlap": false
          },
          paint: {
            "text-color": "#f472b6"
          }
        });
      }
    };

    if (mapInstance.isStyleLoaded()) {
      load();
    } else {
      mapInstance.once("style.load", load);
    }
  }, [removeLayerAndSource, soilData]);

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

  // Apply layer ordering (array from bottom to top)
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || !layerOrder || layerOrder.length === 0) return;
    const existing = layerOrder.filter((layerId) => mapInstance.getLayer(layerId));
    existing.forEach((layerId, index) => {
      const before = existing[index + 1];
      try {
        mapInstance.moveLayer(layerId, before);
      } catch (error) {
        console.warn("Unable to move layer", layerId, error);
      }
    });
  }, [layerOrder]);

  // Fit bounds when provided
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || !fitBounds) return;
    try {
      mapInstance.fitBounds(fitBounds, {
        padding: { top: 64, bottom: 64, left: 80, right: 80 },
        duration: 900,
        maxZoom: 14,
      });
    } catch (error) {
      console.warn("fitBounds error", error);
    }
  }, [fitBounds]);

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

export default MapLibreUnified;
