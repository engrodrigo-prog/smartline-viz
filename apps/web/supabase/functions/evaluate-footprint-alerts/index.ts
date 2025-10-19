import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FootprintFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  properties: {
    name: string;
    area_ha: number;
    nivel_risco: string;
    description: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: authHeader ? { Authorization: authHeader } : {},
        },
      }
    );

    const { footprints, concessao } = await req.json();

    if (!footprints?.features || !Array.isArray(footprints.features)) {
      throw new Error('Invalid footprints data');
    }

    console.log(`Evaluating ${footprints.features.length} footprints for alerts...`);

    let alertasCriados = 0;
    let criticos = 0;
    let altos = 0;
    let medios = 0;
    const maxDistance = 5000; // 5km

    for (const feature of footprints.features as FootprintFeature[]) {
      try {
        const coords = feature.geometry.coordinates[0];
        const polygonWKT = `POLYGON((${coords.map(c => `${c[0]} ${c[1]}`).join(',')}))`;
        const area_ha = feature.properties.area_ha || 0;
        const nivel_risco_footprint = feature.properties.nivel_risco || 'medio';

        // Verificar interseção ou proximidade com linhas de transmissão
        const { data: linhasProximas, error: linhasError } = await supabase.rpc('find_nearby_lines', {
          footprint_wkt: polygonWKT,
          max_distance_m: maxDistance
        });

        if (linhasError) {
          console.error('Error finding nearby lines:', linhasError);
          continue;
        }

        if (!linhasProximas || linhasProximas.length === 0) {
          console.log(`No lines found near footprint ${feature.properties.name}`);
          continue;
        }

        // Para cada linha próxima, criar alerta
        for (const linha of linhasProximas) {
          const distancia_m = linha.distancia_m || 0;
          
          // Determinar zona de alarme baseado na distância
          let zona_alarme = 'observacao';
          let nivel_alerta = 'baixo';
          
          if (distancia_m < 500) {
            zona_alarme = 'critica';
            nivel_alerta = 'critico';
            criticos++;
          } else if (distancia_m < 1500) {
            zona_alarme = 'acompanhamento';
            nivel_alerta = 'alto';
            altos++;
          } else {
            zona_alarme = 'observacao';
            nivel_alerta = 'medio';
            medios++;
          }

          // Buscar estruturas ameaçadas (torres/postes dentro de 500m do footprint)
          const { data: estruturas } = await supabase.rpc('find_structures_near_footprint', {
            footprint_wkt: polygonWKT,
            max_distance_m: 500
          });

          // Primeiro, salvar o footprint na tabela queimadas_footprints
          const { data: footprintSalvo, error: footprintError } = await supabase
            .from('queimadas_footprints')
            .upsert({
              geometry: polygonWKT,
              area_ha,
              nivel_risco: nivel_risco_footprint,
              concessao: linha.concessao || concessao,
              data_deteccao: new Date().toISOString(),
              satelite: 'VIIRS',
              confidence: 85,
              properties: {
                name: feature.properties.name,
                description: feature.properties.description,
                fonte: 'FIRMS',
                linha_codigo: linha.codigo,
                distancia_m
              }
            }, {
              onConflict: 'geometry',
              ignoreDuplicates: false
            })
            .select()
            .single();

          if (footprintError) {
            console.error('Error saving footprint:', footprintError);
            continue;
          }

          // Criar alerta relacionado ao footprint
          const { error: alertaError } = await supabase
            .from('alertas_queimadas')
            .insert({
              tipo_alerta: 'area_queimada',
              nivel_alerta,
              footprint_id: footprintSalvo.id,
              linha_codigo: linha.codigo,
              concessao: linha.concessao || concessao,
              regiao: linha.regiao,
              distancia_m,
              area_ameacada_ha: area_ha,
              estrutura_codigo: estruturas?.length > 0 ? estruturas[0].codigo : null,
              status: 'ativo',
              metadata: {
                zona_alarme,
                geometria_footprint: polygonWKT,
                satelite: 'VIIRS',
                fonte: 'FIRMS',
                name: feature.properties.name,
                estruturas_ameacadas: estruturas?.map((e: any) => ({
                  codigo: e.codigo,
                  tipo: e.tipo,
                  distancia_m: e.distancia_m
                })) || [],
                linha_nome: linha.nome
              }
            });

          if (alertaError) {
            console.error('Error creating alert:', alertaError);
            continue;
          }

          alertasCriados++;
        }
      } catch (featureError) {
        console.error('Error processing feature:', featureError);
      }
    }

    const resultado = {
      success: true,
      alertas_criados: alertasCriados,
      criticos,
      altos,
      medios,
      total_footprints: footprints.features.length
    };

    console.log('Evaluation complete:', resultado);

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in evaluate-footprint-alerts:', error);
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Unknown error',
        success: false
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
