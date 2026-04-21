-- Re-assert RLS on public-facing tables that existed before the canonical
-- security migrations in this repository, and harden the PostGIS reference
-- table that lives in `public` when the extension is installed there.

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
  END IF;

  IF to_regclass('public.spatial_ref_sys') IS NOT NULL THEN
    ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public can read spatial_ref_sys" ON public.spatial_ref_sys;
    CREATE POLICY "Public can read spatial_ref_sys"
    ON public.spatial_ref_sys
    FOR SELECT
    USING (true);
  END IF;
END
$$;
