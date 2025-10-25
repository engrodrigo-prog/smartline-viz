import { ENV } from "@/config/env";

/**
 * We treat the API as unavailable when running in demo mode without a configured backend URL.
 * On Vercel (static deployment) the default base would be "/api", but no serverless function exists.
 */
export const SHOULD_USE_DEMO_API =
  ENV.DEMO_MODE && (ENV.API_BASE_URL === "" || ENV.API_BASE_URL === "/api" || ENV.API_BASE_URL === undefined);

export const nowIso = () => new Date().toISOString();
