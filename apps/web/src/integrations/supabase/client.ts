import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

const url = rawUrl?.trim();
const key = rawKey?.trim();
const projectRef = (() => {
  try {
    const host = new URL(url ?? "").hostname;
    if (!host.endsWith(".supabase.co")) return null;
    return host.split(".")[0] || null;
  } catch {
    return null;
  }
})();

export const SUPABASE_AUTH_STORAGE_KEY = projectRef ? `sb-${projectRef}-auth-token` : undefined;

let client: SupabaseClient<Database> | null = null;

if (url && key) {
  let clearedBrokenSession = false;
  let refreshTokenFailures = 0;

  const safeFetch: typeof fetch = async (input, init) => {
    try {
      return await fetch(input, init);
    } catch (err) {
      try {
        const target =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        const isRefreshTokenCall =
          target.includes("/auth/v1/token") && target.includes("grant_type=refresh_token");

        if (
          isRefreshTokenCall &&
          !clearedBrokenSession &&
          typeof window !== "undefined" &&
          SUPABASE_AUTH_STORAGE_KEY
        ) {
          refreshTokenFailures += 1;
          if (refreshTokenFailures >= 2) {
            clearedBrokenSession = true;
            window.localStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY);
            window.localStorage.removeItem(`${SUPABASE_AUTH_STORAGE_KEY}-code-verifier`);
            window.localStorage.removeItem("smartline-session-start");
            if (import.meta.env.DEV) {
              console.warn("[supabase] refresh token falhou; sessão local removida");
            }
          }
        }
      } catch {
        // ignore cleanup errors
      }
      throw err;
    }
  };

  client = createClient<Database>(url, key, {
    global: {
      fetch: safeFetch,
    },
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      storageKey: SUPABASE_AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true
    }
  });
  if (import.meta.env.DEV) {
    console.info("[supabase] client inicializado");
  }
} else {
  console.warn("[supabase] env ausente; pulando init (demo sem Supabase)");
}

export const supabase = client;
export default client;

const broadcastAuthEvent = (event: "SIGNED_IN" | "SIGNED_OUT", session: Session | null) => {
  if (typeof window === "undefined" || !SUPABASE_AUTH_STORAGE_KEY || typeof window.BroadcastChannel === "undefined") {
    return;
  }

  try {
    const channel = new window.BroadcastChannel(SUPABASE_AUTH_STORAGE_KEY);
    channel.postMessage({ event, session });
    channel.close();
  } catch {
    // Falha no broadcast não deve impedir a persistência local.
  }
};

export const persistSupabaseSession = (session: Session | null | undefined) => {
  if (typeof window === "undefined" || !SUPABASE_AUTH_STORAGE_KEY) return false;
  if (!session) {
    window.localStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY);
    window.localStorage.removeItem(`${SUPABASE_AUTH_STORAGE_KEY}-code-verifier`);
    broadcastAuthEvent("SIGNED_OUT", null);
    return false;
  }

  const normalizedSession: Session = {
    ...session,
    expires_at:
      typeof session.expires_at === "number"
        ? session.expires_at
        : typeof session.expires_in === "number"
          ? Math.floor(Date.now() / 1000) + session.expires_in
          : undefined,
  };

  window.localStorage.setItem(SUPABASE_AUTH_STORAGE_KEY, JSON.stringify(normalizedSession));
  broadcastAuthEvent("SIGNED_IN", normalizedSession);
  return true;
};

export const clearPersistedSupabaseSession = () => {
  if (typeof window === "undefined") return;
  persistSupabaseSession(null);
  window.localStorage.removeItem("smartline-session-start");
};

export function getSupabase(): SupabaseClient<Database> {
  if (!client) {
    throw new Error(
      "Supabase não configurado neste ambiente. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ou VITE_SUPABASE_PUBLISHABLE_KEY) em apps/web/.env.local (ou .env.*.local)."
    );
  }
  return client;
}
