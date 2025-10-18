import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FirmsKmlOptions {
  url?: string;
  enabled?: boolean;
}

export const useFirmsKml = (options: FirmsKmlOptions = {}) => {
  return useQuery({
    queryKey: ['firms-kml', options.url],
    queryFn: async () => {
      const params = options.url ? `?url=${encodeURIComponent(options.url)}` : '';
      
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/firms-fetch`;
      const response = await fetch(`${baseUrl}${params}`, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch FIRMS footprints`);
      }
      
      const data = await response.json();
      return data as GeoJSON.FeatureCollection;
    },
    refetchInterval: 600000, // Refresh every 10 minutes (footprints don't change frequently)
    staleTime: 300000, // 5 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: options.enabled !== false,
  });
};
