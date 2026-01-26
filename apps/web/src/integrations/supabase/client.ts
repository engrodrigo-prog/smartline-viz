import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

const url = rawUrl?.trim();
const key = rawKey?.trim();

let client: SupabaseClient<Database> | null = null;

if (url && key) {
  const projectRef = (() => {
    try {
      const host = new URL(url).hostname;
      if (!host.endsWith(".supabase.co")) return null;
      return host.split(".")[0] || null;
    } catch {
      return null;
    }
  })();

  const storageKey = projectRef ? `sb-${projectRef}-auth-token` : undefined;
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
          storageKey
        ) {
          refreshTokenFailures += 1;
          if (refreshTokenFailures >= 2) {
            clearedBrokenSession = true;
            window.localStorage.removeItem(storageKey);
            window.localStorage.removeItem(`${storageKey}-code-verifier`);
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
      storageKey,
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

export function getSupabase(): SupabaseClient<Database> {
  if (!client) {
    throw new Error(
      "Supabase não configurado neste ambiente. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ou VITE_SUPABASE_PUBLISHABLE_KEY) em apps/web/.env.local (ou .env.*.local)."
    );
  }
  return client;
}
