import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import nodemailer from 'nodemailer';

const app = new Hono();

app.use(
  '*',
  cors({
    origin: (origin) => {
      const fallback = 'http://localhost:5173';
      if (!origin) return fallback;
      return origin;
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Type', 'Content-Disposition'],
    maxAge: 86400,
  }),
);

app.use('*', logger());

app.get('/health', (c) => c.json({ status: 'ok', runtime: 'vercel-serverless' }));
app.get('/firms', (c) =>
  c.json({
    meta: { lastFetchedAt: new Date().toISOString() },
    features: [],
  }),
);
app.get('/weather', (c) =>
  c.json({
    status: 'ok',
    message: 'Demo weather endpoint',
  }),
);

app.post('/admin/send-approval-email', async (c) => {
  try {
    const body = await c.req.json<{
      email: string;
      full_name: string;
      days: number;
      type?: 'new' | 'extend';
    }>();

    const { email, full_name, days, type } = body;
    if (!email || !full_name || !days) {
      return c.json({ error: 'Parâmetros inválidos' }, 400);
    }

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.EMAIL_FROM ?? 'admin@smartline.pro';

    if (!host || !user || !pass) {
      console.warn('[email] SMTP não configurado; pulando envio.');
      return c.json({ ok: true, skipped: 'smtp_not_configured' });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const subject =
      type === 'extend'
        ? 'Extensão de acesso ao Smartline'
        : 'Acesso autorizado ao Smartline AssetHealth';

    const text = [
      `Olá ${full_name},`,
      '',
      type === 'extend'
        ? `Sua extensão de acesso ao Smartline AssetHealth foi aprovada.`
        : `Seu acesso ao Smartline AssetHealth foi aprovado.`,
      `Prazo de acesso: ${days} dia(s) a partir desta mensagem.`,
      '',
      'Você poderá acessar o ambiente em breve com as credenciais fornecidas pela equipe.',
      '',
      'Atenciosamente,',
      'Equipe Smartline',
    ].join('\n');

    await transporter.sendMail({
      from,
      to: email,
      subject,
      text,
    });

    return c.json({ ok: true });
  } catch (err: any) {
    console.error('[email] falha ao enviar e-mail de aprovação', err);
    return c.json({ error: err?.message ?? 'Falha ao enviar e-mail' }, 500);
  }
});

export default app;
