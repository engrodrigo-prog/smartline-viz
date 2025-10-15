-- Function to centralize queimadas GeoJSON enrichment (distância real e zona)
CREATE OR REPLACE FUNCTION public.get_queimadas_geojson(
  p_mode text DEFAULT 'live',
  p_concessao text DEFAULT 'TODAS',
  p_min_conf integer DEFAULT 50,
  p_sat text DEFAULT 'ALL',
  p_max_km numeric DEFAULT 1,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_zona_critica numeric DEFAULT 500,
  p_zona_acomp numeric DEFAULT 1500,
  p_zona_obs numeric DEFAULT 3000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_features jsonb;
BEGIN
  WITH base AS (
    SELECT q.*
    FROM queimadas q
    WHERE q.confianca >= COALESCE(p_min_conf, 0)
      AND (p_concessao = 'TODAS' OR q.concessao = p_concessao)
      AND (p_sat = 'ALL' OR q.fonte ILIKE '%' || p_sat || '%')
      AND (
        CASE
          WHEN p_mode = 'archive' THEN
            q.data_aquisicao BETWEEN COALESCE(p_start_date, q.data_aquisicao)
                                  AND COALESCE(p_end_date, q.data_aquisicao)
          ELSE
            q.data_aquisicao >= NOW() - INTERVAL '24 hours'
        END
      )
  ),
  enriched AS (
    SELECT
      b.*,
      lt.id AS linha_proxima_id,
      lt.nome AS linha_proxima_nome,
      lt.codigo AS linha_proxima_codigo,
      ST_Distance(b.geometry::geography, lt.geometry::geography) AS distancia_linha_m,
      est.codigo AS estrutura_codigo_proxima,
      ST_Distance(b.geometry::geography, est.geometry::geography) AS distancia_estrutura_m
    FROM base b
    LEFT JOIN LATERAL (
      SELECT l.id, l.nome, l.codigo, l.geometry
      FROM linhas_transmissao l
      ORDER BY b.geometry <-> l.geometry
      LIMIT 1
    ) lt ON TRUE
    LEFT JOIN LATERAL (
      SELECT e.codigo, e.geometry
      FROM estruturas e
      ORDER BY b.geometry <-> e.geometry
      LIMIT 1
    ) est ON TRUE
  ),
  limited AS (
    SELECT
      e.*,
      COALESCE(e.distancia_linha_m, e.distancia_m) AS distancia_util_m,
      CASE
        WHEN COALESCE(e.distancia_linha_m, e.distancia_m) IS NULL THEN NULL
        WHEN COALESCE(e.distancia_linha_m, e.distancia_m) <= p_zona_critica THEN 'critica'
        WHEN COALESCE(e.distancia_linha_m, e.distancia_m) <= p_zona_acomp THEN 'acompanhamento'
        WHEN COALESCE(e.distancia_linha_m, e.distancia_m) <= p_zona_obs THEN 'observacao'
        ELSE 'fora'
      END AS zona_classificacao
    FROM enriched e
    WHERE COALESCE(e.distancia_linha_m, e.distancia_m) IS NULL
       OR COALESCE(e.distancia_linha_m, e.distancia_m) <= p_max_km * 1000
  )
  SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(jsonb_agg(
      jsonb_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(limited.geometry)::jsonb,
        'properties', jsonb_strip_nulls(
          jsonb_build_object(
            'id', limited.id,
            'fonte', limited.fonte,
            'satelite', limited.satelite,
            'data_aquisicao', limited.data_aquisicao,
            'brilho', limited.brilho,
            'confianca', limited.confianca,
            'concessao', limited.concessao,
            'id_linha', COALESCE(limited.linha_proxima_id, limited.id_linha),
            'linha_nome', limited.linha_proxima_nome,
            'linha_codigo', limited.linha_proxima_codigo,
            'ramal', limited.ramal,
            'distancia_m', ROUND(COALESCE(limited.distancia_linha_m, limited.distancia_m)::numeric, 2),
            'zona', limited.zona_classificacao,
            'estrutura_codigo', limited.estrutura_codigo_proxima
          )
        )
      )
    ), '[]'::jsonb)
  ) INTO v_features
  FROM limited;

  RETURN COALESCE(v_features, jsonb_build_object('type', 'FeatureCollection', 'features', '[]'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_queimadas_geojson(
  text, text, integer, text, numeric, timestamptz, timestamptz, numeric, numeric, numeric
) TO authenticated, anon, service_role;
