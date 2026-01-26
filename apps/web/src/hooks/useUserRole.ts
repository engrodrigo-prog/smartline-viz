import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'admin' | 'analyst' | 'operator' | 'visitor' | 'cpfl_user' | null;

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRole() {
      try {
        if (!supabase) {
          setRole(null);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRole(null);
          setLoading(false);
          return;
        }

        // Query user_roles table
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching role:', error);
          setRole(null);
        } else if (roles && roles.length > 0) {
          // Se tiver múltiplas roles, priorizar admin
          const isAdmin = roles.some(r => r.role === 'admin');
          if (isAdmin) {
            setRole('admin');
          } else {
            setRole(roles[0].role as UserRole);
          }
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error('Error in useUserRole:', error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    fetchUserRole();
  }, []);

  return { 
    role, 
    loading,
    isAdmin: role === 'admin',
    isAnalyst: role === 'analyst',
    isOperator: role === 'operator',
  };
}
