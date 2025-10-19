import { serve } from "@hono/node-server";
import { app } from "./app";
import { env } from "./env";

const port = env.port;

serve({
  fetch: app.fetch,
  port
});

console.log(`🚀 API ready on http://localhost:${port}`);
