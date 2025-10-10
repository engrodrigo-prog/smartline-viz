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
      });

      if (filters.mode === 'archive' && filters.startDate && filters.endDate) {
        params.append('start_date', filters.startDate);
        params.append('end_date', filters.endDate);
      }

      const functionName = filters.mode === 'live' ? 'queimadas-live' : 'queimadas-archive';
      
      // Construir URL com query params
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
      const response = await fetch(`${baseUrl}?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        signal: AbortSignal.timeout(30000), // Timeout de 30s
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro da API:', errorText);
        throw new Error(`Erro ao buscar queimadas: ${response.status}`);
      }
      
      const data = await response.json();
      return data as GeoJSON.FeatureCollection;
    },
    refetchInterval: filters.mode === 'live' ? 30000 : false, // Atualiza a cada 30s em modo live
    staleTime: filters.mode === 'live' ? 30000 : 60000,
  });
};
