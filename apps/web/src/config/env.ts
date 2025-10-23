export const ENV = {
  APP_NAME: import.meta.env.VITE_APP_NAME ?? 'SmartLine-Viz',
  MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN ?? '',
  JOTFORM_URL: import.meta.env.VITE_JOTFORM_URL ?? '',
  // In production on Vercel, prefer /api (serverless functions)
  API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL ??
    (typeof window !== 'undefined' && window.location?.origin?.includes('vercel.app') ? '/api' : 'http://localhost:8080'),
  DEMO_MODE: String(import.meta.env.VITE_DEMO_MODE ?? 'true') === 'true',
  SITE_ORIGIN: import.meta.env.VITE_SITE_ORIGIN ?? (typeof window !== 'undefined' ? window.location.origin : ''),
}
