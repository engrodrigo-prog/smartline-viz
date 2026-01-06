import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FirmsKmlOptions {
  url?: string;
  enabled?: boolean;
  localFile?: string; // Path to local asset file
}

export const useFirmsKml = (options: FirmsKmlOptions = {}) => {
  return useQuery({
    queryKey: ['firms-kml', options.url, options.localFile],
    queryFn: async () => {
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/firms-fetch`;
      const apiKey =
        (import.meta.env.VITE_SUPABASE_ANON_KEY ??
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;
      const { data: sessionData } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      const token = sessionData.session?.access_token ?? apiKey ?? "";
      const headers: Record<string, string> = {};
      if (apiKey) headers["apikey"] = apiKey;
      if (token) headers["Authorization"] = `Bearer ${token}`;
      
      // Se tiver arquivo local, fazer upload
      if (options.localFile) {
        const localFileResponse = await fetch(options.localFile);
        const blob = await localFileResponse.blob();
        
        const formData = new FormData();
        formData.append('file', blob, options.localFile.split('/').pop() || 'local.kmz');
        
        const response = await fetch(baseUrl, {
          method: 'POST',
          headers,
          body: formData,
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.warn('[firms-kml] falha ao processar KMZ', { status: response.status, error: errorData });
          return { type: "FeatureCollection", features: [] } as GeoJSON.FeatureCollection;
        }
        
        const data = await response.json();
        return data as GeoJSON.FeatureCollection;
      }
      
      // Caso contrário, usar URL
      const params = options.url ? `?url=${encodeURIComponent(options.url)}` : '';
      const response = await fetch(`${baseUrl}${params}`, {
        headers,
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.warn('[firms-kml] falha ao buscar footprints', { status: response.status, error: errorData });
        return { type: "FeatureCollection", features: [] } as GeoJSON.FeatureCollection;
      }
      
      const data = await response.json();
      return data as GeoJSON.FeatureCollection;
    },
    refetchInterval: 600000, // Refresh every 10 minutes
    staleTime: 300000, // 5 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: options.enabled !== false,
  });
};
