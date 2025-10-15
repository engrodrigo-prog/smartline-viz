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
    const zonaCritica = parseFloat(url.searchParams.get('zona_critica') || '500');
    const zonaAcomp = parseFloat(url.searchParams.get('zona_acomp') || '1500');
    const zonaObs = parseFloat(url.searchParams.get('zona_obs') || '3000');

    console.log('Queimadas live request:', {
      concessao,
      minConf,
      satelite,
      maxKm,
      zonaCritica,
      zonaAcomp,
      zonaObs,
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase.rpc('get_queimadas_geojson', {
      p_mode: 'live',
      p_concessao: concessao,
      p_min_conf: minConf,
      p_sat: satelite,
      p_max_km: maxKm,
      p_zona_critica: zonaCritica,
      p_zona_acomp: zonaAcomp,
      p_zona_obs: zonaObs,
    });

    if (error) throw error;

    const geojson = data ?? { type: 'FeatureCollection', features: [] };

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
