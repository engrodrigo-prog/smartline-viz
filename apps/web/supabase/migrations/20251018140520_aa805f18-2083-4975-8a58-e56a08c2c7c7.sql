-- Criar bucket público para camadas geográficas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'layers',
  'layers',
  true,
  52428800, -- 50MB
  ARRAY['application/zip', 'application/json', 'application/geo+json', 'application/vnd.mapbox-vector-tile']::text[]
);

-- RLS: Leitura pública para todas as camadas
CREATE POLICY "Public read access to layers"
ON storage.objects FOR SELECT
USING (bucket_id = 'layers');

-- RLS: Upload autenticado apenas em custom/user_<uuid>/
CREATE POLICY "Authenticated users can upload to custom/"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'layers' 
  AND (storage.foldername(name))[1] = 'custom'
  AND auth.uid() IS NOT NULL
);

-- RLS: Usuários podem deletar apenas seus próprios arquivos
CREATE POLICY "Users can delete own files in custom/"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'layers'
  AND (storage.foldername(name))[1] = 'custom'
  AND (storage.foldername(name))[2] = concat('user_', auth.uid()::text)
);

-- RLS: Usuários podem atualizar apenas seus próprios arquivos
CREATE POLICY "Users can update own files in custom/"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'layers'
  AND (storage.foldername(name))[1] = 'custom'
  AND (storage.foldername(name))[2] = concat('user_', auth.uid()::text)
);