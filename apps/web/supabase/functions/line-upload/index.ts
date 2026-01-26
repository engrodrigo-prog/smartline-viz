import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LineUploadSchema = z.object({
  line_code: z.string().trim().min(1).max(50).regex(/^[A-Za-z0-9 _-]+$/),
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

    const parseCoordinate = (coord: string) => {
      const parts = coord.split(',').map(part => part.trim());
      const lon = Number(parts[0]);
      const lat = Number(parts[1]);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
      return [lon, lat] as [number, number];
    };

    const extractLineString = (kml: string) => {
      const coordMatch = kml.match(/<LineString>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/);
      if (!coordMatch) return null;
      const coords = coordMatch[1]
        .trim()
        .split(/\s+/)
        .map(parseCoordinate)
        .filter((coord): coord is [number, number] => !!coord);
      return coords.length >= 2 ? coords : null;
    };

    const extractPointsAsLine = (kml: string) => {
      const matches = [...kml.matchAll(/<Point>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/g)];
      const coords = matches
        .map((match) => parseCoordinate(match[1].trim()))
        .filter((coord): coord is [number, number] => !!coord);
      return coords.length >= 2 ? coords : null;
    };

    // Parse KML and extract LineString geometry
    let lineCoordinates: [number, number][] | null = null;

    if (body.kml_data) {
      lineCoordinates = extractLineString(body.kml_data) ?? extractPointsAsLine(body.kml_data);
    }

    if (!lineCoordinates) {
      throw new Error('Could not extract a valid LineString from KML');
    }

    // Convert GeoJSON to WKT for PostGIS
    const wkt = `LINESTRING(${lineCoordinates.map((c) => `${c[0]} ${c[1]}`).join(',')})`;

    // Calculate asymmetric buffer (domain/faixa) using PostGIS function
    const { data: bufferResult, error: bufferError } = await supabase.rpc('calculate_asymmetric_buffer', {
      line_geom: `SRID=4674;${wkt}`,
      left_meters: body.x_left,
      right_meters: body.x_right
    });

    if (bufferError) {
      console.error('Buffer calculation error:', bufferError);
    }

    // Determine UTM zone from line centroid
    const centerLon = lineCoordinates[Math.floor(lineCoordinates.length / 2)][0];
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
        domain_geom: bufferResult ?? null,
        utm_zone: utmZone,
        utm_srid: utmSrid,
        src_source: 'kml_upload',
        meta: {
          uploaded_by: user.id,
          uploaded_at: new Date().toISOString(),
          kml_source: true,
          buffer_error: bufferError?.message ?? null
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
    if (error instanceof z.ZodError) {
      const message = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      return new Response(
        JSON.stringify({ error: message || 'Invalid request payload', issues: error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
