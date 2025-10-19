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
    const { vehicle_id } = await req.json();

    if (!vehicle_id) {
      throw new Error('vehicle_id is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Buscar posição do veículo
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('current_location, speed_kmh, plate')
      .eq('id', vehicle_id)
      .single();

    if (vehicleError || !vehicle) {
      throw new Error('Vehicle not found');
    }

    if (!vehicle.current_location) {
      return new Response(
        JSON.stringify({ events: [], message: 'Vehicle has no location' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar eventos próximos (exemplo com queimadas)
    const radiusKm = 5;
    const { data: fires } = await supabase
      .from('queimadas')
      .select('id, fonte, confianca, data_aquisicao, geometry')
      .limit(50);

    // Calcular distâncias (simplificado - em produção usar PostGIS ST_Distance)
    const results = fires?.map(fire => {
      // Fórmula de Haversine simplificada
      const lat1 = vehicle.current_location.coordinates[1];
      const lon1 = vehicle.current_location.coordinates[0];
      
      // Assumindo geometry é Point
      const fireCoords = fire.geometry;
      const lat2 = fireCoords?.coordinates?.[1] || 0;
      const lon2 = fireCoords?.coordinates?.[0] || 0;
      
      const R = 6371; // Raio da Terra em km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      // Calcular ETA (tempo estimado)
      const speedKmh = vehicle.speed_kmh || 60; // Default 60 km/h se parado
      const etaMinutes = (distance / speedKmh) * 60;

      return {
        event_id: fire.id,
        event_type: 'fire',
        source: fire.fonte,
        confidence: fire.confianca,
        date: fire.data_aquisicao,
        distance_km: Math.round(distance * 100) / 100,
        distance_meters: Math.round(distance * 1000),
        eta_minutes: Math.round(etaMinutes),
        priority: distance < 1 ? 'high' : distance < 3 ? 'medium' : 'low'
      };
    }).filter(e => e.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km) || [];

    return new Response(
      JSON.stringify({ 
        vehicle: {
          id: vehicle_id,
          plate: vehicle.plate,
          speed_kmh: vehicle.speed_kmh
        },
        events: results,
        radius_km: radiusKm
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in calculate-event-distance:', error);
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
