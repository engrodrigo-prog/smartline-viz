import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface QueimadasFilters {
  concessao?: string;
  minConf?: number;
  satelite?: string;
  maxKm?: number;
  mode: 'live' | 'archive';
  startDate?: string;
  endDate?: string;
}

export const useQueimadas = (filters: QueimadasFilters) => {
  return useQuery({
    queryKey: ['queimadas', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        concessao: filters.concessao || 'TODAS',
        min_conf: (filters.minConf || 50).toString(),
        sat: filters.satelite || 'ALL',
        max_km: (filters.maxKm || 1).toString(),
        mode: filters.concessao === 'BRASIL' ? 'brasil' : 'roi',
      });

      if (filters.mode === 'archive' && filters.startDate && filters.endDate) {
        params.append('start_date', filters.startDate);
        params.append('end_date', filters.endDate);
      }

      const functionName = filters.mode === 'live' ? 'queimadas-live' : 'queimadas-archive';
      
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
      const response = await fetch(`${baseUrl}?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        console.error('Erro da API:', errorData);
        throw new Error(errorData.message || `HTTP ${response.status}: Falha ao buscar queimadas`);
      }
      
      const data = await response.json();
      return data as GeoJSON.FeatureCollection;
    },
    refetchInterval: filters.mode === 'live' ? 30000 : false,
    staleTime: filters.mode === 'live' ? 30000 : 60000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
