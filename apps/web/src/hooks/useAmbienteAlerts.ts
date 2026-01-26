import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseAmbienteAlertsOptions {
  status?: string;
  severity?: string;
  context?: string;
  kind?: string;
}

export const useAmbienteAlerts = (options: UseAmbienteAlertsOptions = {}) => {
  return useQuery({
    queryKey: ['ambiente-alerts', options],
    queryFn: async () => {
      if (!supabase) return [];
      let query = (supabase as any)
        .from('alerts_log')
        .select('*')
        .in('kind', ['vegetation', 'occupation', 'change_detection'])
        .order('ts', { ascending: false });

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.severity) {
        query = query.eq('severity', options.severity);
      }

      if (options.context) {
        query = query.eq('context', options.context);
      }

      if (options.kind) {
        query = query.eq('kind', options.kind);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(supabase),
    refetchInterval: supabase ? 30000 : false, // Atualizar a cada 30s
  });
};

export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes?: string }) => {
      if (!supabase) throw new Error('Supabase não configurado');
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await (supabase as any)
        .from('alerts_log')
        .update({
          status: 'acknowledged',
          ack_by: user?.id,
          ack_ts: new Date().toISOString(),
          ack_notes: notes,
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Alerta reconhecido');
      queryClient.invalidateQueries({ queryKey: ['ambiente-alerts'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reconhecer alerta: ${error.message}`);
    },
  });
};
