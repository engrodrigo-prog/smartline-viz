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

    const { classifications, fileName, importMetadata } = await req.json();
    
    if (!classifications || !Array.isArray(classifications)) {
      throw new Error('Classifications array is required');
    }

    console.log('Processing', classifications.length, 'classifications for user:', user.id);

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
        const featureMeta =
          stagingFeature.metadata && typeof stagingFeature.metadata === 'object'
            ? (stagingFeature.metadata as Record<string, unknown>)
            : {};
        const inheritedMetadata =
          featureMeta.importMetadata && typeof featureMeta.importMetadata === 'object'
            ? (featureMeta.importMetadata as Record<string, unknown>)
            : {};
        const metadata = {
          ...inheritedMetadata,
          ...(importMetadata && typeof importMetadata === 'object' ? importMetadata : {}),
        };
        const empresa = typeof metadata.empresa === 'string' ? metadata.empresa : null;
        const regiao = typeof metadata.regiao === 'string' ? metadata.regiao : null;
        const concessao = typeof metadata.concessao === 'string' ? metadata.concessao : null;
        const lineCode = typeof metadata.line_code === 'string' ? metadata.line_code : stagingFeature.feature_name;
        const lineName = typeof metadata.line_name === 'string' ? metadata.line_name : stagingFeature.feature_name;
        const tensaoKv = (() => {
          const raw = metadata.tensao_kv;
          if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
          if (typeof raw === 'string' && raw.trim()) {
            const next = Number(raw);
            return Number.isFinite(next) ? next : null;
          }
          return null;
        })();
        const referenceDate = typeof metadata.reference_date === 'string' ? metadata.reference_date : null;
        const normalizedMetadata = {
          ...metadata,
          line_code: lineCode,
          line_name: lineName,
          tensao_kv: tensaoKv,
          reference_date: referenceDate,
        };
        
        // Processar baseado na classificação
        if (classification === 'linha' || classification === 'linha_estrutura') {
          // Inserir linha
          if (stagingFeature.geometry_type === 'LineString') {
            const { error } = await supabase.from('linhas_transmissao').insert({
              codigo: lineCode,
              nome: lineName,
              geometry: stagingFeature.geometry,
              status: 'Ativa',
              empresa,
              concessao,
              regiao,
              tensao_kv: tensaoKv,
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
              empresa,
              concessao,
              regiao,
              tensao_kv: tensaoKv !== null ? String(tensaoKv) : null,
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
            empresa,
            concessao,
            regiao,
            tensao_kv: tensaoKv !== null ? String(tensaoKv) : null,
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
            empresa,
            concessao,
            regiao,
            data_ocorrencia: referenceDate,
            metadata: normalizedMetadata,
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
            empresa,
            concessao,
            regiao,
            tensao_kv: tensaoKv !== null ? String(tensaoKv) : null,
            metadata: {
              ...normalizedMetadata,
            },
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
