-- ============================================
-- CRITICAL SECURITY FIX - Implement Authentication & RLS
-- ============================================

-- 1. Create user roles system for RBAC
CREATE TYPE public.app_role AS ENUM ('admin', 'analyst', 'operator');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Only admins can manage roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Create profiles table for user metadata
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  organization TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Add user_id to geodata_staging for ownership tracking
ALTER TABLE public.geodata_staging
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing records to null (will be cleaned up)
UPDATE public.geodata_staging SET user_id = NULL WHERE user_id IS NULL;

-- 4. DROP all public access policies and replace with authenticated ones

-- concessoes_geo
DROP POLICY IF EXISTS "Allow public read access to concessoes" ON public.concessoes_geo;
CREATE POLICY "Authenticated users can read concessoes"
ON public.concessoes_geo
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- estruturas
DROP POLICY IF EXISTS "Allow public read access to estruturas" ON public.estruturas;
CREATE POLICY "Authenticated users can read estruturas"
ON public.estruturas
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- eventos_geo
DROP POLICY IF EXISTS "Allow public read access to eventos_geo" ON public.eventos_geo;
DROP POLICY IF EXISTS "Allow public insert to eventos_geo" ON public.eventos_geo;

CREATE POLICY "Authenticated users can read eventos"
ON public.eventos_geo
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert eventos"
ON public.eventos_geo
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- geodata_outros
DROP POLICY IF EXISTS "Allow public read access to geodata_outros" ON public.geodata_outros;
DROP POLICY IF EXISTS "Allow public insert to geodata_outros" ON public.geodata_outros;

CREATE POLICY "Authenticated users can read geodata_outros"
ON public.geodata_outros
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert geodata_outros"
ON public.geodata_outros
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- geodata_staging - User can only see/modify their own staged data
DROP POLICY IF EXISTS "Allow public read access to geodata_staging" ON public.geodata_staging;
DROP POLICY IF EXISTS "Allow public insert to geodata_staging" ON public.geodata_staging;

CREATE POLICY "Users can read own staged geodata"
ON public.geodata_staging
FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own staged geodata"
ON public.geodata_staging
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own staged geodata"
ON public.geodata_staging
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own staged geodata"
ON public.geodata_staging
FOR DELETE
USING (auth.uid() = user_id);

-- linhas_transmissao
DROP POLICY IF EXISTS "Allow public read access to linhas" ON public.linhas_transmissao;
CREATE POLICY "Authenticated users can read linhas"
ON public.linhas_transmissao
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- queimadas
DROP POLICY IF EXISTS "Allow public read access to queimadas" ON public.queimadas;
CREATE POLICY "Authenticated users can read queimadas"
ON public.queimadas
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 5. Create storage policies for geodata-uploads bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('geodata-uploads', 'geodata-uploads', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Users can upload to their own folder
CREATE POLICY "Users can upload own files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'geodata-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own files
CREATE POLICY "Users can view own files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'geodata-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'geodata-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can access all files
CREATE POLICY "Admins can access all files"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'geodata-uploads' 
  AND public.has_role(auth.uid(), 'admin')
);