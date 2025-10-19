import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const frotologApiKey = Deno.env.get('FROTOLOG_API_KEY');
    
    if (!frotologApiKey) {
      console.log('FROTOLOG_API_KEY not configured - using mock data');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Configure FROTOLOG_API_KEY to enable integration',
          count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar dados da API Frotolog
    const response = await fetch('https://api.frotolog.com/v1/vehicles', {
      headers: { 
        'Authorization': `Bearer ${frotologApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Frotolog API error: ${response.statusText}`);
    }

    const vehicles = await response.json();

    // Atualizar posições no Supabase
    let updatedCount = 0;
    for (const vehicle of vehicles) {
      const { error } = await supabase.from('vehicles').upsert({
        external_id: vehicle.id,
        plate: vehicle.plate,
        model: vehicle.model,
        brand: vehicle.brand,
        current_location: `POINT(${vehicle.longitude} ${vehicle.latitude})`,
        speed_kmh: vehicle.speed,
        heading: vehicle.heading,
        fuel_level: vehicle.fuel_level,
        integration_source: 'frotolog',
        last_update: new Date().toISOString()
      }, { onConflict: 'external_id' });

      if (!error) {
        updatedCount++;
        
        // Salvar histórico
        await supabase.from('vehicle_history').insert({
          vehicle_id: vehicle.id,
          location: `POINT(${vehicle.longitude} ${vehicle.latitude})`,
          speed_kmh: vehicle.speed,
          heading: vehicle.heading,
          event_type: 'position',
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Error upserting vehicle:', vehicle.plate, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: updatedCount,
        total: vehicles.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in frotolog-sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
