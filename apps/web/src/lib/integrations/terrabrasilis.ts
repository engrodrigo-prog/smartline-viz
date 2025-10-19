// Stub para integração com TerraBrasilis
// WMS/WFS para dados de desmatamento e monitoramento

export interface TerraBrasilisLayer {
  wms_url: string;
  layer_name: string;
  type: 'deforestation' | 'degradation' | 'land_use';
}

export async function getTerraBrasilisLayer(
  type: 'deforestation' | 'degradation' | 'land_use',
  year?: number
): Promise<TerraBrasilisLayer> {
  console.log('TerraBrasilis query (stub):', { type, year });
  
  // TODO: Implementar chamada real ao WMS do TerraBrasilis
  // http://terrabrasilis.dpi.inpe.br/
  
  return {
    wms_url: 'http://terrabrasilis.dpi.inpe.br/geoserver/wms',
    layer_name: `terrabrasilis:${type}_${year || 'current'}`,
    type,
  };
}

export async function getDeforestationAlerts(roi: GeoJSON.Polygon) {
  console.log('TerraBrasilis deforestation alerts (stub):', roi);
  
  return {
    alerts: [],
    count: 0,
    last_update: new Date().toISOString(),
  };
}
