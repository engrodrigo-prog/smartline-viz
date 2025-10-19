import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UnifilarDiagramSchema = z.object({
  file_path: z.string(),
  line_code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  description: z.string().optional(),
  file_type: z.enum(['svg', 'json', 'png', 'jpg']),
  organization: z.string().optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
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

    const body = await req.json();
    const validatedData = UnifilarDiagramSchema.parse(body);

    console.log('Processing unifilar diagram:', validatedData);

    // Para JSON, tentar parsear diagram_data
    let diagramData = null;
    if (validatedData.file_type === 'json') {
      try {
        const { data: fileContent } = await anonClient.storage
          .from('unifilar-diagrams')
          .download(validatedData.file_path);
        
        if (fileContent) {
          const text = await fileContent.text();
          diagramData = JSON.parse(text);
          console.log('Parsed JSON diagram data');
        }
      } catch (error) {
        console.error('Error parsing JSON diagram:', error);
      }
    }

    // Gerar URL pública do arquivo
    const { data: urlData } = anonClient.storage
      .from('unifilar-diagrams')
      .getPublicUrl(validatedData.file_path);

    // Inserir registro no banco
    const { data: diagram, error: insertError } = await anonClient
      .from('unifilar_diagrams')
      .insert({
        line_code: validatedData.line_code,
        name: validatedData.name,
        description: validatedData.description,
        file_url: urlData.publicUrl,
        file_type: validatedData.file_type,
        diagram_data: diagramData,
        uploaded_by: user.id,
        organization: validatedData.organization,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Failed to save diagram: ' + insertError.message);
    }

    console.log('Diagram saved successfully:', diagram.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: diagram,
        message: 'Diagrama unifilar salvo com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing unifilar diagram:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
