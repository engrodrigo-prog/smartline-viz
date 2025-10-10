-- Criar tabela de staging para classificação de geodados
CREATE TABLE IF NOT EXISTS public.geodata_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  geometry_type text NOT NULL, -- Point, LineString, Polygon
  geometry geometry(Geometry, 4326) NOT NULL,
  feature_name text,
  classification text, -- 'linha', 'linha_estrutura', 'estrutura', 'evento', 'outros'
  custom_classification text, -- Para quando classification = 'outros'
  metadata jsonb DEFAULT '{}'::jsonb,
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela para eventos/ocorrências
CREATE TABLE IF NOT EXISTS public.eventos_geo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome character varying NOT NULL,
  tipo_evento character varying, -- Tipo de evento definido pelo usuário
  geometry geometry(Geometry, 4326) NOT NULL,
  regiao character,
  concessao character varying,
  descricao text,
  data_ocorrencia timestamptz,
  status character varying,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela para outros geodados
CREATE TABLE IF NOT EXISTS public.geodata_outros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome character varying NOT NULL,
  categoria character varying NOT NULL, -- Categoria personalizada pelo usuário
  geometry geometry(Geometry, 4326) NOT NULL,
  regiao character,
  concessao character varying,
  descricao text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.geodata_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_geo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geodata_outros ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para acesso público (ajustar conforme necessário)
CREATE POLICY "Allow public read access to geodata_staging"
  ON public.geodata_staging FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to geodata_staging"
  ON public.geodata_staging FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read access to eventos_geo"
  ON public.eventos_geo FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to eventos_geo"
  ON public.eventos_geo FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read access to geodata_outros"
  ON public.geodata_outros FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to geodata_outros"
  ON public.geodata_outros FOR INSERT
  WITH CHECK (true);

-- Criar índices espaciais
CREATE INDEX IF NOT EXISTS idx_geodata_staging_geometry ON public.geodata_staging USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_eventos_geo_geometry ON public.eventos_geo USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_geodata_outros_geometry ON public.geodata_outros USING GIST (geometry);