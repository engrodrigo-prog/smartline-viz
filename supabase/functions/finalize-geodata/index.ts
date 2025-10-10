import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClassificationItem {
  id: string;
  classification: string;
  customClassification?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { classifications, fileName } = await req.json();
    
    if (!classifications || !Array.isArray(classifications)) {
      throw new Error('Classifications array is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Processing', classifications.length, 'classifications');

    const stats = {
      linhas: 0,
      estruturas: 0,
      eventos: 0,
      outros: 0,
    };
    const errors: string[] = [];

    for (const item of classifications) {
      try {
        // Buscar feature do staging
        const { data: stagingFeature, error: fetchError } = await supabase
          .from('geodata_staging')
          .select('*')
          .eq('id', item.id)
          .single();

        if (fetchError || !stagingFeature) {
          errors.push(`Feature ${item.id} não encontrada no staging`);
          continue;
        }

        const classification = item.classification;
        
        // Processar baseado na classificação
        if (classification === 'linha' || classification === 'linha_estrutura') {
          // Inserir linha
          if (stagingFeature.geometry_type === 'LineString') {
            const { error } = await supabase.from('linhas_transmissao').insert({
              codigo: stagingFeature.feature_name,
              nome: stagingFeature.feature_name,
              geometry: stagingFeature.geometry,
              status: 'Ativa',
            });
            
            if (error) {
              errors.push(`Erro ao inserir linha "${stagingFeature.feature_name}": ${error.message}`);
            } else {
              stats.linhas++;
            }
          }
          
          // Se linha_estrutura, também inserir pontos como estruturas
          if (classification === 'linha_estrutura' && stagingFeature.geometry_type === 'Point') {
            const { error } = await supabase.from('estruturas').insert({
              codigo: stagingFeature.feature_name,
              geometry: stagingFeature.geometry,
              tipo: 'Torre',
              estado_conservacao: 'Bom',
            });
            
            if (error) {
              errors.push(`Erro ao inserir estrutura "${stagingFeature.feature_name}": ${error.message}`);
            } else {
              stats.estruturas++;
            }
          }
        } else if (classification === 'estrutura') {
          // Inserir estrutura
          const { error } = await supabase.from('estruturas').insert({
            codigo: stagingFeature.feature_name,
            geometry: stagingFeature.geometry,
            tipo: 'Torre',
            estado_conservacao: 'Bom',
          });
          
          if (error) {
            errors.push(`Erro ao inserir estrutura "${stagingFeature.feature_name}": ${error.message}`);
          } else {
            stats.estruturas++;
          }
        } else if (classification === 'evento') {
          // Inserir evento
          const { error } = await supabase.from('eventos_geo').insert({
            nome: stagingFeature.feature_name,
            tipo_evento: item.customClassification || 'Geral',
            geometry: stagingFeature.geometry,
            status: 'Ativo',
          });
          
          if (error) {
            errors.push(`Erro ao inserir evento "${stagingFeature.feature_name}": ${error.message}`);
          } else {
            stats.eventos++;
          }
        } else if (classification === 'outros') {
          // Inserir em outros
          const { error } = await supabase.from('geodata_outros').insert({
            nome: stagingFeature.feature_name,
            categoria: item.customClassification || 'Outros',
            geometry: stagingFeature.geometry,
          });
          
          if (error) {
            errors.push(`Erro ao inserir outro geodado "${stagingFeature.feature_name}": ${error.message}`);
          } else {
            stats.outros++;
          }
        }

        // Marcar como processado
        await supabase
          .from('geodata_staging')
          .update({ processed: true })
          .eq('id', item.id);

      } catch (error) {
        console.error('Error processing classification:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Erro ao processar classificação: ${errorMsg}`);
      }
    }

    // Limpar staging e arquivo
    if (fileName) {
      await supabase.storage.from('geodata-uploads').remove([fileName]);
      await supabase
        .from('geodata_staging')
        .delete()
        .eq('file_name', fileName);
    }

    console.log('Finalization complete:', stats);

    return new Response(JSON.stringify({
      success: true,
      stats,
      errors,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in finalize-geodata function:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMsg,
        stats: { linhas: 0, estruturas: 0, eventos: 0, outros: 0 },
        errors: [errorMsg],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});