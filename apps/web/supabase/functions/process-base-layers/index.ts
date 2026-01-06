import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = normalizeBaseUrl(Deno.env.get('SUPABASE_URL') ?? '');
    if (!supabaseUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE_URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if base layers already exist
    const { data: existing } = await supabase
      .from('base_layers_catalog')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ message: 'Base layers already initialized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize base layers catalog
    const baseLayers = [
      {
        name: 'Brasil - Estados (UF)',
        layer_type: 'uf',
        source: 'IBGE',
        file_url: `${supabaseUrl}/storage/v1/object/public/layers/base/BR_UF_2024.geojson`,
        style_json: {
          type: 'line',
          paint: {
            'line-color': '#666666',
            'line-width': 1.5,
            'line-opacity': 0.7
          }
        },
        bbox: [-73.9, -33.7, -34.8, 5.3],
        active: true
      },
      {
        name: 'São Paulo - Municípios',
        layer_type: 'municipio',
        source: 'IBGE',
        file_url: `${supabaseUrl}/storage/v1/object/public/layers/base/SP_Municipios_2024.geojson`,
        style_json: {
          type: 'line',
          paint: {
            'line-color': '#888888',
            'line-width': 1,
            'line-opacity': 0.5
          }
        },
        bbox: [-53.1, -25.3, -44.2, -19.8],
        active: true
      },
      {
        name: 'Rio Grande do Sul - Municípios',
        layer_type: 'municipio',
        source: 'IBGE',
        file_url: `${supabaseUrl}/storage/v1/object/public/layers/base/RS_Municipios_2024.geojson`,
        style_json: {
          type: 'line',
          paint: {
            'line-color': '#888888',
            'line-width': 1,
            'line-opacity': 0.5
          }
        },
        bbox: [-57.6, -33.7, -49.7, -27.1],
        active: true
      },
      {
        name: 'Ramal Marapé',
        layer_type: 'ramal',
        source: 'Custom',
        file_url: `${supabaseUrl}/storage/v1/object/public/layers/ramais/Ramal_Marape.geojson`,
        style_json: {
          line: {
            'line-color': '#FF3333',
            'line-width': 3,
            'line-opacity': 0.9
          },
          point: {
            'circle-color': '#FFA500',
            'circle-radius': 6,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FFFFFF'
          }
        },
        bbox: [-46.4, -24.0, -46.3, -23.9],
        active: true
      }
    ];

    const { data: inserted, error } = await supabase
      .from('base_layers_catalog')
      .insert(baseLayers)
      .select();

    if (error) {
      console.error('Error inserting base layers:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${inserted.length} base layers initialized`,
        layers: inserted
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-base-layers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
