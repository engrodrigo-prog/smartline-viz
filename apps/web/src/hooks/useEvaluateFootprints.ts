import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EvaluateFootprintsParams {
  footprints: GeoJSON.FeatureCollection;
  concessao?: string;
}

interface EvaluationResult {
  success: boolean;
  alertas_criados: number;
  criticos: number;
  altos: number;
  medios: number;
  total_footprints: number;
}

export const useEvaluateFootprints = () => {
  return useMutation({
    mutationFn: async ({ footprints, concessao }: EvaluateFootprintsParams): Promise<EvaluationResult> => {
      if (!supabase) {
        throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
      }
      const { data, error } = await supabase.functions.invoke('evaluate-footprint-alerts', {
        body: { footprints, concessao }
      });

      if (error) {
        throw error;
      }

      return data as EvaluationResult;
    },
  });
};
