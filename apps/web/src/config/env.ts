export const ENV = {
  APP_NAME: import.meta.env.VITE_APP_NAME ?? 'SmartLine',
  MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN ?? '',
  JOTFORM_URL: import.meta.env.VITE_JOTFORM_URL ?? '',
  // Prefer demo local (sem backend) quando DEMO_MODE estiver ativo
  DEMO_MODE: (() => {
    const explicit = import.meta.env.VITE_DEMO_MODE;
    if (explicit !== undefined) return String(explicit) === 'true';
    const hasSupabase = Boolean(
      import.meta.env.VITE_SUPABASE_URL &&
        (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
    );
    return !hasSupabase;
  })(),
  DEMO_BYPASS_AUTH: (() => {
    const explicit = import.meta.env.VITE_DEMO_BYPASS_AUTH;
    if (explicit !== undefined) return String(explicit) === 'true';
    const hasSupabase = Boolean(
      import.meta.env.VITE_SUPABASE_URL &&
        (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
    );
    return !hasSupabase;
  })(),
  CONTACT_EMAIL: import.meta.env.VITE_CONTACT_EMAIL ?? 'guilherme@gpcad.com.br',
  // Em demo, não definir base para evitar chamadas reais.
  API_BASE_URL: (() => {
    const demoMode = (() => {
      const explicit = import.meta.env.VITE_DEMO_MODE;
      if (explicit !== undefined) return String(explicit) === 'true';
      const hasSupabase = Boolean(
        import.meta.env.VITE_SUPABASE_URL &&
          (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
      );
      return !hasSupabase;
    })();
    const explicit = import.meta.env.VITE_API_BASE_URL as string | undefined;
    // Em modo demo, ignorar base explícita para evitar erros quando o backend não estiver rodando.
    if (demoMode) return '';
    if (explicit) return explicit;
    if (typeof window === 'undefined') return '';
    const origin = window.location?.origin ?? '';
    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
    return isLocal ? 'http://localhost:8080' : '/api';
  })(),
  SITE_ORIGIN: import.meta.env.VITE_SITE_ORIGIN ?? (typeof window !== 'undefined' ? window.location.origin : ''),
}
