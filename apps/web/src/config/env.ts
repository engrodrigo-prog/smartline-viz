export const ENV = {
  APP_NAME: import.meta.env.VITE_APP_NAME ?? 'SmartLine-Viz',
  MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN ?? '',
  JOTFORM_URL: import.meta.env.VITE_JOTFORM_URL ?? '',
  // Prefer demo local (sem backend) quando DEMO_MODE estiver ativo
  DEMO_MODE: String(import.meta.env.VITE_DEMO_MODE ?? 'true') === 'true',
  DEMO_BYPASS_AUTH: String(import.meta.env.VITE_DEMO_BYPASS_AUTH ?? 'true') === 'true',
  CONTACT_EMAIL: import.meta.env.VITE_CONTACT_EMAIL ?? 'guilherme@gpcad.com.br',
  // Em demo, não definir base para evitar chamadas reais.
  API_BASE_URL: (() => {
    const demoMode = String(import.meta.env.VITE_DEMO_MODE ?? 'true') === 'true';
    const explicit = import.meta.env.VITE_API_BASE_URL as string | undefined;
    // Em modo demo, ignorar base explícita para evitar erros quando o backend não estiver rodando.
    if (demoMode) return '';
    if (explicit) return explicit;
    const isVercel = typeof window !== 'undefined' && window.location?.origin?.includes('vercel.app');
    return isVercel ? '/api' : 'http://localhost:8080';
  })(),
  SITE_ORIGIN: import.meta.env.VITE_SITE_ORIGIN ?? (typeof window !== 'undefined' ? window.location.origin : ''),
}
