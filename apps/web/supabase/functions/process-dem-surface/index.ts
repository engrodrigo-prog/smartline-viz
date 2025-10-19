import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEMUploadSchema = z.object({
  file_path: z.string().min(1),
  line_code: z.string().trim().min(1).max(50).regex(/^[A-Za-z0-9_-]+$/),
  gsd_cm: z.number().int().min(1).max(1000),
  bands: z.number().int().optional().default(1),
  tenant_id: z.string().uuid().optional()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    const rawBody = await req.json();
    const body = DEMUploadSchema.parse(rawBody);

    // Validate tenant access
    const { data: validatedTenant, error: tenantError } = await anonClient.rpc(
      'validate_tenant_access',
      {
        _user_id: user.id,
        _requested_tenant_id: body.tenant_id || null
      }
    );

    if (tenantError || !validatedTenant) {
      return new Response(
        JSON.stringify({ 
          error: tenantError?.message || 'Invalid tenant access'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenant_id = validatedTenant;

    // Validate file ownership
    const normalizedPath = body.file_path.replace(/\.\.\//g, '');
    if (!normalizedPath.startsWith(`${user.id}/`)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized file access' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get file URL from storage
    const { data: urlData } = await supabase.storage
      .from('geodata-uploads')
      .createSignedUrl(normalizedPath, 31536000); // 1 year

    if (!urlData) {
      throw new Error('Failed to create file URL');
    }

    // Insert DEM record
    const { data: demRecord, error: insertError } = await supabase
      .from('dem_surface')
      .insert({
        tenant_id,
        line_code: body.line_code,
        file_url: urlData.signedUrl,
        gsd_cm: body.gsd_cm,
        bands: body.bands,
        meta: {
          uploaded_by: user.id,
          uploaded_at: new Date().toISOString(),
          original_filename: normalizedPath.split('/').pop()
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Failed to insert DEM record');
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: demRecord,
        message: 'DEM surface imported successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
