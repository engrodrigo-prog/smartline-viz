import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DetectChangesParams {
  raster_t0_id: string;
  raster_t1_id: string;
  corridor_id?: string;
  threshold?: number;
  min_area_m2?: number;
  context?: 'vegetation_management' | 'corridor_invasion';
}

export const useChangeDetection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DetectChangesParams) => {
      const { data, error } = await supabase.functions.invoke('detect-changes', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      toast.success(`${data.changes_detected} mudanças detectadas`);
      
      // Avaliar alertas automaticamente
      if (data.change_sets && data.change_sets.length > 0) {
        const change_set_ids = data.change_sets.map((cs: any) => cs.id);
        
        await supabase.functions.invoke('evaluate-alerts', {
          body: { change_set_ids },
        });
      }

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['change-sets'] });
      queryClient.invalidateQueries({ queryKey: ['ambiente-alerts'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao detectar mudanças: ${error.message}`);
    },
  });
};
