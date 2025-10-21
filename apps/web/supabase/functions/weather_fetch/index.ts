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
      // Fallback: Open‑Meteo (gratis) com vento a 10m/100m e variáveis básicas
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', String(lat));
      url.searchParams.set('longitude', String(lon));
      url.searchParams.set('current', 'temperature_2m,relativehumidity_2m,windspeed_10m,winddirection_10m,windspeed_100m,winddirection_100m,rain');
      url.searchParams.set('hourly', 'temperature_2m,relativehumidity_2m,windspeed_10m,winddirection_10m,windspeed_100m,winddirection_100m,rain');
      url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum');
      url.searchParams.set('timezone', 'UTC');

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
      const data = await res.json();

      const pick = (obj: any, key: string) => (obj && key in obj ? obj[key] : undefined);

      const windSpeedCurrent = Number(pick(data.current, 'windspeed_100m') ?? pick(data.current, 'windspeed_10m') ?? 0);
      const windDirCurrent = Number(pick(data.current, 'winddirection_100m') ?? pick(data.current, 'winddirection_10m') ?? 0);

      const current = {
        temp: Number(data.current?.temperature_2m ?? 0),
        feels_like: Number(data.current?.temperature_2m ?? 0),
        humidity: Number(data.current?.relativehumidity_2m ?? 0),
        wind_speed: windSpeedCurrent,
        wind_deg: windDirCurrent,
        weather: [{ id: 800, main: 'Clear', description: 'Open‑Meteo', icon: '01d' }],
        rain: { '1h': Number(data.current?.rain ?? 0) }
      };

      const hourlyTimes: string[] = data.hourly?.time ?? [];
      const hourly = hourlyTimes.slice(0, 48).map((t: string, i: number) => ({
        dt: Math.floor(Date.parse(t) / 1000),
        temp: Number(data.hourly?.temperature_2m?.[i] ?? 0),
        rain: { '1h': Number(data.hourly?.rain?.[i] ?? 0) },
        wind_speed: Number(data.hourly?.windspeed_100m?.[i] ?? data.hourly?.windspeed_10m?.[i] ?? 0),
        wind_deg: Number(data.hourly?.winddirection_100m?.[i] ?? data.hourly?.winddirection_10m?.[i] ?? 0),
      }));

      const dailyTimes: string[] = data.daily?.time ?? [];
      const daily = dailyTimes.slice(0, 7).map((t: string, i: number) => ({
        dt: Math.floor(Date.parse(t) / 1000),
        temp: {
          min: Number(data.daily?.temperature_2m_min?.[i] ?? 0),
          max: Number(data.daily?.temperature_2m_max?.[i] ?? 0),
        },
        rain: Number(data.daily?.precipitation_sum?.[i] ?? 0),
        wind_speed: 0, // Open‑Meteo daily wind speed not mapped here
      }));

      return new Response(
        JSON.stringify({ current, hourly, daily, provider: 'open-meteo' }),
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
