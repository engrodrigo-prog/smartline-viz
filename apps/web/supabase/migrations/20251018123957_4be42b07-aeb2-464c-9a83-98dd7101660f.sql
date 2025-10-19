-- Phase 1: Create queimadas_footprints table for FIRMS burned area polygons
CREATE TABLE IF NOT EXISTS public.queimadas_footprints (
  id BIGSERIAL PRIMARY KEY,
  geometry geometry(POLYGON, 4326) NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  area_ha NUMERIC,
  data_deteccao TIMESTAMPTZ NOT NULL,
  concessao VARCHAR,
  nivel_risco TEXT,
  satelite VARCHAR,
  confidence INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index for efficient querying
CREATE INDEX IF NOT EXISTS idx_footprints_geom ON public.queimadas_footprints USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_footprints_data ON public.queimadas_footprints(data_deteccao DESC);
CREATE INDEX IF NOT EXISTS idx_footprints_concessao ON public.queimadas_footprints(concessao);

-- Enable RLS
ALTER TABLE public.queimadas_footprints ENABLE ROW LEVEL SECURITY;

-- RLS policy for footprints (same tenant-based access as queimadas)
CREATE POLICY "Users can read footprints for their tenant"
ON public.queimadas_footprints FOR SELECT
USING (
  auth.uid() IN (
    SELECT au.id 
    FROM app_user au
    WHERE au.tenant_id IS NOT NULL
  )
);

-- Phase 2: Create storage bucket for FIRMS historical data
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'firms-archive', 
  'firms-archive', 
  false,
  10485760, -- 10MB limit
  ARRAY['application/json', 'application/geo+json']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for FIRMS archive
CREATE POLICY "Admins can read FIRMS archive"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'firms-archive' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "System can upload to FIRMS archive"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'firms-archive'
  AND auth.uid() IS NOT NULL
);

-- Phase 3: Create alertas_queimadas table
CREATE TABLE IF NOT EXISTS public.alertas_queimadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_alerta TEXT NOT NULL, -- 'ponto' ou 'footprint'
  queimada_id BIGINT, -- reference to queimadas.id
  footprint_id BIGINT REFERENCES queimadas_footprints(id),
  linha_codigo VARCHAR,
  estrutura_codigo VARCHAR,
  distancia_m NUMERIC,
  area_ameacada_ha NUMERIC,
  nivel_alerta TEXT NOT NULL CHECK (nivel_alerta IN ('critico', 'alto', 'medio', 'baixo')),
  concessao VARCHAR,
  regiao CHAR(2),
  metadata JSONB DEFAULT '{}'::jsonb,
  data_criacao TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'resolvido', 'falso_positivo', 'monitorando')),
  resolvido_por UUID,
  resolvido_em TIMESTAMPTZ,
  notas TEXT
);

-- Indexes for alerts
CREATE INDEX IF NOT EXISTS idx_alertas_status ON public.alertas_queimadas(status);
CREATE INDEX IF NOT EXISTS idx_alertas_nivel ON public.alertas_queimadas(nivel_alerta);
CREATE INDEX IF NOT EXISTS idx_alertas_data ON public.alertas_queimadas(data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_alertas_linha ON public.alertas_queimadas(linha_codigo);

-- Enable RLS
ALTER TABLE public.alertas_queimadas ENABLE ROW LEVEL SECURITY;

-- RLS policies for alerts
CREATE POLICY "Users can read alerts for their tenant"
ON public.alertas_queimadas FOR SELECT
USING (
  auth.uid() IN (
    SELECT au.id 
    FROM app_user au
    WHERE au.tenant_id IS NOT NULL
  )
);

CREATE POLICY "Authenticated users can create alerts"
ON public.alertas_queimadas FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update alerts"
ON public.alertas_queimadas FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- SQL Function: Detect threats from footprints
CREATE OR REPLACE FUNCTION public.detect_footprint_threats()
RETURNS TABLE (
  footprint_id BIGINT,
  linha_codigo VARCHAR,
  estrutura_codigo VARCHAR,
  area_ameacada_ha NUMERIC,
  distancia_m NUMERIC,
  nivel_alerta TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH footprint_intersections AS (
    SELECT 
      f.id AS footprint_id,
      l.codigo AS linha_codigo,
      e.codigo AS estrutura_codigo,
      ST_Area(ST_Intersection(f.geometry, l.geometry)::geography) / 10000 AS area_ameacada_ha,
      ST_Distance(f.geometry::geography, l.geometry::geography) AS distancia_m,
      CASE 
        WHEN ST_Intersects(f.geometry, l.geometry) THEN 'critico'
        WHEN ST_Distance(f.geometry::geography, l.geometry::geography) < 500 THEN 'alto'
        WHEN ST_Distance(f.geometry::geography, l.geometry::geography) < 1500 THEN 'medio'
        ELSE 'baixo'
      END AS nivel_alerta
    FROM queimadas_footprints f
    CROSS JOIN linhas_transmissao l
    LEFT JOIN estruturas e ON ST_DWithin(f.geometry::geography, e.geometry::geography, 100)
    WHERE f.data_deteccao > NOW() - INTERVAL '24 hours'
      AND ST_DWithin(f.geometry::geography, l.geometry::geography, 3000)
  )
  SELECT * FROM footprint_intersections
  WHERE area_ameacada_ha > 0 OR distancia_m < 3000
  ORDER BY nivel_alerta DESC, distancia_m ASC;
END;
$$;

-- Function to auto-create alerts from new footprints
CREATE OR REPLACE FUNCTION public.auto_create_footprint_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert alerts for any threats detected
  INSERT INTO alertas_queimadas (
    tipo_alerta,
    footprint_id,
    linha_codigo,
    estrutura_codigo,
    area_ameacada_ha,
    distancia_m,
    nivel_alerta,
    concessao,
    metadata
  )
  SELECT 
    'footprint',
    NEW.id,
    t.linha_codigo,
    t.estrutura_codigo,
    t.area_ameacada_ha,
    t.distancia_m,
    t.nivel_alerta,
    NEW.concessao,
    jsonb_build_object(
      'area_total_ha', NEW.area_ha,
      'data_deteccao', NEW.data_deteccao,
      'satelite', NEW.satelite
    )
  FROM detect_footprint_threats() t
  WHERE t.footprint_id = NEW.id
    AND t.nivel_alerta IN ('critico', 'alto');
    
  RETURN NEW;
END;
$$;

-- Trigger to auto-create alerts when new footprints are inserted
DROP TRIGGER IF EXISTS trigger_auto_create_footprint_alerts ON public.queimadas_footprints;
CREATE TRIGGER trigger_auto_create_footprint_alerts
  AFTER INSERT ON public.queimadas_footprints
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_footprint_alerts();