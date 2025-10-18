-- Função para encontrar linhas próximas de um footprint
CREATE OR REPLACE FUNCTION public.find_nearby_lines(
  footprint_wkt TEXT,
  max_distance_m NUMERIC DEFAULT 5000
)
RETURNS TABLE (
  codigo VARCHAR,
  nome VARCHAR,
  concessao VARCHAR,
  regiao CHAR,
  distancia_m NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.codigo,
    l.nome,
    l.concessao,
    l.regiao,
    ST_Distance(
      ST_Transform(l.geometry::geometry, 3857),
      ST_Transform(ST_GeomFromText(footprint_wkt, 4326), 3857)
    ) AS distancia_m
  FROM linhas_transmissao l
  WHERE ST_DWithin(
    ST_Transform(l.geometry::geometry, 3857),
    ST_Transform(ST_GeomFromText(footprint_wkt, 4326), 3857),
    max_distance_m
  )
  ORDER BY distancia_m ASC
  LIMIT 5;
END;
$$;

-- Função para encontrar estruturas próximas de um footprint
CREATE OR REPLACE FUNCTION public.find_structures_near_footprint(
  footprint_wkt TEXT,
  max_distance_m NUMERIC DEFAULT 500
)
RETURNS TABLE (
  codigo VARCHAR,
  tipo VARCHAR,
  distancia_m NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.codigo,
    e.tipo,
    ST_Distance(
      ST_Transform(e.geometry::geometry, 3857),
      ST_Transform(ST_GeomFromText(footprint_wkt, 4326), 3857)
    ) AS distancia_m
  FROM estruturas e
  WHERE ST_DWithin(
    ST_Transform(e.geometry::geometry, 3857),
    ST_Transform(ST_GeomFromText(footprint_wkt, 4326), 3857),
    max_distance_m
  )
  ORDER BY distancia_m ASC
  LIMIT 10;
END;
$$;