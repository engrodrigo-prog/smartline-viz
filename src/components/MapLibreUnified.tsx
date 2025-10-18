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
  mode?: 'live' | 'archive';
  confiancaMin?: number;
  sateliteFilter?: string;
  focusCoord?: [number, number];
  zoneConfig?: any;
  onFeatureClick?: (feature: any) => void;
}

// Temporary placeholder - map component being migrated to ESRI + MapLibre
export const MapLibreUnified = (props: MapLibreUnifiedProps) => {
  return (
    <div className="w-full h-[600px] rounded-lg border border-border bg-background flex items-center justify-center">
      <div className="text-center p-6">
        <p className="text-muted-foreground mb-2">🗺️ Mapa em migração para ESRI</p>
        <p className="text-sm text-muted-foreground">
          Componente sendo atualizado para usar MapLibre GL + ESRI basemaps
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Migração do Mapbox para ESRI está em andamento
        </p>
      </div>
    </div>
  );
};
