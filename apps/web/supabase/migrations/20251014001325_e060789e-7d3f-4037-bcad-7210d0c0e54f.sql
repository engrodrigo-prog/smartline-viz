-- Criar tabela de configuração de zonas de alarme
CREATE TABLE IF NOT EXISTS alarm_zones_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  concessao VARCHAR,
  zona_critica_max_m INT DEFAULT 500 CHECK (zona_critica_max_m >= 100 AND zona_critica_max_m <= 10000),
  zona_acomp_max_m INT DEFAULT 1500 CHECK (zona_acomp_max_m >= 100 AND zona_acomp_max_m <= 10000),
  zona_obs_max_m INT DEFAULT 3000 CHECK (zona_obs_max_m >= 100 AND zona_obs_max_m <= 10000),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, concessao)
);

-- Ativar RLS
ALTER TABLE alarm_zones_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can read own zone configs"
ON alarm_zones_config
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own zone configs"
ON alarm_zones_config
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own zone configs"
ON alarm_zones_config
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own zone configs"
ON alarm_zones_config
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_alarm_zones_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_alarm_zones_config_timestamp
BEFORE UPDATE ON alarm_zones_config
FOR EACH ROW
EXECUTE FUNCTION update_alarm_zones_config_updated_at();

-- Comentários
COMMENT ON TABLE alarm_zones_config IS 'Configurações personalizadas de zonas de alarme para queimadas por usuário e concessão';
COMMENT ON COLUMN alarm_zones_config.zona_critica_max_m IS 'Distância máxima em metros para zona crítica (requer ação imediata)';
COMMENT ON COLUMN alarm_zones_config.zona_acomp_max_m IS 'Distância máxima em metros para zona de acompanhamento (monitoramento ativo)';
COMMENT ON COLUMN alarm_zones_config.zona_obs_max_m IS 'Distância máxima em metros para zona de observação (registro apenas)';