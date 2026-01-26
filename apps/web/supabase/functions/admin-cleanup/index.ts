import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CleanupSchema = z.object({
  keep_line_code: z.string().trim().min(1).max(50),
  wipe_legacy: z.boolean().optional().default(true),
  dry_run: z.boolean().optional().default(false),
});

type CleanupSummary = {
  keep_line_code: string;
  keep_tenant_id: string;
  dry_run: boolean;
  tables: Record<
    string,
    { will_delete: number; deleted: number; notes?: string | null }
  >;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: auth, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );

    const user = auth?.user ?? null;
    if (authError || !user) {
      throw new Error("Invalid authentication token");
    }

    const rawBody = await req.json();
    const body = CleanupSchema.parse(rawBody);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const isAdminByClaim =
      (user.app_metadata as Record<string, unknown> | null | undefined)
        ?.smartline_role === "admin";

    let isAdmin = isAdminByClaim;
    if (!isAdmin) {
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      isAdmin = Boolean(adminRole);
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: keepLine, error: keepLineError } = await supabase
      .from("line_asset")
      .select("tenant_id,line_code")
      .eq("line_code", body.keep_line_code)
      .maybeSingle();

    if (keepLineError) throw keepLineError;
    if (!keepLine) {
      return new Response(
        JSON.stringify({
          error: "keep_line_code not found in line_asset",
          keep_line_code: body.keep_line_code,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const keepTenantId = keepLine.tenant_id as string | null;
    if (!keepTenantId) {
      return new Response(
        JSON.stringify({
          error: "line_asset has no tenant_id",
          hint: "Re-ingest the line or update the record with a tenant_id before cleaning.",
          keep_line_code: body.keep_line_code,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const summary: CleanupSummary = {
      keep_line_code: body.keep_line_code,
      keep_tenant_id: keepTenantId,
      dry_run: body.dry_run,
      tables: {},
    };

    const recordTable = (table: string, will_delete: number, deleted: number, notes?: string | null) => {
      summary.tables[table] = { will_delete, deleted, notes: notes ?? null };
    };

    const countExact = async (query: any) => {
      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    };

    const safeDelete = async (table: string, builder: any) => {
      const { error } = await builder;
      if (error) throw error;
    };

    // Tenant-scoped tables (keep only the selected line within the selected tenant)
    const tenantTables = ["tower_asset", "span_analysis", "dem_surface", "profile_data", "dataset_catalog"];

    for (const table of tenantTables) {
      try {
        const willDelete =
          (await countExact(
            supabase
              .from(table)
              .select("id", { count: "exact", head: true })
              .or(`tenant_id.is.null,tenant_id.neq.${keepTenantId}`),
          )) +
          (await countExact(
            supabase
              .from(table)
              .select("id", { count: "exact", head: true })
              .eq("tenant_id", keepTenantId)
              .or(`line_code.is.null,line_code.neq.${body.keep_line_code}`),
          ));

        if (body.dry_run) {
          recordTable(table, willDelete, 0, "dry_run");
          continue;
        }

        await safeDelete(
          table,
          supabase.from(table).delete().or(`tenant_id.is.null,tenant_id.neq.${keepTenantId}`),
        );

        await safeDelete(
          table,
          supabase
            .from(table)
            .delete()
            .eq("tenant_id", keepTenantId)
            .neq("line_code", body.keep_line_code),
        );

        await safeDelete(
          table,
          supabase.from(table).delete().eq("tenant_id", keepTenantId).is("line_code", null),
        );

        recordTable(table, willDelete, willDelete);
      } catch (error) {
        console.error("[admin-cleanup] table error:", table, error);
        recordTable(
          table,
          0,
          0,
          error instanceof Error ? error.message : "table_error",
        );
      }
    }

    // line_asset: keep only the selected line_code
    try {
      const willDelete = await countExact(
        supabase
          .from("line_asset")
          .select("id", { count: "exact", head: true })
          .neq("line_code", body.keep_line_code),
      );

      if (body.dry_run) {
        recordTable("line_asset", willDelete, 0, "dry_run");
      } else {
        await safeDelete(
          "line_asset",
          supabase.from("line_asset").delete().neq("line_code", body.keep_line_code),
        );
        recordTable("line_asset", willDelete, willDelete);
      }
    } catch (error) {
      console.error("[admin-cleanup] table error:", "line_asset", error);
      recordTable(
        "line_asset",
        0,
        0,
        error instanceof Error ? error.message : "table_error",
      );
    }

    // app_user / tenant: keep only current tenant membership
    for (const table of ["app_user", "tenant"]) {
      try {
        const column = table === "tenant" ? "id" : "tenant_id";
        const willDelete = await countExact(
          supabase
            .from(table)
            .select("id", { count: "exact", head: true })
            .or(`${column}.is.null,${column}.neq.${keepTenantId}`),
        );

        if (body.dry_run) {
          recordTable(table, willDelete, 0, "dry_run");
          continue;
        }

        await safeDelete(
          table,
          supabase.from(table).delete().or(`${column}.is.null,${column}.neq.${keepTenantId}`),
        );
        recordTable(table, willDelete, willDelete);
      } catch (error) {
        console.error("[admin-cleanup] table error:", table, error);
        recordTable(
          table,
          0,
          0,
          error instanceof Error ? error.message : "table_error",
        );
      }
    }

    if (body.wipe_legacy) {
      const legacyTables = [
        "linhas_transmissao",
        "estruturas",
        "concessoes_geo",
        "eventos_geo",
        "geodata_outros",
        "geodata_staging",
        "queimadas",
        "queimadas_footprints",
        "alertas_queimadas",
        "infrastructure",
        "fires",
        "custom_layers",
        "ndvi_stats",
        "roi_metrics",
        "telemetry_events",
        "teams",
        "vehicles",
        "vehicle_history",
        "sensors",
        "sensor_readings",
        "unifilar_diagrams",
        "weather_cache",
      ];

      for (const table of legacyTables) {
        try {
          const willDelete = await countExact(
            supabase.from(table).select("id", { count: "exact", head: true }),
          );

          if (body.dry_run) {
            recordTable(table, willDelete, 0, "dry_run");
            continue;
          }

          await safeDelete(table, supabase.from(table).delete().not("id", "is", null)); // delete all
          recordTable(table, willDelete, willDelete);
        } catch (error) {
          console.error("[admin-cleanup] legacy table error:", table, error);
          recordTable(
            table,
            0,
            0,
            error instanceof Error ? error.message : "table_error",
          );
        }
      }
    }

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
