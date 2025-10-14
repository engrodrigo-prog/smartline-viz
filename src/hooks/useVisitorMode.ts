import { supabase } from '@/integrations/supabase/client';

export const useVisitorMode = () => {
  const isVisitor = localStorage.getItem('visitor_mode') === 'true';
  
  const applyVisitorFilter = async (query: any) => {
    // Visitantes veem todos os dados (sem filtro user_id)
    // Usuários autenticados veem apenas seus dados
    if (!isVisitor) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        return query.eq('uploaded_by', user.id);
      }
    }
    return query;
  };
  
  return { isVisitor, applyVisitorFilter };
};
