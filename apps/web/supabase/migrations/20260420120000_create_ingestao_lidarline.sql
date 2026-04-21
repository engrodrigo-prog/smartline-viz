-- =============================================================================
-- Ingestão LiPowerline: surveys, risk_readings, risk_classifications,
-- risk_threshold_config, risk_threshold_audit
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE IF NOT EXISTS public.ingestao_report_type AS ENUM (
  'CD_SC_TR',   -- Clearance Distance Safety Check — real
  'CD_SC_SIM',  -- Clearance Distance Safety Check — simulated (wind/load)
  'TF_TR',      -- Tree Fall — real
  'TF_SIM'      -- Tree Fall — simulated
);

CREATE TYPE IF NOT EXISTS public.ingestao_risk_model AS ENUM (
  'MAC',  -- Condutor-Solo (Clearance to Ground)
  'MCB',  -- Condutor-Vegetação (Clearance to Vegetation)
  'MT',   -- Condutor-Condutor (Conductor-Conductor)
  'MTR',  -- Condutor-Obstáculo (Conductor to Road/Obstacle)
  'MEF',  -- Estrutura-Faixa (Structure Right-of-Way)
  'MPQ'   -- Queda de Árvore (Tree Fall)
);

CREATE TYPE IF NOT EXISTS public.ingestao_severity AS ENUM (
  'N1',  -- CRITICAL ≤30 days
  'N2',  -- HIGH ≤90 days
  'N3',  -- MEDIUM ≤180 days
  'N4'   -- LOW — monitor
);

CREATE TYPE IF NOT EXISTS public.ingestao_survey_status AS ENUM (
  'processing',
  'complete',
  'failed'
);

