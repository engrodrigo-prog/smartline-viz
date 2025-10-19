import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const healthChecks = [];

    // 1. Check OpenWeather API
    try {
      const owmKey = Deno.env.get('OPENWEATHER_API_KEY');
      if (owmKey) {
        const owmRes = await fetch(
          `https://api.openweathermap.org/data/3.0/onecall?lat=-23.96&lon=-46.33&appid=${owmKey}`,
          { signal: AbortSignal.timeout(5000) }
        );
        const status = owmRes.ok ? 'healthy' : 'degraded';
        healthChecks.push({
          service: 'openweather',
          status,
          error_message: owmRes.ok ? null : `HTTP ${owmRes.status}`
        });
      } else {
        healthChecks.push({
          service: 'openweather',
          status: 'down',
          error_message: 'API key not configured'
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      healthChecks.push({
        service: 'openweather',
        status: 'down',
        error_message: errorMsg
      });
    }

    // 2. Check FIRMS API
    try {
      const firmsRes = await fetch(
        'https://firms.modaps.eosdis.nasa.gov/api/area/csv/5d8552316e6eadd87a974f0e7a7bb534/VIIRS_SNPP_NRT/-46.4,-24.0,-46.3,-23.9/1',
        { signal: AbortSignal.timeout(5000) }
      );
      const status = firmsRes.ok ? 'healthy' : 'degraded';
      healthChecks.push({
        service: 'firms',
        status,
        error_message: firmsRes.ok ? null : `HTTP ${firmsRes.status}`
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      healthChecks.push({
        service: 'firms',
        status: 'down',
        error_message: errorMsg
      });
    }

    // 3. Check Storage bucket
    try {
      const { data, error } = await supabase.storage
        .from('layers')
        .list('base', { limit: 1 });
      const status = error ? 'down' : 'healthy';
      healthChecks.push({
        service: 'storage',
        status,
        error_message: error?.message || null
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      healthChecks.push({
        service: 'storage',
        status: 'down',
        error_message: errorMsg
      });
    }

    // 4. Check Database
    try {
      const { error } = await supabase
        .from('base_layers_catalog')
        .select('id')
        .limit(1);
      const status = error ? 'down' : 'healthy';
      healthChecks.push({
        service: 'database',
        status,
        error_message: error?.message || null
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      healthChecks.push({
        service: 'database',
        status: 'down',
        error_message: errorMsg
      });
    }

    // Update health cache
    for (const check of healthChecks) {
      await supabase
        .from('health_cache')
        .upsert({
          service: check.service,
          status: check.status,
          last_check: new Date().toISOString(),
          error_message: check.error_message,
          metadata: { checked_by: 'health-check-function' }
        });
    }

    const overallHealthy = healthChecks.every(c => c.status === 'healthy');
    const overallStatus = overallHealthy ? 'healthy' : 
                          healthChecks.some(c => c.status === 'down') ? 'degraded' : 'healthy';

    return new Response(
      JSON.stringify({
        status: overallStatus,
        checks: healthChecks,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in health-check:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
