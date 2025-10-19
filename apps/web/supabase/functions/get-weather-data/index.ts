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
      console.warn('OPENWEATHER_API_KEY não configurada, retornando dados mock');
      // Retornar dados mock se API key não está configurada
      return new Response(JSON.stringify({
        wind_speed: Math.random() * 20 + 5, // 5-25 km/h
        wind_direction: Math.floor(Math.random() * 360), // 0-360°
        temperature: Math.random() * 10 + 25, // 25-35°C
        humidity: Math.random() * 30 + 40 // 40-70%
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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
      humidity: data.main?.humidity || 50
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in get-weather-data:', error);
    
    // Fallback para dados mock em caso de erro
    return new Response(JSON.stringify({
      wind_speed: Math.random() * 20 + 5,
      wind_direction: Math.floor(Math.random() * 360),
      temperature: Math.random() * 10 + 25,
      humidity: Math.random() * 30 + 40
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