-- ---------------------------------------------------------------------------
-- ingestao_survey — one row per uploaded LiPowerline report file
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ingestao_survey (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid REFERENCES public.tenant(id) ON DELETE CASCADE NOT NULL
                DEFAULT public.user_tenant_id(auth.uid()),

  line_name        text NOT NULL,
  report_type      public.ingestao_report_type NOT NULL,
  survey_date      date,
  source_filename  text,
  status           public.ingestao_survey_status NOT NULL DEFAULT 'processing',

  -- summary counters (filled after classification)
  total_rows   integer NOT NULL DEFAULT 0,
  n1_count     integer NOT NULL DEFAULT 0,
  n2_count     integer NOT NULL DEFAULT 0,
  n3_count     integer NOT NULL DEFAULT 0,
  n4_count     integer NOT NULL DEFAULT 0,
  error_count  integer NOT NULL DEFAULT 0,

  created_at   timestamptz DEFAULT now() NOT NULL,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_at   timestamptz DEFAULT now() NOT NULL,
  updated_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_ingestao_survey_tenant_created
  ON public.ingestao_survey(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingestao_survey_tenant_line
  ON public.ingestao_survey(tenant_id, line_name);

-- ---------------------------------------------------------------------------
-- ingestao_reading — one row per span/obstruction from LiPowerline report
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ingestao_reading (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id   uuid REFERENCES public.ingestao_survey(id) ON DELETE CASCADE NOT NULL,
  tenant_id   uuid REFERENCES public.tenant(id) ON DELETE CASCADE NOT NULL,

  span_id            text NOT NULL,   -- e.g. "T001-T002"
  structure_from     text,
  structure_to       text,
  line_name          text NOT NULL,
  risk_model         public.ingestao_risk_model NOT NULL,

  clearance_distance   numeric,       -- meters (key classification field)
  horizontal_distance  numeric,       -- meters
  vertical_distance    numeric,       -- meters
  crossing_count       integer,       -- for MPQ (tree fall count)

  lidarline_type         text,        -- raw "Type" column from LiPowerline
  lidarline_safety_level text,        -- LiPowerline's own label (may differ)

  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ingestao_reading_survey
  ON public.ingestao_reading(survey_id);

CREATE INDEX IF NOT EXISTS idx_ingestao_reading_tenant_span
  ON public.ingestao_reading(tenant_id, span_id);

CREATE INDEX IF NOT EXISTS idx_ingestao_reading_tenant_model
  ON public.ingestao_reading(tenant_id, risk_model);

-- ---------------------------------------------------------------------------
-- ingestao_classification — severity assigned to each reading
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ingestao_classification (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_id  uuid REFERENCES public.ingestao_reading(id) ON DELETE CASCADE UNIQUE NOT NULL,
  tenant_id   uuid REFERENCES public.tenant(id) ON DELETE CASCADE NOT NULL,

  severity             public.ingestao_severity NOT NULL,
  severity_label       text NOT NULL,           -- URGENTE, CRITICO, ALTO, MEDIO, BAIXO
  threshold_config_id  uuid,                    -- FK added below after risk_threshold_config
  threshold_snapshot   jsonb DEFAULT '{}',      -- thresholds in effect at classification time

  classified_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ingestao_classification_tenant_severity
  ON public.ingestao_classification(tenant_id, severity);

CREATE INDEX IF NOT EXISTS idx_ingestao_classification_reading
  ON public.ingestao_classification(reading_id);

-- ---------------------------------------------------------------------------
-- risk_threshold_config — tenant-customizable thresholds per risk model
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.risk_threshold_config (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid REFERENCES public.tenant(id) ON DELETE CASCADE NOT NULL,

  risk_model     public.ingestao_risk_model NOT NULL,
  scenario       text NOT NULL CHECK (scenario IN ('TR', 'SIM', 'ALL')),
  severity       public.ingestao_severity NOT NULL,
  severity_label text NOT NULL,    -- URGENTE, CRITICO, ALTO, MEDIO, BAIXO

  -- For distance-based models (MAC, MCB, MT, MTR, MEF):
  threshold_min  numeric,          -- null = no lower bound
  threshold_max  numeric,          -- null = no upper bound

  -- For count-based models (MPQ):
  count_min      integer,
  count_max      integer,

  unit           text NOT NULL DEFAULT 'm',
  is_default     boolean NOT NULL DEFAULT false,  -- true = from CPFL v9.0 seed

  effective_from timestamptz DEFAULT now() NOT NULL,
  created_at     timestamptz DEFAULT now() NOT NULL,
  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_at     timestamptz DEFAULT now() NOT NULL,
  updated_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),

  UNIQUE (tenant_id, risk_model, scenario, severity)
);

CREATE INDEX IF NOT EXISTS idx_risk_threshold_config_tenant_model
  ON public.risk_threshold_config(tenant_id, risk_model, scenario);

-- Add FK from ingestao_classification → risk_threshold_config
ALTER TABLE public.ingestao_classification
  ADD CONSTRAINT fk_classification_threshold
  FOREIGN KEY (threshold_config_id)
  REFERENCES public.risk_threshold_config(id)
  ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- risk_threshold_audit — immutable log of threshold changes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.risk_threshold_audit (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id    uuid REFERENCES public.risk_threshold_config(id) ON DELETE SET NULL,
  tenant_id    uuid REFERENCES public.tenant(id) ON DELETE CASCADE NOT NULL,
  risk_model   public.ingestao_risk_model NOT NULL,
  scenario     text NOT NULL,
  severity     public.ingestao_severity NOT NULL,
  old_value    jsonb,
  new_value    jsonb,
  changed_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at   timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_risk_threshold_audit_tenant
  ON public.risk_threshold_audit(tenant_id, changed_at DESC);

-- ---------------------------------------------------------------------------
-- Trigger: updated_at / updated_by on ingestao_survey
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ingestao_set_updated_fields()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER ingestao_survey_set_updated_fields
BEFORE UPDATE ON public.ingestao_survey
FOR EACH ROW EXECUTE FUNCTION public.ingestao_set_updated_fields();

CREATE TRIGGER risk_threshold_config_set_updated_fields
BEFORE UPDATE ON public.risk_threshold_config
FOR EACH ROW EXECUTE FUNCTION public.ingestao_set_updated_fields();

-- Audit trigger for threshold changes
CREATE OR REPLACE FUNCTION public.risk_threshold_config_audit_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.risk_threshold_audit (
    config_id, tenant_id, risk_model, scenario, severity,
    old_value, new_value, changed_by
  ) VALUES (
    NEW.id,
    NEW.tenant_id,
    NEW.risk_model,
    NEW.scenario,
    NEW.severity,
    to_jsonb(OLD),
    to_jsonb(NEW),
    auth.uid()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER risk_threshold_config_audit
AFTER UPDATE ON public.risk_threshold_config
FOR EACH ROW EXECUTE FUNCTION public.risk_threshold_config_audit_trigger();

-- ---------------------------------------------------------------------------
-- RLS — ingestao_survey
-- ---------------------------------------------------------------------------

ALTER TABLE public.ingestao_survey ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can read ingestao_survey" ON public.ingestao_survey;
CREATE POLICY "Tenant members can read ingestao_survey"
ON public.ingestao_survey FOR SELECT TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Operators can insert ingestao_survey" ON public.ingestao_survey;
CREATE POLICY "Operators can insert ingestao_survey"
ON public.ingestao_survey FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.user_tenant_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'analyst') OR public.has_role(auth.uid(), 'operator'))
);

DROP POLICY IF EXISTS "Operators can update ingestao_survey" ON public.ingestao_survey;
CREATE POLICY "Operators can update ingestao_survey"
ON public.ingestao_survey FOR UPDATE TO authenticated
USING (
  tenant_id = public.user_tenant_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'analyst') OR public.has_role(auth.uid(), 'operator'))
);

