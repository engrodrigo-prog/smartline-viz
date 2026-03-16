import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import {
  changeBasemap,
  DEFAULT_BASEMAP,
  getCurrentBasemap,
  initializeSmartlineMap,
  resolveBasemapId,
  type BasemapId,
} from "@/lib/mapConfig";
import { isMapStyleReady, runWhenMapStyleReady } from "@/lib/mapStyle";
import { BasemapSelector } from "./BasemapSelector";
import { MapLoadingIndicator } from "@/components/map/MapLoadingIndicator";
import type { FeatureCollection, Geometry, Polygon, LineString } from "geojson";
import type { Local3DLayer } from "@/features/map/UnifiedMapView/local3d";

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
  customPolygons?: FeatureCollection<
    Polygon,
    { color?: string; ndvi?: number; fillOpacity?: number; strokeColor?: string; strokeWidth?: number }
  >;
  customLines?: FeatureCollection<
    LineString,
    {
      color?: string;
      width?: number;
      opacity?: number;
      corridorColor?: string;
      corridorWidth?: number;
      corridorOpacity?: number;
    }
  >;
  local3DLayers?: Local3DLayer[];
  height?: string;
  initialBasemapId?: BasemapId;
  fallbackBasemapId?: BasemapId;
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || ["input", "textarea", "select", "button"].includes(tagName);
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
  customPolygons,
  customLines,
  local3DLayers = [],
  height,
  initialBasemapId,
  fallbackBasemapId,
}: MapLibreUnifiedProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const fallbackAppliedRef = useRef(false);
  const styleReadyRef = useRef(false);

  const mapboxToken: string | undefined = undefined;
  const mapboxAvailable = false;
  const preferredBasemapId = initialBasemapId ?? DEFAULT_BASEMAP;
  const resolvedInitialBasemap = useMemo(
    () => resolveBasemapId(preferredBasemapId),
    [preferredBasemapId],
  );
  const fallbackBasemapIdResolved: BasemapId = fallbackBasemapId ?? "imagery";

  const [isLoading, setIsLoading] = useState(true);
  const [currentBasemap, setCurrentBasemap] = useState<BasemapId>(resolvedInitialBasemap);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [activeMap, setActiveMap] = useState<maplibregl.Map | null>(null);
  const [isEarthNavigationActive, setIsEarthNavigationActive] = useState(false);

  useEffect(() => {
    setCurrentBasemap(resolvedInitialBasemap);
  }, [resolvedInitialBasemap]);

  // Initialize map
  useEffect(() => {
    fallbackAppliedRef.current = false;
    if (!mapContainer.current || mapRef.current) return;

    let safetyTimeout: number | undefined;

    try {
      const instance = initializeSmartlineMap(mapContainer.current, {
        center: initialCenter || [-46.333, -23.96],
        zoom: initialZoom || 12,
        basemap: resolvedInitialBasemap,
      });

      instance.addControl(new maplibregl.NavigationControl(), "top-right");
      instance.addControl(new maplibregl.FullscreenControl(), "top-right");
      instance.addControl(new maplibregl.ScaleControl(), "bottom-right");

      const applyFallback = () => {
        if (fallbackAppliedRef.current) {
          return;
        }
        fallbackAppliedRef.current = true;
        if (safetyTimeout !== undefined) {
          window.clearTimeout(safetyTimeout);
        }
        try {
          console.warn("[map] Aplicando fallback de mapa base para", fallbackBasemapIdResolved);
          styleReadyRef.current = false;
          changeBasemap(instance, fallbackBasemapIdResolved);
          setCurrentBasemap(fallbackBasemapIdResolved);
          onMapLoad?.(instance);
        } catch (err) {
          console.warn("[map] Falha ao aplicar fallback em MapLibreUnified", err);
        } finally {
          setIsLoading(false);
        }
      };

      // Safety timeout: if style doesn't load (e.g., token/domínio), fallback to ESRI imagery
      safetyTimeout = window.setTimeout(() => {
        if (!styleReadyRef.current) {
          console.warn("[map] Timeout no carregamento do estilo inicial. Forçando fallback ESRI.");
          applyFallback();
        }
      }, 6000);

      instance.on("load", () => {
        styleReadyRef.current = true;
        setIsLoading(false);
        const resolved = getCurrentBasemap(instance);
        if (resolved) {
          setCurrentBasemap(resolved);
        }
        onMapLoad?.(instance);
        if (safetyTimeout !== undefined) {
          window.clearTimeout(safetyTimeout);
        }
      });

      instance.on("error", (event: any) => {
        const message = (event?.error && (event.error as Error).message) || "";
        if (typeof message === "string" && message.includes('unknown property "name"')) {
          return;
        }

        const status = (event?.error as any)?.status ?? (event?.error as any)?.resource?.status;
        const resourceUrl = (event?.error as any)?.resource?.url ?? "";
        const isMapboxAuthIssue =
          status === 401 ||
          status === 403 ||
          /access[_-]?token|unauthorized|forbidden/i.test(String(message)) ||
          /api\.mapbox\.com|styles\/v1/.test(resourceUrl);

        if (isMapboxAuthIssue) {
          console.warn("[map] Erro de autenticação/estilo Mapbox detectado. Aplicando fallback ESRI.", event?.error);
          applyFallback();
          if (safetyTimeout !== undefined) {
            window.clearTimeout(safetyTimeout);
          }
          return;
        }

        console.error("Map error:", event);
        setIsLoading(false);
        if (safetyTimeout !== undefined) {
          window.clearTimeout(safetyTimeout);
        }
      });

      mapRef.current = instance;
      setActiveMap(instance);
    } catch (error) {
      console.error("Error initializing map:", error);
      setIsLoading(false);
    }

    return () => {
      if (safetyTimeout !== undefined) {
        window.clearTimeout(safetyTimeout);
      }
      styleReadyRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
      setActiveMap(null);
    };
  }, [resolvedInitialBasemap, fallbackBasemapIdResolved, initialCenter, initialZoom, onMapLoad]);

  // Desbloqueia troca de basemap somente após interação do usuário
  useEffect(() => {
    const el = mapContainer.current;
    if (!el || hasInteracted) return;
    const unlock = () => setHasInteracted(true);
    el.addEventListener('pointerdown', unlock, { once: true });
    el.addEventListener('wheel', unlock, { once: true });
    return () => {
      try {
        el.removeEventListener('pointerdown', unlock as any);
        el.removeEventListener('wheel', unlock as any);
      } catch {/* ignore */}
    };
  }, [hasInteracted]);

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

      // Evita piscadas trocando apenas quando o estilo atual é diferente
      const target = resolveBasemapId(basemapId);
      const current = getCurrentBasemap(mapInstance);
      if (current === target) return;
      try {
        changeBasemap(mapInstance, target);
        setCurrentBasemap(target);
      } catch (error) {
        console.error("Failed to change basemap", error);
      }
    },
    [],
  );

  // Helper utilities to avoid calling getLayer/getSource before style is ready
  const hasLayer = useCallback(
    (map: maplibregl.Map | null | undefined, layerId: string) => {
      try {
        if (!map || !isMapStyleReady(map)) return false;
        return !!map.getLayer(layerId);
      } catch {
        return false;
      }
    },
    [],
  );

  const hasSource = useCallback(
    (map: maplibregl.Map | null | undefined, sourceId: string) => {
      try {
        if (!map || !isMapStyleReady(map)) return false;
        return !!map.getSource(sourceId);
      } catch {
        return false;
      }
    },
    [],
  );

  useEffect(() => {
    const mapInstance = activeMap;
    if (!mapInstance) return;

    const markStylePending = () => {
      styleReadyRef.current = false;
    };
    const markStyleReady = () => {
      styleReadyRef.current = true;
    };

    mapInstance.on("style.load", markStyleReady);
    mapInstance.on("basemap-changing" as any, markStylePending);

    return () => {
      mapInstance.off("style.load", markStyleReady);
      mapInstance.off("basemap-changing" as any, markStylePending);
    };
  }, [activeMap]);

  const safeRemoveLayer = useCallback(
    (map: maplibregl.Map | null | undefined, layerId: string) => {
      try {
        if (hasLayer(map, layerId)) map!.removeLayer(layerId);
      } catch {
        // ignore
      }
    },
    [hasLayer],
  );

  const safeRemoveSource = useCallback(
    (map: maplibregl.Map | null | undefined, sourceId: string) => {
      try {
        if (hasSource(map, sourceId)) map!.removeSource(sourceId);
      } catch {
        // ignore
      }
    },
    [hasSource],
  );

  // Helper to remove a source/layer pair
  const removeLayerAndSource = useCallback(
    (map: maplibregl.Map | null | undefined, layerId: string, sourceId: string) => {
      if (!map) return;
      safeRemoveLayer(map, layerId);
      safeRemoveSource(map, sourceId);
    },
    [safeRemoveLayer, safeRemoveSource],
  );

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

    return runWhenMapStyleReady(mapInstance, addOrUpdateLayer);
  }, [customPoints, removeLayerAndSource]);

  // Custom polygons layer (e.g., NDVI surfaces)
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    const sourceId = "custom-polygons";
    const fillLayerId = "custom-polygons-fill";
    const outlineLayerId = "custom-polygons-outline";

    if (!customPolygons || customPolygons.features.length === 0) {
      safeRemoveLayer(mapInstance, outlineLayerId);
      removeLayerAndSource(mapInstance, fillLayerId, sourceId);
      return;
    }

    const data: FeatureCollection = {
      type: "FeatureCollection",
      features: customPolygons.features.map((feature) => ({
        type: "Feature",
        geometry: feature.geometry,
        properties: {
          ...(feature.properties ?? {}),
        },
      })),
    };

    const addLayers = () => {
      safeRemoveLayer(mapInstance, outlineLayerId);
      safeRemoveLayer(mapInstance, fillLayerId);
      if (hasSource(mapInstance, sourceId)) {
        (mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
      } else {
        mapInstance.addSource(sourceId, { type: "geojson", data });
      }

      mapInstance.addLayer({
        id: fillLayerId,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": [
            "coalesce",
            ["get", "color"],
            [
              "interpolate",
              ["linear"],
              ["coalesce", ["get", "ndvi"], 0],
              -0.2, "#6366f1",
              0, "#f97316",
              0.3, "#facc15",
              0.6, "#22c55e",
              0.8, "#15803d"
            ],
          ],
          "fill-opacity": ["coalesce", ["get", "fillOpacity"], 0.45],
        },
      });

      mapInstance.addLayer({
        id: outlineLayerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": ["coalesce", ["get", "strokeColor"], "#0f172a"],
          "line-width": ["coalesce", ["get", "strokeWidth"], 1.25],
          "line-dasharray": [2, 1.5],
        },
      });
    };

    const cancelPending = runWhenMapStyleReady(mapInstance, addLayers);

    return () => {
      cancelPending();
      safeRemoveLayer(mapInstance, outlineLayerId);
      removeLayerAndSource(mapInstance, fillLayerId, sourceId);
    };
  }, [customPolygons, hasSource, removeLayerAndSource, safeRemoveLayer]);

  // Custom lines layer (e.g., demo RS line)
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    const sourceId = "custom-lines";
    const corridorId = "custom-lines-corridor";
    const mainId = "custom-lines";

    if (!customLines || customLines.features.length === 0) {
      safeRemoveLayer(mapInstance, corridorId);
      removeLayerAndSource(mapInstance, mainId, sourceId);
      return;
    }

    const data: FeatureCollection = {
      type: "FeatureCollection",
      features: customLines.features.map((f) => ({
        type: "Feature",
        geometry: f.geometry,
        properties: {
          ...(f.properties ?? {}),
          color: f.properties?.color ?? "#0284c7",
          width: f.properties?.width ?? 3,
          opacity: f.properties?.opacity ?? 0.9,
          corridorColor: f.properties?.corridorColor ?? "#22d3ee",
          corridorWidth: f.properties?.corridorWidth ?? 10,
          corridorOpacity: f.properties?.corridorOpacity ?? 0.25,
        },
      })),
    };

    const addOrUpdate = () => {
      if (hasSource(mapInstance, sourceId)) {
        (mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
      } else {
        mapInstance.addSource(sourceId, { type: "geojson", data });
      }

      if (!hasLayer(mapInstance, corridorId)) {
        mapInstance.addLayer({
          id: corridorId,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": ["coalesce", ["get", "corridorColor"], "#22d3ee"],
            "line-width": ["coalesce", ["get", "corridorWidth"], 10],
            "line-opacity": ["coalesce", ["get", "corridorOpacity"], 0.25],
          },
        });
      }

      if (!hasLayer(mapInstance, mainId)) {
        mapInstance.addLayer({
          id: mainId,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": ["coalesce", ["get", "color"], "#0284c7"],
            "line-width": ["coalesce", ["get", "width"], 3],
            "line-opacity": ["coalesce", ["get", "opacity"], 0.9],
          },
        });
      }
    };

    const cancelPending = runWhenMapStyleReady(mapInstance, addOrUpdate);

    return () => {
      cancelPending();
      safeRemoveLayer(mapInstance, corridorId);
      removeLayerAndSource(mapInstance, mainId, sourceId);
    };
  }, [customLines, hasLayer, hasSource, removeLayerAndSource, safeRemoveLayer]);

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

    return runWhenMapStyleReady(mapInstance, load);
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

    return runWhenMapStyleReady(mapInstance, load);
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

    return runWhenMapStyleReady(mapInstance, loadInfrastructure);
  }, [filterEmpresa, filterLinha, filterRegiao, removeLayerAndSource, showInfrastructure]);

  // Load queimadas layer
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    const clearLayers = () => {
      ["queimadas-points", "queimadas-clusters", "queimadas-cluster-count"].forEach((layerId) => {
        safeRemoveLayer(mapInstance, layerId);
      });
      safeRemoveSource(mapInstance, "queimadas");
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

    const cancelPending = runWhenMapStyleReady(mapInstance, loadQueimadas);

    return () => {
      cancelPending();
      mapInstance.off("click", "queimadas-points", handlePointClick);
      mapInstance.off("mouseenter", "queimadas-points", handleMouseEnter);
      mapInstance.off("mouseleave", "queimadas-points", handleMouseLeave);
    };
  }, [confiancaMin, mode, onFeatureClick, sateliteFilter, showQueimadas, zoneConfig, safeRemoveLayer, safeRemoveSource]);

  // Update queimadas data when it changes
  useEffect(() => {
    if (!mapRef.current || !showQueimadas || !queimadasData) return;

    try {
      const source = mapRef.current.getSource("queimadas") as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(queimadasData);
      }
    } catch {/* ignore */}
  }, [queimadasData, showQueimadas]);

  useEffect(() => {
    const mapInstance = activeMap;
    if (!mapInstance) return;
    if (local3DLayers.length === 0) return;

    const syncLocal3DLayers = () => {
      if (!styleReadyRef.current) return;

      const activeSourceIds = new Set<string>();
      const activeLayerIds = new Set<string>();

      local3DLayers.forEach((layer) => {
        const sourceId = `local-3d-source-${layer.id}`;
        const extrusionLayerId = `local-3d-extrusion-${layer.id}`;
        const outlineLayerId = `local-3d-outline-${layer.id}`;
        activeSourceIds.add(sourceId);
        activeLayerIds.add(extrusionLayerId);
        activeLayerIds.add(outlineLayerId);

        if (!layer.visible) {
          safeRemoveLayer(mapInstance, outlineLayerId);
          removeLayerAndSource(mapInstance, extrusionLayerId, sourceId);
          return;
        }

        if (hasSource(mapInstance, sourceId)) {
          (mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource).setData(layer.data as any);
        } else {
          mapInstance.addSource(sourceId, {
            type: "geojson",
            data: layer.data as any,
          });
        }

        if (!hasLayer(mapInstance, extrusionLayerId)) {
          mapInstance.addLayer({
            id: extrusionLayerId,
            type: "fill-extrusion",
            source: sourceId,
            paint: {
              "fill-extrusion-color": ["coalesce", ["get", "extrusionColor"], layer.color],
              "fill-extrusion-height": ["coalesce", ["to-number", ["get", "extrusionHeight"]], 18],
              "fill-extrusion-base": ["coalesce", ["to-number", ["get", "baseHeight"]], 0],
              "fill-extrusion-opacity": 0.82,
              "fill-extrusion-vertical-gradient": true,
            },
          });
        }

        if (!hasLayer(mapInstance, outlineLayerId)) {
          mapInstance.addLayer({
            id: outlineLayerId,
            type: "line",
            source: sourceId,
            paint: {
              "line-color": "#e2e8f0",
              "line-width": 0.9,
              "line-opacity": 0.35,
            },
          });
        }
      });

      const style = mapInstance.getStyle();
      style.layers
        .filter((layer) => layer.id.startsWith("local-3d-") && !activeLayerIds.has(layer.id))
        .forEach((layer) => safeRemoveLayer(mapInstance, layer.id));

      Object.keys(style.sources)
        .filter((sourceId) => sourceId.startsWith("local-3d-source-") && !activeSourceIds.has(sourceId))
        .forEach((sourceId) => safeRemoveSource(mapInstance, sourceId));
    };

    const cancelPending = runWhenMapStyleReady(mapInstance, syncLocal3DLayers);

    mapInstance.on("style.load", syncLocal3DLayers);
    return () => {
      cancelPending();
      mapInstance.off("style.load", syncLocal3DLayers);
    };
  }, [
    activeMap,
    hasLayer,
    hasSource,
    local3DLayers,
    removeLayerAndSource,
    safeRemoveLayer,
    safeRemoveSource,
  ]);

  useEffect(() => {
    const mapInstance = activeMap;
    if (!mapInstance) return;

    const canvas = mapInstance.getCanvas();
    const pressedKeys = { control: false, shift: false };
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startBearing = 0;
    let startPitch = 0;

    const updateNavigationState = () => {
      const nextActive = pressedKeys.control && pressedKeys.shift;
      setIsEarthNavigationActive(nextActive);

      if (nextActive) {
        mapInstance.dragPan.disable();
        canvas.style.cursor = isDragging ? "grabbing" : "grab";
        return;
      }

      isDragging = false;
      mapInstance.dragPan.enable();
      canvas.style.cursor = "";
    };

    const stopDragging = () => {
      if (!isDragging) return;
      isDragging = false;
      canvas.style.cursor = pressedKeys.control && pressedKeys.shift ? "grab" : "";
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if (event.key === "Control") pressedKeys.control = true;
      if (event.key === "Shift") pressedKeys.shift = true;

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        mapInstance.easeTo({
          bearing: 0,
          pitch: 0,
          duration: 700,
          essential: true,
        });
        return;
      }

      updateNavigationState();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Control") pressedKeys.control = false;
      if (event.key === "Shift") pressedKeys.shift = false;
      stopDragging();
      updateNavigationState();
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (!(pressedKeys.control && pressedKeys.shift)) return;

      event.preventDefault();
      isDragging = true;
      startX = event.clientX;
      startY = event.clientY;
      startBearing = mapInstance.getBearing();
      startPitch = mapInstance.getPitch();
      if (startPitch < 35) {
        startPitch = 35;
        mapInstance.jumpTo({ pitch: 35 });
      }
      canvas.style.cursor = "grabbing";
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      mapInstance.jumpTo({
        bearing: startBearing + deltaX * 0.32,
        pitch: clamp(startPitch - deltaY * 0.28, 0, 85),
      });
    };

    const handleWindowBlur = () => {
      pressedKeys.control = false;
      pressedKeys.shift = false;
      stopDragging();
      updateNavigationState();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDragging);
    window.addEventListener("blur", handleWindowBlur);
    canvas.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDragging);
      window.removeEventListener("blur", handleWindowBlur);
      canvas.removeEventListener("mousedown", handleMouseDown);
      stopDragging();
      mapInstance.dragPan.enable();
      canvas.style.cursor = "";
      setIsEarthNavigationActive(false);
    };
  }, [activeMap]);

  // Apply layer ordering (array from bottom to top)
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || !layerOrder || layerOrder.length === 0) return;
    const existing = layerOrder.filter((layerId) => hasLayer(mapInstance, layerId));
    existing.forEach((layerId, index) => {
      const before = existing[index + 1];
      try {
        mapInstance.moveLayer(layerId, before);
      } catch (error) {
        console.warn("Unable to move layer", layerId, error);
      }
    });
  }, [hasLayer, layerOrder]);

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

  const outerStyle = height ? { height } : undefined;

  return (
    <div
      className="relative w-full h-full map-smooth"
      style={outerStyle}
      aria-busy={isLoading}
      aria-live="polite"
    >
      {isLoading && <MapLoadingIndicator label="Carregando mapa geoespacial..." />}

      {hasInteracted && (
        <BasemapSelector value={currentBasemap} onChange={handleBasemapChange} mapboxAvailable={false} />
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 z-[5] rounded-xl border border-border/70 bg-background/85 px-3 py-2 shadow-sm backdrop-blur">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Navegação Earth
        </div>
        <div className="mt-1 text-xs text-foreground">
          <span className="font-medium">R</span> retorna para nadir e norte
        </div>
        <div className="text-xs text-foreground">
          <span className="font-medium">Ctrl + Shift + arrastar</span> orbita em 3D
        </div>
        {isEarthNavigationActive && (
          <div className="mt-1 text-[11px] font-medium text-primary">Modo 3D ativo</div>
        )}
      </div>

      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default MapLibreUnified;
