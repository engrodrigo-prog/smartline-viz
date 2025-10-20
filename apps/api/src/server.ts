import { serve } from "@hono/node-server";
import app from "./app.js";
import { env } from "./env.js";

serve({ fetch: app.fetch, port: env.PORT });
console.log(`[api] listening on http://localhost:${env.PORT}`);
