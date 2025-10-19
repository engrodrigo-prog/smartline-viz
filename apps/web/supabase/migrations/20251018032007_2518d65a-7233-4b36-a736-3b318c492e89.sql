-- Adicionar colunas de vento e risco à tabela queimadas
ALTER TABLE public.queimadas 
ADD COLUMN IF NOT EXISTS wind_direction INTEGER, -- 0-360 graus (0 = Norte)
ADD COLUMN IF NOT EXISTS wind_speed NUMERIC(5,2), -- km/h
ADD COLUMN IF NOT EXISTS nivel_risco TEXT; -- risco calculado

-- Criar função PostGIS para calcular distância real à linha mais próxima
CREATE OR REPLACE FUNCTION public.calculate_distance_to_nearest_line(
  p_lon DOUBLE PRECISION,
  p_lat DOUBLE PRECISION
) RETURNS TABLE (
  linha_id INTEGER,
  linha_codigo TEXT,
  linha_nome TEXT,
  distancia_m NUMERIC,
  ramal TEXT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.codigo::TEXT,
    l.nome::TEXT,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
      l.geometry
    ) as distancia_m,
    l.codigo::TEXT as ramal
  FROM linhas_transmissao l
  WHERE l.geometry IS NOT NULL
  ORDER BY distancia_m ASC
  LIMIT 1;
END;
$$;

-- Função para avaliar risco de queimada baseado em distância e vento
CREATE OR REPLACE FUNCTION public.avaliar_risco_queimada(
  p_distancia_m NUMERIC,
  p_wind_direction INTEGER,
  p_bearing_to_line INTEGER
) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_diff_angle INTEGER;
BEGIN
  -- REGRA 1: Distância > 1.5km = RISCO ZERO (não mostrar)
  IF p_distancia_m > 1500 THEN
    RETURN 'risco_zero';
  END IF;
  
  -- Calcular diferença angular entre vento e direção da linha
  IF p_wind_direction IS NOT NULL AND p_bearing_to_line IS NOT NULL THEN
    v_diff_angle := ABS(p_wind_direction - p_bearing_to_line);
    IF v_diff_angle > 180 THEN
      v_diff_angle := 360 - v_diff_angle;
    END IF;
  ELSE
    -- Se não temos dados de vento, usar apenas distância
    v_diff_angle := 90; -- Neutro
  END IF;
  
  -- REGRA 2: Distância < 1km + vento na direção da linha (±45°)
  IF p_distancia_m < 1000 AND v_diff_angle <= 45 THEN
    RETURN 'risco_critico_vento';
  END IF;
  
  -- REGRA 3: Distância < 1km sem vento desfavorável
  IF p_distancia_m < 1000 THEN
    RETURN 'risco_alto';
  END IF;
  
  -- REGRA 4: Entre 1km e 1.5km
  IF p_distancia_m BETWEEN 1000 AND 1500 THEN
    IF v_diff_angle <= 45 THEN
      RETURN 'risco_medio_vento';
    ELSE
      RETURN 'risco_baixo';
    END IF;
  END IF;
  
  RETURN 'risco_desconhecido';
END;
$$;

-- Criar índice para melhorar performance de queries geoespaciais
CREATE INDEX IF NOT EXISTS idx_queimadas_nivel_risco ON public.queimadas(nivel_risco);
CREATE INDEX IF NOT EXISTS idx_queimadas_wind ON public.queimadas(wind_direction, wind_speed);