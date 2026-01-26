import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const app = new Hono();

type FeatureCollection = {
  type: 'FeatureCollection';
  features: any[];
  meta?: Record<string, unknown>;
};

const allowedOrigins = (() => {
  const raw = process.env.ALLOWED_ORIGINS ?? process.env.VITE_ALLOWED_ORIGINS ?? process.env.VITE_SITE_ORIGIN ?? '';
  const parsed = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (parsed.length) return parsed;

  return ['https://smartline-gpcad.enerlytics.pro', 'http://localhost:5173', 'http://127.0.0.1:5173', '*.vercel.app'];
})();

const emptyFeatureCollection = (meta?: Record<string, unknown>): FeatureCollection => ({
  type: 'FeatureCollection',
  features: [],
  meta,
});

const nowIso = () => new Date().toISOString();

const supabaseEnv = (() => {
  const url = (process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').trim();
  const key = (
    process.env.VITE_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    ''
  ).trim();
  return { url, key, enabled: Boolean(url && key) };
})();

const createRlsClient = (authHeader: string) => {
  if (!supabaseEnv.enabled) return null;
  return createClient(supabaseEnv.url, supabaseEnv.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: authHeader },
    },
  });
};

app.use(
  '*',
  cors({
    origin: (origin) => {
      const fallback = allowedOrigins[0] ?? 'http://localhost:5173';
      if (!origin) return fallback;
      const match = allowedOrigins.some((pat) => {
        if (!pat) return false;
        if (pat === '*') return true;
        if (pat.startsWith('*.')) {
          const suffix = pat.slice(1); // ".vercel.app"
          return origin.endsWith(suffix);
        }
        return pat === origin;
      });
      return match ? origin : fallback;
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
app.get('/firms', (c) => c.json(emptyFeatureCollection({ lastFetchedAt: nowIso(), source: 'stub' })));
app.get('/firms/wfs', (c) =>
  c.json(
    emptyFeatureCollection({
      typenames: (c.req.query('typenames') ?? '').split(',').filter(Boolean),
      bbox: c.req.query('bbox') ?? 'brazil',
      count: Number(c.req.query('count') ?? 0),
      source: 'stub',
      cached: false,
      lastFetchedAt: nowIso(),
      formatAttempt: [c.req.query('format') ?? 'auto'],
    }),
  ),
);
app.get('/weather', (c) =>
  c.json({
    status: 'ok',
    message: 'Demo weather endpoint',
  }),
);

// ---- Demo auth (landing/demo topbar) ----
app.get('/auth/demo/me', (c) => c.json({ user: null }));
app.post('/auth/demo/login', async (c) => {
  const body = await c.req.json().catch(() => ({} as any));
  const displayName = typeof body?.display_name === 'string' ? body.display_name : 'Guest';
  const email = typeof body?.email === 'string' ? body.email : undefined;
  return c.json({
    ok: true,
    user: { id: `demo-${Math.random().toString(36).slice(2, 10)}`, display_name: displayName, email, issued_at: nowIso() },
  });
});
app.post('/auth/demo/logout', (c) => c.json({ ok: true }));

// ---- Lipowerline API (stub MVP) ----
app.get('/linhas', async (c) => {
  if (!supabaseEnv.enabled) {
    return c.json([]);
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json([]);

  const supabase = createRlsClient(authHeader);
  if (!supabase) return c.json([]);

  const { data, error } = await supabase
    .from('line_asset')
    .select('line_code,name,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[api] /linhas error:', error);
    return c.json({ error: error.message }, 500);
  }

  return c.json(
    (data ?? []).map((row: any) => ({
      linha_id: row.line_code,
      codigo_linha: row.line_code,
      nome_linha: row.name ?? row.line_code,
      tensao_kv: null,
      concessionaria: null,
      regiao: null,
    })),
  );
});

app.get('/cenarios', (c) => {
  const linhaId = c.req.query('linha_id');
  if (!linhaId) return c.json([]);
  return c.json([
    {
      cenario_id: `${linhaId}-base`,
      descricao: 'Base (ingestão)',
      data_referencia: nowIso(),
      tipo_cenario: 'base',
      status: 'ativo',
    },
  ]);
});

app.get('/kpi-linha', async (c) => {
  if (!supabaseEnv.enabled) {
    return c.json([]);
  }

  const linhaId = c.req.query('linha_id');
  if (!linhaId) return c.json([]);

  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json([]);

  const supabase = createRlsClient(authHeader);
  if (!supabase) return c.json([]);

  const cenarioId = c.req.query('cenario_id') ?? `${linhaId}-base`;

  const [{ data: line, error: lineError }, { count: spansCount, error: spansError }, { count: towersCount, error: towersError }] =
    await Promise.all([
      supabase.from('line_asset').select('line_code,name').eq('line_code', linhaId).maybeSingle(),
      supabase.from('span_analysis').select('id', { count: 'exact', head: true }).eq('line_code', linhaId),
      supabase.from('tower_asset').select('id', { count: 'exact', head: true }).eq('line_code', linhaId),
    ]);

  if (lineError || spansError || towersError) {
    const message = lineError?.message ?? spansError?.message ?? towersError?.message ?? 'query_failed';
    console.error('[api] /kpi-linha error:', { lineError, spansError, towersError });
    return c.json({ error: message }, 500);
  }

  return c.json([
    {
      linha_id: linhaId,
      codigo_linha: linhaId,
      nome_linha: line?.name ?? line?.line_code ?? linhaId,
      cenario_id: cenarioId,
      cenario_descricao: 'Base (ingestão)',
      tipo_cenario: 'base',
      km_linha: 0,
      total_vaos: spansCount ?? 0,
      arvores_criticas: 0,
      cruzamentos_criticos: 0,
      total_riscos_vegetacao: 0,
      total_torres: towersCount ?? 0,
    },
  ]);
});
app.get('/risco-vegetacao', (c) => c.json([]));
app.get('/risco-queda', (c) => c.json([]));
app.get('/cruzamentos', (c) => c.json([]));
app.get('/tratamentos', (c) => c.json([]));
app.post('/simulacoes/riscos', async (c) => {
  const payload = await c.req.json().catch(() => null);
  const linhaId = payload?.linhaId ?? 'LT-001';
  const cenarioId = payload?.cenarioId ?? `${linhaId}-pre-demo`;
  return c.json({
    linhaId,
    cenarioId,
    totalVaos: 120,
    totalVaosSelecionados: Array.isArray(payload?.vaoIds) ? payload.vaoIds.length : 10,
    riscoAtual: 100,
    riscoPosTratamento: 75,
    reducaoAbsoluta: 25,
    reducaoPercentual: 25,
    selecionados: [],
  });
});

// ---- Media API (stub MVP) ----
app.get('/media/search', (c) => c.json({ total: 0, items: [] }));
app.post('/media/upload', (c) => c.json({ error: 'not_implemented' }, 501));
app.get('/media/jobs', (c) => c.json([]));
app.get('/media/jobs/:jobId', (c) => c.json({ error: 'job_not_found' }, 404));
app.get('/media/items', (c) => c.json({ items: [], count: 0 }));

// ---- Anomalias (stub MVP) ----
app.get('/anomalias', (c) => c.json([]));
app.post('/anomalias', (c) => c.json({ error: 'not_implemented' }, 501));
app.patch('/anomalias/:anomaliaId', (c) => c.json({ error: 'not_implemented' }, 501));

// ---- Demandas (stub MVP) ----
app.get('/demandas', (c) =>
  c.json({
    items: [],
    total: 0,
    disponiveis: { status: ['Aberta', 'Em Execução', 'Em Validação', 'Concluída'], executorTipos: ['Própria', 'Terceiros'], temas: [] },
  }),
);
app.get('/demandas/analytics/comparativo', (c) =>
  c.json({
    atualizadoEm: nowIso(),
    periodo: { inicio: nowIso(), fim: nowIso() },
    resumos: [],
    mapaHeat: [],
  }),
);
app.post('/demandas', (c) => c.json({ error: 'not_implemented' }, 501));
app.put('/demandas/:id', (c) => c.json({ error: 'not_implemented' }, 501));
app.delete('/demandas/:id', (c) => c.json({ error: 'not_implemented' }, 501));

// ---- Missões (stub MVP) ----
app.post('/missoes/tipos', (c) =>
  c.json({
    tipos: [
      {
        id: 'LiDAR_Corredor',
        titulo: 'LiDAR - Corredor',
        descricao: 'Captura de corredor com LiDAR embarcado para geração de nuvem de pontos.',
        campos: [],
        recomenda: [],
      },
      {
        id: 'Circular_Torre',
        titulo: 'Circular - Torre',
        descricao: 'Missão circular para inspeção visual detalhada da torre.',
        campos: [],
        recomenda: [],
      },
    ],
  }),
);
app.get('/missoes', (c) => c.json({ items: [] }));
app.post('/missoes/criar', (c) =>
  c.json({
    id: `MIS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    tipo: 'LiDAR_Corredor',
    nome: 'Nova missão (demo)',
    parametros: {},
    mediaPattern: 'DEMO',
    criadoEm: nowIso(),
    atualizadoEm: nowIso(),
    exports: [],
  }),
);

// ---- Feature status (stub MVP) ----
app.get('/status/:layer', (c) => {
  const id = c.req.query('id') ?? 'unknown';
  return c.json({ id, status: 'OK', updatedAt: nowIso() });
});
app.get('/status/:layer/bulk', (c) => {
  const ids = (c.req.query('ids') ?? '').split(',').filter(Boolean);
  return c.json(ids.map((id) => ({ id, status: 'OK', updatedAt: nowIso() })));
});
app.post('/status/:layer', async (c) => {
  const body = await c.req.json().catch(() => ({} as any));
  const id = typeof body?.id === 'string' ? body.id : 'unknown';
  const status = typeof body?.status === 'string' ? body.status : 'OK';
  return c.json({ id, status, notes: body?.notes, cameraUrl: body?.cameraUrl, updatedAt: nowIso() });
});

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
