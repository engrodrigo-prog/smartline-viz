import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessResult {
  success: boolean;
  stats: {
    linhas: number;
    estruturas: number;
    concessoes: number;
  };
  errors: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, errors: ['Missing authorization header'] }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user auth to verify
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, errors: ['Unauthorized'] }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { filePath } = await req.json();
    
    if (!filePath) {
      throw new Error('File path is required');
    }

    // Verify file belongs to user
    if (!filePath.startsWith(`${user.id}/`)) {
      return new Response(
        JSON.stringify({ success: false, errors: ['Unauthorized file access'] }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing geodata file:', filePath, 'for user:', user.id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Downloading file from storage:', filePath);
    
    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('geodata-uploads')
      .download(filePath);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    console.log('File downloaded, size:', fileData.size);

    // Parse file based on extension
    const extension = filePath.split('.').pop()?.toLowerCase();
    let kmlContent = '';

    if (extension === 'kml') {
      kmlContent = await fileData.text();
    } else if (extension === 'kmz') {
      // For KMZ, we'll need to extract the KML from the ZIP
      const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
      const zip = await JSZip.loadAsync(fileData);
      
      // Find the main KML file (usually doc.kml)
      const kmlFile = zip.file(/\.kml$/i)[0];
      if (!kmlFile) {
        throw new Error('No KML file found in KMZ archive');
      }
      
      kmlContent = await kmlFile.async('text');
    } else {
      throw new Error(`Unsupported file format: ${extension}`);
    }

    console.log('KML content length:', kmlContent.length);

    // Parse KML using Deno's DOM API
    const doc = new DOMParser().parseFromString(kmlContent, 'text/xml');
    if (!doc) {
      throw new Error('Failed to parse XML document');
    }
    
    const features: any[] = [];
    const errors: string[] = [];

    // Extract placemarks
    const placemarks = doc.querySelectorAll('Placemark');
    console.log('Found placemarks:', placemarks.length);

    for (const placemark of placemarks) {
      try {
        const placemarkEl = placemark as any;
        const nameEl = placemarkEl.querySelector('name');
        const name = nameEl?.textContent || 'Sem nome';
        
        // Check for Point
        const pointCoords = placemarkEl.querySelector('Point coordinates');
        if (pointCoords) {
          const coords = pointCoords.textContent?.trim().split(',');
          if (coords && coords.length >= 2) {
            const lon = parseFloat(coords[0]);
            const lat = parseFloat(coords[1]);
            
            features.push({
              type: 'Point',
              name,
              geometry: `SRID=4326;POINT(${lon} ${lat})`,
              coords: { lon, lat },
            });
          }
          continue;
        }

        // Check for LineString
        const lineStringCoords = placemarkEl.querySelector('LineString coordinates');
        if (lineStringCoords) {
          const coordsText = lineStringCoords.textContent?.trim();
          if (coordsText) {
            const points = coordsText.split(/\s+/).map((coord: string) => {
              const [lon, lat] = coord.split(',');
              return `${lon} ${lat}`;
            }).join(',');
            
            features.push({
              type: 'LineString',
              name,
              geometry: `SRID=4326;LINESTRING(${points})`,
              coordsCount: coordsText.split(/\s+/).length,
            });
          }
          continue;
        }

        // Check for Polygon
        const polygonCoords = placemarkEl.querySelector('Polygon outerBoundaryIs LinearRing coordinates');
        if (polygonCoords) {
          const coordsText = polygonCoords.textContent?.trim();
          if (coordsText) {
            const points = coordsText.split(/\s+/).map((coord: string) => {
              const [lon, lat] = coord.split(',');
              return `${lon} ${lat}`;
            }).join(',');
            
            features.push({
              type: 'Polygon',
              name,
              geometry: `SRID=4326;POLYGON((${points}))`,
              coordsCount: coordsText.split(/\s+/).length,
            });
          }
          continue;
        }
      } catch (error) {
        console.error('Error processing placemark:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Erro ao processar feature: ${errorMsg}`);
      }
    }

    // Insert features into staging table
    for (const feature of features) {
      try {
        const { error: insertError } = await supabase.from('geodata_staging').insert({
          file_name: filePath,
          geometry_type: feature.type,
          geometry: feature.geometry,
          feature_name: feature.name,
          user_id: user.id,
          metadata: { 
            coordsCount: feature.coordsCount,
            coords: feature.coords,
          },
        });

        if (insertError) {
          console.error('Error inserting to staging:', insertError);
          errors.push(`Erro ao salvar feature "${feature.name}": ${insertError.message}`);
        }
      } catch (error) {
        console.error('Error inserting feature:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Erro ao salvar feature: ${errorMsg}`);
      }
    }

    console.log('Processing complete. Features found:', features.length);

    const result = {
      success: true,
      features,
      fileName: filePath,
      stats: {
        points: features.filter(f => f.type === 'Point').length,
        lines: features.filter(f => f.type === 'LineString').length,
        polygons: features.filter(f => f.type === 'Polygon').length,
        total: features.length,
      },
      errors,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-geodata function:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMsg,
        stats: { linhas: 0, estruturas: 0, concessoes: 0 },
        errors: [errorMsg],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
