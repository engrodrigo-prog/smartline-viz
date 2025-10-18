import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectChangesRequest {
  raster_t0_id: string;
  raster_t1_id: string;
  corridor_id?: string;
  threshold?: number;
  min_area_m2?: number;
  context?: 'vegetation_management' | 'corridor_invasion';
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

    const {
      raster_t0_id,
      raster_t1_id,
      corridor_id,
      threshold = 0.15,
      min_area_m2 = 50,
      context = 'vegetation_management'
    }: DetectChangesRequest = await req.json();

    console.log('Detecting changes:', { raster_t0_id, raster_t1_id, context, threshold });

    // Buscar rasters
    const { data: raster_t0, error: error_t0 } = await supabase
      .from('rasters')
      .select('*')
      .eq('id', raster_t0_id)
      .single();

    const { data: raster_t1, error: error_t1 } = await supabase
      .from('rasters')
      .select('*')
      .eq('id', raster_t1_id)
      .single();

    if (error_t0 || error_t1 || !raster_t0 || !raster_t1) {
      throw new Error('Rasters não encontrados');
    }

    // TODO: Implementar detecção real de mudanças com análise de imagens
    // Por enquanto, stub que gera mudanças simuladas
    
    const has_ndvi = raster_t0.bands >= 4 && raster_t1.bands >= 4;
    const index_name = has_ndvi ? 'ndvi' : 'vari';
    
    const t0_mean = has_ndvi ? raster_t0.stats_json.ndvi_mean : raster_t0.stats_json.vari_mean;
    const t1_mean = has_ndvi ? raster_t1.stats_json.ndvi_mean : raster_t1.stats_json.vari_mean;
    const delta = t1_mean - t0_mean;

    const changes = [];

    // Simular 2-5 mudanças detectadas
    const num_changes = Math.floor(Math.random() * 4) + 2;

    for (let i = 0; i < num_changes; i++) {
      const area_m2 = min_area_m2 + Math.random() * 500;
      const change_delta = delta + (Math.random() - 0.5) * 0.3;
      
      let change_type = 'vegetation_loss';
      let class_from = 'dense_vegetation';
      let class_to = 'sparse_vegetation';

      if (context === 'vegetation_management') {
        if (change_delta < -0.3) {
          change_type = 'mowing';
          class_to = 'bare_soil';
        } else if (change_delta < -0.15) {
          change_type = 'pruning';
          class_to = 'sparse_vegetation';
        }
      } else {
        // corridor_invasion
        if (change_delta < -0.4 && Math.random() > 0.5) {
          change_type = 'occupation';
          class_to = 'built_area';
        } else if (change_delta < -0.2) {
          change_type = 'deforestation';
          class_to = 'bare_soil';
        }
      }

      const changeData: any = {
        corridor_id,
        line_code: raster_t0.line_code,
        t0: raster_t0.ts_acquired,
        t1: raster_t1.ts_acquired,
        raster_t0_id,
        raster_t1_id,
        area_m2,
        change_type,
        context,
        class_from,
        class_to,
        confidence: 0.7 + Math.random() * 0.25,
        analysis_method: `${index_name}_diff`,
        // Geometria simulada (em produção, seria vetorização real)
        geom: JSON.stringify({
          type: 'MultiPolygon',
          coordinates: [[[[
            [-46.5 + Math.random() * 0.01, -23.5 + Math.random() * 0.01],
            [-46.5 + Math.random() * 0.01, -23.49 + Math.random() * 0.01],
            [-46.49 + Math.random() * 0.01, -23.49 + Math.random() * 0.01],
            [-46.49 + Math.random() * 0.01, -23.5 + Math.random() * 0.01],
            [-46.5 + Math.random() * 0.01, -23.5 + Math.random() * 0.01]
          ]]]]
        })
      };

      if (has_ndvi) {
        changeData.ndvi_t0_mean = t0_mean + (Math.random() - 0.5) * 0.1;
        changeData.ndvi_t1_mean = t1_mean + (Math.random() - 0.5) * 0.1;
        changeData.ndvi_delta = changeData.ndvi_t1_mean - changeData.ndvi_t0_mean;
      } else {
        changeData.vari_t0_mean = t0_mean + (Math.random() - 0.5) * 0.1;
        changeData.vari_t1_mean = t1_mean + (Math.random() - 0.5) * 0.1;
        changeData.vari_delta = changeData.vari_t1_mean - changeData.vari_t0_mean;
      }

      changes.push(changeData);
    }

    // Salvar mudanças no banco
    const { data: changeSets, error: changeError } = await supabase
      .from('change_sets')
      .insert(changes)
      .select();

    if (changeError) throw changeError;

    console.log(`${changeSets.length} mudanças detectadas`);

    return new Response(
      JSON.stringify({
        success: true,
        changes_detected: changeSets.length,
        change_sets: changeSets,
        method: `${index_name}_diff`,
        threshold_used: threshold
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error detecting changes:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
