import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KmlMetadata {
  empresa: string;
  regiao: string;
  linha_prefixo: string;
  linha_codigo: string;
  nome_material: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const metadata = JSON.parse(formData.get('metadata') as string) as KmlMetadata;

    if (!file) {
      throw new Error('Arquivo não fornecido');
    }

    console.log(`Processing KML file: ${file.name}`);

    // Read file content
    const fileContent = await file.text();
    
    // Parse KML/KMZ
    const features = await parseKmlContent(fileContent, metadata, user.id);

    // Insert into database
    if (features.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('infrastructure')
        .insert(features);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${features.length} estruturas importadas com sucesso`,
        count: features.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function parseKmlContent(kmlText: string, metadata: KmlMetadata, userId: string): any[] {
  const features: any[] = [];
  
  // Simple XML parsing for KML
  const placemarkRegex = /<Placemark>([\s\S]*?)<\/Placemark>/g;
  const nameRegex = /<name>(.*?)<\/name>/;
  const coordinatesRegex = /<coordinates>([\s\S]*?)<\/coordinates>/;
  const pointRegex = /<Point>/;
  const lineStringRegex = /<LineString>/;

  let match;
  while ((match = placemarkRegex.exec(kmlText)) !== null) {
    const placemarkContent = match[1];
    const nameMatch = nameRegex.exec(placemarkContent);
    const coordMatch = coordinatesRegex.exec(placemarkContent);
    
    if (!coordMatch) continue;

    const name = nameMatch ? nameMatch[1].trim() : '';
    const coordsText = coordMatch[1].trim();
    
    // Parse coordinates
    const coordLines = coordsText.split(/\s+/).filter(c => c.length > 0);
    const coords = coordLines.map(line => {
      const parts = line.split(',').map(Number);
      return parts;
    });

    if (coords.length === 0) continue;

    // Parse name for structure info (COD - RAMAL - ESTRUTURA)
    const nameParts = name.split('-').map(s => s.trim());
    const codigo = nameParts[0] || metadata.linha_codigo;
    const ramal = nameParts[1] || '';
    const estrutura = nameParts.slice(2).join('-') || '';

    const isPoint = pointRegex.test(placemarkContent);
    const isLine = lineStringRegex.test(placemarkContent);

    if (isPoint && coords.length > 0) {
      const [lon, lat, alt = 0] = coords[0];
      features.push({
        empresa: metadata.empresa,
        regiao: metadata.regiao,
        linha_prefixo: metadata.linha_prefixo,
        linha_codigo: codigo,
        linha_nome: `${metadata.linha_prefixo}-${codigo}`,
        ramal,
        estrutura,
        nome_material: metadata.nome_material,
        asset_type: 'structure',
        lat,
        lon,
        alt,
        bbox: [lon, lat, lon, lat],
        geometry: { type: 'Point', coordinates: [lon, lat, alt] },
        user_id: userId
      });
    } else if (isLine && coords.length > 1) {
      const lineCoords = coords.map(c => [c[0], c[1], c[2] || 0]);
      const bbox = calculateBbox(lineCoords);
      
      features.push({
        empresa: metadata.empresa,
        regiao: metadata.regiao,
        linha_prefixo: metadata.linha_prefixo,
        linha_codigo: codigo,
        linha_nome: `${metadata.linha_prefixo}-${codigo}`,
        ramal,
        estrutura,
        nome_material: metadata.nome_material,
        asset_type: 'line',
        lat: null,
        lon: null,
        alt: null,
        bbox,
        geometry: { type: 'LineString', coordinates: lineCoords },
        user_id: userId
      });
    }
  }

  return features;
}

function calculateBbox(coords: number[][]): number[] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (const [x, y] of coords) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  
  return [minX, minY, maxX, maxY];
}
