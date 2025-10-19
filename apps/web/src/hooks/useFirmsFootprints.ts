import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FirmsFootprintsFilters {
  concessao?: string;
  minArea?: number;
  startDate?: string;
  endDate?: string;
}

export const useFirmsFootprints = (filters: FirmsFootprintsFilters = {}) => {
  return useQuery({
    queryKey: ['firms-footprints', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        concessao: filters.concessao || 'TODAS',
        min_area: (filters.minArea || 0).toString(),
      });

      if (filters.startDate) {
        params.append('start_date', filters.startDate);
      }
      if (filters.endDate) {
        params.append('end_date', filters.endDate);
      }

      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/queimadas-footprints`;
      const response = await fetch(`${baseUrl}?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(errorData.message || `HTTP ${response.status}: Falha ao buscar footprints`);
      }
      
      const data = await response.json();
      return data as GeoJSON.FeatureCollection;
    },
    refetchInterval: 300000, // Refresh every 5 minutes
    staleTime: 60000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
