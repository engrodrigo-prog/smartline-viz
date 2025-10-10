import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const concessao = url.searchParams.get('concessao') || 'TODAS';
    const minConf = parseInt(url.searchParams.get('min_conf') || '50');
    const satelite = url.searchParams.get('sat') || 'ALL';
    const maxKm = parseFloat(url.searchParams.get('max_km') || '1');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar queimadas das últimas 24h
    let query = supabase
      .from('queimadas')
      .select(`
        *,
        linhas_transmissao (codigo, nome, concessao)
      `)
      .gte('data_aquisicao', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .gte('confianca', minConf)
      .lte('distancia_m', maxKm * 1000)
      .order('data_aquisicao', { ascending: false });

    if (concessao !== 'TODAS') {
      query = query.eq('concessao', concessao);
    }

    if (satelite !== 'ALL') {
      query = query.like('fonte', `%${satelite}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Converter geometrias para GeoJSON
    const geojson = {
      type: 'FeatureCollection',
      features: (data || []).map((item: any) => {
        // Parse WKT geometry to lon/lat
        const match = item.geometry?.match(/POINT\(([^ ]+) ([^ ]+)\)/);
        const coords = match ? [parseFloat(match[1]), parseFloat(match[2])] : [0, 0];

        return {
          type: 'Feature',
          properties: {
            id: item.id,
            fonte: item.fonte,
            satelite: item.satelite,
            data_aquisicao: item.data_aquisicao,
            brilho: item.brilho,
            confianca: item.confianca,
            concessao: item.concessao,
            id_linha: item.id_linha,
            ramal: item.ramal,
            distancia_m: item.distancia_m,
            linha_codigo: item.linhas_transmissao?.codigo,
            linha_nome: item.linhas_transmissao?.nome
          },
          geometry: {
            type: 'Point',
            coordinates: coords
          }
        };
      })
    };

    return new Response(
      JSON.stringify(geojson),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});