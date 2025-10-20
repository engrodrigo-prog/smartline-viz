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
  client = createClient<Database>(url, key, {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true
    }
  });
  console.info("[supabase] client inicializado");
} else {
  console.warn("[supabase] env ausente; pulando init (demo sem Supabase)");
}

export const supabase = client;
export default client;

export function getSupabase(): SupabaseClient<Database> {
  if (!client) {
    throw new Error(
      "Supabase não configurado neste demo. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ou VITE_SUPABASE_PUBLISHABLE_KEY) em apps/web/.env."
    );
  }
  return client;
}
