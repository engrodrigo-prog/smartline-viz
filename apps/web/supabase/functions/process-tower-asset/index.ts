import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TowerUploadSchema = z.object({
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
    const body = TowerUploadSchema.parse(rawBody);

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
          error: tenantError?.message || 'Invalid tenant access',
          hint: 'If you belong to multiple tenants, please specify tenant_id'
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
    const towers: any[] = [];

    // Parse CSV or KML
    if (normalizedPath.endsWith('.csv')) {
      const lines = fileContent.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length < headers.length) continue;

        const row: any = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx]?.trim();
        });

        if (row.latitude && row.longitude) {
          towers.push({
            tower_id: row.tower_id || row.id || `TWR-${i}`,
            structure_type: row.structure_type || row.tipo,
            altitude_m: parseFloat(row.altitude_m || row.altitude || 0),
            cota_m: parseFloat(row.cota_m || row.cota || 0),
            geom: `SRID=4674;POINT(${row.longitude} ${row.latitude})`,
            meta: {
              imported_from: 'csv',
              original_data: row
            }
          });
        }
      }
    } else if (normalizedPath.endsWith('.kml') || normalizedPath.endsWith('.kmz')) {
      // Simple KML parsing for Placemarks with Point geometry
      const placemarkRegex = /<Placemark>[\s\S]*?<\/Placemark>/g;
      const placemarks = fileContent.match(placemarkRegex) || [];

      for (const placemark of placemarks) {
        const nameMatch = placemark.match(/<name>(.*?)<\/name>/);
        const coordMatch = placemark.match(/<Point>[\s\S]*?<coordinates>(.*?)<\/coordinates>/);
        
        if (coordMatch) {
          const [lon, lat, alt] = coordMatch[1].trim().split(',').map(Number);
          towers.push({
            tower_id: nameMatch?.[1] || `TWR-${towers.length + 1}`,
            structure_type: 'imported',
            altitude_m: alt || 0,
            cota_m: 0,
            geom: `SRID=4674;POINT(${lon} ${lat})`,
            meta: {
              imported_from: 'kml',
              name: nameMatch?.[1]
            }
          });
        }
      }
    }

    if (towers.length === 0) {
      throw new Error('No valid tower data found in file');
    }

    // Insert towers
    const towersToInsert = towers.map(t => ({
      tenant_id,
      line_code: body.line_code,
      ...t
    }));

    const { data: insertedTowers, error: insertError } = await supabase
      .from('tower_asset')
      .insert(towersToInsert)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Failed to insert tower data');
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: insertedTowers,
        message: `${towers.length} towers imported successfully`
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
