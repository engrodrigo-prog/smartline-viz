CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS public.rasters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenant(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other' CHECK (
    type IN ('rgb', 'vari', 'ndvi', 'dem', 'ortho', 'thermal', 'multispectral', 'other')
  ),
  src TEXT NOT NULL DEFAULT 'upload',
  bands INTEGER NOT NULL DEFAULT 3 CHECK (bands BETWEEN 1 AND 20),
  crs TEXT,
  ts_acquired TIMESTAMPTZ NOT NULL,
  line_code TEXT,
  corridor_id UUID,
  url_cog TEXT NOT NULL,
  thumbnail_url TEXT,
  footprint GEOMETRY(Polygon, 4326),
  qgis_layer_uri TEXT,
  stats_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rasters_footprint ON public.rasters USING GIST (footprint);
CREATE INDEX IF NOT EXISTS idx_rasters_line_code ON public.rasters(line_code);
CREATE INDEX IF NOT EXISTS idx_rasters_ts_acquired ON public.rasters(ts_acquired DESC);

ALTER TABLE public.rasters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read rasters" ON public.rasters;
CREATE POLICY "Authenticated users can read rasters"
ON public.rasters
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP TRIGGER IF EXISTS update_rasters_updated_at ON public.rasters;
CREATE TRIGGER update_rasters_updated_at
BEFORE UPDATE ON public.rasters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE VIEW public.vw_dashboard_geo_features AS
  SELECT
    'line_asset'::TEXT AS layer_source,
    'linhas_transmissao'::TEXT AS source_table,
    l.id::TEXT AS source_id,
    COALESCE(NULLIF(BTRIM(l.nome), ''), NULLIF(BTRIM(l.codigo), ''), CONCAT('Linha ', l.id::TEXT)) AS title,
    'vector'::TEXT AS asset_type,
    REPLACE(ST_GeometryType(l.geometry), 'ST_', '') AS geometry_kind,
    ARRAY['dashboard', 'mapa', 'estrutura']::TEXT[] AS dashboard_contexts,
    COALESCE(NULLIF(BTRIM(l.empresa), ''), NULLIF(BTRIM(l.concessao), '')) AS company_name,
    NULLIF(BTRIM(l.regiao::TEXT), '') AS region_code,
    NULLIF(BTRIM(l.codigo), '') AS line_code,
    jsonb_build_object(
      'color', '#0284c7',
      'width', 3,
      'opacity', 0.9
    ) AS style_json,
    jsonb_strip_nulls(
      jsonb_build_object(
        'codigo', l.codigo,
        'nome', l.nome,
        'tensao_kv', l.tensao_kv,
        'empresa', l.empresa,
        'concessao', l.concessao,
        'regiao', l.regiao,
        'status', l.status
      )
    ) AS properties,
    l.geometry::GEOMETRY(Geometry, 4326) AS geom,
    ST_AsGeoJSON(l.geometry)::jsonb AS geom_geojson,
    l.created_at
  FROM public.linhas_transmissao l
  WHERE l.geometry IS NOT NULL

  UNION ALL

  SELECT
    'structure_asset'::TEXT AS layer_source,
    'estruturas'::TEXT AS source_table,
    e.id::TEXT AS source_id,
    COALESCE(NULLIF(BTRIM(e.codigo), ''), CONCAT('Estrutura ', e.id::TEXT)) AS title,
    'vector'::TEXT AS asset_type,
    REPLACE(ST_GeometryType(e.geometry), 'ST_', '') AS geometry_kind,
    ARRAY['dashboard', 'mapa', 'estrutura']::TEXT[] AS dashboard_contexts,
    COALESCE(NULLIF(BTRIM(e.empresa), ''), NULLIF(BTRIM(e.concessao), '')) AS company_name,
    NULLIF(BTRIM(e.regiao::TEXT), '') AS region_code,
    COALESCE(NULLIF(BTRIM(l.codigo), ''), NULLIF(BTRIM(e.codigo), '')) AS line_code,
    jsonb_build_object(
      'color', '#2563eb',
      'radius', 6
    ) AS style_json,
    jsonb_strip_nulls(
      jsonb_build_object(
        'codigo', e.codigo,
        'tipo', e.tipo,
        'altura_m', e.altura_m,
        'estado_conservacao', e.estado_conservacao,
        'risco_corrosao', e.risco_corrosao,
        'empresa', e.empresa,
        'concessao', e.concessao,
        'regiao', e.regiao,
        'linha_codigo', l.codigo
      )
    ) AS properties,
    e.geometry::GEOMETRY(Geometry, 4326) AS geom,
    ST_AsGeoJSON(e.geometry)::jsonb AS geom_geojson,
    e.created_at
  FROM public.estruturas e
  LEFT JOIN public.linhas_transmissao l ON l.id = e.id_linha
  WHERE e.geometry IS NOT NULL

  UNION ALL

  SELECT
    'concession_area'::TEXT AS layer_source,
    'concessoes_geo'::TEXT AS source_table,
    c.id::TEXT AS source_id,
    COALESCE(NULLIF(BTRIM(c.nome), ''), CONCAT('Concessao ', c.id::TEXT)) AS title,
    'vector'::TEXT AS asset_type,
    REPLACE(ST_GeometryType(c.geometry), 'ST_', '') AS geometry_kind,
    ARRAY['dashboard', 'ambiental', 'mapa']::TEXT[] AS dashboard_contexts,
    NULL::TEXT AS company_name,
    NULL::TEXT AS region_code,
    NULL::TEXT AS line_code,
    jsonb_build_object(
      'fill', '#22c55e',
      'fillOpacity', 0.12,
      'stroke', '#166534',
      'strokeWidth', 1.2
    ) AS style_json,
    jsonb_build_object(
      'nome', c.nome
    ) AS properties,
    c.geometry::GEOMETRY(Geometry, 4326) AS geom,
    ST_AsGeoJSON(c.geometry)::jsonb AS geom_geojson,
    c.created_at
  FROM public.concessoes_geo c
  WHERE c.geometry IS NOT NULL

  UNION ALL

  SELECT
    'geo_event'::TEXT AS layer_source,
    'eventos_geo'::TEXT AS source_table,
    e.id::TEXT AS source_id,
    COALESCE(NULLIF(BTRIM(e.nome), ''), CONCAT('Evento ', e.id::TEXT)) AS title,
    'vector'::TEXT AS asset_type,
    REPLACE(ST_GeometryType(e.geometry), 'ST_', '') AS geometry_kind,
    ARRAY['dashboard', 'ambiental', 'operacao', 'mapa']::TEXT[] AS dashboard_contexts,
    COALESCE(NULLIF(BTRIM(e.empresa), ''), NULLIF(BTRIM(e.concessao), '')) AS company_name,
    NULLIF(BTRIM(e.regiao::TEXT), '') AS region_code,
    NULL::TEXT AS line_code,
    CASE
      WHEN ST_GeometryType(e.geometry) IN ('ST_Polygon', 'ST_MultiPolygon') THEN
        jsonb_build_object(
          'fill', '#f97316',
          'fillOpacity', 0.22,
          'stroke', '#9a3412',
          'strokeWidth', 1.2
        )
      ELSE
        jsonb_build_object(
          'color', '#f97316',
          'radius', 7
        )
    END AS style_json,
    jsonb_strip_nulls(
      jsonb_build_object(
        'nome', e.nome,
        'tipo_evento', e.tipo_evento,
        'descricao', e.descricao,
        'status', e.status,
        'empresa', e.empresa,
        'concessao', e.concessao,
        'regiao', e.regiao,
        'data_ocorrencia', e.data_ocorrencia,
        'metadata', e.metadata
      )
    ) AS properties,
    e.geometry::GEOMETRY(Geometry, 4326) AS geom,
    ST_AsGeoJSON(e.geometry)::jsonb AS geom_geojson,
    e.created_at
  FROM public.eventos_geo e
  WHERE e.geometry IS NOT NULL

  UNION ALL

  SELECT
    'custom_geo'::TEXT AS layer_source,
    'geodata_outros'::TEXT AS source_table,
    g.id::TEXT AS source_id,
    COALESCE(NULLIF(BTRIM(g.nome), ''), CONCAT('Geodado ', g.id::TEXT)) AS title,
    'vector'::TEXT AS asset_type,
    REPLACE(ST_GeometryType(g.geometry), 'ST_', '') AS geometry_kind,
    ARRAY['dashboard', 'ambiental', 'operacao', 'mapa']::TEXT[] AS dashboard_contexts,
    NULLIF(BTRIM(g.empresa), '') AS company_name,
    NULLIF(BTRIM(g.regiao::TEXT), '') AS region_code,
    COALESCE(NULLIF(BTRIM(g.metadata ->> 'line_code'), ''), NULLIF(BTRIM(g.metadata ->> 'linha_codigo'), '')) AS line_code,
    CASE
      WHEN ST_GeometryType(g.geometry) IN ('ST_Polygon', 'ST_MultiPolygon') THEN
        jsonb_build_object(
          'fill', '#8b5cf6',
          'fillOpacity', 0.18,
          'stroke', '#5b21b6',
          'strokeWidth', 1.2
        )
      WHEN ST_GeometryType(g.geometry) IN ('ST_LineString', 'ST_MultiLineString') THEN
        jsonb_build_object(
          'color', '#7c3aed',
          'width', 2.5,
          'opacity', 0.85
        )
      ELSE
        jsonb_build_object(
          'color', '#8b5cf6',
          'radius', 7
        )
    END AS style_json,
    jsonb_strip_nulls(
      jsonb_build_object(
        'nome', g.nome,
        'categoria', g.categoria,
        'descricao', g.descricao,
        'empresa', g.empresa,
        'regiao', g.regiao,
        'tensao_kv', g.tensao_kv,
        'tipo_material', g.tipo_material,
        'metadata', g.metadata
      )
    ) AS properties,
    g.geometry::GEOMETRY(Geometry, 4326) AS geom,
    ST_AsGeoJSON(g.geometry)::jsonb AS geom_geojson,
    g.created_at
  FROM public.geodata_outros g
  WHERE g.geometry IS NOT NULL

  UNION ALL

  SELECT
    'raster_footprint'::TEXT AS layer_source,
    'rasters'::TEXT AS source_table,
    r.id::TEXT AS source_id,
    COALESCE(NULLIF(BTRIM(r.name), ''), CONCAT('Raster ', r.id::TEXT)) AS title,
    'raster'::TEXT AS asset_type,
    CASE
      WHEN r.footprint IS NULL THEN 'Raster'
      ELSE REPLACE(ST_GeometryType(r.footprint), 'ST_', '')
    END AS geometry_kind,
    ARRAY['dashboard', 'ambiental', 'vegetacao', 'mapa']::TEXT[] AS dashboard_contexts,
    NULL::TEXT AS company_name,
    NULL::TEXT AS region_code,
    NULLIF(BTRIM(r.line_code), '') AS line_code,
    jsonb_strip_nulls(
      jsonb_build_object(
        'fillOpacity', 0.24,
        'stroke', '#166534',
        'strokeWidth', 1.4
      )
    ) AS style_json,
    jsonb_strip_nulls(
      jsonb_build_object(
        'name', r.name,
        'type', r.type,
        'src', r.src,
        'bands', r.bands,
        'crs', r.crs,
        'line_code', r.line_code,
        'url_cog', r.url_cog,
        'thumbnail_url', r.thumbnail_url,
        'ts_acquired', r.ts_acquired,
        'qgis_layer_uri', r.qgis_layer_uri,
        'stats', r.stats_json,
        'metadata', r.metadata
      )
    ) AS properties,
    r.footprint::GEOMETRY(Geometry, 4326) AS geom,
    CASE
      WHEN r.footprint IS NULL THEN NULL::jsonb
      ELSE ST_AsGeoJSON(r.footprint)::jsonb
    END AS geom_geojson,
    r.created_at
  FROM public.rasters r;

GRANT SELECT ON public.rasters TO authenticated;
GRANT SELECT ON public.vw_dashboard_geo_features TO authenticated;
