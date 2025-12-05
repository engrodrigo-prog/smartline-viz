import { useCallback, useEffect, useMemo, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { DEFAULT_LAYERS, BASE_LAYERS } from "@/components/map/layersConfig";
import type { Layer } from "@/components/map/LayerSelector";
import { LayersStorage } from "@/lib/storage/layers";
import JSZip from "jszip";
import { toast } from "sonner";
import { useQueimadas } from "@/hooks/useQueimadas";
import { useFirmsKml } from "@/hooks/useFirmsKml";
import type { FiltersState } from "@/context/FiltersContext";

const RS_BOUNDS: [[number, number], [number, number]] = [
  [-57.65, -33.75],
  [-49.5, -27.0],
];

export const useUnifiedMapState = (filters: FiltersState) => {
  const [layers, setLayers] = useState<Layer[]>(DEFAULT_LAYERS);
  const [baseLayers, setBaseLayers] = useState<Layer[]>(BASE_LAYERS);
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);
  const [loadingLayers, setLoadingLayers] = useState<Set<string>>(new Set());
  const [isBasemapChanging, setIsBasemapChanging] = useState(false);

  const shouldShowBrazilMode = useMemo(
    () => !filters.linha && !filters.regiao && !filters.empresa,
    [filters.linha, filters.regiao, filters.empresa],
  );

  // TODO Simulação de risco: incorporar resultados span_analysis quando o edge function expuser novos atributos.
  const { data: queimadasData } = useQueimadas({
    mode: "live",
    concessao: shouldShowBrazilMode ? "BRASIL" : filters.empresa || "TODAS",
    maxKm: shouldShowBrazilMode ? 999999 : 3,
  });

  const { data: footprintsData } = useFirmsKml({
    enabled: shouldShowBrazilMode,
  });

  const handleToggleLayer = useCallback((layerId: string) => {
    setLayers((prev) =>
      prev.map((layer) => (layer.id === layerId ? { ...layer, visible: !layer.visible } : layer)),
    );
  }, []);

  const handleToggleBaseLayer = useCallback((layerId: string) => {
    setBaseLayers((prev) =>
      prev.map((layer) => (layer.id === layerId ? { ...layer, visible: !layer.visible } : layer)),
    );
  }, []);

  useEffect(() => {
    if (!mapInstance) return;

    const onChanging = () => setIsBasemapChanging(true);
    const onChanged = () => setIsBasemapChanging(false);

    mapInstance.on("basemap-changing" as any, onChanging);
    mapInstance.on("basemap-changed" as any, onChanged);

    return () => {
      mapInstance.off("basemap-changing" as any, onChanging);
      mapInstance.off("basemap-changed" as any, onChanged);
    };
  }, [mapInstance]);

  useEffect(() => {
    if (!mapInstance || isBasemapChanging) return;
    if (!mapInstance.getStyle || !mapInstance.getStyle()) return;

    if (!mapInstance.isStyleLoaded()) {
      mapInstance.once("style.load", () => {
        setLoadingLayers(new Set());
      });
      return;
    }

    const updateLayers = async () => {
      for (const layer of baseLayers) {
        try {
          let layerExists = false;
          try {
            layerExists = Boolean(mapInstance.getLayer(layer.id));
          } catch {
            layerExists = false;
          }

          if (layer.visible && !layerExists) {
            setLoadingLayers((prev) => new Set(prev).add(layer.id));

            const url = LayersStorage.getBaseLayerUrl(layer.filename || "");
            const response = await fetch(url);

            if (!response.ok) {
              throw new Error("Arquivo não encontrado no storage");
            }

            let geojson: any;
            if (layer.filename?.endsWith(".zip")) {
              const blob = await response.blob();
              const zip = await JSZip.loadAsync(blob);
              const geojsonFile = Object.keys(zip.files).find((fileName) =>
                fileName.endsWith(".geojson") || fileName.endsWith(".json"),
              );
              if (!geojsonFile) {
                throw new Error("Nenhum arquivo GeoJSON encontrado no ZIP");
              }
              const geojsonContent = await zip.file(geojsonFile)?.async("string");
              geojson = JSON.parse(geojsonContent || "{}");
            } else {
              geojson = await response.json();
            }

            if (!mapInstance.getSource(layer.id)) {
              mapInstance.addSource(layer.id, {
                type: "geojson",
                data: geojson,
              });
            }

            mapInstance.addLayer({
              id: layer.id,
              type: "line",
              source: layer.id,
              paint: {
                "line-color": "#3b82f6",
                "line-width": 2,
                "line-opacity": 0.7,
              },
            });

            mapInstance.addLayer({
              id: `${layer.id}-fill`,
              type: "fill",
              source: layer.id,
              paint: {
                "fill-color": "#3b82f6",
                "fill-opacity": 0.1,
              },
            });

            toast.success(`Camada "${layer.name}" carregada`);
          } else if (!layer.visible && layerExists) {
            if (mapInstance.getLayer(`${layer.id}-fill`)) {
              mapInstance.removeLayer(`${layer.id}-fill`);
            }
            if (mapInstance.getLayer(layer.id)) {
              mapInstance.removeLayer(layer.id);
            }
            if (mapInstance.getSource(layer.id)) {
              mapInstance.removeSource(layer.id);
            }
          }
        } catch (error: any) {
          console.error(`Erro ao processar camada ${layer.id}:`, error);
          toast.error(`Erro ao carregar "${layer.name}": ${error.message}`);
          setBaseLayers((prev) => prev.map((item) => (item.id === layer.id ? { ...item, visible: false } : item)));
        } finally {
          setLoadingLayers((prev) => {
            const next = new Set(prev);
            next.delete(layer.id);
            return next;
          });
        }
      }
    };

    void updateLayers();
  }, [baseLayers, isBasemapChanging, mapInstance]);

  useEffect(() => {
    if (!queimadasData) return;
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === "queimadas"
          ? { ...layer, count: queimadasData.features?.length || 0 }
          : layer,
      ),
    );
  }, [queimadasData]);

  const centerCoords = shouldShowBrazilMode ? { lat: -30.0, lng: -53.0 } : { lat: -23.96, lng: -46.33 };
  const initialZoom = shouldShowBrazilMode ? 6 : 12;

  return {
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
    fitBounds: shouldShowBrazilMode ? RS_BOUNDS : undefined,
  };
};
