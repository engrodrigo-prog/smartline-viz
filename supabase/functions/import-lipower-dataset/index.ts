import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { parse } from "https://deno.land/std@0.200.0/csv/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LiPowerlineDatasetRequest {
  dataset_name: string;
  line_code: string;
  line_kml_url: string;        // URL to Line.kml in storage
  tower_csv_url: string;        // URL to TowerAccount.csv in storage
  span_csv_url: string;         // URL to SpanAnalysis.csv in storage
  dem_tif_url?: string;         // Optional: URL to DEM.tif in storage
  x_left: number;               // Left buffer in meters
  x_right: number;              // Right buffer in meters
  tenant_id?: string;           // Optional, will be inferred if user has single tenant
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
    const body: LiPowerlineDatasetRequest = await req.json();

    // Validate tenant_id
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

    // Create dataset catalog entry
    const { data: dataset, error: datasetError } = await supabase
      .from('dataset_catalog')
      .insert({
        tenant_id,
        line_code: body.line_code,
        name: body.dataset_name,
        source: 'LiPowerline',
        upload_user: user.id,
        status: 'processing',
        files: {
          line_kml: body.line_kml_url,
          tower_csv: body.tower_csv_url,
          span_csv: body.span_csv_url,
          dem_tif: body.dem_tif_url
        },
        meta: {
          x_left: body.x_left,
          x_right: body.x_right
        }
      })
      .select()
      .single();

    if (datasetError) {
      throw new Error('Failed to create dataset entry');
    }

    // 1. Process Line.kml
    console.log('Processing Line.kml...');
    const lineKmlResponse = await fetch(body.line_kml_url);
    const lineKmlText = await lineKmlResponse.text();
    
    const coordMatch = lineKmlText.match(/<LineString>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/);
    if (!coordMatch) {
      throw new Error('Could not extract LineString from Line.kml');
    }

    const coords = coordMatch[1].trim().split(/\s+/).map(coord => {
      const [lon, lat] = coord.split(',').map(Number);
      return [lon, lat];
    });

    const wkt = `LINESTRING(${coords.map(c => `${c[0]} ${c[1]}`).join(',')})`;

    // Calculate buffer
    const { data: bufferResult } = await supabase.rpc('calculate_asymmetric_buffer', {
      line_geom: `SRID=4674;${wkt}`,
      left_meters: body.x_left,
      right_meters: body.x_right
    });

    const centerLon = coords[Math.floor(coords.length / 2)][0];
    const utmZone = Math.floor((centerLon + 180) / 6) + 1;
    const utmSrid = 31980 + utmZone;

    // Insert line_asset
    const { data: lineAsset } = await supabase
      .from('line_asset')
      .insert({
        tenant_id,
        line_code: body.line_code,
        name: body.dataset_name,
        x_left: body.x_left,
        x_right: body.x_right,
        geom: `SRID=4674;${wkt}`,
        domain_geom: bufferResult,
        utm_zone: utmZone,
        utm_srid: utmSrid,
        src_source: 'LiPowerline',
        meta: { dataset_id: dataset.id }
      })
      .select()
      .single();

    // 2. Process TowerAccount.csv
    console.log('Processing TowerAccount.csv...');
    const towerCsvResponse = await fetch(body.tower_csv_url);
    const towerCsvText = await towerCsvResponse.text();
    const towerData = parse(towerCsvText, { skipFirstRow: true });

    const towers = towerData.map((row: any) => ({
      tenant_id,
      line_code: body.line_code,
      tower_id: row.TowerID || row.tower_id,
      altitude_m: parseFloat(row.Altitude || row.altitude || 0),
      cota_m: parseFloat(row.Cota || row.cota || 0),
      structure_type: row.StructureType || row.structure_type,
      geom: `SRID=4674;POINT(${parseFloat(row.Longitude || row.lon)} ${parseFloat(row.Latitude || row.lat)})`,
      meta: { dataset_id: dataset.id, raw_data: row }
    }));

    await supabase.from('tower_asset').insert(towers);

    // 3. Process SpanAnalysis.csv
    console.log('Processing SpanAnalysis.csv...');
    const spanCsvResponse = await fetch(body.span_csv_url);
    const spanCsvText = await spanCsvResponse.text();
    const spanData = parse(spanCsvText, { skipFirstRow: true });

    const spans = spanData.map((row: any) => ({
      tenant_id,
      line_code: body.line_code,
      span_id: row.SpanID || row.span_id,
      tower_from: row.TowerFrom || row.tower_from,
      tower_to: row.TowerTo || row.tower_to,
      span_length_m: parseFloat(row.SpanLength || row.span_length || 0),
      sag_m: parseFloat(row.Sag || row.sag || 0),
      angle_deg: parseFloat(row.Angle || row.angle || 0),
      min_clearance_m: parseFloat(row.MinClearance || row.min_clearance || 0),
      meta: { dataset_id: dataset.id, raw_data: row }
    }));

    await supabase.from('span_analysis').insert(spans);

    // 4. Process DEM.tif (optional)
    if (body.dem_tif_url) {
      console.log('Processing DEM.tif...');
      await supabase.from('dem_surface').insert({
        tenant_id,
        line_code: body.line_code,
        file_url: body.dem_tif_url,
        meta: { dataset_id: dataset.id }
      });
    }

    // Update dataset status
    await supabase
      .from('dataset_catalog')
      .update({ 
        status: 'completed',
        meta: {
          ...dataset.meta,
          towers_count: towers.length,
          spans_count: spans.length,
          processed_at: new Date().toISOString()
        }
      })
      .eq('id', dataset.id);

    return new Response(
      JSON.stringify({
        success: true,
        dataset_id: dataset.id,
        stats: {
          line_asset_id: lineAsset?.id,
          towers_imported: towers.length,
          spans_imported: spans.length,
          dem_imported: !!body.dem_tif_url
        },
        message: 'LiPowerline dataset imported successfully'
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