DROP POLICY IF EXISTS "Admins can delete ingestao_survey" ON public.ingestao_survey;
CREATE POLICY "Admins can delete ingestao_survey"
ON public.ingestao_survey FOR DELETE TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- RLS — ingestao_reading
-- ---------------------------------------------------------------------------

ALTER TABLE public.ingestao_reading ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can read ingestao_reading" ON public.ingestao_reading;
CREATE POLICY "Tenant members can read ingestao_reading"
ON public.ingestao_reading FOR SELECT TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Operators can insert ingestao_reading" ON public.ingestao_reading;
CREATE POLICY "Operators can insert ingestao_reading"
ON public.ingestao_reading FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.user_tenant_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'analyst') OR public.has_role(auth.uid(), 'operator'))
);

DROP POLICY IF EXISTS "Admins can delete ingestao_reading" ON public.ingestao_reading;
CREATE POLICY "Admins can delete ingestao_reading"
ON public.ingestao_reading FOR DELETE TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- RLS — ingestao_classification
-- ---------------------------------------------------------------------------

ALTER TABLE public.ingestao_classification ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can read ingestao_classification" ON public.ingestao_classification;
CREATE POLICY "Tenant members can read ingestao_classification"
ON public.ingestao_classification FOR SELECT TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Operators can insert ingestao_classification" ON public.ingestao_classification;
CREATE POLICY "Operators can insert ingestao_classification"
ON public.ingestao_classification FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.user_tenant_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'analyst') OR public.has_role(auth.uid(), 'operator'))
);

-- ---------------------------------------------------------------------------
-- RLS — risk_threshold_config
-- ---------------------------------------------------------------------------

ALTER TABLE public.risk_threshold_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can read risk_threshold_config" ON public.risk_threshold_config;
CREATE POLICY "Tenant members can read risk_threshold_config"
ON public.risk_threshold_config FOR SELECT TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert risk_threshold_config" ON public.risk_threshold_config;
CREATE POLICY "Admins can insert risk_threshold_config"
ON public.risk_threshold_config FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.user_tenant_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Admins can update risk_threshold_config" ON public.risk_threshold_config;
CREATE POLICY "Admins can update risk_threshold_config"
ON public.risk_threshold_config FOR UPDATE TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete risk_threshold_config" ON public.risk_threshold_config;
CREATE POLICY "Admins can delete risk_threshold_config"
ON public.risk_threshold_config FOR DELETE TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin') AND is_default = false);

