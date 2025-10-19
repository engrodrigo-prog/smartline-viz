import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SpanUploadSchema = z.object({
  file_path: z.string().min(1),
  line_code: z.string().trim().min(1).max(50).regex(/^[A-Za-z0-9_-]+$/),
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
    const body = SpanUploadSchema.parse(rawBody);

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

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('geodata-uploads')
      .download(normalizedPath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    const fileContent = await fileData.text();
    const spans: any[] = [];

    // Parse CSV
    const lines = fileContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < headers.length) continue;

      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim();
      });

      if (row.tower_from && row.tower_to) {
        spans.push({
          span_id: row.span_id || `${row.tower_from}-${row.tower_to}`,
          tower_from: row.tower_from,
          tower_to: row.tower_to,
          span_length_m: parseFloat(row.span_length_m || row.length || 0),
          sag_m: parseFloat(row.sag_m || row.sag || 0),
          min_clearance_m: parseFloat(row.min_clearance_m || row.clearance || 0),
          angle_deg: parseFloat(row.angle_deg || row.angle || 0),
          meta: {
            imported_from: 'csv',
            original_data: row
          }
        });
      }
    }

    if (spans.length === 0) {
      throw new Error('No valid span data found in CSV');
    }

    // Insert spans
    const spansToInsert = spans.map(s => ({
      tenant_id,
      line_code: body.line_code,
      ...s
    }));

    const { data: insertedSpans, error: insertError } = await supabase
      .from('span_analysis')
      .insert(spansToInsert)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Failed to insert span data');
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: insertedSpans,
        message: `${spans.length} spans imported successfully`
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
