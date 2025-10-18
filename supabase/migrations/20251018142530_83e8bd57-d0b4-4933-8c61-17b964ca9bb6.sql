-- Função 1: Encontrar concessão baseada em ponto geográfico
CREATE OR REPLACE FUNCTION public.find_concessao(lat NUMERIC, lon NUMERIC)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_name TEXT;
BEGIN
  SELECT nome INTO result_name
  FROM concessoes_geo
  WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(lon, lat), 4326))
  LIMIT 1;
  
  RETURN COALESCE(result_name, 'DESCONHECIDA');
END;
$$;

-- Função 2: Calcular distância até a linha mais próxima
CREATE OR REPLACE FUNCTION public.calculate_distance_to_nearest_line(lat NUMERIC, lon NUMERIC)
RETURNS TABLE(
  distancia_m NUMERIC,
  linha_id INTEGER,
  linha_codigo TEXT,
  ramal TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ST_Distance(
      geography(ST_SetSRID(ST_MakePoint(lon, lat), 4326)),
      geography(lt.geometry)
    )::NUMERIC as distancia_m,
    lt.id as linha_id,
    lt.codigo as linha_codigo,
    COALESCE(lt.nome, 'Principal') as ramal
  FROM linhas_transmissao lt
  WHERE lt.geometry IS NOT NULL
  ORDER BY ST_Distance(
    geography(ST_SetSRID(ST_MakePoint(lon, lat), 4326)),
    geography(lt.geometry)
  ) ASC
  LIMIT 1;
END;
$$;

-- Função 3: Avaliar risco de queimada
CREATE OR REPLACE FUNCTION public.avaliar_risco_queimada(
  p_confianca INTEGER,
  p_distancia_m NUMERIC,
  p_wind_speed NUMERIC DEFAULT NULL,
  p_wind_direction INTEGER DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  zona_critica_m NUMERIC := 500;
  zona_acomp_m NUMERIC := 1500;
  zona_obs_m NUMERIC := 3000;
BEGIN
  -- Risco Zero: muito longe
  IF p_distancia_m > zona_obs_m THEN
    RETURN 'risco_zero';
  END IF;

  -- Risco Crítico: perto + alta confiança
  IF p_distancia_m <= zona_critica_m AND p_confianca >= 80 THEN
    RETURN 'critico';
  END IF;

  -- Risco Alto: zona acompanhamento + alta confiança ou zona crítica + baixa confiança
  IF (p_distancia_m <= zona_acomp_m AND p_confianca >= 70) OR 
     (p_distancia_m <= zona_critica_m AND p_confianca >= 50) THEN
    RETURN 'alto';
  END IF;

  -- Risco Médio: zona observação + boa confiança
  IF p_distancia_m <= zona_obs_m AND p_confianca >= 60 THEN
    RETURN 'medio';
  END IF;

  -- Risco Baixo: qualquer outro caso dentro da zona de observação
  IF p_distancia_m <= zona_obs_m THEN
    RETURN 'baixo';
  END IF;

  RETURN 'risco_zero';
END;
$$;