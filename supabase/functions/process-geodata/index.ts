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
    const { filePath } = await req.json();
    
    if (!filePath) {
      throw new Error('File path is required');
    }

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
    
    const stats = {
      linhas: 0,
      estruturas: 0,
      concessoes: 0,
    };
    const errors: string[] = [];

    // Extract placemarks
    const placemarks = doc.querySelectorAll('Placemark');
    console.log('Found placemarks:', placemarks.length);

    for (const placemark of placemarks) {
      try {
        const placemarkEl = placemark as any; // Cast for DOM methods
        const nameEl = placemarkEl.querySelector('name');
        const name = nameEl?.textContent || 'Sem nome';
        
        // Check for Point
        const pointCoords = placemarkEl.querySelector('Point coordinates');
        if (pointCoords) {
          const coords = pointCoords.textContent?.trim().split(',');
          if (coords && coords.length >= 2) {
            const lon = parseFloat(coords[0]);
            const lat = parseFloat(coords[1]);
            
            const { error } = await supabase.from('estruturas').insert({
              codigo: name,
              geometry: `SRID=4326;POINT(${lon} ${lat})`,
              tipo: 'Importado',
              estado_conservacao: 'A definir',
            });
            
            if (error) {
              console.error('Error inserting estrutura:', error);
              errors.push(`Estrutura "${name}": ${error.message}`);
            } else {
              stats.estruturas++;
            }
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
            
            const { error } = await supabase.from('linhas_transmissao').insert({
              codigo: name,
              nome: name,
              geometry: `SRID=4326;LINESTRING(${points})`,
              status: 'Ativa',
            });
            
            if (error) {
              console.error('Error inserting linha:', error);
              errors.push(`Linha "${name}": ${error.message}`);
            } else {
              stats.linhas++;
            }
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
            
            const { error } = await supabase.from('concessoes_geo').insert({
              nome: name,
              geometry: `SRID=4326;POLYGON((${points}))`,
            });
            
            if (error) {
              console.error('Error inserting concessao:', error);
              errors.push(`Concessão "${name}": ${error.message}`);
            } else {
              stats.concessoes++;
            }
          }
          continue;
        }
      } catch (error) {
        console.error('Error processing placemark:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Erro ao processar feature: ${errorMsg}`);
      }
    }

    // Clean up uploaded file
    await supabase.storage.from('geodata-uploads').remove([filePath]);

    console.log('Processing complete:', stats);

    const result: ProcessResult = {
      success: true,
      stats,
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
