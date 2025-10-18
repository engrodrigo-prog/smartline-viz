import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseRastersOptions {
  line_code?: string;
  corridor_id?: string;
  type?: string;
}

export const useRasters = (options: UseRastersOptions = {}) => {
  return useQuery({
    queryKey: ['rasters', options],
    queryFn: async () => {
      let query = (supabase as any)
        .from('rasters')
        .select('*')
        .order('ts_acquired', { ascending: false });

      if (options.line_code) {
        query = query.eq('line_code', options.line_code);
      }

      if (options.corridor_id) {
        query = query.eq('corridor_id', options.corridor_id);
      }

      if (options.type) {
        query = query.eq('type', options.type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
  });
};
