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
      const apiKey =
        (import.meta.env.VITE_SUPABASE_ANON_KEY ??
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;
      const { data: sessionData } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      const token = sessionData.session?.access_token ?? apiKey ?? "";
      const headers: Record<string, string> = {};
      if (apiKey) headers["apikey"] = apiKey;
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${baseUrl}?${params.toString()}`, {
        headers,
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        console.warn('[queimadas] falha ao buscar', { status: response.status, error: errorData });
        return { type: "FeatureCollection", features: [] } as GeoJSON.FeatureCollection;
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
