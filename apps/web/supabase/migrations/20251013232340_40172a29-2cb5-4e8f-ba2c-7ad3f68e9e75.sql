-- Create infrastructure table for transmission lines and structures
CREATE TABLE IF NOT EXISTS public.infrastructure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa text NOT NULL,
  regiao text NOT NULL,
  linha_prefixo text NOT NULL,
  linha_codigo text NOT NULL,
  linha_nome text NOT NULL,
  ramal text,
  estrutura text,
  nome_material text,
  asset_type text NOT NULL CHECK (asset_type IN ('structure', 'line', 'segment')),
  lat numeric,
  lon numeric,
  alt numeric,
  bbox jsonb,
  geometry jsonb NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on infrastructure
ALTER TABLE public.infrastructure ENABLE ROW LEVEL SECURITY;

-- Visitors can read all infrastructure
CREATE POLICY "Visitors can read infrastructure"
ON public.infrastructure
FOR SELECT
USING (true);

-- Authenticated users can insert infrastructure
CREATE POLICY "Authenticated users can insert infrastructure"
ON public.infrastructure
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own infrastructure
CREATE POLICY "Users can update own infrastructure"
ON public.infrastructure
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete own infrastructure
CREATE POLICY "Users can delete own infrastructure"
ON public.infrastructure
FOR DELETE
USING (auth.uid() = user_id);

-- Create fires table for FIRMS data
CREATE TABLE IF NOT EXISTS public.fires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  confidence integer,
  brightness numeric,
  acq_date date,
  acq_time text,
  satellite text,
  source text DEFAULT 'FIRMS',
  geometry jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on fires (public read)
ALTER TABLE public.fires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read fires"
ON public.fires
FOR SELECT
USING (true);

-- Create storage bucket for KML uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('kml-uploads', 'kml-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for kml-uploads
CREATE POLICY "Authenticated users can upload KML files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'kml-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own KML files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'kml-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own KML files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'kml-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add visitor role to existing app_role enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'analyst', 'operator');
  END IF;
  
  -- Add visitor if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'visitor' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'visitor';
  END IF;
  
  -- Add cpfl_user if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cpfl_user' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'cpfl_user';
  END IF;
END $$;

-- Function to auto-assign role based on email domain
CREATE OR REPLACE FUNCTION public.assign_role_by_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if email domain is CPFL
  IF NEW.email LIKE '%@cpfl.com.br' OR NEW.email LIKE '%@cpflenergia.com.br' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'cpfl_user'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Default to visitor role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'visitor'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto role assignment
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_role_by_domain();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_infrastructure_geometry ON public.infrastructure USING gin(geometry);
CREATE INDEX IF NOT EXISTS idx_infrastructure_user_id ON public.infrastructure(user_id);
CREATE INDEX IF NOT EXISTS idx_infrastructure_empresa_regiao ON public.infrastructure(empresa, regiao);
CREATE INDEX IF NOT EXISTS idx_fires_location ON public.fires(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_fires_acq_date ON public.fires(acq_date);