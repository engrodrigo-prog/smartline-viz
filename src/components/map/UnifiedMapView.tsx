import { useState, useEffect } from "react";
import { MapLibreUnified } from "@/components/MapLibreUnified";
import LayerSelector, { DEFAULT_LAYERS, Layer } from "./LayerSelector";
import { useFilters } from "@/context/FiltersContext";
import { useQueimadas } from "@/hooks/useQueimadas";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Globe } from "lucide-react";

const UnifiedMapView = () => {
  const { filters } = useFilters();
  const [layers, setLayers] = useState<Layer[]>(DEFAULT_LAYERS);
  
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
        <LayerSelector layers={layers} onToggleLayer={handleToggleLayer} />
        
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
        />
      </div>
    </div>
  );
};

export default UnifiedMapView;
