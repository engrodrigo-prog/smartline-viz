-- Criar bucket para uploads de geodados (KML, KMZ, SHP, ZIP)
INSERT INTO storage.buckets (id, name, public)
VALUES ('geodata-uploads', 'geodata-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Permitir uploads autenticados
CREATE POLICY "Authenticated users can upload geodata"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'geodata-uploads');

-- RLS: Permitir leitura autenticada
CREATE POLICY "Authenticated users can read geodata"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'geodata-uploads');

-- RLS: Permitir atualização autenticada
CREATE POLICY "Authenticated users can update geodata"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'geodata-uploads');

-- RLS: Permitir deleção autenticada
CREATE POLICY "Authenticated users can delete geodata"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'geodata-uploads');