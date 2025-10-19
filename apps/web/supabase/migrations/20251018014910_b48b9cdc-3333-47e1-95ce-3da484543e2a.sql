-- ============================================================================
-- Sistema de permissões e usuário admin
-- ============================================================================

-- Função para atribuir role admin após criação do usuário
CREATE OR REPLACE FUNCTION public.assign_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se email for admin@admin.com, atribuir role admin
  IF NEW.email = 'admin@admin.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Criar perfil também
    INSERT INTO public.profiles (id, full_name, organization)
    VALUES (NEW.id, 'Administrator', 'SmartLine')
    ON CONFLICT (id) DO UPDATE
    SET full_name = 'Administrator', organization = 'SmartLine';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para auto-atribuição de admin role
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_admin_role();

-- Garantir que admin existente tenha a role correta
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@admin.com';
  
  IF admin_user_id IS NOT NULL THEN
    -- Atribuir role admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Atualizar perfil
    INSERT INTO public.profiles (id, full_name, organization)
    VALUES (admin_user_id, 'Administrator', 'SmartLine')
    ON CONFLICT (id) DO UPDATE
    SET full_name = 'Administrator', organization = 'SmartLine';
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.assign_admin_role() TO authenticated;

-- ============================================================================
-- Tabela para armazenar diagramas unifilares
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.unifilar_diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('svg', 'json', 'png', 'jpg')),
  diagram_data JSONB,
  thumbnail_url TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  meta JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.unifilar_diagrams ENABLE ROW LEVEL SECURITY;

-- Policies para unifilar_diagrams
CREATE POLICY "Authenticated users can read diagrams"
ON public.unifilar_diagrams
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert diagrams"
ON public.unifilar_diagrams
FOR INSERT
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update own diagrams"
ON public.unifilar_diagrams
FOR UPDATE
USING (auth.uid() = uploaded_by);

CREATE POLICY "Admins can manage all diagrams"
ON public.unifilar_diagrams
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_unifilar_diagrams_line_code ON public.unifilar_diagrams(line_code);
CREATE INDEX IF NOT EXISTS idx_unifilar_diagrams_uploaded_by ON public.unifilar_diagrams(uploaded_by);

-- Storage bucket para diagramas
INSERT INTO storage.buckets (id, name, public)
VALUES ('unifilar-diagrams', 'unifilar-diagrams', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies para unifilar-diagrams
CREATE POLICY "Users can upload diagrams"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'unifilar-diagrams'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read own diagrams"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'unifilar-diagrams'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can read all diagrams"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'unifilar-diagrams'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Admins can manage all diagram files"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'unifilar-diagrams'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);