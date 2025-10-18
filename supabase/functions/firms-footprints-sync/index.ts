import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { parse } from 'https://deno.land/x/xml@2.1.3/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KMLFeature {
  name: string;
  coordinates: number[][][];
  properties: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify admin authorization before allowing sync
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create auth client to verify user
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: isAdmin, error: roleError } = await supabaseAuth.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error('Role check failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`FIRMS footprints sync initiated by admin user: ${user.id}`);

    // Now safe to use service role key for data operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const FIRMS_API_KEY = Deno.env.get('FIRMS_API_KEY');
    if (!FIRMS_API_KEY) {
      throw new Error('FIRMS_API_KEY not configured');
    }

    console.log('Fetching FIRMS footprints KML...');
    
    // Fetch KML from FIRMS API (last 24 hours for South America)
    const kmlUrl = `https://firms.modaps.eosdis.nasa.gov/api/kml_fire_footprints/south_america/24h/${FIRMS_API_KEY}`;
    const kmlResponse = await fetch(kmlUrl);
    
    if (!kmlResponse.ok) {
      throw new Error(`FIRMS API error: ${kmlResponse.status}`);
    }

    const kmlText = await kmlResponse.text();
    console.log('KML fetched, parsing...');

    // Parse KML to extract polygons
    const kmlDoc = parse(kmlText);
    const features = extractFeaturesFromKML(kmlDoc);
    
    console.log(`Parsed ${features.length} footprints from KML`);

    let insertedCount = 0;
    let duplicateCount = 0;

    // Process each footprint
    for (const feature of features) {
      try {
        // Calculate area in hectares
        const areaHa = calculatePolygonArea(feature.coordinates);
        
        // Find which concessao this footprint intersects
        const { data: concessaoData } = await supabase.rpc('find_concessao', {
          lat: feature.coordinates[0][0][1],
          lon: feature.coordinates[0][0][0]
        });

        // Convert to WKT for PostGIS
        const wkt = polygonToWKT(feature.coordinates);

        // Check for duplicates (same location + time window)
        const { data: existing } = await supabase
          .from('queimadas_footprints')
          .select('id')
          .eq('concessao', concessaoData?.nome || 'DESCONHECIDA')
          .gte('data_deteccao', new Date(Date.now() - 86400000).toISOString()) // Last 24h
          .limit(1);

        if (existing && existing.length > 0) {
          duplicateCount++;
          continue;
        }

        // Insert footprint
        const { error: insertError } = await supabase
          .from('queimadas_footprints')
          .insert({
            geometry: wkt,
            properties: feature.properties,
            area_ha: areaHa,
            data_deteccao: new Date().toISOString(),
            concessao: concessaoData?.nome || 'DESCONHECIDA',
            satelite: feature.properties.satellite || 'MODIS',
            confidence: parseInt(feature.properties.confidence || '50'),
            nivel_risco: classifyRisk(areaHa, parseInt(feature.properties.confidence || '50'))
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          continue;
        }

        insertedCount++;
      } catch (featureError) {
        console.error('Error processing feature:', featureError);
      }
    }

    // Save historical data to storage
    const fileName = `footprints_${new Date().toISOString().split('T')[0]}.json`;
    const geojson = {
      type: 'FeatureCollection',
      features: features.map(f => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: f.coordinates
        },
        properties: f.properties
      }))
    };

    await supabase.storage
      .from('firms-archive')
      .upload(`footprints/${fileName}`, JSON.stringify(geojson), {
        contentType: 'application/geo+json',
        upsert: false
      });

    console.log(`Sync complete: ${insertedCount} inserted, ${duplicateCount} duplicates`);

    return new Response(
      JSON.stringify({
        success: true,
        inserted: insertedCount,
        duplicates: duplicateCount,
        total: features.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in firms-footprints-sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractFeaturesFromKML(kmlDoc: any): KMLFeature[] {
  const features: KMLFeature[] = [];
  
  // Navigate KML structure to find Placemarks
  const placemarks = findPlacemarks(kmlDoc);
  
  for (const placemark of placemarks) {
    try {
      const name = placemark.name || 'Unknown';
      const coordinates = extractCoordinates(placemark);
      const properties = extractProperties(placemark);
      
      if (coordinates && coordinates.length > 0) {
        features.push({ name, coordinates, properties });
      }
    } catch (e) {
      console.error('Error extracting feature:', e);
    }
  }
  
  return features;
}

function findPlacemarks(node: any): any[] {
  const placemarks: any[] = [];
  
  if (node.Placemark) {
    return Array.isArray(node.Placemark) ? node.Placemark : [node.Placemark];
  }
  
  if (node.Document?.Placemark) {
    return Array.isArray(node.Document.Placemark) 
      ? node.Document.Placemark 
      : [node.Document.Placemark];
  }
  
  // Recursively search
  for (const key in node) {
    if (typeof node[key] === 'object') {
      placemarks.push(...findPlacemarks(node[key]));
    }
  }
  
  return placemarks;
}

function extractCoordinates(placemark: any): number[][][] {
  const polygon = placemark.Polygon || placemark.MultiGeometry?.Polygon;
  if (!polygon) return [];
  
  const coordsText = polygon.outerBoundaryIs?.LinearRing?.coordinates || 
                     polygon.coordinates;
  
  if (!coordsText) return [];
  
  // Parse coordinates string: "lon,lat,alt lon,lat,alt ..."
  const points = coordsText.trim().split(/\s+/).map((point: string) => {
    const [lon, lat] = point.split(',').map(parseFloat);
    return [lon, lat];
  });
  
  return [points];
}

function extractProperties(placemark: any): Record<string, any> {
  const props: Record<string, any> = {};
  
  if (placemark.ExtendedData?.Data) {
    const data = Array.isArray(placemark.ExtendedData.Data) 
      ? placemark.ExtendedData.Data 
      : [placemark.ExtendedData.Data];
    
    for (const item of data) {
      if (item['@name'] && item.value) {
        props[item['@name']] = item.value;
      }
    }
  }
  
  return props;
}

function polygonToWKT(coordinates: number[][][]): string {
  const ring = coordinates[0];
  const points = ring.map(([lon, lat]) => `${lon} ${lat}`).join(', ');
  return `SRID=4326;POLYGON((${points}))`;
}

function calculatePolygonArea(coordinates: number[][][]): number {
  // Simple area calculation (not perfectly accurate for lat/lon but good enough)
  const ring = coordinates[0];
  let area = 0;
  
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += (x1 * y2) - (x2 * y1);
  }
  
  // Convert to hectares (very rough approximation)
  return Math.abs(area / 2) * 111 * 111; // ~111 km per degree
}

function classifyRisk(areaHa: number, confidence: number): string {
  if (areaHa > 100 && confidence > 80) return 'critico';
  if (areaHa > 50 && confidence > 60) return 'alto';
  if (areaHa > 10) return 'medio';
  return 'baixo';
}
