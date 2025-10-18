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

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const style = formData.get('style') ? JSON.parse(formData.get('style') as string) : {};
    const permanent = formData.get('permanent') === 'true';
    
    if (!file || !name) {
      return new Response(
        JSON.stringify({ error: 'File and name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: 'File size exceeds 50MB limit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Upload to storage: layers/custom/user_{uuid}/filename
    const filePath = `custom/user_${user.id}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('layers')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('layers')
      .getPublicUrl(filePath);

    // Detect layer type from file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    let layerType = 'polygon';
    if (extension === 'geojson' || extension === 'json') {
      // Could be any type, default to polygon
      layerType = 'polygon';
    } else if (extension === 'tif' || extension === 'tiff') {
      layerType = 'raster';
    }

    // Insert into custom_layers table
    const { data: layerData, error: dbError } = await supabase
      .from('custom_layers')
      .insert({
        user_id: user.id,
        name,
        file_url: urlData.publicUrl,
        style_json: style,
        permanent,
        layer_type: layerType,
        metadata: {
          original_filename: file.name,
          file_size: file.size,
          uploaded_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: `Database error: ${dbError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log telemetry
    await supabase.from('telemetry_events').insert({
      user_id: user.id,
      event_type: 'layer_upload',
      event_data: {
        layer_name: name,
        file_type: extension,
        file_size: file.size
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        layer: layerData,
        message: `Camada "${name}" carregada com sucesso!`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in custom-layer-upload:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
