import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const concessao = url.searchParams.get('concessao') || 'TODAS';
    const minArea = parseFloat(url.searchParams.get('min_area') || '0');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    console.log('Queimadas footprints request:', { concessao, minArea, startDate, endDate });

    // Build query
    let query = supabase
      .from('queimadas_footprints')
      .select('*')
      .gte('area_ha', minArea);

    // Apply filters
    if (concessao !== 'TODAS') {
      query = query.eq('concessao', concessao);
    }

    if (startDate) {
      query = query.gte('data_deteccao', startDate);
    }

    if (endDate) {
      query = query.lte('data_deteccao', endDate);
    }

    // Default to last 7 days if no date range
    if (!startDate && !endDate) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query = query.gte('data_deteccao', sevenDaysAgo.toISOString());
    }

    query = query.order('data_deteccao', { ascending: false }).limit(1000);

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Convert to GeoJSON
    const geojson = {
      type: 'FeatureCollection',
      features: (data || []).map((row: any) => {
        // Parse PostGIS geometry WKT to GeoJSON
        const coords = parseWKTPolygon(row.geometry);
        
        return {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: coords
          },
          properties: {
            id: row.id,
            area_ha: row.area_ha,
            data_deteccao: row.data_deteccao,
            concessao: row.concessao,
            nivel_risco: row.nivel_risco,
            satelite: row.satelite,
            confidence: row.confidence,
            ...row.properties
          }
        };
      })
    };

    console.log(`Returning ${geojson.features.length} footprints`);

    return new Response(
      JSON.stringify(geojson),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching footprints:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseWKTPolygon(wkt: string): number[][][] {
  if (!wkt || typeof wkt !== 'string') {
    return [];
  }

  // Extract coordinates from WKT POLYGON((x y, x y, ...))
  const match = wkt.match(/POLYGON\s*\(\((.*?)\)\)/i);
  if (!match) {
    return [];
  }

  const coordsStr = match[1];
  const points = coordsStr.split(',').map(pair => {
    const [lon, lat] = pair.trim().split(/\s+/).map(parseFloat);
    return [lon, lat];
  });

  return [points];
}
