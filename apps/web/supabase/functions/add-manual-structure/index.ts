import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const body = await req.json();
    const { empresa, regiao, linha_prefixo, linha_codigo, ramal, estrutura, latitude, longitude, altitude, nome_material } = body;

    // Validate coordinates
    const lat = Number(latitude);
    const lon = Number(longitude);
    const alt = Number(altitude || 0);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error('Coordenadas inválidas');
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error('Coordenadas fora dos limites válidos');
    }

    // Create structure record
    const record = {
      empresa,
      regiao,
      linha_prefixo,
      linha_codigo,
      linha_nome: `${linha_prefixo}-${linha_codigo}`,
      ramal: ramal || '',
      estrutura: estrutura || '',
      nome_material: nome_material || '',
      asset_type: 'structure',
      lat,
      lon,
      alt,
      bbox: [lon, lat, lon, lat],
      geometry: { type: 'Point', coordinates: [lon, lat, alt] },
      user_id: user.id
    };

    const { data, error } = await supabaseClient
      .from('infrastructure')
      .insert([record])
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Estrutura adicionada com sucesso',
        data 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
