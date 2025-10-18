-- Add file_type column to dataset_catalog for upload classification
ALTER TABLE dataset_catalog 
ADD COLUMN IF NOT EXISTS file_type TEXT 
CHECK (file_type IN (
  'line_kml', 
  'towers', 
  'span_analysis', 
  'danger_trees', 
  'tree_fall', 
  'clearance_danger', 
  'scissor_crossing', 
  'dangers_kml', 
  'dem_surface'
));

CREATE INDEX IF NOT EXISTS idx_dataset_catalog_file_type ON dataset_catalog(file_type);

-- Standardize tipo_evento values in eventos_geo
ALTER TABLE eventos_geo
DROP CONSTRAINT IF EXISTS check_tipo_evento;

ALTER TABLE eventos_geo
ADD CONSTRAINT check_tipo_evento CHECK (tipo_evento IN (
  'arvore_queda',
  'arvore_lateral',
  'clearance_perigo',
  'cruzamento',
  'perigo_generico',
  'estrutura',
  'vegetacao',
  'outros'
));

-- Add processing_status to dataset_catalog for better tracking
ALTER TABLE dataset_catalog
ADD COLUMN IF NOT EXISTS processing_details JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN dataset_catalog.file_type IS 'Type of geospatial data uploaded';
COMMENT ON COLUMN dataset_catalog.processing_details IS 'Details about processing steps, errors, and results';
COMMENT ON COLUMN eventos_geo.tipo_evento IS 'Standardized event type for categorization';