-- ---------------------------------------------------------------------------
-- RLS — risk_threshold_audit
-- ---------------------------------------------------------------------------

ALTER TABLE public.risk_threshold_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read risk_threshold_audit" ON public.risk_threshold_audit;
CREATE POLICY "Admins can read risk_threshold_audit"
ON public.risk_threshold_audit FOR SELECT TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- Seed: CPFL v9.0 default thresholds (inserted per-tenant via function)
-- ---------------------------------------------------------------------------
-- Call this function after creating a new tenant to seed default thresholds.

CREATE OR REPLACE FUNCTION public.seed_cpfl_default_thresholds(p_tenant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- MAC (Condutor-Solo) — distance-based, ALL scenarios
  INSERT INTO public.risk_threshold_config
    (tenant_id, risk_model, scenario, severity, severity_label, threshold_min, threshold_max, unit, is_default)
  VALUES
    (p_tenant_id, 'MAC', 'ALL', 'N1', 'URGENTE',  null,  2.0, 'm', true),
    (p_tenant_id, 'MAC', 'ALL', 'N1', 'CRITICO',   2.0,  4.0, 'm', true),
    (p_tenant_id, 'MAC', 'ALL', 'N2', 'ALTO',       4.0,  5.0, 'm', true),
    (p_tenant_id, 'MAC', 'ALL', 'N3', 'MEDIO',      5.0,  7.0, 'm', true),
    (p_tenant_id, 'MAC', 'ALL', 'N4', 'BAIXO',      7.0, null, 'm', true)
  ON CONFLICT (tenant_id, risk_model, scenario, severity) DO NOTHING;

  -- MCB (Condutor-Vegetação) — distance-based
  INSERT INTO public.risk_threshold_config
    (tenant_id, risk_model, scenario, severity, severity_label, threshold_min, threshold_max, unit, is_default)
  VALUES
    (p_tenant_id, 'MCB', 'ALL', 'N2', 'ALTO',   null, 7.0, 'm', true),
    (p_tenant_id, 'MCB', 'ALL', 'N3', 'MEDIO',   7.0, 9.0, 'm', true),
    (p_tenant_id, 'MCB', 'ALL', 'N4', 'BAIXO',   9.0, null,'m', true)
  ON CONFLICT (tenant_id, risk_model, scenario, severity) DO NOTHING;

  -- MTR (Condutor-Obstáculo) — same as MCB
  INSERT INTO public.risk_threshold_config
    (tenant_id, risk_model, scenario, severity, severity_label, threshold_min, threshold_max, unit, is_default)
  VALUES
    (p_tenant_id, 'MTR', 'ALL', 'N2', 'ALTO',   null, 7.0, 'm', true),
    (p_tenant_id, 'MTR', 'ALL', 'N3', 'MEDIO',   7.0, 9.0, 'm', true),
    (p_tenant_id, 'MTR', 'ALL', 'N4', 'BAIXO',   9.0, null,'m', true)
  ON CONFLICT (tenant_id, risk_model, scenario, severity) DO NOTHING;

  -- MPQ (Queda de Árvore) — count-based
  INSERT INTO public.risk_threshold_config
    (tenant_id, risk_model, scenario, severity, severity_label, count_min, count_max, unit, is_default)
  VALUES
    (p_tenant_id, 'MPQ', 'ALL', 'N1', 'CRITICO',  5, null, 'trees', true),
    (p_tenant_id, 'MPQ', 'ALL', 'N2', 'ALTO',      3,    5, 'trees', true),
    (p_tenant_id, 'MPQ', 'ALL', 'N3', 'MEDIO',     1,    3, 'trees', true),
    (p_tenant_id, 'MPQ', 'ALL', 'N4', 'BAIXO',  null,    1, 'trees', true)
  ON CONFLICT (tenant_id, risk_model, scenario, severity) DO NOTHING;
END;
$$;
