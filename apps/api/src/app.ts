import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "./env.js";
import uploadRoutes from "./routes/upload.js";
import { firmsRoutes } from "./routes/firms.js";
import { statusRoutes } from "./routes/status.js";
import { travessiasRoutes } from "./routes/travessias.js";
import { alagadosRoutes } from "./routes/alagados.js";
import { pointcloudRoutes } from "./routes/pointclouds.js";
import { mediaRoutes } from "./routes/media.js";
import { missoesRoutes } from "./routes/missoes.js";
import { demandasRoutes } from "./routes/demandas.js";
import weatherRoutes from "./routes/weather.js";
import { readFileSync, existsSync, createReadStream } from "node:fs";
import { join } from "node:path";
import mime from "mime";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => {
      // Return a concrete origin string to avoid 'true' in header
      const fallback = env.ALLOWED_ORIGINS[0] ?? "http://localhost:5173";
      if (!origin) return fallback;
      return env.ALLOWED_ORIGINS.includes(origin) ? origin : fallback;
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Type", "Content-Disposition"],
    maxAge: 86400,
  })
);

app.use("*", logger());

app.get("/health", (c) => c.json({ status: "ok" }));

// Demo: retorna usuário atual (sem sessão real nesta versão)
app.get("/auth/demo/me", (c) => {
  return c.json({ user: null });
});

app.post("/auth/demo/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const displayName = body.display_name ?? "Guest";
  return c.json({ ok: true, user: { id: "demo", display_name: displayName, issued_at: new Date().toISOString() } });
});

app.post("/auth/demo/logout", (c) => c.json({ ok: true }));

app.route("/upload", uploadRoutes);
app.route("/firms", firmsRoutes);
app.route("/status", statusRoutes);
app.route("/travessias", travessiasRoutes);
app.route("/alagados", alagadosRoutes);
app.route("/pointclouds", pointcloudRoutes);
app.route("/media", mediaRoutes);
app.route("/missoes", missoesRoutes);
app.route("/demandas", demandasRoutes);
app.route("/weather", weatherRoutes);

app.get("/jobs/:id/status", (c) => {
  const p = join("workers/media/outbox", `${c.req.param("id")}.status.json`);
  if (!existsSync(p)) return c.json({ state: "queued" });
  return c.json(JSON.parse(readFileSync(p, "utf8")));
});

app.get("/jobs/:id/result", (c) => {
  const p = join("workers/media/outbox", `${c.req.param("id")}.geojson`);
  if (!existsSync(p)) return c.json({ error: "not ready" }, 404);
  return c.json(JSON.parse(readFileSync(p, "utf8")));
});

app.get("/processed/*", (c) => {
  const sub = c.req.path.replace(/^\/processed\//, "");
  const file = join("apps/api/.data/processed", sub);
  if (!existsSync(file)) return c.text("Not Found", 404);
  const type = mime.getType(file) || "application/octet-stream";
  return new Response(createReadStream(file) as any, { headers: { "Content-Type": type } });
});

export default app;
