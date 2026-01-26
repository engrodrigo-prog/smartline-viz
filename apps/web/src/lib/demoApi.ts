import { ENV } from "@/config/env";

/**
 * We treat the API as unavailable when running in demo mode without a configured backend URL.
 * In purely static deployments (publishing only `dist/`), the default base would be "/api" but there are no Functions.
 */
export const SHOULD_USE_DEMO_API =
  ENV.DEMO_MODE && (ENV.API_BASE_URL === "" || ENV.API_BASE_URL === "/api" || ENV.API_BASE_URL === undefined);

export const nowIso = () => new Date().toISOString();
