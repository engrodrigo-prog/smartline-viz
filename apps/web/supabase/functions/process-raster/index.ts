import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ProcessRasterSchema = z.object({
  file_path: z.string().trim().max(500).regex(/^[a-zA-Z0-9/_.-]+$/),
  line_code: z.string().trim().max(50).optional(),
  corridor_id: z.string().uuid().optional(),
  ts_acquired: z.string().datetime(),
  bands: z.number().int().min(3).max(10).optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT and get user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Parse and validate request body
    const rawBody = await req.json();
    const { file_path, line_code, corridor_id, ts_acquired, bands = 3 } = ProcessRasterSchema.parse(rawBody);

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
