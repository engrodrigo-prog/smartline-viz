import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FootprintAlert {
  id: string;
  tipo_alerta: string;
  nivel_alerta: string;
  linha_codigo: string | null;
  concessao: string | null;
  regiao: string | null;
  distancia_m: number | null;
  area_ameacada_ha: number | null;
  estrutura_codigo: string | null;
  status: string | null;
  data_criacao: string | null;
  metadata: any;
  footprint_id: number | null;
}

export const useFootprintAlerts = (filters?: {
  zona?: string;
  nivelRisco?: string;
  linha?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: ['footprint-alerts', filters],
    queryFn: async () => {
      let query = supabase
        .from('alertas_queimadas')
        .select('*')
        .eq('tipo_alerta', 'area_queimada')
        .order('data_criacao', { ascending: false });

      // Aplicar filtros
      if (filters?.zona) {
        query = query.eq('metadata->>zona_alarme', filters.zona);
      }

      if (filters?.nivelRisco) {
        query = query.eq('nivel_alerta', filters.nivelRisco);
      }

      if (filters?.linha) {
        query = query.ilike('linha_codigo', `%${filters.linha}%`);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      } else {
        // Por padrão, mostrar apenas alertas ativos
        query = query.eq('status', 'ativo');
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data as FootprintAlert[];
    },
    refetchInterval: 60000, // Refetch a cada 1 minuto
  });
};
