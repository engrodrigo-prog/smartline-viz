import { useState, useEffect } from "react";
import { MapLibreUnified } from "@/components/MapLibreUnified";
import LayerSelector, { DEFAULT_LAYERS, BASE_LAYERS, Layer } from "./LayerSelector";
import { useFilters } from "@/context/FiltersContext";
import { useQueimadas } from "@/hooks/useQueimadas";
import { useFirmsKml } from "@/hooks/useFirmsKml";
import { FirmsFootprintsLayer } from "@/components/ambiente/FirmsFootprintsLayer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Globe, Loader2 } from "lucide-react";
import { LayersStorage } from "@/lib/storage/layers";
import JSZip from "jszip";
import { toast } from "sonner";
import type { Map as MapLibreMap } from "maplibre-gl";

const UnifiedMapView = () => {
  const { filters } = useFilters();
  const [layers, setLayers] = useState<Layer[]>(DEFAULT_LAYERS);
  const [baseLayers, setBaseLayers] = useState<Layer[]>(BASE_LAYERS);
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);
  const [loadingLayers, setLoadingLayers] = useState<Set<string>>(new Set());
  const [isBasemapChanging, setIsBasemapChanging] = useState(false);
  
  // Determinar se deve mostrar modo Brasil
  const shouldShowBrazilMode = !filters.linha && !filters.regiao && !filters.empresa;
  
  // CORRIGIDO: usar 'BRASIL' em modo Brasil para forçar mode=brasil no edge function
  const { data: queimadasData, isLoading } = useQueimadas({
    mode: 'live',
    concessao: shouldShowBrazilMode ? 'BRASIL' : (filters.empresa || 'TODAS'),
    maxKm: shouldShowBrazilMode ? 999999 : 3,
  });

  // Buscar footprints FIRMS via KML/KMZ quando em modo Brasil
  const { data: footprintsData } = useFirmsKml({
    enabled: shouldShowBrazilMode,
  });

  const handleToggleLayer = (layerId: string) => {
    setLayers(prev => 
      prev.map(layer => 
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  const handleToggleBaseLayer = (layerId: string) => {
    setBaseLayers(prev => 
      prev.map(layer => 
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  // Listeners para eventos de troca de basemap
  useEffect(() => {
    if (!mapInstance) return;
    
    const onChanging = () => setIsBasemapChanging(true);
    const onChanged = () => setIsBasemapChanging(false);
    
    mapInstance.on('basemap-changing' as any, onChanging);
    mapInstance.on('basemap-changed' as any, onChanged);
    
    return () => {
      mapInstance.off('basemap-changing' as any, onChanging);
      mapInstance.off('basemap-changed' as any, onChanged);
    };
  }, [mapInstance]);

  // Carregar camadas base dinamicamente
  useEffect(() => {
    if (!mapInstance || isBasemapChanging) return;
    
    // Verificação defensiva para evitar erro getLayer
    if (!mapInstance.getStyle || !mapInstance.getStyle()) {
      return;
    }
    
    if (!mapInstance.isStyleLoaded()) {
      mapInstance.once('style.load', () => {
        // Trigger re-render após style carregar
        setLoadingLayers(new Set());
      });
      return;
    }

    const updateLayers = async () => {
      for (const layer of baseLayers) {
        try {
          // Verificação defensiva
          let layerExists = false;
          try {
            layerExists = !!mapInstance.getLayer(layer.id);
          } catch (e) {
            // Ignorar erro se camada não existe
            layerExists = false;
          }
          
          if (layer.visible && !layerExists) {
            // Adicionar camada
            setLoadingLayers(prev => new Set(prev).add(layer.id));
            
            const url = LayersStorage.getBaseLayerUrl(layer.filename || '');
            const response = await fetch(url);
            
            if (!response.ok) {
              throw new Error('Arquivo não encontrado no storage');
            }

            let geojson: any;

            // Se for ZIP, descompactar
            if (layer.filename?.endsWith('.zip')) {
              const blob = await response.blob();
              const zip = await JSZip.loadAsync(blob);
              const geojsonFile = Object.keys(zip.files).find(f => 
                f.endsWith('.geojson') || f.endsWith('.json')
              );
              
              if (!geojsonFile) {
                throw new Error('Nenhum arquivo GeoJSON encontrado no ZIP');
              }

              const geojsonContent = await zip.file(geojsonFile)?.async('string');
              geojson = JSON.parse(geojsonContent || '{}');
            } else {
              // GeoJSON direto
              geojson = await response.json();
            }

            // Adicionar source e layer ao mapa
            if (!mapInstance.getSource(layer.id)) {
              mapInstance.addSource(layer.id, {
                type: 'geojson',
                data: geojson,
              });
            }

            // Adicionar layer de linha
            mapInstance.addLayer({
              id: layer.id,
              type: 'line',
              source: layer.id,
              paint: {
                'line-color': '#3b82f6',
                'line-width': 2,
                'line-opacity': 0.7,
              },
            });

            // Adicionar layer de preenchimento (polígonos)
            mapInstance.addLayer({
              id: `${layer.id}-fill`,
              type: 'fill',
              source: layer.id,
              paint: {
                'fill-color': '#3b82f6',
                'fill-opacity': 0.1,
              },
            });

            toast.success(`Camada "${layer.name}" carregada`);
          } else if (!layer.visible && layerExists) {
            // Remover camada
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
          
          // Reverter visibilidade em caso de erro
          setBaseLayers(prev =>
            prev.map(l => l.id === layer.id ? { ...l, visible: false } : l)
          );
        } finally {
          setLoadingLayers(prev => {
            const next = new Set(prev);
            next.delete(layer.id);
            return next;
          });
        }
      }
    };

    updateLayers();
  }, [baseLayers, mapInstance, isBasemapChanging]);

  // Atualizar contagem de queimadas
  useEffect(() => {
    if (queimadasData) {
      setLayers(prev =>
        prev.map(layer =>
          layer.id === 'queimadas'
            ? { ...layer, count: queimadasData.features?.length || 0 }
            : layer
        )
      );
    }
  }, [queimadasData]);

  const centerCoords = shouldShowBrazilMode
    ? { lat: -12.0, lng: -52.0 } // Centro do Brasil
    : { lat: -23.96, lng: -46.33 }; // Santos

  const initialZoom = shouldShowBrazilMode ? 4 : 12;

  return (
    <div className="flex h-full gap-4">
      {/* Painel lateral de camadas */}
      <div className="w-80 flex-shrink-0 overflow-y-auto">
        <LayerSelector 
          layers={layers} 
          onToggleLayer={handleToggleLayer}
          baseLayers={baseLayers}
          onToggleBaseLayer={handleToggleBaseLayer}
        />
        
        {loadingLayers.size > 0 && (
          <Alert className="mt-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <AlertDescription>
              Carregando camadas...
            </AlertDescription>
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

      {/* Mapa principal */}
      <div className="flex-1 relative rounded-lg overflow-hidden tech-card">
        <MapLibreUnified
          filterRegiao={filters.regiao}
          filterEmpresa={filters.empresa}
          filterLinha={filters.linha}
          showQueimadas={layers.find(l => l.id === 'queimadas')?.visible ?? true}
          showInfrastructure={layers.find(l => l.id === 'linhas')?.visible ?? true}
          queimadasData={queimadasData}
          initialCenter={[centerCoords.lng, centerCoords.lat]}
          initialZoom={initialZoom}
          onMapLoad={setMapInstance}
        />
        
        {/* Camada de footprints FIRMS */}
        <FirmsFootprintsLayer
          map={mapInstance}
          geojson={footprintsData || null}
          visible={layers.find(l => l.id === 'queimadas_footprints')?.visible ?? shouldShowBrazilMode}
        />
      </div>
    </div>
  );
};

export default UnifiedMapView;
