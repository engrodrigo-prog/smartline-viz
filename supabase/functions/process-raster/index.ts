import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessRasterRequest {
  file_path: string;
  line_code?: string;
  corridor_id?: string;
  ts_acquired: string;
  bands?: number;
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

    const { file_path, line_code, corridor_id, ts_acquired, bands = 3 }: ProcessRasterRequest = await req.json();

    console.log('Processing raster:', { file_path, line_code, ts_acquired, bands });

    // TODO: Implementar processamento real com GDAL ou Sharp
    // Por enquanto, stub que retorna estatísticas simuladas
    
    const stats = bands >= 4 ? {
      ndvi_mean: 0.45 + Math.random() * 0.3,
      ndvi_std: 0.12 + Math.random() * 0.08,
      ndvi_p95: 0.75 + Math.random() * 0.2,
      ndvi_p05: 0.15 + Math.random() * 0.1,
      has_nir: true
    } : {
      vari_mean: 0.35 + Math.random() * 0.25,
      vari_std: 0.10 + Math.random() * 0.06,
      green_mean: 120 + Math.random() * 40,
      has_nir: false
    };

    // Simular URLs (em produção, seria upload para Storage após processamento)
    const url_cog = file_path; // URL do COG processado
    const thumbnail_url = file_path.replace('.tif', '_thumb.jpg');

    // Salvar no banco
    const { data: raster, error } = await supabase
      .from('rasters')
      .insert({
        name: file_path.split('/').pop(),
        type: bands >= 4 ? 'ndvi' : 'vari',
        src: 'local_upload',
        bands,
        crs: 'EPSG:4326',
        ts_acquired,
        url_cog,
        thumbnail_url,
        stats_json: stats,
        line_code,
        corridor_id,
      })
      .select()
      .single();

    if (error) throw error;

    console.log('Raster processed successfully:', raster.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        raster,
        message: `Raster processado com ${bands >= 4 ? 'NDVI' : 'VARI'}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing raster:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
