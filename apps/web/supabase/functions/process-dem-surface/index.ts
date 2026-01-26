import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEMUploadSchema = z.object({
  file_path: z.string().min(1),
  line_code: z.string().trim().min(1).max(50).regex(/^[A-Za-z0-9 _-]+$/),
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

    // Validate file ownership
    const normalizedPath = body.file_path.replace(/\.\.\//g, '');
    if (!normalizedPath.startsWith(`${user.id}/`)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized file access' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
