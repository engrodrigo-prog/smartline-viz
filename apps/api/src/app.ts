import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "@hono/logger";
import { cors } from "@hono/cors";
import { cookie, deleteCookie, getSignedCookie, setSignedCookie } from "@hono/cookie";
import { z } from "zod";

import { env, isProduction } from "./env";
import { fetchFirmsGeoJson, type FirmsPreset } from "./lib/firms";

const SESSION_COOKIE = "smartline_demo_session";

const loginSchema = z.object({
  display_name: z.string().min(2, "Informe um nome"),
  email: z.string().email().optional()
});

const presetSchema = z.enum(["12h", "24h", "48h", "7d"]);

interface DemoSession {
  id: string;
  display_name: string;
  email?: string;
  issued_at: string;
}

const resolveOrigin = (origin: string | undefined) => {
  if (!origin) {
    return env.allowedOrigins?.[0] ?? "http://localhost:5173";
  }

  if (!env.allowedOrigins || env.allowedOrigins.length === 0) {
    return origin;
  }

  return env.allowedOrigins.includes(origin) ? origin : env.allowedOrigins[0];
};

export const app = new Hono();

app.use("*", logger());
app.use("*", cookie());
app.use(
  "*",
  cors({
    origin: (origin) => resolveOrigin(origin),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    credentials: true,
    maxAge: 86400
  })
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/auth/demo/login", async (c) => {
  if (!env.sessionSecret) {
    throw new HTTPException(500, { message: "SESSION_SECRET não configurado" });
  }

  const payload = await c.req.json();
  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    throw new HTTPException(400, { message: parsed.error.issues[0]?.message ?? "Dados inválidos" });
  }

  const session: DemoSession = {
    id: `demo-${Date.now()}`,
    display_name: parsed.data.display_name,
    email: parsed.data.email,
    issued_at: new Date().toISOString()
  };

  await setSignedCookie(c, SESSION_COOKIE, JSON.stringify(session), env.sessionSecret, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: 60 * 60 * 24
  });

  return c.json({ user: session });
});

app.post("/auth/demo/logout", async (c) => {
  if (env.sessionSecret) {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
  }
  return c.json({ ok: true });
});

app.get("/auth/demo/me", async (c) => {
  if (!env.sessionSecret) {
    return c.json({ user: null });
  }

  const cookieValue = await getSignedCookie(c, env.sessionSecret, SESSION_COOKIE);
  if (!cookieValue) {
    return c.json({ user: null });
  }

  try {
    const session = JSON.parse(cookieValue) as DemoSession;
    return c.json({ user: session });
  } catch (error) {
    console.warn("Invalid session cookie", error);
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ user: null });
  }
});

app.get("/firms", async (c) => {
  const presetQuery = c.req.query("preset");
  const parsedPreset = presetSchema.safeParse(presetQuery);
  const preset = parsedPreset.success ? (parsedPreset.data as FirmsPreset) : "24h";

  const result = await fetchFirmsGeoJson(preset, env.firmsBaseUrl);

  return c.json({
    type: result.collection.type,
    features: result.collection.features,
    metadata: {
      preset,
      cached: result.cached,
      live: result.live,
      source: result.source
    }
  });
});
