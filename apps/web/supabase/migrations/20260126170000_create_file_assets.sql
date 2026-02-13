-- ============================================================================
-- SmartLine: File catalog (docs/images) + tenant-scoped storage bucket
-- ============================================================================

-- Ensure PostGIS exists for geom columns
create extension if not exists postgis;

-- Ensure helper function exists even if older migrations weren't applied correctly
CREATE OR REPLACE FUNCTION public.user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.app_user WHERE id = _user_id
$$;

-- 1) Storage bucket for generic attachments (docs, images, PDFs, spreadsheets)
INSERT INTO storage.buckets (id, name, public)
VALUES ('asset-files', 'asset-files', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Tenant-scoped storage policies:
-- Path convention: <tenant_id>/<user_id>/<timestamp>_<rand>_<filename>
-- - Anyone in the tenant can READ
-- - Only the uploader (or admin) can UPDATE/DELETE
DROP POLICY IF EXISTS "Tenant users can upload asset files" ON storage.objects;
CREATE POLICY "Tenant users can upload asset files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'asset-files'
  AND (storage.foldername(name))[1] = public.user_tenant_id(auth.uid())::text
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Tenant users can read asset files" ON storage.objects;
CREATE POLICY "Tenant users can read asset files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'asset-files'
  AND (storage.foldername(name))[1] = public.user_tenant_id(auth.uid())::text
);

DROP POLICY IF EXISTS "Users can update own asset files" ON storage.objects;
CREATE POLICY "Users can update own asset files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'asset-files'
  AND (storage.foldername(name))[1] = public.user_tenant_id(auth.uid())::text
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own asset files" ON storage.objects;
CREATE POLICY "Users can delete own asset files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'asset-files'
  AND (storage.foldername(name))[1] = public.user_tenant_id(auth.uid())::text
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- 2) Catalog table for uploaded files
CREATE TABLE IF NOT EXISTS public.file_asset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenant(id) ON DELETE CASCADE NOT NULL,
  line_code text NOT NULL,
  category text,
  description text,
  bucket_id text NOT NULL DEFAULT 'asset-files',
  object_path text NOT NULL,
  file_name text,
  original_name text,
  mime_type text,
  size_bytes bigint,
  geom geometry(Point, 4326),
  meta jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, object_path)
);

CREATE INDEX IF NOT EXISTS idx_file_asset_tenant_line ON public.file_asset(tenant_id, line_code);
CREATE INDEX IF NOT EXISTS idx_file_asset_created_at ON public.file_asset(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_asset_geom ON public.file_asset USING GIST (geom);

ALTER TABLE public.file_asset ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped RLS
DROP POLICY IF EXISTS "Users can view own tenant files" ON public.file_asset;
CREATE POLICY "Users can view own tenant files" ON public.file_asset
FOR SELECT
TO authenticated
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Users can insert own tenant files" ON public.file_asset;
CREATE POLICY "Users can insert own tenant files" ON public.file_asset
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.user_tenant_id(auth.uid())
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Users can update own files" ON public.file_asset;
CREATE POLICY "Users can update own files" ON public.file_asset
FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete own files" ON public.file_asset;
CREATE POLICY "Users can delete own files" ON public.file_asset
FOR DELETE
TO authenticated
USING (created_by = auth.uid());
