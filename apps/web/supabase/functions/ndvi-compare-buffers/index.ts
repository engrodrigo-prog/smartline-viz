import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { raster_t0_url, raster_t1_url, buffer_m = 25, line_geojson } = await req.json();

    if (!raster_t0_url || !raster_t1_url || !line_geojson) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Simulate NDVI calculation
    // In production, this would use GDAL/rasterio to process actual raster data
    const features = line_geojson.features || [];
    const results: any[] = [];

    for (const feature of features) {
      const coords = feature.geometry.coordinates;
      const torreId = feature.properties?.codigo || feature.properties?.name || `Torre_${Math.random().toString(36).substr(2, 9)}`;
      
      // Simulate NDVI values (in production, extract from rasters)
      const ndvi_t0 = 0.45 + Math.random() * 0.3; // 0.45-0.75
      const ndvi_t1 = 0.35 + Math.random() * 0.4; // 0.35-0.75
      const delta_ndvi = ndvi_t1 - ndvi_t0;
      
      // Calculate area changes (simplified - in production use actual pixel counts)
      const bufferAreaM2 = Math.PI * buffer_m * buffer_m; // Buffer area
      const vegetacaoLimpa = delta_ndvi < -0.1 ? Math.abs(delta_ndvi) * bufferAreaM2 : 0;
      const vegetacaoCresceu = delta_ndvi > 0.1 ? delta_ndvi * bufferAreaM2 : 0;

      // Get centroid for point geometry
      const [lon, lat] = Array.isArray(coords[0]) ? coords[0] : coords;

      // Insert into database
      const { data: statsData, error: statsError } = await supabase
        .from('ndvi_stats')
        .insert({
          torre_id: torreId,
          roi_id: 'ramal_marape',
          ndvi_t0: parseFloat(ndvi_t0.toFixed(3)),
          ndvi_t1: parseFloat(ndvi_t1.toFixed(3)),
          delta_ndvi: parseFloat(delta_ndvi.toFixed(3)),
          area_limpa_m2: parseFloat(vegetacaoLimpa.toFixed(2)),
          area_cresceu_m2: parseFloat(vegetacaoCresceu.toFixed(2)),
          geometry: `POINT(${lon} ${lat})`,
          metadata: {
            buffer_m,
            raster_t0: raster_t0_url,
            raster_t1: raster_t1_url,
            calculated_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (!statsError && statsData) {
        results.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          properties: {
            torre_id: torreId,
            ndvi_t0: parseFloat(ndvi_t0.toFixed(3)),
            ndvi_t1: parseFloat(ndvi_t1.toFixed(3)),
            delta_ndvi: parseFloat(delta_ndvi.toFixed(3)),
            area_limpa_m2: parseFloat(vegetacaoLimpa.toFixed(2)),
            area_cresceu_m2: parseFloat(vegetacaoCresceu.toFixed(2)),
            status: delta_ndvi < -0.15 ? 'crítico' : delta_ndvi < -0.05 ? 'atenção' : 'ok'
          }
        });
      }
    }

    // Log telemetry
    await supabase.from('telemetry_events').insert({
      user_id: user.id,
      event_type: 'ndvi_analysis',
      event_data: {
        torres_analyzed: results.length,
        buffer_m
      }
    });

    return new Response(
      JSON.stringify({
        type: 'FeatureCollection',
        features: results,
        metadata: {
          total_torres: results.length,
          buffer_m,
          timestamp: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ndvi-compare-buffers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
