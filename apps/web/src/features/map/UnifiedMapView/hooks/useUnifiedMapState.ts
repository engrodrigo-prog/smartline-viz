import { useCallback, useEffect, useMemo, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";
import JSZip from "jszip";
import { toast } from "sonner";

import { DEFAULT_LAYERS, BASE_LAYERS } from "@/components/map/layersConfig";
import type { Layer } from "@/components/map/LayerSelector";
import type { FiltersState } from "@/context/FiltersContext";
import { useSelectionContext } from "@/context/SelectionContext";
import { useFirmsKml } from "@/hooks/useFirmsKml";
import { useGeodataQuery } from "@/hooks/useGeodataQuery";
import { useLipowerlineCruzamentos } from "@/hooks/useLipowerlineCruzamentos";
import { useLipowerlineRiscoQueda } from "@/hooks/useLipowerlineRiscoQueda";
import { useLipowerlineRiscoVegetacao } from "@/hooks/useLipowerlineRiscoVegetacao";
import { useLipowerlineTratamentos } from "@/hooks/useLipowerlineTratamentos";
import { useMediaItems } from "@/hooks/useMedia";
import { useQueimadas } from "@/hooks/useQueimadas";
import { explodeLineFeatures, explodePointFeatures, explodePolygonFeatures } from "@/lib/geodata";
import { isMapStyleReady, runWhenMapStyleReady } from "@/lib/mapStyle";
import { LayersStorage } from "@/lib/storage/layers";

const RS_BOUNDS: [[number, number], [number, number]] = [
  [-57.65, -33.75],
  [-49.5, -27.0],
];

const MEDIA_COLORS: Record<string, string> = {
  frame: "#f97316",
  foto: "#0ea5e9",
  video: "#a855f7",
};

const isPointGeometry = (type?: string) => type === "Point" || type === "MultiPoint";
const isLineGeometry = (type?: string) => type === "LineString" || type === "MultiLineString";
const isPolygonGeometry = (type?: string) => type === "Polygon" || type === "MultiPolygon";
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
  const shouldFetchQueimadas = useMemo(
    () => layers.some((layer) => layer.id === "queimadas" && layer.visible),
    [layers],
  );
  const shouldFetchQueimadasFootprints = useMemo(
    () => layers.some((layer) => layer.id === "queimadas_footprints" && layer.visible),
    [layers],
  );
  const shouldFetchDashboardGeodata = useMemo(
    () =>
      layers.some(
        (layer) =>
          layer.visible &&
          ["linhas", "torres", "geo_pontos", "geo_poligonos", "geo_rasters"].includes(layer.id),
      ),
    [layers],
  );

  // TODO Simulação de risco: incorporar resultados span_analysis quando o edge function expuser novos atributos.
  const { linhaSelecionadaId, cenarioSelecionadoId } = useSelectionContext();

  const { data: queimadasData } = useQueimadas({
    mode: "live",
    concessao: shouldShowBrazilMode ? "BRASIL" : filters.empresa || "TODAS",
    maxKm: shouldShowBrazilMode ? 999999 : 3,
    enabled: shouldFetchQueimadas,
  });

  const { data: footprintsData } = useFirmsKml({
    enabled: shouldShowBrazilMode && shouldFetchQueimadasFootprints,
  });

  const vegetacaoRisk = useLipowerlineRiscoVegetacao(linhaSelecionadaId, cenarioSelecionadoId);
  const quedaRisk = useLipowerlineRiscoQueda(linhaSelecionadaId, cenarioSelecionadoId);
  const cruzamentos = useLipowerlineCruzamentos(linhaSelecionadaId, cenarioSelecionadoId);
  const tratamentos = useLipowerlineTratamentos(linhaSelecionadaId, cenarioSelecionadoId);
  const dashboardGeodata = useGeodataQuery({
    context: "dashboard",
    enabled: shouldFetchDashboardGeodata,
    requireGeometry: true,
    filters: {
      empresa: filters.empresa,
      regiao: filters.regiao,
      lineCode: filters.linha,
      lineName: filters.linhaNome,
      tensaoKv: filters.tensaoKv,
      dateFrom: filters.dataInicio,
      dateTo: filters.dataFim,
    },
  });
  const mediaItems = useMediaItems(
    { linhaId: linhaSelecionadaId, cenarioId: cenarioSelecionadoId, hasGeom: true, limit: 1000 },
    { enabled: Boolean(linhaSelecionadaId) },
  );

  const dashboardGeoItems = useMemo(() => dashboardGeodata.data ?? [], [dashboardGeodata.data]);

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

    if (!isMapStyleReady(mapInstance)) {
      const cancelPending = runWhenMapStyleReady(mapInstance, () => {
        setLoadingLayers(new Set());
      });
      return () => {
        cancelPending();
      };
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

            let geojson: unknown;
            if (layer.filename?.endsWith(".zip")) {
              const blob = await response.blob();
              const zip = await JSZip.loadAsync(blob);
              const geojsonFile = Object.keys(zip.files).find(
                (fileName) => fileName.endsWith(".geojson") || fileName.endsWith(".json"),
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
                data: geojson as Record<string, unknown>,
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
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Erro desconhecido";
          console.error(`Erro ao processar camada ${layer.id}:`, error);
          toast.error(`Erro ao carregar "${layer.name}": ${message}`);
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
      prev.map((layer) => (layer.id === "queimadas" ? { ...layer, count: queimadasData.features?.length || 0 } : layer)),
    );
  }, [queimadasData]);

  const mediaPoints = useMemo<Feature<Point>[]>(() => {
    const items = mediaItems.data?.items ?? [];
    return items
      .filter((item) => item.geometry)
      .map((item) => ({
        type: "Feature" as const,
        geometry: item.geometry!,
        properties: {
          mediaId: item.mediaId,
          jobId: item.jobId,
          tipo: item.tipoMidia,
          filePath: item.filePath,
          color: MEDIA_COLORS[item.tipoMidia] ?? "#fbbf24",
          size: item.tipoMidia === "frame" ? 6 : 8,
        },
      }));
  }, [mediaItems.data?.items]);

  const publishedLineFeatures = useMemo(
    () =>
      explodeLineFeatures(
        dashboardGeoItems.filter(
          (item) =>
            item.assetType === "vector" &&
            isLineGeometry(item.geometry?.type) &&
            (item.sourceTable === "linhas_transmissao" || item.sourceTable === "geodata_outros" || item.sourceTable === "eventos_geo"),
        ),
      ),
    [dashboardGeoItems],
  );

  const publishedStructurePoints = useMemo(
    () =>
      explodePointFeatures(
        dashboardGeoItems.filter((item) => item.sourceTable === "estruturas" && isPointGeometry(item.geometry?.type)),
      ),
    [dashboardGeoItems],
  );

  const publishedGenericGeoPoints = useMemo(
    () =>
      explodePointFeatures(
        dashboardGeoItems.filter(
          (item) => item.sourceTable !== "estruturas" && item.assetType === "vector" && isPointGeometry(item.geometry?.type),
        ),
      ),
    [dashboardGeoItems],
  );

  const publishedVectorPolygons = useMemo(
    () =>
      explodePolygonFeatures(
        dashboardGeoItems.filter(
          (item) => item.assetType === "vector" && item.sourceTable !== "rasters" && isPolygonGeometry(item.geometry?.type),
        ),
      ),
    [dashboardGeoItems],
  );

  const publishedRasterPolygons = useMemo(
    () => explodePolygonFeatures(dashboardGeoItems.filter((item) => item.assetType === "raster")),
    [dashboardGeoItems],
  );

  useEffect(() => {
    setLayers((prev) =>
      prev.map((layer) => {
        if (layer.id === "linhas") {
          return { ...layer, count: publishedLineFeatures.length };
        }
        if (layer.id === "lp_vegetacao") {
          return { ...layer, count: vegetacaoRisk.data.features.length };
        }
        if (layer.id === "lp_queda") {
          return { ...layer, count: quedaRisk.data.features.length };
        }
        if (layer.id === "lp_cruzamentos") {
          return { ...layer, count: cruzamentos.data.features.length };
        }
        if (layer.id === "lp_tratamentos") {
          return { ...layer, count: tratamentos.data.features.length };
        }
        if (layer.id === "lp_media") {
          return { ...layer, count: mediaItems.data?.items.length ?? 0 };
        }
        if (layer.id === "torres") {
          return { ...layer, count: publishedStructurePoints.length };
        }
        if (layer.id === "geo_pontos") {
          return { ...layer, count: publishedGenericGeoPoints.length };
        }
        if (layer.id === "geo_poligonos") {
          return { ...layer, count: publishedVectorPolygons.length };
        }
        if (layer.id === "geo_rasters") {
          return { ...layer, count: publishedRasterPolygons.length };
        }
        return layer;
      }),
    );
  }, [
    cruzamentos.data.features.length,
    mediaItems.data?.items.length,
    publishedGenericGeoPoints.length,
    publishedLineFeatures.length,
    publishedRasterPolygons.length,
    publishedStructurePoints.length,
    publishedVectorPolygons.length,
    quedaRisk.data.features.length,
    tratamentos.data.features.length,
    vegetacaoRisk.data.features.length,
  ]);

  const combinedLines = useMemo<FeatureCollection<LineString> | null>(() => {
    const features: FeatureCollection<LineString>["features"] = [];
    const linhasVisible = layers.find((layer) => layer.id === "linhas")?.visible;
    const vegetacaoVisible = layers.find((layer) => layer.id === "lp_vegetacao")?.visible;
    const tratamentosVisible = layers.find((layer) => layer.id === "lp_tratamentos")?.visible;

    if (linhasVisible) {
      features.push(...publishedLineFeatures);
    }
    if (vegetacaoVisible) {
      features.push(...vegetacaoRisk.data.features);
    }
    if (tratamentosVisible) {
      features.push(...tratamentos.data.features);
    }

    return features.length ? { type: "FeatureCollection", features } : null;
  }, [layers, publishedLineFeatures, tratamentos.data.features, vegetacaoRisk.data.features]);

  const combinedPoints = useMemo<FeatureCollection<Point> | null>(() => {
    const features: FeatureCollection<Point>["features"] = [];
    const torresVisible = layers.find((layer) => layer.id === "torres")?.visible;
    const geoPontosVisible = layers.find((layer) => layer.id === "geo_pontos")?.visible;
    const quedaVisible = layers.find((layer) => layer.id === "lp_queda")?.visible;
    const cruzVisible = layers.find((layer) => layer.id === "lp_cruzamentos")?.visible;
    const mediaVisible = layers.find((layer) => layer.id === "lp_media")?.visible;

    if (torresVisible) {
      features.push(...publishedStructurePoints);
    }
    if (geoPontosVisible) {
      features.push(...publishedGenericGeoPoints);
    }
    if (quedaVisible) {
      features.push(...quedaRisk.data.features);
    }
    if (cruzVisible) {
      features.push(...cruzamentos.data.features);
    }
    if (mediaVisible) {
      features.push(...mediaPoints);
    }

    return features.length ? { type: "FeatureCollection", features } : null;
  }, [
    cruzamentos.data.features,
    layers,
    mediaPoints,
    publishedGenericGeoPoints,
    publishedStructurePoints,
    quedaRisk.data.features,
  ]);

  const combinedPolygons = useMemo<FeatureCollection<Polygon> | null>(() => {
    const features: FeatureCollection<Polygon>["features"] = [];
    const geoPoligonosVisible = layers.find((layer) => layer.id === "geo_poligonos")?.visible;
    const geoRastersVisible = layers.find((layer) => layer.id === "geo_rasters")?.visible;

    if (geoPoligonosVisible) {
      features.push(...publishedVectorPolygons);
    }
    if (geoRastersVisible) {
      features.push(...publishedRasterPolygons);
    }

    return features.length ? { type: "FeatureCollection", features } : null;
  }, [layers, publishedRasterPolygons, publishedVectorPolygons]);

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
    customLines: combinedLines ?? undefined,
    customPoints: combinedPoints ?? undefined,
    customPolygons: combinedPolygons ?? undefined,
    mapInstance,
    setMapInstance,
    centerCoords,
    initialZoom,
    fitBounds: shouldShowBrazilMode ? RS_BOUNDS : undefined,
  };
};
