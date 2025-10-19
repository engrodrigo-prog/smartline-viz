import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon, roi_id } = await req.json();
    
    if (!lat || !lon) {
      throw new Error('Latitude and longitude are required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar cache (últimos 10 min)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: cached } = await supabase
      .from('weather_cache')
      .select('*')
      .eq('roi_id', roi_id || 'default')
      .gte('ts', tenMinutesAgo)
      .order('ts', { ascending: false })
      .limit(1)
      .single();

    if (cached) {
      console.log('Returning cached weather data');
      return new Response(
        JSON.stringify(cached.params_json),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar do OpenWeather
    const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');
    
    if (!OPENWEATHER_API_KEY) {
      console.warn('OPENWEATHER_API_KEY not configured, returning mock data');
      const mockData = {
        current: {
          temp: 25 + Math.random() * 10,
          feels_like: 25 + Math.random() * 10,
          humidity: 60 + Math.random() * 20,
          wind_speed: 5 + Math.random() * 10,
          wind_deg: Math.floor(Math.random() * 360),
          weather: [{ id: 800, main: 'Clear', description: 'Céu limpo', icon: '01d' }],
          rain: { '1h': Math.random() * 5 }
        },
        hourly: Array.from({ length: 48 }, (_, i) => ({
          dt: Date.now() / 1000 + i * 3600,
          temp: 20 + Math.random() * 15,
          rain: { '1h': Math.random() * 3 },
          wind_speed: 3 + Math.random() * 8,
          wind_deg: Math.floor(Math.random() * 360),
        })),
        daily: Array.from({ length: 7 }, (_, i) => ({
          dt: Date.now() / 1000 + i * 86400,
          temp: { min: 18 + Math.random() * 5, max: 28 + Math.random() * 8 },
          rain: Math.random() * 10,
          wind_speed: 4 + Math.random() * 6,
        }))
      };
      
      return new Response(
        JSON.stringify(mockData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pt_br`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OpenWeather API error: ${response.status}`);
    }
    
    const data = await response.json();

    // Salvar no cache
    await supabase.from('weather_cache').insert({
      roi_id: roi_id || 'default',
      ts: new Date().toISOString(),
      params_json: data
    });

    console.log('Weather data fetched and cached successfully');
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in weather_fetch:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
