-- ============================================================================
-- SmartLine-Viz: Comprehensive Database Schema
-- Tasks: Storage structure, IBGE layers, Custom layers, Weather, NDVI, Health
-- ============================================================================

-- 1. Custom layers table (Task #3)
CREATE TABLE IF NOT EXISTS public.custom_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenant(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  style_json JSONB DEFAULT '{"color": "#FF3333", "width": 2, "opacity": 0.8}'::jsonb,
  permanent BOOLEAN DEFAULT false,
  layer_type TEXT CHECK (layer_type IN ('line', 'point', 'polygon', 'raster')) DEFAULT 'polygon',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.custom_layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant custom layers"
ON public.custom_layers FOR SELECT
USING (tenant_id = user_tenant_id(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Users can insert own custom layers"
ON public.custom_layers FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own custom layers"
ON public.custom_layers FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own custom layers"
ON public.custom_layers FOR DELETE
USING (user_id = auth.uid());

-- 2. NDVI statistics table (Task #7)
CREATE TABLE IF NOT EXISTS public.ndvi_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenant(id) ON DELETE CASCADE,
  roi_id TEXT,
  torre_id TEXT,
  ndvi_t0 REAL,
  ndvi_t1 REAL,
  delta_ndvi REAL,
  area_limpa_m2 REAL,
  area_cresceu_m2 REAL,
  geometry GEOMETRY(Point, 4326),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ndvi_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant NDVI stats"
ON public.ndvi_stats FOR SELECT
USING (tenant_id = user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert NDVI stats"
ON public.ndvi_stats FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Base layers catalog (Task #1)
CREATE TABLE IF NOT EXISTS public.base_layers_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  layer_type TEXT CHECK (layer_type IN ('uf', 'municipio', 'ramal')) NOT NULL,
  source TEXT NOT NULL, -- IBGE, custom, etc
  file_url TEXT NOT NULL,
  style_json JSONB DEFAULT '{}'::jsonb,
  bbox JSONB, -- [minLon, minLat, maxLon, maxLat]
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Make base layers publicly readable
ALTER TABLE public.base_layers_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read base layers"
ON public.base_layers_catalog FOR SELECT
USING (true);

-- 4. Health check cache (Task #9)
CREATE TABLE IF NOT EXISTS public.health_cache (
  service TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  last_check TIMESTAMPTZ DEFAULT now(),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.health_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read health cache"
ON public.health_cache FOR SELECT
USING (true);

CREATE POLICY "Service role can manage health cache"
ON public.health_cache FOR ALL
USING (true);

-- 5. Telemetry events (Task #9)
CREATE TABLE IF NOT EXISTS public.telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenant(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- upload, toggle, preset, alert, etc
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON public.telemetry_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_event_type ON public.telemetry_events(event_type);

ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert telemetry"
ON public.telemetry_events FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view all telemetry"
ON public.telemetry_events FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- 6. ROI metrics (Task #10)
CREATE TABLE IF NOT EXISTS public.roi_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenant(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- ndvi_delta, ocupacao, incendio, chuva, rajada, horas_poupadas
  metric_value REAL NOT NULL,
  period_days INTEGER DEFAULT 30,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_roi_metrics_type ON public.roi_metrics(metric_type, calculated_at DESC);

ALTER TABLE public.roi_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant ROI metrics"
ON public.roi_metrics FOR SELECT
USING (tenant_id = user_tenant_id(auth.uid()));

CREATE POLICY "Service can insert ROI metrics"
ON public.roi_metrics FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Preset configurations (Task #4)
CREATE TABLE IF NOT EXISTS public.layer_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  enabled_layers JSONB NOT NULL, -- array of layer IDs/names
  map_config JSONB DEFAULT '{}'::jsonb, -- center, zoom, etc
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.layer_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read presets"
ON public.layer_presets FOR SELECT
USING (true);

-- Insert default presets
INSERT INTO public.layer_presets (name, description, enabled_layers, display_order, is_default)
VALUES 
  ('Operação', 'Camadas operacionais: linhas, torres, veículos', '["linhas", "estruturas", "vehicles"]', 1, false),
  ('Ambiental', 'Monitoramento ambiental: FIRMS, vegetação, queimadas', '["firms", "vegetacao", "queimadas_footprints", "uf", "municipios"]', 2, true),
  ('Risco', 'Análise de riscos: erosão, invasão, corrosão', '["erosao", "invasao_faixa", "corrosao", "estruturas"]', 3, false)
ON CONFLICT (name) DO NOTHING;

-- 8. Update weather_cache with roi_id (already exists, just ensure structure)
-- Table already exists from previous migration

-- 9. Function: Calculate ROI metrics
CREATE OR REPLACE FUNCTION public.calculate_roi_metrics(
  _tenant_id UUID,
  _period_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  metric_type TEXT,
  metric_value REAL,
  period_days INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- NDVI Delta
  RETURN QUERY
  SELECT 
    'ndvi_delta_avg'::TEXT,
    AVG(delta_ndvi)::REAL,
    _period_days
  FROM ndvi_stats
  WHERE tenant_id = _tenant_id
    AND created_at >= now() - (_period_days || ' days')::interval;

  -- Fire incidents
  RETURN QUERY
  SELECT 
    'incendios_24h'::TEXT,
    COUNT(*)::REAL,
    1
  FROM queimadas
  WHERE data_aquisicao >= now() - interval '24 hours';

  -- Estimated inspection hours saved (placeholder calculation)
  RETURN QUERY
  SELECT 
    'horas_inspecao_poupadas'::TEXT,
    (COUNT(DISTINCT torre_id) * 0.5)::REAL, -- 0.5h saved per tower
    _period_days
  FROM ndvi_stats
  WHERE tenant_id = _tenant_id
    AND created_at >= now() - (_period_days || ' days')::interval;
END;
$$;

-- 10. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_layers_tenant ON public.custom_layers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_layers_user ON public.custom_layers(user_id);
CREATE INDEX IF NOT EXISTS idx_ndvi_stats_tenant ON public.ndvi_stats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ndvi_stats_torre ON public.ndvi_stats(torre_id);
CREATE INDEX IF NOT EXISTS idx_base_layers_type ON public.base_layers_catalog(layer_type);

COMMENT ON TABLE public.custom_layers IS 'User-uploaded custom layers (shapefiles, KMZ, GeoJSON)';
COMMENT ON TABLE public.ndvi_stats IS 'NDVI statistics per tower with area change metrics';
COMMENT ON TABLE public.base_layers_catalog IS 'Catalog of base layers (IBGE, ramais)';
COMMENT ON TABLE public.health_cache IS 'Health check status for external services';
COMMENT ON TABLE public.telemetry_events IS 'Anonymous usage telemetry';
COMMENT ON TABLE public.roi_metrics IS 'Calculated ROI metrics for dashboard';
COMMENT ON TABLE public.layer_presets IS 'Predefined layer configurations (Operação, Ambiental, Risco)';