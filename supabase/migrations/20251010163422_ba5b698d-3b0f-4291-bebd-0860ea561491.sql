-- Criar funções de geolocalização para queimadas

-- Função 1: Encontrar concessão por coordenadas
CREATE OR REPLACE FUNCTION find_concessao(p_lon double precision, p_lat double precision)
RETURNS TABLE(nome varchar) AS $$
BEGIN
  RETURN QUERY
  SELECT c.nome
  FROM concessoes_geo c
  WHERE ST_Contains(c.geometry, ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Função 2: Encontrar linha mais próxima com distância
CREATE OR REPLACE FUNCTION find_nearest_linha(p_lon double precision, p_lat double precision)
RETURNS TABLE(id integer, codigo varchar, distancia_m numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.codigo,
    ST_Distance(
      l.geometry::geography,
      ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
    ) as distancia_m
  FROM linhas_transmissao l
  ORDER BY l.geometry <-> ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Criar índices GIST para performance de consultas espaciais
CREATE INDEX IF NOT EXISTS idx_concessoes_geo_geom ON concessoes_geo USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_linhas_geo ON linhas_transmissao USING GIST(geometry);