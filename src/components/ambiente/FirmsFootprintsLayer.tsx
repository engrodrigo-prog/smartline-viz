import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';

interface FirmsFootprintsLayerProps {
  map: maplibregl.Map | null;
  geojson: GeoJSON.FeatureCollection | null;
  visible?: boolean;
  onFeatureClick?: (feature: any) => void;
}

export const FirmsFootprintsLayer = ({ 
  map, 
  geojson, 
  visible = true,
  onFeatureClick 
}: FirmsFootprintsLayerProps) => {
  
  useEffect(() => {
    if (!map || !geojson) return;
    
    // Verificação defensiva: garantir que o estilo está carregado
    if (!map.getStyle || !map.getStyle()) return;
    if (!map.isStyleLoaded()) {
      // Aguardar carregamento do estilo
      map.once('style.load', () => {
        // Força re-render após style carregar
      });
      return;
    }

    const sourceId = 'firms-footprints';
    const fillLayerId = 'firms-footprints-fill';
    const outlineLayerId = 'firms-footprints-outline';
    const labelLayerId = 'firms-footprints-label';

    // Remove existing layers/source if present (com try/catch)
    try {
      if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId);
      if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    } catch (e) {
      console.debug('Layers not present, continuing...');
    }

    // Add source
    map.addSource(sourceId, {
      type: 'geojson',
      data: geojson,
    });

    // Fill layer with risk-based colors
    map.addLayer({
      id: fillLayerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': [
          'match',
          ['get', 'nivel_risco'],
          'critico', '#d32f2f',
          'alto', '#f57c00',
          'medio', '#fbc02d',
          'baixo', '#fdd835',
          '#ff5722' // default
        ],
        'fill-opacity': 0.35,
      },
      layout: {
        visibility: visible ? 'visible' : 'none',
      },
    });

    // Outline layer
    map.addLayer({
      id: outlineLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': [
          'match',
          ['get', 'nivel_risco'],
          'critico', '#b71c1c',
          'alto', '#e65100',
          'medio', '#f57f17',
          'baixo', '#f9a825',
          '#d32f2f' // default
        ],
        'line-width': 2,
        'line-opacity': 0.8,
      },
      layout: {
        visibility: visible ? 'visible' : 'none',
      },
    });

    // Label layer showing area
    map.addLayer({
      id: labelLayerId,
      type: 'symbol',
      source: sourceId,
      layout: {
        'text-field': ['concat', ['to-string', ['round', ['get', 'area_ha']]], ' ha'],
        'text-size': 12,
        'text-offset': [0, 0],
        visibility: visible ? 'visible' : 'none',
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 2,
      },
    });

    // Click handler with detailed popup
    const handleClick = (e: maplibregl.MapLayerMouseEvent) => {
      if (!e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      const props = feature.properties || {};
      
      // Criar popup com informações detalhadas
      const area_ha = props.area_ha || 0;
      const nivel_risco = props.nivel_risco || 'desconhecido';
      const name = props.name || 'Área de Queimada';
      
      const popupContent = `
        <div class="p-3 min-w-[200px]">
          <h3 class="font-bold text-sm mb-2 flex items-center gap-2">
            🔥 ${name}
          </h3>
          <div class="space-y-1 text-xs">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Área:</span>
              <span class="font-semibold">${area_ha.toFixed(1)} ha</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Risco:</span>
              <span class="font-semibold ${
                nivel_risco === 'critico' ? 'text-red-500' :
                nivel_risco === 'alto' ? 'text-orange-500' :
                nivel_risco === 'medio' ? 'text-yellow-500' :
                'text-green-500'
              }">${nivel_risco.toUpperCase()}</span>
            </div>
          </div>
        </div>
      `;
      
      new maplibregl.Popup({ closeButton: true, closeOnClick: true })
        .setLngLat(e.lngLat)
        .setHTML(popupContent)
        .addTo(map);
      
      if (onFeatureClick) {
        onFeatureClick(feature);
      }
    };

    // Hover cursor
    const handleMouseEnter = () => {
      if (map) map.getCanvas().style.cursor = 'pointer';
    };

    const handleMouseLeave = () => {
      if (map) map.getCanvas().style.cursor = '';
    };

    map.on('click', fillLayerId, handleClick);
    map.on('mouseenter', fillLayerId, handleMouseEnter);
    map.on('mouseleave', fillLayerId, handleMouseLeave);

    return () => {
      map.off('click', fillLayerId, handleClick);
      map.off('mouseenter', fillLayerId, handleMouseEnter);
      map.off('mouseleave', fillLayerId, handleMouseLeave);
    };
  }, [map, geojson, visible, onFeatureClick]);

  // Handle visibility changes
  useEffect(() => {
    if (!map) return;
    
    // Verificação defensiva: garantir que o estilo está carregado
    if (!map.getStyle || !map.getStyle()) return;
    if (!map.isStyleLoaded()) return;

    const layers = [
      'firms-footprints-fill',
      'firms-footprints-outline',
      'firms-footprints-label'
    ];

    layers.forEach(layerId => {
      try {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
        }
      } catch (e) {
        // Ignorar erro se camada não existir ainda (estilo sendo carregado)
        console.debug(`Layer ${layerId} not available yet`);
      }
    });
  }, [map, visible]);

  return null;
};
