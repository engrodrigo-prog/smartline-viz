-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Linhas de Transmissão (LineString)
CREATE TABLE IF NOT EXISTS linhas_transmissao (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE,
  nome VARCHAR(255),
  tensao_kv NUMERIC(6,2),
  regiao CHAR(1),
  concessao VARCHAR(60),
  status VARCHAR(50),
  geometry GEOMETRY(LineString, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_linhas_geom ON linhas_transmissao USING GIST (geometry);

-- Estruturas (Point)
CREATE TABLE IF NOT EXISTS estruturas (
  id SERIAL PRIMARY KEY,
  id_linha INT REFERENCES linhas_transmissao(id),
  codigo VARCHAR(50) UNIQUE,
  tipo VARCHAR(100),
  altura_m NUMERIC(6,2),
  estado_conservacao VARCHAR(50),
  risco_corrosao NUMERIC(5,2),
  regiao CHAR(1),
  concessao VARCHAR(60),
  geometry GEOMETRY(Point, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_estruturas_geom ON estruturas USING GIST (geometry);

-- Concessões (MultiPolygon)
CREATE TABLE IF NOT EXISTS concessoes_geo (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(60) UNIQUE,
  geometry GEOMETRY(MultiPolygon, 4326) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_concessoes_geom ON concessoes_geo USING GIST (geometry);

-- Queimadas (pontos FIRMS enriquecidos)
CREATE TABLE IF NOT EXISTS queimadas (
  id BIGSERIAL PRIMARY KEY,
  fonte VARCHAR(20) NOT NULL,
  data_aquisicao TIMESTAMPTZ NOT NULL,
  brilho NUMERIC(8,2),
  confianca INT,
  satelite VARCHAR(20),
  estado CHAR(2) DEFAULT 'SP',
  concessao VARCHAR(60),
  id_linha INT,
  ramal VARCHAR(50),
  distancia_m NUMERIC(10,2),
  geometry GEOMETRY(Point, 4326) NOT NULL,
  processado BOOLEAN DEFAULT TRUE,
  erro_processamento TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quem_geom ON queimadas USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_quem_data ON queimadas (data_aquisicao);
CREATE INDEX IF NOT EXISTS idx_quem_conf ON queimadas (confianca);

-- Function para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_linhas_updated_at BEFORE UPDATE ON linhas_transmissao
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_estruturas_updated_at BEFORE UPDATE ON estruturas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_concessoes_updated_at BEFORE UPDATE ON concessoes_geo
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE linhas_transmissao ENABLE ROW LEVEL SECURITY;
ALTER TABLE estruturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE concessoes_geo ENABLE ROW LEVEL SECURITY;
ALTER TABLE queimadas ENABLE ROW LEVEL SECURITY;

-- RLS Policies (read-only for now, functions will write with service role)
CREATE POLICY "Allow public read access to linhas" ON linhas_transmissao FOR SELECT USING (true);
CREATE POLICY "Allow public read access to estruturas" ON estruturas FOR SELECT USING (true);
CREATE POLICY "Allow public read access to concessoes" ON concessoes_geo FOR SELECT USING (true);
CREATE POLICY "Allow public read access to queimadas" ON queimadas FOR SELECT USING (true);