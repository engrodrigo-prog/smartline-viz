import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon } = await req.json();
    
    const API_KEY = Deno.env.get('OPENWEATHER_API_KEY');

    if (!API_KEY) {
      // Fallback: Open‑Meteo (gratis) com vento a 10m e 100m
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', String(lat));
      url.searchParams.set('longitude', String(lon));
      url.searchParams.set('current', 'temperature_2m,relativehumidity_2m,windspeed_10m,winddirection_10m,windspeed_100m,winddirection_100m');
      url.searchParams.set('timezone', 'UTC');

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
      const data = await res.json();

      const wind100 = Number(data.current?.windspeed_100m ?? 0);
      const wind10 = Number(data.current?.windspeed_10m ?? 0);
      const dir100 = Number(data.current?.winddirection_100m ?? 0);
      const dir10 = Number(data.current?.winddirection_10m ?? 0);
      const temp = Number(data.current?.temperature_2m ?? 0);
      const hum = Number(data.current?.relativehumidity_2m ?? 0);

      return new Response(JSON.stringify({
        wind_speed: wind100 || wind10, // prioriza 100m
        wind_direction: dir100 || dir10,
        temperature: temp,
        humidity: hum,
        provider: 'open-meteo'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OpenWeather API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return new Response(JSON.stringify({
      wind_speed: (data.wind?.speed || 0) * 3.6, // m/s para km/h
      wind_direction: data.wind?.deg || 0, // 0-360
      temperature: (data.main?.temp || 273.15) - 273.15, // Kelvin para Celsius
      humidity: data.main?.humidity || 50,
      provider: 'openweather'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in get-weather-data:', error);
    
    // Fallback: valores padrão mínimos
    return new Response(JSON.stringify({
      wind_speed: 0,
      wind_direction: 0,
      temperature: 0,
      humidity: 0,
      provider: 'error'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
