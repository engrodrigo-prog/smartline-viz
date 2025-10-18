import { useState, useEffect } from "react";
import { MapLibreUnified } from "@/components/MapLibreUnified";
import LayerSelector, { DEFAULT_LAYERS, BASE_LAYERS, Layer } from "./LayerSelector";
import { useFilters } from "@/context/FiltersContext";
import { useQueimadas } from "@/hooks/useQueimadas";
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
  
  // Determinar se deve mostrar modo Brasil
  const shouldShowBrazilMode = !filters.linha && !filters.regiao && !filters.empresa;
  
  const { data: queimadasData, isLoading } = useQueimadas({
    mode: 'live',
    concessao: shouldShowBrazilMode ? 'TODAS' : (filters.empresa || 'TODAS'),
    maxKm: shouldShowBrazilMode ? 999999 : 3,
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

  // Carregar camadas base dinamicamente
  useEffect(() => {
    if (!mapInstance) return;

    baseLayers.forEach(async (layer) => {
      const layerExists = mapInstance.getLayer(layer.id);
      
      if (layer.visible && !layerExists) {
        // Adicionar camada
        setLoadingLayers(prev => new Set(prev).add(layer.id));
        
        try {
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
        } catch (error: any) {
          console.error(`Erro ao carregar camada ${layer.id}:`, error);
          toast.error(`Erro ao carregar "${layer.name}": ${error.message}`);
          
          // Reverter visibilidade
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
      } else if (!layer.visible && layerExists) {
        // Remover camada
        try {
          if (mapInstance.getLayer(`${layer.id}-fill`)) {
            mapInstance.removeLayer(`${layer.id}-fill`);
          }
          if (mapInstance.getLayer(layer.id)) {
            mapInstance.removeLayer(layer.id);
          }
          if (mapInstance.getSource(layer.id)) {
            mapInstance.removeSource(layer.id);
          }
        } catch (error) {
          console.error(`Erro ao remover camada ${layer.id}:`, error);
        }
      }
    });
  }, [baseLayers, mapInstance]);

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
          initialCenter={[centerCoords.lng, centerCoords.lat]}
          initialZoom={initialZoom}
          onMapLoad={setMapInstance}
        />
      </div>
    </div>
  );
};

export default UnifiedMapView;
