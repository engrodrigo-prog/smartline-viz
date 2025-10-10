import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors Headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const FIRMS_API_KEY = Deno.env.get('FIRMS_API_KEY');
    if (!FIRMS_API_KEY) {
      throw new Error('FIRMS_API_KEY not configured');
    }

    // São Paulo bbox: -53.0,-25.0,-45.0,-20.0
    const bbox = '-53.0,-25.0,-45.0,-20.0';
    const days = 1; // últimas 24h

    const sources = [
      { name: 'VIIRS_SNPP_NRT', satelite: 'VIIRS S-NPP' },
      { name: 'MODIS_NRT', satelite: 'MODIS Aqua/Terra' }
    ];

    let totalInserted = 0;
    let totalDuplicates = 0;

    for (const source of sources) {
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${FIRMS_API_KEY}/${source.name}/${bbox}/${days}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Failed to fetch ${source.name}:`, response.status);
        continue;
      }

      const csvText = await response.text();
      const lines = csvText.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',');
      
      const latIdx = headers.indexOf('latitude');
      const lonIdx = headers.indexOf('longitude');
      const brightIdx = headers.indexOf('brightness' || headers.indexOf('bright_ti4'));
      const confIdx = headers.indexOf('confidence');
      const dateIdx = headers.indexOf('acq_date');
      const timeIdx = headers.indexOf('acq_time');

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',');
        const lat = parseFloat(row[latIdx]);
        const lon = parseFloat(row[lonIdx]);
        const brilho = parseFloat(row[brightIdx]);
        const confianca = parseInt(row[confIdx]);
        const data = row[dateIdx];
        const tempo = row[timeIdx].padStart(4, '0');
        
        const dataAquisicao = `${data}T${tempo.slice(0, 2)}:${tempo.slice(2, 4)}:00Z`;

        // Verificar duplicado
        const { data: existing } = await supabase
          .from('queimadas')
          .select('id')
          .eq('fonte', source.name)
          .eq('data_aquisicao', dataAquisicao)
          .eq('geometry', `SRID=4326;POINT(${lon} ${lat})`)
          .single();

        if (existing) {
          totalDuplicates++;
          continue;
        }

        // Encontrar concessão
        const { data: concessao } = await supabase.rpc('find_concessao', {
          p_lon: lon,
          p_lat: lat
        }).single();

        // Encontrar linha mais próxima
        const { data: linhaProx } = await supabase.rpc('find_nearest_linha', {
          p_lon: lon,
          p_lat: lat
        }).single();

        const { error: insertError } = await supabase
          .from('queimadas')
          .insert({
            fonte: source.name,
            satelite: source.satelite,
            data_aquisicao: dataAquisicao,
            brilho,
            confianca,
            estado: 'SP',
            concessao: concessao?.nome || null,
            id_linha: linhaProx?.id || null,
            ramal: linhaProx?.codigo?.split('-')[1] || null,
            distancia_m: linhaProx?.distancia_m || null,
            geometry: `SRID=4326;POINT(${lon} ${lat})`,
            processado: true
          });

        if (insertError) {
          console.error('Insert error:', insertError);
        } else {
          totalInserted++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_inseridos: totalInserted,
        total_duplicados: totalDuplicates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});