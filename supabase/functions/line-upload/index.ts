import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LineUploadRequest {
  line_code: string;
  name?: string;
  kml_data?: string;  // KML content as string
  file_url?: string;  // Or URL to KML file in storage
  x_left: number;     // Left buffer in meters
  x_right: number;    // Right buffer in meters
  tenant_id?: string; // Optional, will be inferred if user has single tenant
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT and get user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Parse request body
    const body: LineUploadRequest = await req.json();

    // Validate tenant_id using security definer function
    const { data: validatedTenant, error: tenantError } = await supabase.rpc(
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
