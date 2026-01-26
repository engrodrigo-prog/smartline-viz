import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TowerUploadSchema = z.object({
  file_path: z.string().min(1).optional(),
  file_name: z.string().min(1).optional(),
  kml_data: z.string().max(10_000_000).optional(), // 10MB max
  csv_data: z.string().max(10_000_000).optional(), // 10MB max
  line_code: z.string().trim().min(1).max(50).regex(/^[A-Za-z0-9 _-]+$/),
  tenant_id: z.string().uuid().optional()
}).refine((data) => !!(data.file_path || data.kml_data || data.csv_data), {
  message: 'Provide one of: file_path, kml_data, csv_data'
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: appUser } = await supabase
      .from('app_user')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    const userTenantId = appUser?.tenant_id ?? null;
    const requestedTenantId = body.tenant_id ?? null;

    const ensureAdmin = async () => {
      const isAdminByClaim =
        (user.app_metadata as Record<string, unknown> | null | undefined)?.smartline_role === 'admin';
      if (isAdminByClaim) return true;
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      return Boolean(adminRole);
    };

    if (requestedTenantId) {
      if (userTenantId && requestedTenantId !== userTenantId) {
        return new Response(
          JSON.stringify({ error: 'Invalid tenant access' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      if (!userTenantId) {
        const isAdmin = await ensureAdmin();
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: 'Invalid tenant access' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        const { data: tenantExists, error: tenantExistsError } = await supabase
          .from('tenant')
          .select('id')
          .eq('id', requestedTenantId)
          .maybeSingle();

        if (tenantExistsError) throw tenantExistsError;
        if (!tenantExists) {
          return new Response(
            JSON.stringify({ error: 'tenant_id not found', tenant_id: requestedTenantId }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }
    }

    const upsertAppUser = async (tenantId: string) => {
      const { error } = await supabase.from('app_user').upsert(
        { id: user.id, tenant_id: tenantId, email: user.email ?? null },
        { onConflict: 'id' },
      );

      if (!error) return;
      const message = (error.message ?? '').toLowerCase();
      const isUniqueViolation =
        (error as any)?.code === '23505' || message.includes('duplicate') || message.includes('unique');
      if (!isUniqueViolation) throw error;

      const { error: fallbackError } = await supabase.from('app_user').upsert(
        { id: user.id, tenant_id: tenantId, email: null },
        { onConflict: 'id' },
      );
      if (fallbackError) throw fallbackError;
    };

    let tenant_id: string | null = userTenantId ?? requestedTenantId;

    if (!tenant_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization')
        .eq('id', user.id)
        .maybeSingle();

      const organizationName =
        profile?.organization ??
        (typeof user.user_metadata?.organization === 'string' ? user.user_metadata.organization : null) ??
        (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null) ??
        user.email ??
        'PoC';

      const { data: createdTenant, error: tenantInsertError } = await supabase
        .from('tenant')
        .insert({ name: organizationName })
        .select('id')
        .single();

      if (tenantInsertError) throw tenantInsertError;
      tenant_id = createdTenant.id;
      await upsertAppUser(tenant_id);
    } else if (!userTenantId) {
      // Admin provided a tenant_id but the user had no app_user row yet.
      await upsertAppUser(tenant_id);
    }

    if (!tenant_id) {
      throw new Error('Unable to resolve tenant_id for user');
    }

    const fileNameHint = (body.file_name ?? body.file_path ?? '').toLowerCase();
    const isCsv = body.csv_data !== undefined || fileNameHint.endsWith('.csv');
    const isKml = body.kml_data !== undefined || fileNameHint.endsWith('.kml') || fileNameHint.endsWith('.kmz');

    if (!isCsv && !isKml) {
      throw new Error('Unsupported file format (expected .csv, .kml, .kmz)');
    }

    let fileContent: string;
    let uploadSource: 'inline' | 'storage' = 'inline';

    if (body.csv_data !== undefined) {
      fileContent = body.csv_data;
    } else if (body.kml_data !== undefined) {
      fileContent = body.kml_data;
    } else if (body.file_path) {
      uploadSource = 'storage';
      const normalizedPath = body.file_path.replace(/\.\.\//g, '');
      if (!normalizedPath.startsWith(`${user.id}/`)) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized file access' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('geodata-uploads')
        .download(normalizedPath);

      if (downloadError) {
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }

      fileContent = await fileData.text();
    } else {
      throw new Error('Missing file content');
    }

    const towers: any[] = [];

    // Parse CSV or KML
    if (isCsv) {
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
              upload_source: uploadSource,
              original_data: row
            }
          });
        }
      }
    } else if (isKml) {
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
              upload_source: uploadSource,
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
