-- ============================================================================
-- CRITICAL SECURITY FIX: Resolve Infinite Recursion and Privilege Escalation
-- ============================================================================

-- Step 1: Create security definer function to safely get user's tenant
CREATE OR REPLACE FUNCTION public.user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.app_user WHERE id = _user_id
$$;

-- Step 2: Fix infinite recursion in app_user RLS policy
DROP POLICY IF EXISTS "Users can view own tenant users" ON public.app_user;

CREATE POLICY "Users can view own tenant users" ON public.app_user
FOR SELECT 
USING (tenant_id = public.user_tenant_id(auth.uid()));

-- Step 3: Fix recursive policy on tenant table
DROP POLICY IF EXISTS "Users can view own tenant data" ON public.tenant;

CREATE POLICY "Users can view own tenant data" ON public.tenant
FOR SELECT 
USING (id = public.user_tenant_id(auth.uid()));

-- Step 4: Fix all other tenant-based recursive policies
DROP POLICY IF EXISTS "Users can view own tenant datasets" ON public.dataset_catalog;
CREATE POLICY "Users can view own tenant datasets" ON public.dataset_catalog
FOR SELECT 
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view own tenant lines" ON public.line_asset;
CREATE POLICY "Users can view own tenant lines" ON public.line_asset
FOR SELECT 
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view own tenant DEMs" ON public.dem_surface;
CREATE POLICY "Users can view own tenant DEMs" ON public.dem_surface
FOR SELECT 
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view own tenant profiles" ON public.profile_data;
CREATE POLICY "Users can view own tenant profiles" ON public.profile_data
FOR SELECT 
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view own tenant spans" ON public.span_analysis;
CREATE POLICY "Users can view own tenant spans" ON public.span_analysis
FOR SELECT 
USING (tenant_id = public.user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view own tenant towers" ON public.tower_asset;
CREATE POLICY "Users can view own tenant towers" ON public.tower_asset
FOR SELECT 
USING (tenant_id = public.user_tenant_id(auth.uid()));

-- Step 5: Migrate roles from app_user to user_roles (if any exist)
-- Only migrate non-VIEWER roles that don't already exist in user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role
FROM public.app_user
WHERE role IS NOT NULL 
  AND role != 'VIEWER'
  AND role IN ('admin', 'analyst', 'operator', 'visitor', 'cpfl_user')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = app_user.id 
    AND role = app_user.role::app_role
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 6: Drop the dangerous role column from app_user
ALTER TABLE public.app_user DROP COLUMN IF EXISTS role;

-- Step 7: Add comment documenting the security fix
COMMENT ON FUNCTION public.user_tenant_id(UUID) IS 
'Security definer function to safely retrieve user tenant ID without triggering RLS recursion. Used in RLS policies to avoid infinite loops.';

COMMENT ON TABLE public.user_roles IS
'SECURITY CRITICAL: This is the ONLY table that should store user roles. Never add role columns to other tables.';