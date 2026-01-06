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
import simulacoesRoutes from "./routes/simulacoes.js";
import lipowerlineRoutes from "./routes/lipowerline.js";
import mediaApiRoutes from "./routes/media_inspecoes.js";
import anomaliasRoutes from "./routes/anomalias.js";
import exportRoutes from "./routes/export.js";
import { readFileSync, existsSync, createReadStream } from "node:fs";
import { join } from "node:path";
import mime from "mime";
import nodemailer from "nodemailer";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => {
      // Return a concrete origin string to avoid 'true' in header
      const fallback = env.ALLOWED_ORIGINS[0] ?? "http://localhost:5173";
      if (!origin) return fallback;
      const allowed = env.ALLOWED_ORIGINS;
      const match = allowed.some((pat) => {
        if (!pat) return false;
        if (pat === "*") return true; // will return origin below
        if (pat.startsWith("*.")) {
          const suffix = pat.slice(1); // ".example.com"
          return origin.endsWith(suffix);
        }
        return pat === origin;
      });
      return match ? origin : fallback;
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

app.post("/admin/send-approval-email", async (c) => {
  try {
    const body = await c.req.json<{
      email: string;
      full_name: string;
      days: number;
      type?: "new" | "extend";
    }>();

    const { email, full_name, days, type } = body;
    if (!email || !full_name || !days) {
      return c.json({ error: "Parâmetros inválidos" }, 400);
    }

    const host = env.SMTP_HOST;
    const port = env.SMTP_PORT ?? 587;
    const user = env.SMTP_USER;
    const pass = env.SMTP_PASS;
    const from = env.EMAIL_FROM ?? "admin@smartline.pro";

    if (!host || !user || !pass) {
      console.warn("[email] SMTP não configurado; pulando envio.");
      return c.json({ ok: true, skipped: "smtp_not_configured" });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const subject =
      type === "extend"
        ? "Extensão de acesso ao Smartline"
        : "Acesso autorizado ao Smartline AssetHealth";

    const text = [
      `Olá ${full_name},`,
      "",
      type === "extend"
        ? `Sua extensão de acesso ao Smartline AssetHealth foi aprovada.`
        : `Seu acesso ao Smartline AssetHealth foi aprovado.`,
      `Prazo de acesso: ${days} dia(s) a partir desta mensagem.`,
      "",
      "Você poderá acessar o ambiente em breve com as credenciais fornecidas pela equipe.",
      "",
      "Atenciosamente,",
      "Equipe Smartline",
    ].join("\n");

    await transporter.sendMail({
      from,
      to: email,
      subject,
      text,
    });

    return c.json({ ok: true });
  } catch (err: any) {
    console.error("[email] falha ao enviar e-mail de aprovação", err);
    return c.json({ error: err?.message ?? "Falha ao enviar e-mail" }, 500);
  }
});

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
app.route("/", lipowerlineRoutes);
app.route("/api", lipowerlineRoutes); // compat
app.route("/simulacoes", simulacoesRoutes);
app.route("/api/simulacoes", simulacoesRoutes); // compat
app.route("/media", mediaApiRoutes);
app.route("/api/media", mediaApiRoutes); // compat
app.route("/anomalias", anomaliasRoutes);
app.route("/api/anomalias", anomaliasRoutes); // compat
app.route("/export", exportRoutes);
app.route("/api/export", exportRoutes); // compat

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
