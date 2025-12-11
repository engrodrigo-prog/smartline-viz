CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scenario_type') THEN
    CREATE TYPE scenario_type AS ENUM ('pre_manejo', 'pos_manejo', 'simulado');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scenario_status') THEN
    CREATE TYPE scenario_status AS ENUM ('ativo', 'arquivado');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS tb_lipowerline_dataset (
  dataset_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  line_code text,
  scenario_hint text,
  source_path text,
  status text NOT NULL DEFAULT 'pending',
  created_by text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tb_linha (
  linha_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_linha text NOT NULL UNIQUE,
  nome_linha text,
  tensao_kv numeric,
  concessionaria text,
  regiao text,
  geom geometry(LineString, 4326),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tb_linha_updated ON tb_linha;
CREATE TRIGGER trg_tb_linha_updated
BEFORE UPDATE ON tb_linha
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS tb_estrutura (
  estrutura_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linha_id uuid NOT NULL REFERENCES tb_linha(linha_id) ON DELETE CASCADE,
  codigo_estrutura text NOT NULL,
  tipo_estrutura text,
  n_circuitos smallint,
  altura_m numeric,
  latitude numeric,
  longitude numeric,
  geom geometry(Point, 4326),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(linha_id, codigo_estrutura)
);

DROP TRIGGER IF EXISTS trg_tb_estrutura_updated ON tb_estrutura;
CREATE TRIGGER trg_tb_estrutura_updated
BEFORE UPDATE ON tb_estrutura
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS tb_vao (
  vao_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linha_id uuid NOT NULL REFERENCES tb_linha(linha_id) ON DELETE CASCADE,
  estrutura_ini_id uuid REFERENCES tb_estrutura(estrutura_id) ON DELETE SET NULL,
  estrutura_fim_id uuid REFERENCES tb_estrutura(estrutura_id) ON DELETE SET NULL,
  codigo_vao text NOT NULL,
  comprimento_m numeric,
  geom geometry(LineString, 4326),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(linha_id, codigo_vao)
);

DROP TRIGGER IF EXISTS trg_tb_vao_updated ON tb_vao;
CREATE TRIGGER trg_tb_vao_updated
BEFORE UPDATE ON tb_vao
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS tb_cenario (
  cenario_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linha_id uuid NOT NULL REFERENCES tb_linha(linha_id) ON DELETE CASCADE,
  descricao text NOT NULL,
  data_referencia date,
  tipo_cenario scenario_type NOT NULL DEFAULT 'pre_manejo',
  status scenario_status NOT NULL DEFAULT 'ativo',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(linha_id, descricao)
);

CREATE TABLE IF NOT EXISTS tb_elemento_vegetacao (
  arvore_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linha_id uuid NOT NULL REFERENCES tb_linha(linha_id) ON DELETE CASCADE,
  vao_id uuid REFERENCES tb_vao(vao_id) ON DELETE SET NULL,
  codigo_externo text,
  geom geometry(Point, 4326),
  altura_m numeric,
  diametro_copa_m numeric,
  em_app boolean,
  tipo_vegetacao text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(linha_id, codigo_externo)
);

CREATE TABLE IF NOT EXISTS tb_risco_vegetacao_vao (
  risco_veg_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vao_id uuid NOT NULL REFERENCES tb_vao(vao_id) ON DELETE CASCADE,
  arvore_id uuid REFERENCES tb_elemento_vegetacao(arvore_id) ON DELETE SET NULL,
  cenario_id uuid NOT NULL REFERENCES tb_cenario(cenario_id) ON DELETE CASCADE,
  dist_min_cabo_m numeric,
  classe_risco_clearance text,
  distancia_lateral_m numeric,
  categoria_risco text,
  data_processamento date,
  fonte text DEFAULT 'LiPowerline',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tb_risco_queda_lateral (
  risco_queda_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linha_id uuid NOT NULL REFERENCES tb_linha(linha_id) ON DELETE CASCADE,
  vao_id uuid REFERENCES tb_vao(vao_id) ON DELETE SET NULL,
  arvore_id uuid REFERENCES tb_elemento_vegetacao(arvore_id) ON DELETE SET NULL,
  altura_arvore_m numeric,
  dist_lateral_projecao_m numeric,
  alcance_ate_condutor_m numeric,
  classe_risco_queda text,
  em_app boolean,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tb_cruzamento (
  cruzamento_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linha_id uuid NOT NULL REFERENCES tb_linha(linha_id) ON DELETE CASCADE,
  vao_id uuid REFERENCES tb_vao(vao_id) ON DELETE SET NULL,
  tipo_cruzamento text,
  geom geometry(Geometry, 4326),
  atributos jsonb NOT NULL DEFAULT '{}'::jsonb,
  classe_risco_cruzamento text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tb_tratamento_vegetacao (
  tratamento_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cenario_id uuid NOT NULL REFERENCES tb_cenario(cenario_id) ON DELETE CASCADE,
  linha_id uuid NOT NULL REFERENCES tb_linha(linha_id) ON DELETE CASCADE,
  vao_id uuid REFERENCES tb_vao(vao_id) ON DELETE SET NULL,
  geom geometry(Geometry, 4326),
  tipo_servico text,
  data_execucao date,
  origem text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stg_kml_linha (
  stg_id bigserial PRIMARY KEY,
  dataset_id uuid NOT NULL REFERENCES tb_lipowerline_dataset(dataset_id) ON DELETE CASCADE,
  source_file text NOT NULL,
  feature_name text,
  raw jsonb NOT NULL,
  geom geometry(LineString, 4326),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stg_kml_estrutura (
  stg_id bigserial PRIMARY KEY,
  dataset_id uuid NOT NULL REFERENCES tb_lipowerline_dataset(dataset_id) ON DELETE CASCADE,
  source_file text NOT NULL,
  feature_name text,
  raw jsonb NOT NULL,
  geom geometry(Point, 4326),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stg_kml_tratado (
  stg_id bigserial PRIMARY KEY,
  dataset_id uuid NOT NULL REFERENCES tb_lipowerline_dataset(dataset_id) ON DELETE CASCADE,
  source_file text NOT NULL,
  feature_name text,
  raw jsonb NOT NULL,
  geom geometry(Geometry, 4326),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stg_csv_vegetacao (
  stg_id bigserial PRIMARY KEY,
  dataset_id uuid NOT NULL REFERENCES tb_lipowerline_dataset(dataset_id) ON DELETE CASCADE,
  source_file text NOT NULL,
  row_number integer NOT NULL,
  raw jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stg_csv_risco_vegetacao (
  stg_id bigserial PRIMARY KEY,
  dataset_id uuid NOT NULL REFERENCES tb_lipowerline_dataset(dataset_id) ON DELETE CASCADE,
  source_file text NOT NULL,
  row_number integer NOT NULL,
  raw jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stg_csv_queda_lateral (
  stg_id bigserial PRIMARY KEY,
  dataset_id uuid NOT NULL REFERENCES tb_lipowerline_dataset(dataset_id) ON DELETE CASCADE,
  source_file text NOT NULL,
  row_number integer NOT NULL,
  raw jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stg_csv_cruzamentos (
  stg_id bigserial PRIMARY KEY,
  dataset_id uuid NOT NULL REFERENCES tb_lipowerline_dataset(dataset_id) ON DELETE CASCADE,
  source_file text NOT NULL,
  row_number integer NOT NULL,
  raw jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tb_estrutura_geom ON tb_estrutura USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_tb_elemento_vegetacao_geom ON tb_elemento_vegetacao USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_tb_tratamento_geom ON tb_tratamento_vegetacao USING GIST (geom);

CREATE OR REPLACE VIEW vw_kpi_linha AS
SELECT
  l.linha_id,
  l.codigo_linha,
  l.nome_linha,
  c.cenario_id,
  c.descricao AS cenario_descricao,
  c.tipo_cenario,
  COALESCE(ST_Length(l.geom::geography) / 1000.0, 0) AS km_linha,
  COUNT(DISTINCT v.vao_id) AS total_vaos,
  COUNT(DISTINCT CASE WHEN rv.classe_risco_clearance ILIKE 'crit%' THEN rv.risco_veg_id END) AS arvores_criticas,
  COUNT(DISTINCT CASE WHEN cz.classe_risco_cruzamento ILIKE 'crit%' THEN cz.cruzamento_id END) AS cruzamentos_criticos,
  COUNT(DISTINCT rv.risco_veg_id) AS total_riscos_vegetacao
FROM tb_linha l
LEFT JOIN tb_cenario c ON c.linha_id = l.linha_id
LEFT JOIN tb_vao v ON v.linha_id = l.linha_id
LEFT JOIN tb_risco_vegetacao_vao rv ON rv.vao_id = v.vao_id AND rv.cenario_id = c.cenario_id
LEFT JOIN tb_cruzamento cz ON cz.linha_id = l.linha_id
GROUP BY l.linha_id, l.codigo_linha, l.nome_linha, c.cenario_id, c.descricao, c.tipo_cenario;

CREATE OR REPLACE VIEW vw_risco_vegetacao_mapa AS
SELECT
  v.vao_id,
  v.linha_id,
  c.cenario_id,
  v.codigo_vao,
  rv.classe_risco_clearance,
  rv.dist_min_cabo_m,
  rv.distancia_lateral_m,
  rv.categoria_risco,
  rv.data_processamento,
  v.geom
FROM tb_vao v
JOIN tb_risco_vegetacao_vao rv ON rv.vao_id = v.vao_id
JOIN tb_cenario c ON c.cenario_id = rv.cenario_id;

CREATE OR REPLACE VIEW vw_risco_queda_mapa AS
SELECT
  rq.risco_queda_id,
  rq.linha_id,
  rq.vao_id,
  rq.arvore_id,
  rq.classe_risco_queda,
  rq.altura_arvore_m,
  rq.dist_lateral_projecao_m,
  rq.alcance_ate_condutor_m,
  ev.geom
FROM tb_risco_queda_lateral rq
LEFT JOIN tb_elemento_vegetacao ev ON ev.arvore_id = rq.arvore_id;

CREATE OR REPLACE VIEW vw_tratamento_mapa AS
SELECT
  t.tratamento_id,
  t.linha_id,
  t.cenario_id,
  t.tipo_servico,
  t.data_execucao,
  t.origem,
  t.geom
FROM tb_tratamento_vegetacao t;
