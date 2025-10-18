import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EventoUploadSchema = z.object({
  file_path: z.string().min(1),
  tipo_evento: z.enum(['arvore_queda', 'arvore_lateral', 'clearance_perigo', 'cruzamento', 'perigo_generico', 'outros']),
  concessao: z.string().optional(),
  tenant_id: z.string().uuid().optional()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    const rawBody = await req.json();
    const body = EventoUploadSchema.parse(rawBody);

    // Validate file ownership
    const normalizedPath = body.file_path.replace(/\.\.\//g, '');
    if (!normalizedPath.startsWith(`${user.id}/`)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized file access' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('geodata-uploads')
      .download(normalizedPath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    const fileContent = await fileData.text();
    const eventos: any[] = [];

    // Parse KML/CSV
    if (normalizedPath.endsWith('.csv')) {
      const lines = fileContent.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length < headers.length) continue;

        const row: any = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx]?.trim();
        });

        if (row.latitude && row.longitude) {
          eventos.push({
            nome: row.nome || row.name || `${body.tipo_evento}-${i}`,
            descricao: row.descricao || row.description,
            tipo_evento: body.tipo_evento,
            concessao: body.concessao || row.concessao,
            geometry: `SRID=4674;POINT(${row.longitude} ${row.latitude})`,
            metadata: {
              imported_from: 'csv',
              original_data: row
            }
          });
        }
      }
    } else {
      // Parse KML
      const placemarkRegex = /<Placemark>[\s\S]*?<\/Placemark>/g;
      const placemarks = fileContent.match(placemarkRegex) || [];

      for (const placemark of placemarks) {
        const nameMatch = placemark.match(/<name>(.*?)<\/name>/);
        const descMatch = placemark.match(/<description>(.*?)<\/description>/);
        
        // Try Point geometry
        let coordMatch = placemark.match(/<Point>[\s\S]*?<coordinates>(.*?)<\/coordinates>/);
        let geomType = 'POINT';
        
        // Try Polygon geometry
        if (!coordMatch) {
          coordMatch = placemark.match(/<Polygon>[\s\S]*?<coordinates>(.*?)<\/coordinates>/);
          geomType = 'POLYGON';
        }
        
        if (coordMatch) {
          const coords = coordMatch[1].trim();
          let wkt: string;
          
          if (geomType === 'POINT') {
            const [lon, lat] = coords.split(',').map(Number);
            wkt = `POINT(${lon} ${lat})`;
          } else {
            const points = coords.split(/\s+/).map(coord => {
              const [lon, lat] = coord.split(',').map(Number);
              return `${lon} ${lat}`;
            }).join(',');
            wkt = `POLYGON((${points}))`;
          }
          
          eventos.push({
            nome: nameMatch?.[1] || `${body.tipo_evento}-${eventos.length + 1}`,
            descricao: descMatch?.[1],
            tipo_evento: body.tipo_evento,
            concessao: body.concessao,
            geometry: `SRID=4674;${wkt}`,
            metadata: {
              imported_from: 'kml',
              geometry_type: geomType
            }
          });
        }
      }
    }

    if (eventos.length === 0) {
      throw new Error('No valid event data found in file');
    }

    // Insert events
    const { data: insertedEventos, error: insertError } = await supabase
      .from('eventos_geo')
      .insert(eventos)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Failed to insert event data');
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: insertedEventos,
        message: `${eventos.length} events imported successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
