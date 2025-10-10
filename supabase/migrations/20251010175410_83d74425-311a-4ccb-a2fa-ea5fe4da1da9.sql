-- Fix search_path for custom functions to prevent security issues
-- This addresses the "Function Search Path Mutable" warning

-- Update find_concessao function with fixed search_path
CREATE OR REPLACE FUNCTION public.find_concessao(p_lon double precision, p_lat double precision)
RETURNS TABLE(nome character varying)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT c.nome
  FROM concessoes_geo c
  WHERE ST_Contains(c.geometry, ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326))
  LIMIT 1;
END;
$function$;

-- Update find_nearest_linha function with fixed search_path
CREATE OR REPLACE FUNCTION public.find_nearest_linha(p_lon double precision, p_lat double precision)
RETURNS TABLE(id integer, codigo character varying, distancia_m numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;