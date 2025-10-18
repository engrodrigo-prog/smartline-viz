import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LineUploadSchema = z.object({
  line_code: z.string().trim().min(1).max(50).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().max(200).optional(),
  kml_data: z.string().max(10_000_000).optional(), // 10MB max
  file_url: z.string().url().optional(),
  x_left: z.number().min(0).max(10000),
  x_right: z.number().min(0).max(10000),
  tenant_id: z.string().uuid().optional()
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify JWT and get user with anon client
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

    // Parse and validate request body
    const rawBody = await req.json();
    const body = LineUploadSchema.parse(rawBody);

    // Validate tenant access BEFORE using service role
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
          error: tenantError?.message || 'Invalid tenant access',
          hint: 'If you belong to multiple tenants, please specify tenant_id'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenant_id = validatedTenant;

    // NOW safe to use service role with validated tenant
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse KML and extract LineString geometry
    let lineGeometry: any = null;

    if (body.kml_data) {
      // Simple KML parsing (extract coordinates from LineString)
      const coordMatch = body.kml_data.match(/<LineString>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/);
      
      if (coordMatch) {
        const coords = coordMatch[1].trim().split(/\s+/).map(coord => {
          const [lon, lat] = coord.split(',').map(Number);
          return [lon, lat];
        });

        lineGeometry = {
          type: 'LineString',
          coordinates: coords
        };
      }
    }

    if (!lineGeometry) {
      throw new Error('Could not extract LineString geometry from KML');
    }

    // Convert GeoJSON to WKT for PostGIS
    const wkt = `LINESTRING(${lineGeometry.coordinates.map((c: number[]) => `${c[0]} ${c[1]}`).join(',')})`;

    // Calculate asymmetric buffer (domain/faixa) using PostGIS function
    const { data: bufferResult, error: bufferError } = await supabase.rpc('calculate_asymmetric_buffer', {
      line_geom: `SRID=4674;${wkt}`,
      left_meters: body.x_left,
      right_meters: body.x_right
    });

    if (bufferError) {
      console.error('Buffer calculation error:', bufferError);
      throw new Error('Failed to calculate buffer zone');
    }

    // Determine UTM zone from line centroid
    const centerLon = lineGeometry.coordinates[Math.floor(lineGeometry.coordinates.length / 2)][0];
    const utmZone = Math.floor((centerLon + 180) / 6) + 1;
    const utmSrid = 31980 + utmZone; // SIRGAS 2000 UTM South zones

    // Insert line_asset record
    const { data: lineAsset, error: insertError } = await supabase
      .from('line_asset')
      .insert({
        tenant_id,
        line_code: body.line_code,
        name: body.name || body.line_code,
        x_left: body.x_left,
        x_right: body.x_right,
        geom: `SRID=4674;${wkt}`,
        domain_geom: bufferResult,
        utm_zone: utmZone,
        utm_srid: utmSrid,
        src_source: 'kml_upload',
        meta: {
          uploaded_by: user.id,
          uploaded_at: new Date().toISOString(),
          kml_source: true
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Failed to insert line asset');
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: lineAsset,
        message: 'Line uploaded successfully'
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
