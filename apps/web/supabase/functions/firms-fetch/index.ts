import { parse as parseXML } from "https://deno.land/x/xml@5.4.11/mod.ts";
import JSZip from "npm:jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  properties: {
    name: string;
    area_ha: number;
    nivel_risco: string;
    description: string;
  };
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let kmlContent = '';

    // Handle GET with URL parameter or POST with file
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const apiKey = Deno.env.get('FIRMS_API_KEY');
      const preset = url.searchParams.get('preset') || '24h';
      const region = url.searchParams.get('region') || 'south_america';

      let kmlUrl = url.searchParams.get('url') || Deno.env.get('FIRMS_FOOTPRINTS_URL') || '';
      if (!kmlUrl) {
        if (apiKey) {
          kmlUrl = `https://firms.modaps.eosdis.nasa.gov/api/kml_fire_footprints/${region}/${preset}/${apiKey}`;
        } else {
          // Public fallback (may be rate-limited or change)
          kmlUrl = 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/kml/J1_VIIRS_C2_South_America_24h.kmz';
        }
      }
      
      console.log(`Fetching FIRMS KML/KMZ from: ${kmlUrl}`);
      
      const response = await fetch(kmlUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const arrayBuffer = await response.arrayBuffer();

      if (kmlUrl.endsWith('.kmz') || contentType.includes('application/vnd.google-earth.kmz')) {
        // KMZ - unzip and extract KML
        console.log('Processing KMZ file...');
        const zip = await JSZip.loadAsync(arrayBuffer);
        const kmlFile = Object.keys(zip.files).find(name => name.endsWith('.kml'));
        
        if (!kmlFile) {
          throw new Error('No KML file found in KMZ archive');
        }

        kmlContent = await zip.file(kmlFile)!.async('string');
        console.log(`Extracted KML: ${kmlFile}`);
      } else {
        // Plain KML
        kmlContent = new TextDecoder().decode(arrayBuffer);
      }
    } else if (req.method === 'POST') {
      // Handle file upload
      const formData = await req.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        throw new Error('No file provided');
      }

      console.log(`Processing uploaded file: ${file.name}`);
      const arrayBuffer = await file.arrayBuffer();

      if (file.name.endsWith('.kmz')) {
        const zip = await JSZip.loadAsync(arrayBuffer);
        const kmlFile = Object.keys(zip.files).find(name => name.endsWith('.kml'));
        
        if (!kmlFile) {
          throw new Error('No KML file found in KMZ archive');
        }

        kmlContent = await zip.file(kmlFile)!.async('string');
      } else {
        kmlContent = new TextDecoder().decode(arrayBuffer);
      }
    }

    // Parse KML to GeoJSON
    console.log('Parsing KML content...');
    const xmlDoc: any = parseXML(kmlContent);
    const features: GeoJSONFeature[] = [];

    // Navigate through KML structure
    const kml = xmlDoc.Document || xmlDoc.kml?.Document;
    if (!kml) {
      throw new Error('Invalid KML structure');
    }

    const placemarks = Array.isArray(kml.Placemark) ? kml.Placemark : [kml.Placemark].filter(Boolean);
    
    for (const placemark of placemarks) {
      if (!placemark) continue;

      const polygon = placemark.Polygon;
      if (!polygon) continue;

      const coordsText = polygon.outerBoundaryIs?.LinearRing?.coordinates?.[0] || 
                        polygon.outerBoundaryIs?.LinearRing?.coordinates || '';
      
      if (!coordsText) continue;

      // Parse coordinates (format: lon,lat,alt lon,lat,alt ...)
      const coords = coordsText.trim().split(/\s+/).map((coord: string) => {
        const [lon, lat] = coord.split(',').map(Number);
        return [lon, lat];
      });

      if (coords.length < 3) continue;

      // Extract properties
      const name = placemark.name?.[0] || 'Unknown';
      const description = placemark.description?.[0] || '';
      
      // Parse extended data or description for area and risk
      let area_ha = 0;
      let nivel_risco = 'medio';
      
      // Try to extract from description (FIRMS format)
      const areaMatch = description.match(/(\d+\.?\d*)\s*ha/i);
      if (areaMatch) {
        area_ha = parseFloat(areaMatch[1]);
      }

      // Determine risk level based on area
      if (area_ha > 500) nivel_risco = 'critico';
      else if (area_ha > 100) nivel_risco = 'alto';
      else if (area_ha > 10) nivel_risco = 'medio';
      else nivel_risco = 'baixo';

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coords]
        },
        properties: {
          name,
          area_ha,
          nivel_risco,
          description
        }
      });
    }

    const geojson: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      features
    };

    console.log(`Converted ${features.length} footprint polygons to GeoJSON`);

    return new Response(JSON.stringify(geojson), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in firms-fetch:', error);
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Unknown error',
        type: 'FeatureCollection',
        features: []
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
