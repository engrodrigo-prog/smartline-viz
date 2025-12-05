import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SESSION_START_KEY = "smartline-session-start";
const MAX_SESSION_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const client = supabase;
  const location = useLocation();
  const [hasSession, setHasSession] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [expiredAccess, setExpiredAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = Date.now();

    // Se não houver Supabase configurado, considera não autenticado
    if (!client) {
      setHasSession(false);
      setLoading(false);
      return;
    }

    // Supabase: verifica sessão real + expiração em 7 dias
    const checkSupabaseSession = async () => {
      try {
        const { data } = await client.auth.getSession();
        const session = data.session;
        if (!session?.user) {
          setHasSession(false);
          return;
        }

        if (typeof window === "undefined") {
          setHasSession(true);
          return;
        }

        let startIso = window.localStorage.getItem(SESSION_START_KEY);
        if (!startIso) {
          startIso = new Date().toISOString();
          window.localStorage.setItem(SESSION_START_KEY, startIso);
        }

        const startMs = Date.parse(startIso);
        if (Number.isFinite(startMs) && now - startMs >= MAX_SESSION_AGE_MS) {
          // Sessão expirada: força logout
          try {
            await client.auth.signOut();
          } catch {
            // ignora erro de signOut, apenas limpa localmente
          }
          window.localStorage.removeItem(SESSION_START_KEY);
          setHasSession(false);
          return;
        }

        // Busca profile para saber flags de troca de senha e expiração customizada
        const { data: profile, error } = await client
          .from("profiles")
          .select("must_change_password, expires_at")
          .eq("id", session.user.id)
          .single();

        if (error) {
          // Em caso de erro, ainda considera sessão válida, mas sem flags
          setHasSession(true);
          return;
        }

        if (profile?.expires_at) {
          const expMs = Date.parse(profile.expires_at as unknown as string);
          if (Number.isFinite(expMs) && now >= expMs) {
            setExpiredAccess(true);
            setHasSession(false);
            try {
              await client.auth.signOut();
            } catch {/* ignore */}
            window.localStorage.removeItem(SESSION_START_KEY);
            return;
          }
        }

        setMustChangePassword(Boolean(profile?.must_change_password));
        setHasSession(true);
      } finally {
        setLoading(false);
      }
    };

    void checkSupabaseSession();
  }, [client]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!hasSession) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (expiredAccess) {
    return <Navigate to="/login?expired=1" replace />;
  }

  return <>{children}</>;
};
