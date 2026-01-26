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

// ---- File assets (docs/images catalog) ----
app.get('/files', async (c) => {
  if (!supabaseEnv.enabled) return c.json([]);

  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json([]);

  const supabase = createRlsClient(authHeader);
  if (!supabase) return c.json([]);

  const lineCode = c.req.query('line_code') ?? undefined;
  const format = (c.req.query('format') ?? 'list').toLowerCase();

  let query = supabase
    .from('file_asset')
    .select(
      'id,tenant_id,line_code,category,description,bucket_id,object_path,file_name,original_name,mime_type,size_bytes,created_by,created_at,geom,meta',
    )
    .order('created_at', { ascending: false });

  if (lineCode) query = query.eq('line_code', lineCode);

  const { data, error } = await query;

  if (error) {
    const message = (error as any)?.message ?? 'query_failed';
    const code = (error as any)?.code ?? null;
    const lower = String(message).toLowerCase();
    if (code === '42P01' || lower.includes('file_asset')) {
      return c.json(
        {
          error: 'file_asset_not_initialized',
          hint: 'Aplique as migrations do Supabase (apps/web/supabase/migrations), incluindo 20260126170000_create_file_assets.sql.',
        },
        501,
      );
    }
    console.error('[api] /files error:', error);
    return c.json({ error: message }, 500);
  }

  const rows = data ?? [];

  if (format === 'geojson') {
    const features = rows
      .filter((row: any) => row.geom)
      .map((row: any) => ({
        type: 'Feature',
        id: row.id,
        geometry: typeof row.geom === 'string' ? JSON.parse(row.geom) : row.geom,
        properties: {
          line_code: row.line_code,
          category: row.category,
          description: row.description,
          bucket_id: row.bucket_id,
          object_path: row.object_path,
          file_name: row.file_name,
          original_name: row.original_name,
          mime_type: row.mime_type,
          size_bytes: row.size_bytes,
          created_at: row.created_at,
        },
      }));

    return c.json({ type: 'FeatureCollection', features });
  }

  const withUrls = await Promise.all(
    rows.map(async (row: any) => {
      const bucket = (row.bucket_id as string | null) ?? 'asset-files';
      let url: string | null = null;
      try {
        const { data: signed, error: signedError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(row.object_path, 60 * 60);
        if (!signedError) url = signed?.signedUrl ?? null;
      } catch {
        // ignore signed url failures
      }
      return { ...row, url };
    }),
  );

  return c.json(withUrls);
});

app.post('/files', async (c) => {
  if (!supabaseEnv.enabled) {
    return c.json({ error: 'supabase_not_configured' }, 500);
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);

  const supabase = createRlsClient(authHeader);
  if (!supabase) return c.json({ error: 'supabase_not_configured' }, 500);

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  const user = auth?.user ?? null;
  if (authError || !user) {
    return c.json({ error: 'Invalid authentication token' }, 401);
  }

  const body = await c.req.json().catch(() => ({} as any));
  const lineCode = typeof body?.line_code === 'string' ? body.line_code.trim() : '';
  const objectPath = typeof body?.object_path === 'string' ? body.object_path.trim() : '';
  const bucketId = typeof body?.bucket_id === 'string' && body.bucket_id.trim() ? body.bucket_id.trim() : 'asset-files';

  if (!lineCode) return c.json({ error: 'line_code_required' }, 400);
  if (!objectPath) return c.json({ error: 'object_path_required' }, 400);

  const { data: appUser, error: appUserError } = await supabase
    .from('app_user')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle();

  if (appUserError) {
    console.error('[api] /files app_user error:', appUserError);
    return c.json({ error: appUserError.message }, 500);
  }

  const tenantId = (appUser?.tenant_id as string | null | undefined) ?? null;
  if (!tenantId) {
    return c.json(
      {
        error: 'tenant_not_set',
        hint: 'Faça a ingestão de uma linha (KML/KMZ) primeiro para criar/associar sua empresa (tenant).',
      },
      400,
    );
  }

  const { data: lineAsset, error: lineError } = await supabase
    .from('line_asset')
    .select('line_code')
    .eq('line_code', lineCode)
    .maybeSingle();

  if (lineError) {
    console.error('[api] /files line_asset error:', lineError);
    return c.json({ error: lineError.message }, 500);
  }
  if (!lineAsset) {
    return c.json({ error: 'line_not_found', line_code: lineCode }, 400);
  }

  const lat = typeof body?.lat === 'number' ? body.lat : undefined;
  const lon = typeof body?.lon === 'number' ? body.lon : undefined;
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lon);

  const { data: inserted, error: insertError } = await supabase
    .from('file_asset')
    .insert({
      tenant_id: tenantId,
      line_code: lineCode,
      category: typeof body?.category === 'string' ? body.category.trim() : null,
      description: typeof body?.description === 'string' ? body.description.trim() : null,
      bucket_id: bucketId,
      object_path: objectPath,
      file_name: typeof body?.file_name === 'string' ? body.file_name : null,
      original_name: typeof body?.original_name === 'string' ? body.original_name : null,
      mime_type: typeof body?.mime_type === 'string' ? body.mime_type : null,
      size_bytes: typeof body?.size_bytes === 'number' ? Math.round(body.size_bytes) : null,
      created_by: user.id,
      geom: hasPoint ? `SRID=4326;POINT(${lon} ${lat})` : null,
      meta: typeof body?.meta === 'object' && body.meta !== null ? body.meta : {},
    })
    .select()
    .single();

  if (insertError) {
    const message = (insertError as any)?.message ?? 'insert_failed';
    const code = (insertError as any)?.code ?? null;
    const lower = String(message).toLowerCase();
    if (code === '42P01' || lower.includes('file_asset')) {
      return c.json(
        {
          error: 'file_asset_not_initialized',
          hint: 'Aplique as migrations do Supabase (apps/web/supabase/migrations), incluindo 20260126170000_create_file_assets.sql.',
        },
        501,
      );
    }
    console.error('[api] /files insert error:', insertError);
    return c.json({ error: message }, 400);
  }

  return c.json({ success: true, data: inserted });
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
