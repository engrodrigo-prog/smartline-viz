import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvaluateAlertsRequest {
  change_set_ids: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { change_set_ids }: EvaluateAlertsRequest = await req.json();

    console.log('Evaluating alerts for', change_set_ids.length, 'change sets');

    const alerts = [];

    for (const cs_id of change_set_ids) {
      const { data: changeSet, error } = await supabase
        .from('change_sets')
        .select('*')
        .eq('id', cs_id)
        .single();

      if (error || !changeSet) {
        console.error('Change set not found:', cs_id);
        continue;
      }

      // REGRA 1: Vegetação - Perda > 30% no NDVI/VARI médio
      if (changeSet.context === 'vegetation_management') {
        const index_delta = changeSet.ndvi_delta || changeSet.vari_delta || 0;
        const index_t0 = changeSet.ndvi_t0_mean || changeSet.vari_t0_mean || 1;
        const loss_pct = (index_delta / index_t0) * 100;

        if (loss_pct < -30) {
          alerts.push({
            severity: loss_pct < -50 ? 'high' : 'medium',
            kind: 'vegetation',
            context: 'vegetation_management',
            change_set_id: cs_id,
            message: `Perda de ${Math.abs(loss_pct).toFixed(1)}% na vegetação detectada`,
            description: `Mudança de índice de ${index_t0.toFixed(2)} para ${(index_t0 + index_delta).toFixed(2)}. Tipo: ${changeSet.change_type}`,
            area_affected_m2: changeSet.area_m2,
            ndvi_change: index_delta,
            corridor_id: changeSet.corridor_id,
            line_code: changeSet.line_code,
            geom: changeSet.geom, // Em produção, calcular centroide
            action_json: {
              recommended_action: 'verify_mowing_compliance',
              priority: loss_pct < -50 ? 'high' : 'medium'
            }
          });
        }
      }

      // REGRA 2: Invasão de Faixa - Nova ocupação > 100m²
      if (changeSet.context === 'corridor_invasion') {
        if (changeSet.change_type === 'occupation' && changeSet.area_m2 > 100) {
          alerts.push({
            severity: changeSet.area_m2 > 500 ? 'critical' : 'high',
            kind: 'occupation',
            context: 'corridor_invasion',
            change_set_id: cs_id,
            message: `Nova ocupação irregular detectada (${changeSet.area_m2.toFixed(0)}m²)`,
            description: `Mudança de '${changeSet.class_from}' para '${changeSet.class_to}' entre ${new Date(changeSet.t0).toLocaleDateString()} e ${new Date(changeSet.t1).toLocaleDateString()}`,
            area_affected_m2: changeSet.area_m2,
            corridor_id: changeSet.corridor_id,
            line_code: changeSet.line_code,
            geom: changeSet.geom,
            action_json: {
              recommended_action: 'field_inspection_urgent',
              priority: 'critical',
              assign_to: 'legal_team'
            }
          });
        }
      }

      // REGRA 3: Desmatamento grande (qualquer contexto)
      if (changeSet.change_type === 'deforestation' && changeSet.area_m2 > 1000) {
        alerts.push({
          severity: 'high',
          kind: 'vegetation',
          context: changeSet.context,
          change_set_id: cs_id,
          message: `Desmatamento significativo detectado (${(changeSet.area_m2 / 10000).toFixed(2)} ha)`,
          area_affected_m2: changeSet.area_m2,
          corridor_id: changeSet.corridor_id,
          line_code: changeSet.line_code,
          geom: changeSet.geom,
          action_json: {
            recommended_action: 'environmental_audit',
            priority: 'high'
          }
        });
      }
    }

    // Salvar alertas
    if (alerts.length > 0) {
      const { data: createdAlerts, error: alertError } = await supabase
        .from('alerts_log')
        .insert(alerts)
        .select();

      if (alertError) throw alertError;

      console.log(`${createdAlerts.length} alertas criados`);

      return new Response(
        JSON.stringify({
          success: true,
          alerts_created: createdAlerts.length,
          alerts: createdAlerts
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: true,
          alerts_created: 0,
          message: 'Nenhum alerta gerado'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error evaluating alerts:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
