import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user's JWT for RLS
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // Verify JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Parse query parameters
    const url = new URL(req.url);
    const fn = url.searchParams.get('fn'); // lines | domain | profile
    const lineCode = url.searchParams.get('line_code');
    const tenantId = url.searchParams.get('tenant_id');
    const format = url.searchParams.get('format') || 'geojson'; // geojson | wkt

    if (!fn) {
      throw new Error('Missing required parameter: fn (lines|domain|profile)');
    }

    // Validate tenant access if tenant_id provided
    let validatedTenant = tenantId;
    
    if (!tenantId) {
      // Try to infer tenant_id if user belongs to single tenant
      const { data: singleTenant } = await supabase.rpc('get_user_single_tenant', {
        _user_id: user.id
      });
      
      if (singleTenant) {
        validatedTenant = singleTenant;
      } else {
        throw new Error('tenant_id is required (user belongs to multiple tenants)');
      }
    }

    let result: any;

    switch (fn) {
      case 'lines': {
        // Get all lines for tenant (RLS automatically filters)
        let query = supabase
          .from('line_asset')
          .select('id, line_code, name, x_left, x_right, utm_zone, utm_srid, src_source, created_at, geom');

        if (lineCode) {
          query = query.eq('line_code', lineCode);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Convert to GeoJSON FeatureCollection
        result = {
          type: 'FeatureCollection',
          features: (data || []).map((line: any) => ({
            type: 'Feature',
            id: line.id,
            geometry: typeof line.geom === 'string' ? JSON.parse(line.geom) : line.geom,
            properties: {
              line_code: line.line_code,
              name: line.name,
              x_left: line.x_left,
              x_right: line.x_right,
              utm_zone: line.utm_zone,
              utm_srid: line.utm_srid,
              src_source: line.src_source,
              created_at: line.created_at
            }
          }))
        };
        break;
      }

      case 'domain': {
        // Get domain/faixa (buffer polygon) for lines
        if (!lineCode) {
          throw new Error('line_code is required for domain query');
        }

        const { data, error } = await supabase
          .from('line_asset')
          .select('id, line_code, name, domain_geom')
          .eq('line_code', lineCode);

        if (error) throw error;

        result = {
          type: 'FeatureCollection',
          features: (data || []).map((line: any) => ({
            type: 'Feature',
            id: line.id,
            geometry: typeof line.domain_geom === 'string' ? JSON.parse(line.domain_geom) : line.domain_geom,
            properties: {
              line_code: line.line_code,
              name: line.name,
              type: 'domain'
            }
          }))
        };
        break;
      }

      case 'profile': {
        // Get profile data (elevation along line)
        if (!lineCode) {
          throw new Error('line_code is required for profile query');
        }

        const { data, error } = await supabase
          .from('profile_data')
          .select('s_m, ground_z_m, conductor_z_m, meta')
          .eq('line_code', lineCode)
          .order('s_m', { ascending: true });

        if (error) throw error;

        result = {
          line_code: lineCode,
          profile_points: data.map(point => ({
            distance_m: point.s_m,
            ground_elevation_m: point.ground_z_m,
            conductor_elevation_m: point.conductor_z_m,
            clearance_m: point.conductor_z_m && point.ground_z_m 
              ? point.conductor_z_m - point.ground_z_m 
              : null,
            metadata: point.meta
          }))
        };
        break;
      }

      default:
        throw new Error(`Invalid function: ${fn}. Valid options: lines, domain, profile`);
    }

    return new Response(
      JSON.stringify(result),
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
