// Stub para integração com MapBiomas
// WMS/WFS para camadas de uso e cobertura do solo

export interface MapBiomasLayer {
  wms_url: string;
  layer_name: string;
  year: number;
  legend: Record<number, string>;
}

export async function getMapBiomasLayer(
  year: number,
  roi?: GeoJSON.Polygon
): Promise<MapBiomasLayer> {
  console.log('MapBiomas query (stub):', { year, roi });
  
  // TODO: Implementar chamada real ao WMS do MapBiomas
  // https://mapbiomas.org/
  
  return {
    wms_url: 'https://mapbiomas.org/wms',
    layer_name: `coverage_${year}`,
    year,
    legend: {
      3: 'Floresta',
      4: 'Savana',
      15: 'Pastagem',
      18: 'Agricultura',
      21: 'Mosaico Agricultura/Pastagem',
      24: 'Área Urbana',
      33: 'Água',
    },
  };
}

export async function getMapBiomasTimeSeries(
  roi: GeoJSON.Polygon,
  startYear: number,
  endYear: number
) {
  console.log('MapBiomas time series (stub):', { roi, startYear, endYear });
  
  return {
    years: Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i),
    classes: {},
  };
}
