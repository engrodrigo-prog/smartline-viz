DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_job_status') THEN
    CREATE TYPE media_job_status AS ENUM ('queued', 'processing', 'done', 'error');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'anomalia_status') THEN
    CREATE TYPE anomalia_status AS ENUM ('aberta', 'em_planejamento', 'concluida', 'descartada');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS tb_media_job (
  job_id text PRIMARY KEY,
  linha_id uuid REFERENCES tb_linha(linha_id) ON DELETE SET NULL,
  cenario_id uuid REFERENCES tb_cenario(cenario_id) ON DELETE SET NULL,
  tipo_inspecao text NOT NULL,
  status media_job_status NOT NULL DEFAULT 'queued',
  input_path text,
  output_path text,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_tb_media_job_updated ON tb_media_job;
CREATE TRIGGER trg_tb_media_job_updated
BEFORE UPDATE ON tb_media_job
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_tb_media_job_linha ON tb_media_job (linha_id);
CREATE INDEX IF NOT EXISTS idx_tb_media_job_status ON tb_media_job (status);

CREATE TABLE IF NOT EXISTS tb_media_item (
  media_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL REFERENCES tb_media_job(job_id) ON DELETE CASCADE,
  linha_id uuid REFERENCES tb_linha(linha_id) ON DELETE SET NULL,
  cenario_id uuid REFERENCES tb_cenario(cenario_id) ON DELETE SET NULL,
  estrutura_id uuid REFERENCES tb_estrutura(estrutura_id) ON DELETE SET NULL,
  vao_id uuid REFERENCES tb_vao(vao_id) ON DELETE SET NULL,
  tipo_midia text NOT NULL,
  file_path text NOT NULL,
  thumb_path text,
  geom geometry(Point, 4326),
  capturado_em timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_tb_media_item_updated ON tb_media_item;
CREATE TRIGGER trg_tb_media_item_updated
BEFORE UPDATE ON tb_media_item
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_tb_media_item_job ON tb_media_item (job_id);
CREATE INDEX IF NOT EXISTS idx_tb_media_item_linha ON tb_media_item (linha_id);
CREATE INDEX IF NOT EXISTS idx_tb_media_item_estrutura ON tb_media_item (estrutura_id);
CREATE INDEX IF NOT EXISTS idx_tb_media_item_vao ON tb_media_item (vao_id);
CREATE INDEX IF NOT EXISTS idx_tb_media_item_geom ON tb_media_item USING GIST (geom);

CREATE TABLE IF NOT EXISTS tb_anomalia_eletromecanica (
  anomalia_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linha_id uuid NOT NULL REFERENCES tb_linha(linha_id) ON DELETE CASCADE,
  estrutura_id uuid REFERENCES tb_estrutura(estrutura_id) ON DELETE SET NULL,
  vao_id uuid REFERENCES tb_vao(vao_id) ON DELETE SET NULL,
  cenario_id uuid REFERENCES tb_cenario(cenario_id) ON DELETE SET NULL,
  media_id uuid REFERENCES tb_media_item(media_id) ON DELETE SET NULL,
  tipo_anomalia text NOT NULL,
  criticidade text,
  status anomalia_status NOT NULL DEFAULT 'aberta',
  origem text,
  descricao text,
  detectado_em timestamptz,
  atualizado_em timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_tb_anomalia_updated ON tb_anomalia_eletromecanica;
CREATE TRIGGER trg_tb_anomalia_updated
BEFORE UPDATE ON tb_anomalia_eletromecanica
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_tb_anomalia_linha ON tb_anomalia_eletromecanica (linha_id);
CREATE INDEX IF NOT EXISTS idx_tb_anomalia_status ON tb_anomalia_eletromecanica (status);
CREATE INDEX IF NOT EXISTS idx_tb_anomalia_media ON tb_anomalia_eletromecanica (media_id);
