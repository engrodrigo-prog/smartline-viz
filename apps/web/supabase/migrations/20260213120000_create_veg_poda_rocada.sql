-- ============================================================================
-- SmartLine: Vegetação (Poda & Roçada) — Operação de campo + gestão
-- Multi-tenant (tenant_id) + RLS + Storage + Auditoria
-- ============================================================================

-- Extensions
create extension if not exists postgis;

-- Ensure helper exists (older environments)
CREATE OR REPLACE FUNCTION public.user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.app_user WHERE id = _user_id
$$;

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.veg_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.veg_status_anomaly AS ENUM ('open', 'triaged', 'scheduled', 'in_progress', 'resolved', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.veg_anomaly_type AS ENUM (
    'encroachment',
    'risk_tree',
    'regrowth',
    'fallen_tree',
    'blocked_access',
    'environmental_restriction',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.veg_source AS ENUM ('field', 'satellite', 'lidar', 'drone', 'customer', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.veg_action_type AS ENUM (
    'pruning',
    'mowing',
    'laser_pruning',
    'tree_removal',
    'clearing',
    'inspection',
    'verification',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.veg_action_status AS ENUM ('planned', 'assigned', 'in_progress', 'executed', 'verified', 'closed', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.veg_doc_type AS ENUM ('ASV', 'license', 'environmental_report', 'photo_report', 'kml', 'geojson', 'pdf', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.veg_evidence_type AS ENUM ('photo', 'video', 'pdf', 'note', 'ai_result', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.veg_audit_result AS ENUM ('approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.veg_risk_category AS ENUM ('vegetation', 'tree_fall', 'environmental', 'access', 'recurrence', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.veg_schedule_status AS ENUM ('planned', 'confirmed', 'done', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.veg_species_status AS ENUM ('suggested', 'confirmed', 'corrected', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.veg_location_method AS ENUM ('gps', 'map_pin', 'manual_address');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.veg_inspection_status AS ENUM ('open', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.veg_work_order_status AS ENUM ('pending', 'assigned', 'in_progress', 'executed', 'verified', 'closed', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.veg_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.veg_risk_status AS ENUM ('open', 'mitigated', 'accepted', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- Common triggers (updated_at / updated_by)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.veg_set_updated_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Audit log (trilha auditável)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.veg_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenant(id) ON DELETE CASCADE NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now() NOT NULL,
  old_data jsonb,
  new_data jsonb,
  meta jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_veg_audit_log_tenant_time ON public.veg_audit_log(tenant_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_veg_audit_log_record ON public.veg_audit_log(table_name, record_id);

ALTER TABLE public.veg_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant users can read veg audit log" ON public.veg_audit_log;
CREATE POLICY "Tenant users can read veg audit log"
ON public.veg_audit_log
FOR SELECT
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Operators can insert veg audit log" ON public.veg_audit_log;
CREATE POLICY "Operators can insert veg audit log"
ON public.veg_audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.user_tenant_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst'))
);

CREATE OR REPLACE FUNCTION public.veg_write_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_record uuid;
BEGIN
  v_tenant := COALESCE(NEW.tenant_id, OLD.tenant_id);
  v_record := COALESCE(NEW.id, OLD.id);

  INSERT INTO public.veg_audit_log (
    tenant_id,
    table_name,
    record_id,
    action,
    changed_by,
    changed_at,
    old_data,
    new_data
  )
  VALUES (
    v_tenant,
    TG_TABLE_NAME,
    v_record,
    TG_OP,
    auth.uid(),
    now(),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.veg_anomaly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenant(id) ON DELETE CASCADE NOT NULL DEFAULT public.user_tenant_id(auth.uid()),
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  status public.veg_status_anomaly NOT NULL DEFAULT 'open',
  severity public.veg_severity NOT NULL DEFAULT 'low',
  anomaly_type public.veg_anomaly_type NOT NULL DEFAULT 'other',
  source public.veg_source NOT NULL DEFAULT 'field',
  title text NOT NULL,
  description text,
  geom geometry(Point, 4326),
  location_method public.veg_location_method NOT NULL DEFAULT 'map_pin',
  location_captured_at timestamptz,
  address_text text,
  asset_ref text,
  due_date date,
  tags text[] DEFAULT '{}'::text[] NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_veg_anomaly_tenant_created ON public.veg_anomaly(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_veg_anomaly_tenant_status ON public.veg_anomaly(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_veg_anomaly_tenant_severity ON public.veg_anomaly(tenant_id, severity);
CREATE INDEX IF NOT EXISTS idx_veg_anomaly_geom ON public.veg_anomaly USING GIST (geom);

CREATE TABLE IF NOT EXISTS public.veg_inspection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenant(id) ON DELETE CASCADE NOT NULL DEFAULT public.user_tenant_id(auth.uid()),
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  anomaly_id uuid REFERENCES public.veg_anomaly(id) ON DELETE SET NULL,
  status public.veg_inspection_status NOT NULL DEFAULT 'open',
  severity public.veg_severity,
  findings jsonb DEFAULT '{}'::jsonb NOT NULL,
  geom geometry(Point, 4326),
  location_method public.veg_location_method NOT NULL DEFAULT 'gps',
  location_captured_at timestamptz,
  address_text text,
  requires_action boolean DEFAULT false NOT NULL,
  suggested_action_type public.veg_action_type,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_veg_inspection_tenant_created ON public.veg_inspection(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_veg_inspection_tenant_status ON public.veg_inspection(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_veg_inspection_geom ON public.veg_inspection USING GIST (geom);

CREATE TABLE IF NOT EXISTS public.veg_work_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenant(id) ON DELETE CASCADE NOT NULL DEFAULT public.user_tenant_id(auth.uid()),
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  anomaly_id uuid REFERENCES public.veg_anomaly(id) ON DELETE SET NULL,
  inspection_id uuid REFERENCES public.veg_inspection(id) ON DELETE SET NULL,
  status public.veg_work_order_status NOT NULL DEFAULT 'pending',
  priority public.veg_priority NOT NULL DEFAULT 'medium',
  team_id uuid,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  geom geometry(Point, 4326),
  location_method public.veg_location_method NOT NULL DEFAULT 'map_pin',
  location_captured_at timestamptz,
  address_text text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_veg_work_order_tenant_created ON public.veg_work_order(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_veg_work_order_tenant_status ON public.veg_work_order(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_veg_work_order_geom ON public.veg_work_order USING GIST (geom);

CREATE TABLE IF NOT EXISTS public.veg_action (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenant(id) ON DELETE CASCADE NOT NULL DEFAULT public.user_tenant_id(auth.uid()),
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  work_order_id uuid REFERENCES public.veg_work_order(id) ON DELETE SET NULL,
  anomaly_id uuid REFERENCES public.veg_anomaly(id) ON DELETE SET NULL,
  action_type public.veg_action_type NOT NULL DEFAULT 'other',
  status public.veg_action_status NOT NULL DEFAULT 'planned',
  planned_start timestamptz,
  planned_end timestamptz,
  executed_at timestamptz,
  team_id uuid,
  operator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  geom geometry(Point, 4326),
  location_method public.veg_location_method NOT NULL DEFAULT 'gps',
  location_captured_at timestamptz,
  address_text text,
  quantity numeric,
  unit text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_veg_action_tenant_created ON public.veg_action(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_veg_action_tenant_status ON public.veg_action(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_veg_action_tenant_type ON public.veg_action(tenant_id, action_type);
CREATE INDEX IF NOT EXISTS idx_veg_action_geom ON public.veg_action USING GIST (geom);

CREATE TABLE IF NOT EXISTS public.veg_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenant(id) ON DELETE CASCADE NOT NULL DEFAULT public.user_tenant_id(auth.uid()),
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  work_order_id uuid REFERENCES public.veg_work_order(id) ON DELETE SET NULL,
  action_id uuid REFERENCES public.veg_action(id) ON DELETE SET NULL,
  result public.veg_audit_result NOT NULL,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  corrective_required boolean DEFAULT false NOT NULL,
  corrective_notes text
);

CREATE INDEX IF NOT EXISTS idx_veg_audit_tenant_created ON public.veg_audit(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_veg_audit_tenant_result ON public.veg_audit(tenant_id, result);

CREATE TABLE IF NOT EXISTS public.veg_risk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenant(id) ON DELETE CASCADE NOT NULL DEFAULT public.user_tenant_id(auth.uid()),
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  related_anomaly_id uuid REFERENCES public.veg_anomaly(id) ON DELETE SET NULL,
  related_work_order_id uuid REFERENCES public.veg_work_order(id) ON DELETE SET NULL,
  category public.veg_risk_category NOT NULL DEFAULT 'vegetation',
  probability smallint NOT NULL CHECK (probability BETWEEN 1 AND 5),
  impact smallint NOT NULL CHECK (impact BETWEEN 1 AND 5),
  score smallint GENERATED ALWAYS AS ((probability * impact)::smallint) STORED,
  sla_days smallint,
  status public.veg_risk_status NOT NULL DEFAULT 'open',
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_veg_risk_tenant_created ON public.veg_risk(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_veg_risk_tenant_status ON public.veg_risk(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_veg_risk_tenant_score ON public.veg_risk(tenant_id, score DESC);

CREATE TABLE IF NOT EXISTS public.veg_schedule_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenant(id) ON DELETE CASCADE NOT NULL DEFAULT public.user_tenant_id(auth.uid()),
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  title text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  team_id uuid,
  operator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  related_anomaly_id uuid REFERENCES public.veg_anomaly(id) ON DELETE SET NULL,
  related_work_order_id uuid REFERENCES public.veg_work_order(id) ON DELETE SET NULL,
  related_action_id uuid REFERENCES public.veg_action(id) ON DELETE SET NULL,
  status public.veg_schedule_status NOT NULL DEFAULT 'planned',
  geom geometry(Point, 4326),
  location_method public.veg_location_method NOT NULL DEFAULT 'map_pin',
  location_captured_at timestamptz,
  address_text text,
  location_text text,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_veg_schedule_event_tenant_start ON public.veg_schedule_event(tenant_id, start_at);
CREATE INDEX IF NOT EXISTS idx_veg_schedule_event_tenant_status ON public.veg_schedule_event(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_veg_schedule_event_geom ON public.veg_schedule_event USING GIST (geom);

CREATE TABLE IF NOT EXISTS public.veg_document (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenant(id) ON DELETE CASCADE NOT NULL DEFAULT public.user_tenant_id(auth.uid()),
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  doc_type public.veg_doc_type NOT NULL DEFAULT 'other',
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  sha256 text,
  geom geometry(Point, 4326),
  location_method public.veg_location_method NOT NULL DEFAULT 'map_pin',
  location_captured_at timestamptz,
  address_text text,
  linked_anomaly_id uuid REFERENCES public.veg_anomaly(id) ON DELETE SET NULL,
  linked_work_order_id uuid REFERENCES public.veg_work_order(id) ON DELETE SET NULL,
  linked_action_id uuid REFERENCES public.veg_action(id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}'::text[] NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_veg_document_tenant_created ON public.veg_document(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_veg_document_tenant_type ON public.veg_document(tenant_id, doc_type);
CREATE INDEX IF NOT EXISTS idx_veg_document_geom ON public.veg_document USING GIST (geom);

CREATE TABLE IF NOT EXISTS public.veg_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenant(id) ON DELETE CASCADE NOT NULL DEFAULT public.user_tenant_id(auth.uid()),
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  evidence_type public.veg_evidence_type NOT NULL DEFAULT 'photo',
  file_path text,
  text_note text,
  address_text text,
  linked_anomaly_id uuid REFERENCES public.veg_anomaly(id) ON DELETE SET NULL,
  linked_inspection_id uuid REFERENCES public.veg_inspection(id) ON DELETE SET NULL,
  linked_work_order_id uuid REFERENCES public.veg_work_order(id) ON DELETE SET NULL,
  linked_action_id uuid REFERENCES public.veg_action(id) ON DELETE SET NULL,
  captured_at timestamptz,
  geom geometry(Point, 4326),
  location_method public.veg_location_method NOT NULL DEFAULT 'gps',
  location_captured_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_veg_evidence_tenant_created ON public.veg_evidence(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_veg_evidence_geom ON public.veg_evidence USING GIST (geom);

CREATE TABLE IF NOT EXISTS public.veg_species_identification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenant(id) ON DELETE CASCADE NOT NULL DEFAULT public.user_tenant_id(auth.uid()),
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  evidence_id uuid REFERENCES public.veg_evidence(id) ON DELETE CASCADE NOT NULL,
  raw_result jsonb NOT NULL,
  suggested_species text,
  suggested_scientific_name text,
  suggested_confidence numeric,
  top_k jsonb,
  model_version text,
  confirmed_species text,
  confirmed_scientific_name text,
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  confidence_threshold numeric NOT NULL DEFAULT 0.75,
  status public.veg_species_status NOT NULL DEFAULT 'suggested'
);

CREATE INDEX IF NOT EXISTS idx_veg_species_identification_tenant_created ON public.veg_species_identification(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_veg_species_identification_evidence ON public.veg_species_identification(evidence_id);

-- ----------------------------------------------------------------------------
-- Triggers (updated fields + audit)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TRIGGER veg_anomaly_set_updated_fields
  BEFORE UPDATE ON public.veg_anomaly
  FOR EACH ROW
  EXECUTE FUNCTION public.veg_set_updated_fields();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER veg_inspection_set_updated_fields
  BEFORE UPDATE ON public.veg_inspection
  FOR EACH ROW
  EXECUTE FUNCTION public.veg_set_updated_fields();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER veg_work_order_set_updated_fields
  BEFORE UPDATE ON public.veg_work_order
  FOR EACH ROW
  EXECUTE FUNCTION public.veg_set_updated_fields();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER veg_action_set_updated_fields
  BEFORE UPDATE ON public.veg_action
  FOR EACH ROW
  EXECUTE FUNCTION public.veg_set_updated_fields();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER veg_audit_set_updated_fields
  BEFORE UPDATE ON public.veg_audit
  FOR EACH ROW
  EXECUTE FUNCTION public.veg_set_updated_fields();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER veg_risk_set_updated_fields
  BEFORE UPDATE ON public.veg_risk
  FOR EACH ROW
  EXECUTE FUNCTION public.veg_set_updated_fields();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER veg_schedule_event_set_updated_fields
  BEFORE UPDATE ON public.veg_schedule_event
  FOR EACH ROW
  EXECUTE FUNCTION public.veg_set_updated_fields();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Audit trail (after insert/update/delete)
DO $$ BEGIN
  CREATE TRIGGER veg_anomaly_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.veg_anomaly
  FOR EACH ROW
  EXECUTE FUNCTION public.veg_write_audit_log();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER veg_inspection_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.veg_inspection
  FOR EACH ROW
  EXECUTE FUNCTION public.veg_write_audit_log();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER veg_work_order_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.veg_work_order
  FOR EACH ROW
  EXECUTE FUNCTION public.veg_write_audit_log();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER veg_action_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.veg_action
  FOR EACH ROW
  EXECUTE FUNCTION public.veg_write_audit_log();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER veg_audit_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.veg_audit
  FOR EACH ROW
  EXECUTE FUNCTION public.veg_write_audit_log();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER veg_risk_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.veg_risk
  FOR EACH ROW
  EXECUTE FUNCTION public.veg_write_audit_log();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER veg_schedule_event_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.veg_schedule_event
  FOR EACH ROW
  EXECUTE FUNCTION public.veg_write_audit_log();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER veg_document_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.veg_document
  FOR EACH ROW
  EXECUTE FUNCTION public.veg_write_audit_log();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER veg_evidence_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.veg_evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.veg_write_audit_log();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER veg_species_identification_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.veg_species_identification
  FOR EACH ROW
  EXECUTE FUNCTION public.veg_write_audit_log();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- RLS policies
-- ----------------------------------------------------------------------------
ALTER TABLE public.veg_anomaly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veg_inspection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veg_work_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veg_action ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veg_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veg_risk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veg_schedule_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veg_document ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veg_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veg_species_identification ENABLE ROW LEVEL SECURITY;

-- Helper macro for "can write" roles: admin/operator/analyst
-- (viewer users typically have no entries in user_roles)

-- veg_anomaly
DROP POLICY IF EXISTS "Tenant users can read veg_anomaly" ON public.veg_anomaly;
CREATE POLICY "Tenant users can read veg_anomaly"
ON public.veg_anomaly FOR SELECT
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Operators can insert veg_anomaly" ON public.veg_anomaly;
CREATE POLICY "Operators can insert veg_anomaly"
ON public.veg_anomaly FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.user_tenant_id(auth.uid())
  AND created_by = auth.uid()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst'))
);

DROP POLICY IF EXISTS "Operators can update veg_anomaly" ON public.veg_anomaly;
CREATE POLICY "Operators can update veg_anomaly"
ON public.veg_anomaly FOR UPDATE
TO authenticated
USING (
  tenant_id = public.user_tenant_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst') OR created_by = auth.uid())
);

DROP POLICY IF EXISTS "Admins can delete veg_anomaly" ON public.veg_anomaly;
CREATE POLICY "Admins can delete veg_anomaly"
ON public.veg_anomaly FOR DELETE
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- veg_inspection
DROP POLICY IF EXISTS "Tenant users can read veg_inspection" ON public.veg_inspection;
CREATE POLICY "Tenant users can read veg_inspection"
ON public.veg_inspection FOR SELECT
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Operators can insert veg_inspection" ON public.veg_inspection;
CREATE POLICY "Operators can insert veg_inspection"
ON public.veg_inspection FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.user_tenant_id(auth.uid())
  AND created_by = auth.uid()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst'))
);

DROP POLICY IF EXISTS "Operators can update veg_inspection" ON public.veg_inspection;
CREATE POLICY "Operators can update veg_inspection"
ON public.veg_inspection FOR UPDATE
TO authenticated
USING (
  tenant_id = public.user_tenant_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst') OR created_by = auth.uid())
);

DROP POLICY IF EXISTS "Admins can delete veg_inspection" ON public.veg_inspection;
CREATE POLICY "Admins can delete veg_inspection"
ON public.veg_inspection FOR DELETE
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- veg_work_order
DROP POLICY IF EXISTS "Tenant users can read veg_work_order" ON public.veg_work_order;
CREATE POLICY "Tenant users can read veg_work_order"
ON public.veg_work_order FOR SELECT
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Operators can insert veg_work_order" ON public.veg_work_order;
CREATE POLICY "Operators can insert veg_work_order"
ON public.veg_work_order FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.user_tenant_id(auth.uid())
  AND created_by = auth.uid()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst'))
);

DROP POLICY IF EXISTS "Operators can update veg_work_order" ON public.veg_work_order;
CREATE POLICY "Operators can update veg_work_order"
ON public.veg_work_order FOR UPDATE
TO authenticated
USING (
  tenant_id = public.user_tenant_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst') OR created_by = auth.uid())
);

DROP POLICY IF EXISTS "Admins can delete veg_work_order" ON public.veg_work_order;
CREATE POLICY "Admins can delete veg_work_order"
ON public.veg_work_order FOR DELETE
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- veg_action
DROP POLICY IF EXISTS "Tenant users can read veg_action" ON public.veg_action;
CREATE POLICY "Tenant users can read veg_action"
ON public.veg_action FOR SELECT
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Operators can insert veg_action" ON public.veg_action;
CREATE POLICY "Operators can insert veg_action"
ON public.veg_action FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.user_tenant_id(auth.uid())
  AND created_by = auth.uid()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst'))
);

DROP POLICY IF EXISTS "Operators can update veg_action" ON public.veg_action;
CREATE POLICY "Operators can update veg_action"
ON public.veg_action FOR UPDATE
TO authenticated
USING (
  tenant_id = public.user_tenant_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst') OR created_by = auth.uid())
);

DROP POLICY IF EXISTS "Admins can delete veg_action" ON public.veg_action;
CREATE POLICY "Admins can delete veg_action"
ON public.veg_action FOR DELETE
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- veg_audit
DROP POLICY IF EXISTS "Tenant users can read veg_audit" ON public.veg_audit;
CREATE POLICY "Tenant users can read veg_audit"
ON public.veg_audit FOR SELECT
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Operators can insert veg_audit" ON public.veg_audit;
CREATE POLICY "Operators can insert veg_audit"
ON public.veg_audit FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.user_tenant_id(auth.uid())
  AND created_by = auth.uid()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst'))
);

DROP POLICY IF EXISTS "Operators can update veg_audit" ON public.veg_audit;
CREATE POLICY "Operators can update veg_audit"
ON public.veg_audit FOR UPDATE
TO authenticated
USING (
  tenant_id = public.user_tenant_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst') OR created_by = auth.uid())
);

DROP POLICY IF EXISTS "Admins can delete veg_audit" ON public.veg_audit;
CREATE POLICY "Admins can delete veg_audit"
ON public.veg_audit FOR DELETE
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- veg_risk
DROP POLICY IF EXISTS "Tenant users can read veg_risk" ON public.veg_risk;
CREATE POLICY "Tenant users can read veg_risk"
ON public.veg_risk FOR SELECT
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Operators can insert veg_risk" ON public.veg_risk;
CREATE POLICY "Operators can insert veg_risk"
ON public.veg_risk FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.user_tenant_id(auth.uid())
  AND created_by = auth.uid()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst'))
);

DROP POLICY IF EXISTS "Operators can update veg_risk" ON public.veg_risk;
CREATE POLICY "Operators can update veg_risk"
ON public.veg_risk FOR UPDATE
TO authenticated
USING (
  tenant_id = public.user_tenant_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst') OR created_by = auth.uid())
);

DROP POLICY IF EXISTS "Admins can delete veg_risk" ON public.veg_risk;
CREATE POLICY "Admins can delete veg_risk"
ON public.veg_risk FOR DELETE
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- veg_schedule_event
DROP POLICY IF EXISTS "Tenant users can read veg_schedule_event" ON public.veg_schedule_event;
CREATE POLICY "Tenant users can read veg_schedule_event"
ON public.veg_schedule_event FOR SELECT
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Operators can insert veg_schedule_event" ON public.veg_schedule_event;
CREATE POLICY "Operators can insert veg_schedule_event"
ON public.veg_schedule_event FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.user_tenant_id(auth.uid())
  AND created_by = auth.uid()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst'))
);

DROP POLICY IF EXISTS "Operators can update veg_schedule_event" ON public.veg_schedule_event;
CREATE POLICY "Operators can update veg_schedule_event"
ON public.veg_schedule_event FOR UPDATE
TO authenticated
USING (
  tenant_id = public.user_tenant_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst') OR created_by = auth.uid())
);

DROP POLICY IF EXISTS "Admins can delete veg_schedule_event" ON public.veg_schedule_event;
CREATE POLICY "Admins can delete veg_schedule_event"
ON public.veg_schedule_event FOR DELETE
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- veg_document
DROP POLICY IF EXISTS "Tenant users can read veg_document" ON public.veg_document;
CREATE POLICY "Tenant users can read veg_document"
ON public.veg_document FOR SELECT
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Operators can insert veg_document" ON public.veg_document;
CREATE POLICY "Operators can insert veg_document"
ON public.veg_document FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.user_tenant_id(auth.uid())
  AND created_by = auth.uid()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst'))
);

DROP POLICY IF EXISTS "Operators can update veg_document" ON public.veg_document;
CREATE POLICY "Operators can update veg_document"
ON public.veg_document FOR UPDATE
TO authenticated
USING (
  tenant_id = public.user_tenant_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst') OR created_by = auth.uid())
);

DROP POLICY IF EXISTS "Admins can delete veg_document" ON public.veg_document;
CREATE POLICY "Admins can delete veg_document"
ON public.veg_document FOR DELETE
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- veg_evidence
DROP POLICY IF EXISTS "Tenant users can read veg_evidence" ON public.veg_evidence;
CREATE POLICY "Tenant users can read veg_evidence"
ON public.veg_evidence FOR SELECT
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Operators can insert veg_evidence" ON public.veg_evidence;
CREATE POLICY "Operators can insert veg_evidence"
ON public.veg_evidence FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.user_tenant_id(auth.uid())
  AND created_by = auth.uid()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst'))
);

DROP POLICY IF EXISTS "Operators can update veg_evidence" ON public.veg_evidence;
CREATE POLICY "Operators can update veg_evidence"
ON public.veg_evidence FOR UPDATE
TO authenticated
USING (
  tenant_id = public.user_tenant_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst') OR created_by = auth.uid())
);

DROP POLICY IF EXISTS "Admins can delete veg_evidence" ON public.veg_evidence;
CREATE POLICY "Admins can delete veg_evidence"
ON public.veg_evidence FOR DELETE
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- veg_species_identification
DROP POLICY IF EXISTS "Tenant users can read veg_species_identification" ON public.veg_species_identification;
CREATE POLICY "Tenant users can read veg_species_identification"
ON public.veg_species_identification FOR SELECT
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Operators can insert veg_species_identification" ON public.veg_species_identification;
CREATE POLICY "Operators can insert veg_species_identification"
ON public.veg_species_identification FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.user_tenant_id(auth.uid())
  AND created_by = auth.uid()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst'))
);

DROP POLICY IF EXISTS "Operators can update veg_species_identification" ON public.veg_species_identification;
CREATE POLICY "Operators can update veg_species_identification"
ON public.veg_species_identification FOR UPDATE
TO authenticated
USING (
  tenant_id = public.user_tenant_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'analyst') OR created_by = auth.uid())
);

DROP POLICY IF EXISTS "Admins can delete veg_species_identification" ON public.veg_species_identification;
CREATE POLICY "Admins can delete veg_species_identification"
ON public.veg_species_identification FOR DELETE
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- ----------------------------------------------------------------------------
-- Storage buckets for Vegetação (evidences + docs)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('veg-evidence', 'veg-evidence', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('veg-docs', 'veg-docs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Path convention: <tenant_id>/<user_id>/<timestamp>_<rand>_<filename>
-- Tenant users can read; uploader (or admin) can update/delete; tenant+uploader can insert.

-- veg-evidence bucket policies
DROP POLICY IF EXISTS "Tenant users can upload veg evidence" ON storage.objects;
CREATE POLICY "Tenant users can upload veg evidence"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'veg-evidence'
  AND (storage.foldername(name))[1] = public.user_tenant_id(auth.uid())::text
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Tenant users can read veg evidence" ON storage.objects;
CREATE POLICY "Tenant users can read veg evidence"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'veg-evidence'
  AND (storage.foldername(name))[1] = public.user_tenant_id(auth.uid())::text
);

DROP POLICY IF EXISTS "Users can update veg evidence" ON storage.objects;
CREATE POLICY "Users can update veg evidence"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'veg-evidence'
  AND (storage.foldername(name))[1] = public.user_tenant_id(auth.uid())::text
  AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

DROP POLICY IF EXISTS "Users can delete veg evidence" ON storage.objects;
CREATE POLICY "Users can delete veg evidence"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'veg-evidence'
  AND (storage.foldername(name))[1] = public.user_tenant_id(auth.uid())::text
  AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- veg-docs bucket policies
DROP POLICY IF EXISTS "Tenant users can upload veg docs" ON storage.objects;
CREATE POLICY "Tenant users can upload veg docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'veg-docs'
  AND (storage.foldername(name))[1] = public.user_tenant_id(auth.uid())::text
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Tenant users can read veg docs" ON storage.objects;
CREATE POLICY "Tenant users can read veg docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'veg-docs'
  AND (storage.foldername(name))[1] = public.user_tenant_id(auth.uid())::text
);

DROP POLICY IF EXISTS "Users can update veg docs" ON storage.objects;
CREATE POLICY "Users can update veg docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'veg-docs'
  AND (storage.foldername(name))[1] = public.user_tenant_id(auth.uid())::text
  AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

DROP POLICY IF EXISTS "Users can delete veg docs" ON storage.objects;
CREATE POLICY "Users can delete veg docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'veg-docs'
  AND (storage.foldername(name))[1] = public.user_tenant_id(auth.uid())::text
  AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);
