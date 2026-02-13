import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

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

const supabaseServiceEnv = (() => {
  const url = (process.env.SUPABASE_URL ?? supabaseEnv.url ?? '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? '').trim();
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

const createServiceClient = () => {
  if (!supabaseServiceEnv.enabled) return null;
  return createClient(supabaseServiceEnv.url, supabaseServiceEnv.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const bearerTokenFromAuthHeader = (authHeader: string | null | undefined): string | null => {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1]?.trim();
  return token ? token : null;
};

const isJwtLike = (token: string): boolean => {
  // Basic shape check (header.payload.signature). Does not validate signature.
  if (!token) return false;
  if (token.includes(' ')) return false;
  const parts = token.split('.');
  return parts.length === 3 && parts.every((p) => p.length > 0);
};

const jwtSubject = (token: string): string | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    if (!payload) return null;
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    const json = JSON.parse(decoded) as { sub?: unknown };
    return typeof json.sub === 'string' ? json.sub : null;
  } catch {
    return null;
  }
};

const statusForSupabaseAuthError = (error: any): 401 | null => {
  const message = String(error?.message ?? '').toLowerCase();
  const code = String(error?.code ?? '').toUpperCase();

  if (code === 'PGRST301') return 401;
  if (message.includes('jwt') || message.includes('token')) return 401;
  if (message.includes('unauthorized')) return 401;

  return null;
};

const asErrorLike = (err: unknown) =>
  typeof err === 'object' && err !== null
    ? (err as any)
    : ({ message: typeof err === 'string' ? err : String(err) } as any);

type ApiErrorPayload = {
  error: string;
  message: string;
  details?: unknown;
};

const jsonError = (c: any, status: number, error: string, message: string, details?: unknown) => {
  const payload: ApiErrorPayload = { error, message };
  if (details !== undefined) payload.details = details;
  return c.json(payload, status);
};

const parseJsonBody = async <T,>(c: any, schema: z.ZodType<T>) => {
  const raw = await c.req.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      res: jsonError(c, 400, 'invalid_body', 'Corpo da requisição inválido', parsed.error.flatten()),
    };
  }
  return { ok: true as const, data: parsed.data };
};

const parseQuery = <T,>(c: any, schema: z.ZodType<T>) => {
  const raw = c.req.query();
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      res: jsonError(c, 400, 'invalid_query', 'Parâmetros de query inválidos', parsed.error.flatten()),
    };
  }
  return { ok: true as const, data: parsed.data };
};

const logJson = (level: 'debug' | 'info' | 'warn' | 'error', event: string, data: Record<string, unknown>) => {
  const record = { level, event, ts: new Date().toISOString(), ...data };
  if (level === 'error') console.error(JSON.stringify(record));
  else if (level === 'warn') console.warn(JSON.stringify(record));
  else console.info(JSON.stringify(record));
};

const requireRlsSupabase = (c: any) => {
  if (!supabaseEnv.enabled) {
    return {
      ok: false as const,
      res: jsonError(
        c,
        503,
        'supabase_not_configured',
        'Supabase não está configurado neste ambiente (defina SUPABASE_URL e SUPABASE_ANON_KEY).',
      ),
    };
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return { ok: false as const, res: jsonError(c, 401, 'missing_authorization', 'Authorization ausente') };
  }
  const token = bearerTokenFromAuthHeader(authHeader);
  if (!token) {
    return { ok: false as const, res: jsonError(c, 401, 'invalid_authorization', 'Authorization inválido') };
  }
  if (!isJwtLike(token)) {
    return {
      ok: false as const,
      res: jsonError(
        c,
        401,
        'invalid_token_format',
        'Authorization deve ser um JWT no formato header.payload.signature',
      ),
    };
  }
  const supabase = createRlsClient(`Bearer ${token}`);
  if (!supabase) {
    return { ok: false as const, res: jsonError(c, 503, 'supabase_not_configured', 'Supabase não configurado') };
  }
  return { ok: true as const, supabase, token };
};

const pointWkt4326 = (lng: number, lat: number) => `SRID=4326;POINT(${lng} ${lat})`;

const LocationPayloadSchema = z
  .object({
    method: z.enum(['gps', 'map_pin', 'manual_address']),
    coords: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .optional(),
    captured_at: z.string().datetime().optional(),
    accuracy_m: z.number().positive().optional(),
    address_text: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.method !== 'manual_address' && !value.coords) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'coords é obrigatório para gps/map_pin', path: ['coords'] });
    }
    if (value.method === 'manual_address' && !value.address_text && !value.coords) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe address_text (ou coords) para manual_address',
        path: ['address_text'],
      });
    }
  });

const applyLocationPatch = (
  patch: Record<string, unknown>,
  location?: z.infer<typeof LocationPayloadSchema> | null,
) => {
  if (!location) return patch;
  const capturedAt = location.captured_at ?? new Date().toISOString();
  const next: Record<string, unknown> = {
    ...patch,
    location_method: location.method,
    location_captured_at: capturedAt,
  };
  if (location.address_text) next.address_text = location.address_text;
  if (location.coords) next.geom = pointWkt4326(location.coords.lng, location.coords.lat);
  if (location.accuracy_m !== undefined) {
    const currentMeta = (patch.metadata && typeof patch.metadata === 'object') ? (patch.metadata as any) : {};
    next.metadata = { ...currentMeta, location_accuracy_m: location.accuracy_m };
  }
  return next;
};

const mapLineAssetToLinha = (row: any) => ({
  linha_id: row.line_code,
  codigo_linha: row.line_code,
  nome_linha: row.name ?? row.line_code,
  tensao_kv: null,
  concessionaria: null,
  regiao: null,
});

const resolveTenantForToken = async (token: string) => {
  const supabase = createServiceClient();
  if (!supabase) {
    return { ok: false as const, status: 500 as const, error: 'service_role_not_configured' as const };
  }

  let auth: any;
  let authError: any;
  try {
    const result = await supabase.auth.getUser(token);
    auth = result.data;
    authError = result.error;
  } catch (err) {
    authError = asErrorLike(err);
  }

  const user = auth?.user ?? null;
  if (authError || !user) {
    const status = statusForSupabaseAuthError(authError) ?? 401;
    return { ok: false as const, status: status as 401, error: authError?.message ?? 'invalid_token' };
  }

  let appUser: any;
  let appUserError: any;
  try {
    const result = await supabase.from('app_user').select('tenant_id').eq('id', user.id).maybeSingle();
    appUser = result.data;
    appUserError = result.error;
  } catch (err) {
    appUserError = asErrorLike(err);
  }

  if (appUserError) {
    return { ok: false as const, status: 500 as const, error: appUserError.message };
  }

  const tenantId = (appUser?.tenant_id as string | null | undefined) ?? null;
  if (!tenantId) {
    return { ok: true as const, tenantId: null, supabase };
  }

  return { ok: true as const, tenantId, supabase };
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
  const token = bearerTokenFromAuthHeader(authHeader);
  if (!token) {
    return c.json([]);
  }
  if (!isJwtLike(token)) {
    return c.json([]);
  }

  const supabase = createRlsClient(`Bearer ${token}`);
  if (!supabase) return c.json([]);

  let data: any[] | null | undefined;
  let error: any;
  try {
    const result = await supabase
      .from('line_asset')
      .select('line_code,name,created_at')
      .order('created_at', { ascending: false });
    data = result.data;
    error = result.error;
  } catch (err) {
    error = asErrorLike(err);
  }

  if (error) {
    const authStatus = statusForSupabaseAuthError(error);
    if (authStatus) {
      return c.json([]);
    }

    // Fall back to service-role querying (still scoped by tenant) when RLS policies are misconfigured.
    const resolved = await resolveTenantForToken(token);
    if (resolved.ok) {
      if (!resolved.tenantId) return c.json([]);
      const { data: lines, error: linesError } = await resolved.supabase
        .from('line_asset')
        .select('line_code,name,created_at')
        .eq('tenant_id', resolved.tenantId)
        .order('created_at', { ascending: false });

      if (!linesError) {
        return c.json((lines ?? []).map(mapLineAssetToLinha));
      }

      console.error('[api] /linhas fallback error:', linesError);
      return c.json([]);
    }

    console.error('[api] /linhas error:', error);
    if (resolved.status === 401) {
      return c.json([]);
    }
    if (resolved.status === 500 && resolved.error === 'service_role_not_configured') {
      return c.json([]);
    }
    return c.json([]);
  }

  return c.json(
    (data ?? []).map(mapLineAssetToLinha),
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
  const token = bearerTokenFromAuthHeader(authHeader);
  if (!token) {
    return c.json({ error: 'invalid_authorization_header' }, 401);
  }
  if (!isJwtLike(token)) {
    return c.json(
      {
        error: 'invalid_token_format',
        message: 'Authorization deve ser um JWT no formato header.payload.signature',
      },
      401,
    );
  }

  const supabase = createRlsClient(`Bearer ${token}`);
  if (!supabase) return c.json([]);

  const cenarioId = c.req.query('cenario_id') ?? `${linhaId}-base`;

  const [lineResult, spansResult, towersResult] = await Promise.all([
    (async () => {
      try {
        return await supabase.from('line_asset').select('line_code,name').eq('line_code', linhaId).maybeSingle();
      } catch (err) {
        return { data: null, error: asErrorLike(err) } as any;
      }
    })(),
    (async () => {
      try {
        return await supabase.from('span_analysis').select('id', { count: 'exact', head: true }).eq('line_code', linhaId);
      } catch (err) {
        return { count: null, error: asErrorLike(err) } as any;
      }
    })(),
    (async () => {
      try {
        return await supabase.from('tower_asset').select('id', { count: 'exact', head: true }).eq('line_code', linhaId);
      } catch (err) {
        return { count: null, error: asErrorLike(err) } as any;
      }
    })(),
  ]);

  const line = (lineResult as any).data;
  const lineError = (lineResult as any).error;
  const spansCount = (spansResult as any).count;
  const spansError = (spansResult as any).error;
  const towersCount = (towersResult as any).count;
  const towersError = (towersResult as any).error;

  if (lineError || spansError || towersError) {
    const message = lineError?.message ?? spansError?.message ?? towersError?.message ?? 'query_failed';
    const authStatus = statusForSupabaseAuthError(lineError ?? spansError ?? towersError);
    if (authStatus) {
      return c.json({ error: 'unauthorized', message }, authStatus);
    }

    const resolved = await resolveTenantForToken(token);
    if (resolved.ok) {
      if (!resolved.tenantId) return c.json([]);
      const [
        { data: line2, error: line2Error },
        { count: spansCount2, error: spans2Error },
        { count: towersCount2, error: towers2Error },
      ] = await Promise.all([
        resolved.supabase
          .from('line_asset')
          .select('line_code,name')
          .eq('tenant_id', resolved.tenantId)
          .eq('line_code', linhaId)
          .maybeSingle(),
        resolved.supabase
          .from('span_analysis')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', resolved.tenantId)
          .eq('line_code', linhaId),
        resolved.supabase
          .from('tower_asset')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', resolved.tenantId)
          .eq('line_code', linhaId),
      ]);

      if (!line2Error && !spans2Error && !towers2Error) {
        return c.json([
          {
            linha_id: linhaId,
            codigo_linha: linhaId,
            nome_linha: (line2 as any)?.name ?? (line2 as any)?.line_code ?? linhaId,
            cenario_id: cenarioId,
            cenario_descricao: 'Base (ingestão)',
            tipo_cenario: 'base',
            km_linha: 0,
            total_vaos: spansCount2 ?? 0,
            arvores_criticas: 0,
            cruzamentos_criticos: 0,
            total_riscos_vegetacao: 0,
            total_torres: towersCount2 ?? 0,
          },
        ]);
      }
    }

    if (!resolved.ok && resolved.status === 401) {
      return c.json({ error: 'unauthorized', message: resolved.error }, 401);
    }

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
  const token = bearerTokenFromAuthHeader(authHeader);
  if (!token) return c.json({ error: 'invalid_authorization_header' }, 401);
  if (!isJwtLike(token)) {
    return c.json(
      {
        error: 'invalid_token_format',
        message: 'Authorization deve ser um JWT no formato header.payload.signature',
      },
      401,
    );
  }

  const supabase = createRlsClient(`Bearer ${token}`);
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

  let data: any[] | null | undefined;
  let error: any;
  try {
    const result = await query;
    data = result.data as any;
    error = result.error;
  } catch (err) {
    error = asErrorLike(err);
  }

  if (error) {
    const authStatus = statusForSupabaseAuthError(error);
    if (authStatus) {
      return c.json({ error: 'unauthorized', message: error.message }, authStatus);
    }
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
  const token = bearerTokenFromAuthHeader(authHeader);
  if (!token) return c.json({ error: 'invalid_authorization_header' }, 401);
  if (!isJwtLike(token)) {
    return c.json(
      {
        error: 'invalid_token_format',
        message: 'Authorization deve ser um JWT no formato header.payload.signature',
      },
      401,
    );
  }

  const supabase = createRlsClient(`Bearer ${token}`);
  if (!supabase) return c.json({ error: 'supabase_not_configured' }, 500);

  let auth: any;
  let authError: any;
  try {
    const result = await supabase.auth.getUser(token);
    auth = result.data;
    authError = result.error;
  } catch (err) {
    authError = asErrorLike(err);
  }
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

// ---- Vegetação (Poda & Roçada) ----
const VegUuidSchema = z.string().uuid();
const VegDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Use formato YYYY-MM-DD');

const VegLimitQuerySchema = z
  .string()
  .optional()
  .transform((value) => {
    const raw = value ? Number(value) : 50;
    if (!Number.isFinite(raw) || raw <= 0) return 50;
    return Math.min(Math.floor(raw), 200);
  });

const VegAnomalyCreateSchema = z
  .object({
    id: VegUuidSchema.optional(),
    status: z
      .enum(['open', 'triaged', 'scheduled', 'in_progress', 'resolved', 'canceled'])
      .optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    anomaly_type: z
      .enum([
        'encroachment',
        'risk_tree',
        'regrowth',
        'fallen_tree',
        'blocked_access',
        'environmental_restriction',
        'other',
      ])
      .optional(),
    source: z.enum(['field', 'satellite', 'lidar', 'drone', 'customer', 'other']).optional(),
    title: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
    asset_ref: z.string().trim().min(1).optional(),
    due_date: VegDateSchema.optional(),
    tags: z.array(z.string().trim().min(1)).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    location: LocationPayloadSchema.optional(),
  })
  .strict();

const VegAnomalyUpdateSchema = VegAnomalyCreateSchema.partial().omit({ title: true }).extend({
  title: z.string().trim().min(1).optional(),
});

const VegInspectionCreateSchema = z
  .object({
    id: VegUuidSchema.optional(),
    anomaly_id: VegUuidSchema.optional(),
    status: z.enum(['open', 'closed']).optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional().nullable(),
    requires_action: z.boolean().optional(),
    suggested_action_type: z
      .enum([
        'pruning',
        'mowing',
        'laser_pruning',
        'tree_removal',
        'clearing',
        'inspection',
        'verification',
        'other',
      ])
      .optional()
      .nullable(),
    findings: z.record(z.string(), z.unknown()).optional(),
    notes: z.string().trim().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    location: LocationPayloadSchema.optional(),
  })
  .strict();

const VegWorkOrderCreateSchema = z
  .object({
    id: VegUuidSchema.optional(),
    anomaly_id: VegUuidSchema.optional(),
    inspection_id: VegUuidSchema.optional(),
    status: z
      .enum(['pending', 'assigned', 'in_progress', 'executed', 'verified', 'closed', 'canceled'])
      .optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    team_id: VegUuidSchema.optional().nullable(),
    scheduled_start: z.string().datetime().optional().nullable(),
    scheduled_end: z.string().datetime().optional().nullable(),
    notes: z.string().trim().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    location: LocationPayloadSchema.optional(),
  })
  .strict();

const VegActionCreateSchema = z
  .object({
    id: VegUuidSchema.optional(),
    work_order_id: VegUuidSchema.optional().nullable(),
    anomaly_id: VegUuidSchema.optional().nullable(),
    action_type: z.enum([
      'pruning',
      'mowing',
      'laser_pruning',
      'tree_removal',
      'clearing',
      'inspection',
      'verification',
      'other',
    ]),
    status: z
      .enum(['planned', 'assigned', 'in_progress', 'executed', 'verified', 'closed', 'canceled'])
      .optional(),
    planned_start: z.string().datetime().optional().nullable(),
    planned_end: z.string().datetime().optional().nullable(),
    executed_at: z.string().datetime().optional().nullable(),
    team_id: VegUuidSchema.optional().nullable(),
    operator_id: VegUuidSchema.optional().nullable(),
    quantity: z.number().optional().nullable(),
    unit: z.string().trim().min(1).optional().nullable(),
    notes: z.string().trim().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    location: LocationPayloadSchema.optional(),
  })
  .strict();

const VegAuditCreateSchema = z
  .object({
    id: VegUuidSchema.optional(),
    work_order_id: VegUuidSchema.optional().nullable(),
    action_id: VegUuidSchema.optional().nullable(),
    result: z.enum(['approved', 'rejected']),
    checklist: z.record(z.string(), z.unknown()).optional(),
    notes: z.string().trim().optional(),
    corrective_required: z.boolean().optional(),
    corrective_notes: z.string().trim().optional().nullable(),
  })
  .strict();

const VegRiskCreateSchema = z
  .object({
    id: VegUuidSchema.optional(),
    related_anomaly_id: VegUuidSchema.optional().nullable(),
    related_work_order_id: VegUuidSchema.optional().nullable(),
    category: z.enum(['vegetation', 'tree_fall', 'environmental', 'access', 'recurrence', 'other']).optional(),
    probability: z.number().int().min(1).max(5),
    impact: z.number().int().min(1).max(5),
    sla_days: z.number().int().positive().optional().nullable(),
    status: z.enum(['open', 'mitigated', 'accepted', 'closed']).optional(),
    notes: z.string().trim().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const VegScheduleCreateSchema = z
  .object({
    id: VegUuidSchema.optional(),
    title: z.string().trim().min(1),
    start_at: z.string().datetime(),
    end_at: z.string().datetime(),
    team_id: VegUuidSchema.optional().nullable(),
    operator_id: VegUuidSchema.optional().nullable(),
    related_anomaly_id: VegUuidSchema.optional().nullable(),
    related_work_order_id: VegUuidSchema.optional().nullable(),
    related_action_id: VegUuidSchema.optional().nullable(),
    status: z.enum(['planned', 'confirmed', 'done', 'canceled']).optional(),
    location_text: z.string().trim().optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    location: LocationPayloadSchema.optional(),
  })
  .strict();

const VegDocumentCreateSchema = z
  .object({
    id: VegUuidSchema.optional(),
    doc_type: z
      .enum(['ASV', 'license', 'environmental_report', 'photo_report', 'kml', 'geojson', 'pdf', 'other'])
      .optional(),
    title: z.string().trim().min(1),
    description: z.string().trim().optional().nullable(),
    file_path: z.string().trim().min(1),
    mime_type: z.string().trim().optional().nullable(),
    size_bytes: z.number().int().positive().optional().nullable(),
    sha256: z.string().trim().optional().nullable(),
    linked_anomaly_id: VegUuidSchema.optional().nullable(),
    linked_work_order_id: VegUuidSchema.optional().nullable(),
    linked_action_id: VegUuidSchema.optional().nullable(),
    tags: z.array(z.string().trim().min(1)).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    location: LocationPayloadSchema.optional(),
  })
  .strict();

const VegEvidenceCreateSchema = z
  .object({
    id: VegUuidSchema.optional(),
    evidence_type: z.enum(['photo', 'video', 'pdf', 'note', 'ai_result', 'other']).optional(),
    file_path: z.string().trim().min(1).optional().nullable(),
    text_note: z.string().trim().min(1).optional().nullable(),
    linked_anomaly_id: VegUuidSchema.optional().nullable(),
    linked_inspection_id: VegUuidSchema.optional().nullable(),
    linked_work_order_id: VegUuidSchema.optional().nullable(),
    linked_action_id: VegUuidSchema.optional().nullable(),
    captured_at: z.string().datetime().optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    location: LocationPayloadSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasFile = Boolean(value.file_path);
    const hasNote = Boolean(value.text_note);
    if (!hasFile && !hasNote) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe file_path (upload) ou text_note',
        path: ['file_path'],
      });
    }
  });

const VegInspectionUpdateSchema = VegInspectionCreateSchema.partial();
const VegWorkOrderUpdateSchema = VegWorkOrderCreateSchema.partial();
const VegActionUpdateSchema = VegActionCreateSchema.partial();
const VegAuditUpdateSchema = VegAuditCreateSchema.partial();
const VegRiskUpdateSchema = VegRiskCreateSchema.partial();
const VegScheduleUpdateSchema = VegScheduleCreateSchema.partial();
const VegDocumentUpdateSchema = VegDocumentCreateSchema.partial();
const VegEvidenceUpdateSchema = VegEvidenceCreateSchema.partial();

const VegReportsQuerySchema = z
  .object({
    date_from: VegDateSchema,
    date_to: VegDateSchema,
    group_by: z.enum(['day', 'week', 'month']).default('day'),
    dimension: z.enum(['period', 'team', 'operator', 'location']).default('period'),
    team_id: VegUuidSchema.optional(),
    operator_id: VegUuidSchema.optional(),
  })
  .strict();

const AiTopKSchema = z.array(
  z.object({
    species: z.string(),
    scientific_name: z.string().optional(),
    confidence: z.number().min(0).max(1),
  }),
);

const AiSpeciesResponseSchema = z.object({
  species: z.string(),
  scientific_name: z.string().optional(),
  confidence: z.number().min(0).max(1),
  top_k: AiTopKSchema.default([]),
  model_version: z.string().default('unknown'),
  notes: z.string().optional(),
});

const VegSpeciesIdentifyRequestSchema = z
  .object({
    evidence_id: VegUuidSchema.optional(),
    image_base64: z.string().min(10).optional(),
    file_path: z.string().trim().min(1).optional(),
    mime_type: z.string().trim().min(1).optional(),
    confidence_threshold: z.number().min(0).max(1).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasSomeInput = Boolean(value.image_base64 || value.file_path || value.evidence_id);
    if (!hasSomeInput) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe image_base64, file_path ou evidence_id',
        path: ['image_base64'],
      });
    }
  });

const OpenAiChatCompletionSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string().nullable().optional(),
      }),
    }),
  ),
});

const extractJsonObject = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
};

const createSignedEvidenceUrl = async (
  authSupabase: any,
  filePath: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> => {
  try {
    const { data, error } = await authSupabase.storage.from('veg-evidence').createSignedUrl(filePath, 60 * 10);
    if (!error && data?.signedUrl) return { ok: true, url: data.signedUrl };
  } catch {
    // ignore and try service fallback
  }

  const service = createServiceClient();
  if (!service) {
    return { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY não configurado para assinar URL do Storage.' };
  }
  const { data, error } = await service.storage.from('veg-evidence').createSignedUrl(filePath, 60 * 10);
  if (error) return { ok: false, error: error.message };
  if (!data?.signedUrl) return { ok: false, error: 'signedUrl ausente' };
  return { ok: true, url: data.signedUrl };
};

const VegSpeciesIdentificationsQuerySchema = z
  .object({
    evidence_id: VegUuidSchema,
    limit: VegLimitQuerySchema,
  })
  .strict();

const VegSpeciesIdentificationUpdateSchema = z
  .object({
    status: z.enum(['suggested', 'confirmed', 'corrected', 'rejected']),
    confirmed_species: z.string().trim().min(1).nullable().optional(),
    confirmed_scientific_name: z.string().trim().min(1).nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.status === 'confirmed' || value.status === 'corrected') {
      if (!value.confirmed_species || !value.confirmed_species.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe confirmed_species ao confirmar/corrigir',
          path: ['confirmed_species'],
        });
      }
    }
    if (value.status === 'rejected') {
      const hasConfirmed = typeof value.confirmed_species === 'string' && value.confirmed_species.trim().length > 0;
      if (hasConfirmed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'confirmed_species deve ser nulo ao rejeitar',
          path: ['confirmed_species'],
        });
      }
    }
  });

app.get('/vegetacao/dashboard', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const supabase = auth.supabase;

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayIso = startOfDay.toISOString();
  const monthIso = startOfMonth.toISOString();

  const openStatuses = ['open', 'triaged', 'scheduled', 'in_progress'];
  const woPendingStatuses = ['pending', 'assigned', 'in_progress'];

  const [
    anomaliesToday,
    anomaliesMonth,
    openAnomalies,
    openLow,
    openMed,
    openHigh,
    openCrit,
    workOrdersPending,
    actionsMonth,
    inspectionsRecent,
    anomaliesRecent,
    actionsRecent,
    auditsPending,
  ] = await Promise.all([
    supabase.from('veg_anomaly').select('id', { count: 'exact', head: true }).gte('created_at', dayIso),
    supabase.from('veg_anomaly').select('id', { count: 'exact', head: true }).gte('created_at', monthIso),
    supabase
      .from('veg_anomaly')
      .select('id', { count: 'exact', head: true })
      .in('status', openStatuses),
    supabase
      .from('veg_anomaly')
      .select('id', { count: 'exact', head: true })
      .in('status', openStatuses)
      .eq('severity', 'low'),
    supabase
      .from('veg_anomaly')
      .select('id', { count: 'exact', head: true })
      .in('status', openStatuses)
      .eq('severity', 'medium'),
    supabase
      .from('veg_anomaly')
      .select('id', { count: 'exact', head: true })
      .in('status', openStatuses)
      .eq('severity', 'high'),
    supabase
      .from('veg_anomaly')
      .select('id', { count: 'exact', head: true })
      .in('status', openStatuses)
      .eq('severity', 'critical'),
    supabase
      .from('veg_work_order')
      .select('id', { count: 'exact', head: true })
      .in('status', woPendingStatuses),
    supabase.from('veg_action').select('id', { count: 'exact', head: true }).gte('executed_at', monthIso),
    supabase.from('veg_inspection').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('veg_anomaly').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('veg_action').select('*').order('created_at', { ascending: false }).limit(5),
    supabase
      .from('veg_action')
      .select('id, veg_audit!left(id)', { count: 'exact', head: true })
      .eq('status', 'executed')
      .is('veg_audit.id', null),
  ]);

  const firstError =
    anomaliesToday.error ??
    anomaliesMonth.error ??
    openAnomalies.error ??
    openLow.error ??
    openMed.error ??
    openHigh.error ??
    openCrit.error ??
    workOrdersPending.error ??
    actionsMonth.error ??
    inspectionsRecent.error ??
    anomaliesRecent.error ??
    actionsRecent.error ??
    auditsPending.error;

  if (firstError) {
    const authStatus = statusForSupabaseAuthError(firstError);
    if (authStatus) return jsonError(c, authStatus, 'unauthorized', firstError.message);
    return jsonError(c, 500, 'db_error', firstError.message);
  }

  return c.json({
    kpis: {
      anomalies_today: anomaliesToday.count ?? 0,
      anomalies_month: anomaliesMonth.count ?? 0,
      anomalies_open_total: openAnomalies.count ?? 0,
      anomalies_open_by_severity: {
        low: openLow.count ?? 0,
        medium: openMed.count ?? 0,
        high: openHigh.count ?? 0,
        critical: openCrit.count ?? 0,
      },
      work_orders_pending: workOrdersPending.count ?? 0,
      actions_executed_month: actionsMonth.count ?? 0,
      audits_pending: auditsPending.count ?? 0,
      pending_sync: 0,
    },
    recent: {
      inspections: inspectionsRecent.data ?? [],
      anomalies: anomaliesRecent.data ?? [],
      actions: actionsRecent.data ?? [],
    },
    generated_at: nowIso(),
  });
});

app.get('/vegetacao/anomalias', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const queryParsed = parseQuery(
    c,
    z.object({
      limit: VegLimitQuerySchema,
      status: z.string().optional(),
      severity: z.string().optional(),
      q: z.string().optional(),
    }),
  );
  if (!queryParsed.ok) return queryParsed.res;

  const supabase = auth.supabase;
  const limit = (queryParsed.data as any).limit as number;
  const status = (queryParsed.data as any).status as string | undefined;
  const severity = (queryParsed.data as any).severity as string | undefined;
  const q = (queryParsed.data as any).q as string | undefined;

  let request = supabase.from('veg_anomaly').select('*').order('created_at', { ascending: false }).limit(limit);
  if (status) request = request.eq('status', status);
  if (severity) request = request.eq('severity', severity);
  if (q) request = request.ilike('title', `%${q}%`);

  const { data, error } = await request;
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ items: data ?? [] });
});

app.post('/vegetacao/anomalias', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const bodyParsed = await parseJsonBody(c, VegAnomalyCreateSchema);
  if (!bodyParsed.ok) return bodyParsed.res;

  const payload = bodyParsed.data;
  const baseRow: Record<string, unknown> = {
    ...(payload.id ? { id: payload.id } : {}),
    ...(payload.status ? { status: payload.status } : {}),
    ...(payload.severity ? { severity: payload.severity } : {}),
    ...(payload.anomaly_type ? { anomaly_type: payload.anomaly_type } : {}),
    ...(payload.source ? { source: payload.source } : {}),
    title: payload.title,
    ...(payload.description ? { description: payload.description } : {}),
    ...(payload.asset_ref ? { asset_ref: payload.asset_ref } : {}),
    ...(payload.due_date ? { due_date: payload.due_date } : {}),
    ...(payload.tags ? { tags: payload.tags } : {}),
    ...(payload.metadata ? { metadata: payload.metadata } : {}),
  };

  const row = applyLocationPatch(baseRow, payload.location ?? null);
  const { data, error } = await auth.supabase.from('veg_anomaly').insert(row).select('*').maybeSingle();
  if (error) {
    logJson('error', 'veg_anomaly_create_failed', { message: error.message });
    return jsonError(c, 400, 'db_error', error.message);
  }
  return c.json({ item: data });
});

app.get('/vegetacao/anomalias/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  const idParsed = VegUuidSchema.safeParse(id);
  if (!idParsed.success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const { data, error } = await auth.supabase.from('veg_anomaly').select('*').eq('id', id).maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  if (!data) return jsonError(c, 404, 'not_found', 'Anomalia não encontrada');
  return c.json({ item: data });
});

app.put('/vegetacao/anomalias/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  const idParsed = VegUuidSchema.safeParse(id);
  if (!idParsed.success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const bodyParsed = await parseJsonBody(c, VegAnomalyUpdateSchema);
  if (!bodyParsed.ok) return bodyParsed.res;

  const payload = bodyParsed.data;
  const basePatch: Record<string, unknown> = {
    ...(payload.status ? { status: payload.status } : {}),
    ...(payload.severity ? { severity: payload.severity } : {}),
    ...(payload.anomaly_type ? { anomaly_type: payload.anomaly_type } : {}),
    ...(payload.source ? { source: payload.source } : {}),
    ...(payload.title ? { title: payload.title } : {}),
    ...(payload.description ? { description: payload.description } : {}),
    ...(payload.asset_ref ? { asset_ref: payload.asset_ref } : {}),
    ...(payload.due_date ? { due_date: payload.due_date } : {}),
    ...(payload.tags ? { tags: payload.tags } : {}),
    ...(payload.metadata ? { metadata: payload.metadata } : {}),
  };
  const patch = applyLocationPatch(basePatch, payload.location ?? null);

  const { data, error } = await auth.supabase.from('veg_anomaly').update(patch).eq('id', id).select('*').maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  if (!data) return jsonError(c, 404, 'not_found', 'Anomalia não encontrada');
  return c.json({ item: data });
});

app.delete('/vegetacao/anomalias/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  const idParsed = VegUuidSchema.safeParse(id);
  if (!idParsed.success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const { error } = await auth.supabase.from('veg_anomaly').delete().eq('id', id);
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ ok: true });
});

app.get('/vegetacao/inspecoes', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const queryParsed = parseQuery(c, z.object({ limit: VegLimitQuerySchema }));
  if (!queryParsed.ok) return queryParsed.res;
  const limit = (queryParsed.data as any).limit as number;

  const { data, error } = await auth.supabase
    .from('veg_inspection')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ items: data ?? [] });
});

app.post('/vegetacao/inspecoes', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const bodyParsed = await parseJsonBody(c, VegInspectionCreateSchema);
  if (!bodyParsed.ok) return bodyParsed.res;

  const payload = bodyParsed.data;
  const baseRow: Record<string, unknown> = {
    ...(payload.id ? { id: payload.id } : {}),
    ...(payload.anomaly_id ? { anomaly_id: payload.anomaly_id } : {}),
    ...(payload.status ? { status: payload.status } : {}),
    ...(payload.severity !== undefined ? { severity: payload.severity } : {}),
    ...(payload.requires_action !== undefined ? { requires_action: payload.requires_action } : {}),
    ...(payload.suggested_action_type !== undefined ? { suggested_action_type: payload.suggested_action_type } : {}),
    ...(payload.findings ? { findings: payload.findings } : {}),
    ...(payload.notes ? { notes: payload.notes } : {}),
    ...(payload.metadata ? { metadata: payload.metadata } : {}),
  };
  const row = applyLocationPatch(baseRow, payload.location ?? null);

  const { data, error } = await auth.supabase.from('veg_inspection').insert(row).select('*').maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ item: data });
});

app.get('/vegetacao/inspecoes/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const { data, error } = await auth.supabase.from('veg_inspection').select('*').eq('id', id).maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  if (!data) return jsonError(c, 404, 'not_found', 'Inspeção não encontrada');
  return c.json({ item: data });
});

app.put('/vegetacao/inspecoes/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const bodyParsed = await parseJsonBody(c, VegInspectionUpdateSchema);
  if (!bodyParsed.ok) return bodyParsed.res;
  const payload = bodyParsed.data;

  const basePatch: Record<string, unknown> = {
    ...(payload.anomaly_id !== undefined ? { anomaly_id: payload.anomaly_id } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.severity !== undefined ? { severity: payload.severity } : {}),
    ...(payload.requires_action !== undefined ? { requires_action: payload.requires_action } : {}),
    ...(payload.suggested_action_type !== undefined ? { suggested_action_type: payload.suggested_action_type } : {}),
    ...(payload.findings !== undefined ? { findings: payload.findings } : {}),
    ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
    ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
  };
  const patch = applyLocationPatch(basePatch, payload.location ?? null);

  const { data, error } = await auth.supabase
    .from('veg_inspection')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  if (!data) return jsonError(c, 404, 'not_found', 'Inspeção não encontrada');
  return c.json({ item: data });
});

app.delete('/vegetacao/inspecoes/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const { error } = await auth.supabase.from('veg_inspection').delete().eq('id', id);
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ ok: true });
});

app.get('/vegetacao/os', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const queryParsed = parseQuery(c, z.object({ limit: VegLimitQuerySchema }));
  if (!queryParsed.ok) return queryParsed.res;
  const limit = (queryParsed.data as any).limit as number;

  const { data, error } = await auth.supabase
    .from('veg_work_order')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ items: data ?? [] });
});

app.post('/vegetacao/os', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const bodyParsed = await parseJsonBody(c, VegWorkOrderCreateSchema);
  if (!bodyParsed.ok) return bodyParsed.res;

  const payload = bodyParsed.data;
  const baseRow: Record<string, unknown> = {
    ...(payload.id ? { id: payload.id } : {}),
    ...(payload.anomaly_id ? { anomaly_id: payload.anomaly_id } : {}),
    ...(payload.inspection_id ? { inspection_id: payload.inspection_id } : {}),
    ...(payload.status ? { status: payload.status } : {}),
    ...(payload.priority ? { priority: payload.priority } : {}),
    ...(payload.team_id !== undefined ? { team_id: payload.team_id } : {}),
    ...(payload.scheduled_start !== undefined ? { scheduled_start: payload.scheduled_start } : {}),
    ...(payload.scheduled_end !== undefined ? { scheduled_end: payload.scheduled_end } : {}),
    ...(payload.notes ? { notes: payload.notes } : {}),
    ...(payload.metadata ? { metadata: payload.metadata } : {}),
  };
  const row = applyLocationPatch(baseRow, payload.location ?? null);

  const { data, error } = await auth.supabase.from('veg_work_order').insert(row).select('*').maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ item: data });
});

app.get('/vegetacao/os/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const { data, error } = await auth.supabase.from('veg_work_order').select('*').eq('id', id).maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  if (!data) return jsonError(c, 404, 'not_found', 'OS não encontrada');
  return c.json({ item: data });
});

app.put('/vegetacao/os/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const bodyParsed = await parseJsonBody(c, VegWorkOrderUpdateSchema);
  if (!bodyParsed.ok) return bodyParsed.res;
  const payload = bodyParsed.data;

  const basePatch: Record<string, unknown> = {
    ...(payload.anomaly_id !== undefined ? { anomaly_id: payload.anomaly_id } : {}),
    ...(payload.inspection_id !== undefined ? { inspection_id: payload.inspection_id } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
    ...(payload.team_id !== undefined ? { team_id: payload.team_id } : {}),
    ...(payload.scheduled_start !== undefined ? { scheduled_start: payload.scheduled_start } : {}),
    ...(payload.scheduled_end !== undefined ? { scheduled_end: payload.scheduled_end } : {}),
    ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
    ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
  };
  const patch = applyLocationPatch(basePatch, payload.location ?? null);

  const { data, error } = await auth.supabase
    .from('veg_work_order')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  if (!data) return jsonError(c, 404, 'not_found', 'OS não encontrada');
  return c.json({ item: data });
});

app.delete('/vegetacao/os/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const { error } = await auth.supabase.from('veg_work_order').delete().eq('id', id);
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ ok: true });
});

app.get('/vegetacao/execucoes', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const queryParsed = parseQuery(c, z.object({ limit: VegLimitQuerySchema }));
  if (!queryParsed.ok) return queryParsed.res;
  const limit = (queryParsed.data as any).limit as number;

  const { data, error } = await auth.supabase
    .from('veg_action')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ items: data ?? [] });
});

app.post('/vegetacao/execucoes', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const bodyParsed = await parseJsonBody(c, VegActionCreateSchema);
  if (!bodyParsed.ok) return bodyParsed.res;

  const payload = bodyParsed.data;
  const baseRow: Record<string, unknown> = {
    ...(payload.id ? { id: payload.id } : {}),
    ...(payload.work_order_id !== undefined ? { work_order_id: payload.work_order_id } : {}),
    ...(payload.anomaly_id !== undefined ? { anomaly_id: payload.anomaly_id } : {}),
    action_type: payload.action_type,
    ...(payload.status ? { status: payload.status } : {}),
    ...(payload.planned_start !== undefined ? { planned_start: payload.planned_start } : {}),
    ...(payload.planned_end !== undefined ? { planned_end: payload.planned_end } : {}),
    ...(payload.executed_at !== undefined ? { executed_at: payload.executed_at } : {}),
    ...(payload.team_id !== undefined ? { team_id: payload.team_id } : {}),
    ...(payload.operator_id !== undefined ? { operator_id: payload.operator_id } : {}),
    ...(payload.quantity !== undefined ? { quantity: payload.quantity } : {}),
    ...(payload.unit !== undefined ? { unit: payload.unit } : {}),
    ...(payload.notes ? { notes: payload.notes } : {}),
    ...(payload.metadata ? { metadata: payload.metadata } : {}),
  };
  const row = applyLocationPatch(baseRow, payload.location ?? null);

  const { data, error } = await auth.supabase.from('veg_action').insert(row).select('*').maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ item: data });
});

app.get('/vegetacao/execucoes/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const { data, error } = await auth.supabase.from('veg_action').select('*').eq('id', id).maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  if (!data) return jsonError(c, 404, 'not_found', 'Execução não encontrada');
  return c.json({ item: data });
});

app.put('/vegetacao/execucoes/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const bodyParsed = await parseJsonBody(c, VegActionUpdateSchema);
  if (!bodyParsed.ok) return bodyParsed.res;
  const payload = bodyParsed.data;

  const basePatch: Record<string, unknown> = {
    ...(payload.work_order_id !== undefined ? { work_order_id: payload.work_order_id } : {}),
    ...(payload.anomaly_id !== undefined ? { anomaly_id: payload.anomaly_id } : {}),
    ...(payload.action_type !== undefined ? { action_type: payload.action_type } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.planned_start !== undefined ? { planned_start: payload.planned_start } : {}),
    ...(payload.planned_end !== undefined ? { planned_end: payload.planned_end } : {}),
    ...(payload.executed_at !== undefined ? { executed_at: payload.executed_at } : {}),
    ...(payload.team_id !== undefined ? { team_id: payload.team_id } : {}),
    ...(payload.operator_id !== undefined ? { operator_id: payload.operator_id } : {}),
    ...(payload.quantity !== undefined ? { quantity: payload.quantity } : {}),
    ...(payload.unit !== undefined ? { unit: payload.unit } : {}),
    ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
    ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
  };
  const patch = applyLocationPatch(basePatch, payload.location ?? null);

  const { data, error } = await auth.supabase.from('veg_action').update(patch).eq('id', id).select('*').maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  if (!data) return jsonError(c, 404, 'not_found', 'Execução não encontrada');
  return c.json({ item: data });
});

app.delete('/vegetacao/execucoes/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const { error } = await auth.supabase.from('veg_action').delete().eq('id', id);
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ ok: true });
});

app.get('/vegetacao/auditorias', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const queryParsed = parseQuery(c, z.object({ limit: VegLimitQuerySchema }));
  if (!queryParsed.ok) return queryParsed.res;
  const limit = (queryParsed.data as any).limit as number;

  const { data, error } = await auth.supabase
    .from('veg_audit')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ items: data ?? [] });
});

app.post('/vegetacao/auditorias', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const bodyParsed = await parseJsonBody(c, VegAuditCreateSchema);
  if (!bodyParsed.ok) return bodyParsed.res;

  const payload = bodyParsed.data;
  const row: Record<string, unknown> = {
    ...(payload.id ? { id: payload.id } : {}),
    ...(payload.work_order_id !== undefined ? { work_order_id: payload.work_order_id } : {}),
    ...(payload.action_id !== undefined ? { action_id: payload.action_id } : {}),
    result: payload.result,
    checklist: payload.checklist ?? {},
    ...(payload.notes ? { notes: payload.notes } : {}),
    ...(payload.corrective_required !== undefined ? { corrective_required: payload.corrective_required } : {}),
    ...(payload.corrective_notes !== undefined ? { corrective_notes: payload.corrective_notes } : {}),
  };

  const { data, error } = await auth.supabase.from('veg_audit').insert(row).select('*').maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ item: data });
});

app.get('/vegetacao/auditorias/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const { data, error } = await auth.supabase.from('veg_audit').select('*').eq('id', id).maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  if (!data) return jsonError(c, 404, 'not_found', 'Auditoria não encontrada');
  return c.json({ item: data });
});

app.put('/vegetacao/auditorias/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const bodyParsed = await parseJsonBody(c, VegAuditUpdateSchema);
  if (!bodyParsed.ok) return bodyParsed.res;
  const payload = bodyParsed.data;

  const patch: Record<string, unknown> = {
    ...(payload.work_order_id !== undefined ? { work_order_id: payload.work_order_id } : {}),
    ...(payload.action_id !== undefined ? { action_id: payload.action_id } : {}),
    ...(payload.result !== undefined ? { result: payload.result } : {}),
    ...(payload.checklist !== undefined ? { checklist: payload.checklist } : {}),
    ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
    ...(payload.corrective_required !== undefined ? { corrective_required: payload.corrective_required } : {}),
    ...(payload.corrective_notes !== undefined ? { corrective_notes: payload.corrective_notes } : {}),
  };

  const { data, error } = await auth.supabase.from('veg_audit').update(patch).eq('id', id).select('*').maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  if (!data) return jsonError(c, 404, 'not_found', 'Auditoria não encontrada');
  return c.json({ item: data });
});

app.delete('/vegetacao/auditorias/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const { error } = await auth.supabase.from('veg_audit').delete().eq('id', id);
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ ok: true });
});

app.get('/vegetacao/agenda', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const queryParsed = parseQuery(c, z.object({ limit: VegLimitQuerySchema }));
  if (!queryParsed.ok) return queryParsed.res;
  const limit = (queryParsed.data as any).limit as number;

  const { data, error } = await auth.supabase
    .from('veg_schedule_event')
    .select('*')
    .order('start_at', { ascending: true })
    .limit(limit);
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ items: data ?? [] });
});

app.post('/vegetacao/agenda', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const bodyParsed = await parseJsonBody(c, VegScheduleCreateSchema);
  if (!bodyParsed.ok) return bodyParsed.res;

  const payload = bodyParsed.data;
  const baseRow: Record<string, unknown> = {
    ...(payload.id ? { id: payload.id } : {}),
    title: payload.title,
    start_at: payload.start_at,
    end_at: payload.end_at,
    ...(payload.team_id !== undefined ? { team_id: payload.team_id } : {}),
    ...(payload.operator_id !== undefined ? { operator_id: payload.operator_id } : {}),
    ...(payload.related_anomaly_id !== undefined ? { related_anomaly_id: payload.related_anomaly_id } : {}),
    ...(payload.related_work_order_id !== undefined ? { related_work_order_id: payload.related_work_order_id } : {}),
    ...(payload.related_action_id !== undefined ? { related_action_id: payload.related_action_id } : {}),
    ...(payload.status ? { status: payload.status } : {}),
    ...(payload.location_text !== undefined ? { location_text: payload.location_text } : {}),
    ...(payload.metadata ? { metadata: payload.metadata } : {}),
  };

  const row = applyLocationPatch(baseRow, payload.location ?? null);
  const { data, error } = await auth.supabase.from('veg_schedule_event').insert(row).select('*').maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ item: data });
});

app.get('/vegetacao/agenda/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const { data, error } = await auth.supabase.from('veg_schedule_event').select('*').eq('id', id).maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  if (!data) return jsonError(c, 404, 'not_found', 'Evento não encontrado');
  return c.json({ item: data });
});

app.put('/vegetacao/agenda/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const bodyParsed = await parseJsonBody(c, VegScheduleUpdateSchema);
  if (!bodyParsed.ok) return bodyParsed.res;
  const payload = bodyParsed.data;

  const basePatch: Record<string, unknown> = {
    ...(payload.title !== undefined ? { title: payload.title } : {}),
    ...(payload.start_at !== undefined ? { start_at: payload.start_at } : {}),
    ...(payload.end_at !== undefined ? { end_at: payload.end_at } : {}),
    ...(payload.team_id !== undefined ? { team_id: payload.team_id } : {}),
    ...(payload.operator_id !== undefined ? { operator_id: payload.operator_id } : {}),
    ...(payload.related_anomaly_id !== undefined ? { related_anomaly_id: payload.related_anomaly_id } : {}),
    ...(payload.related_work_order_id !== undefined ? { related_work_order_id: payload.related_work_order_id } : {}),
    ...(payload.related_action_id !== undefined ? { related_action_id: payload.related_action_id } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.location_text !== undefined ? { location_text: payload.location_text } : {}),
    ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
  };
  const patch = applyLocationPatch(basePatch, payload.location ?? null);

  const { data, error } = await auth.supabase
    .from('veg_schedule_event')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  if (!data) return jsonError(c, 404, 'not_found', 'Evento não encontrado');
  return c.json({ item: data });
});

app.delete('/vegetacao/agenda/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const { error } = await auth.supabase.from('veg_schedule_event').delete().eq('id', id);
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ ok: true });
});

app.get('/vegetacao/risco', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const queryParsed = parseQuery(c, z.object({ limit: VegLimitQuerySchema }));
  if (!queryParsed.ok) return queryParsed.res;
  const limit = (queryParsed.data as any).limit as number;

  const { data, error } = await auth.supabase
    .from('veg_risk')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ items: data ?? [] });
});

app.post('/vegetacao/risco', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const bodyParsed = await parseJsonBody(c, VegRiskCreateSchema);
  if (!bodyParsed.ok) return bodyParsed.res;

  const payload = bodyParsed.data;
  const row: Record<string, unknown> = {
    ...(payload.id ? { id: payload.id } : {}),
    ...(payload.related_anomaly_id !== undefined ? { related_anomaly_id: payload.related_anomaly_id } : {}),
    ...(payload.related_work_order_id !== undefined ? { related_work_order_id: payload.related_work_order_id } : {}),
    ...(payload.category ? { category: payload.category } : {}),
    probability: payload.probability,
    impact: payload.impact,
    ...(payload.sla_days !== undefined ? { sla_days: payload.sla_days } : {}),
    ...(payload.status ? { status: payload.status } : {}),
    ...(payload.notes ? { notes: payload.notes } : {}),
    ...(payload.metadata ? { metadata: payload.metadata } : {}),
  };

  const { data, error } = await auth.supabase.from('veg_risk').insert(row).select('*').maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ item: data });
});

app.get('/vegetacao/risco/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const { data, error } = await auth.supabase.from('veg_risk').select('*').eq('id', id).maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  if (!data) return jsonError(c, 404, 'not_found', 'Risco não encontrado');
  return c.json({ item: data });
});

app.put('/vegetacao/risco/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const bodyParsed = await parseJsonBody(c, VegRiskUpdateSchema);
  if (!bodyParsed.ok) return bodyParsed.res;
  const payload = bodyParsed.data;

  const patch: Record<string, unknown> = {
    ...(payload.related_anomaly_id !== undefined ? { related_anomaly_id: payload.related_anomaly_id } : {}),
    ...(payload.related_work_order_id !== undefined ? { related_work_order_id: payload.related_work_order_id } : {}),
    ...(payload.category !== undefined ? { category: payload.category } : {}),
    ...(payload.probability !== undefined ? { probability: payload.probability } : {}),
    ...(payload.impact !== undefined ? { impact: payload.impact } : {}),
    ...(payload.sla_days !== undefined ? { sla_days: payload.sla_days } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
    ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
  };

  const { data, error } = await auth.supabase.from('veg_risk').update(patch).eq('id', id).select('*').maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  if (!data) return jsonError(c, 404, 'not_found', 'Risco não encontrado');
  return c.json({ item: data });
});

app.delete('/vegetacao/risco/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const { error } = await auth.supabase.from('veg_risk').delete().eq('id', id);
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ ok: true });
});

app.get('/vegetacao/documentos', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const queryParsed = parseQuery(c, z.object({ limit: VegLimitQuerySchema }));
  if (!queryParsed.ok) return queryParsed.res;
  const limit = (queryParsed.data as any).limit as number;

  const { data, error } = await auth.supabase
    .from('veg_document')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ items: data ?? [] });
});

app.post('/vegetacao/documentos', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const bodyParsed = await parseJsonBody(c, VegDocumentCreateSchema);
  if (!bodyParsed.ok) return bodyParsed.res;

  const payload = bodyParsed.data;
  const row: Record<string, unknown> = {
    ...(payload.id ? { id: payload.id } : {}),
    ...(payload.doc_type ? { doc_type: payload.doc_type } : {}),
    title: payload.title,
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    file_path: payload.file_path,
    ...(payload.mime_type !== undefined ? { mime_type: payload.mime_type } : {}),
    ...(payload.size_bytes !== undefined ? { size_bytes: payload.size_bytes } : {}),
    ...(payload.sha256 !== undefined ? { sha256: payload.sha256 } : {}),
    ...(payload.linked_anomaly_id !== undefined ? { linked_anomaly_id: payload.linked_anomaly_id } : {}),
    ...(payload.linked_work_order_id !== undefined ? { linked_work_order_id: payload.linked_work_order_id } : {}),
    ...(payload.linked_action_id !== undefined ? { linked_action_id: payload.linked_action_id } : {}),
    ...(payload.tags ? { tags: payload.tags } : {}),
    ...(payload.metadata ? { metadata: payload.metadata } : {}),
  };

  const insertRow = applyLocationPatch(row, payload.location ?? null);
  const { data, error } = await auth.supabase.from('veg_document').insert(insertRow).select('*').maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ item: data });
});

app.get('/vegetacao/documentos/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const { data, error } = await auth.supabase.from('veg_document').select('*').eq('id', id).maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  if (!data) return jsonError(c, 404, 'not_found', 'Documento não encontrado');
  return c.json({ item: data });
});

app.put('/vegetacao/documentos/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const bodyParsed = await parseJsonBody(c, VegDocumentUpdateSchema);
  if (!bodyParsed.ok) return bodyParsed.res;
  const payload = bodyParsed.data;

  const basePatch: Record<string, unknown> = {
    ...(payload.doc_type !== undefined ? { doc_type: payload.doc_type } : {}),
    ...(payload.title !== undefined ? { title: payload.title } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.file_path !== undefined ? { file_path: payload.file_path } : {}),
    ...(payload.mime_type !== undefined ? { mime_type: payload.mime_type } : {}),
    ...(payload.size_bytes !== undefined ? { size_bytes: payload.size_bytes } : {}),
    ...(payload.sha256 !== undefined ? { sha256: payload.sha256 } : {}),
    ...(payload.linked_anomaly_id !== undefined ? { linked_anomaly_id: payload.linked_anomaly_id } : {}),
    ...(payload.linked_work_order_id !== undefined ? { linked_work_order_id: payload.linked_work_order_id } : {}),
    ...(payload.linked_action_id !== undefined ? { linked_action_id: payload.linked_action_id } : {}),
    ...(payload.tags !== undefined ? { tags: payload.tags } : {}),
    ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
  };
  const patch = applyLocationPatch(basePatch, payload.location ?? null);

  const { data, error } = await auth.supabase.from('veg_document').update(patch).eq('id', id).select('*').maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  if (!data) return jsonError(c, 404, 'not_found', 'Documento não encontrado');
  return c.json({ item: data });
});

app.delete('/vegetacao/documentos/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const { error } = await auth.supabase.from('veg_document').delete().eq('id', id);
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ ok: true });
});

app.get('/vegetacao/evidencias', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;

  const queryParsed = parseQuery(
    c,
    z.object({
      limit: VegLimitQuerySchema,
      linked_anomaly_id: VegUuidSchema.optional(),
      linked_inspection_id: VegUuidSchema.optional(),
      linked_work_order_id: VegUuidSchema.optional(),
      linked_action_id: VegUuidSchema.optional(),
    }),
  );
  if (!queryParsed.ok) return queryParsed.res;

  const limit = (queryParsed.data as any).limit as number;
  const q = queryParsed.data as any;

  let request = auth.supabase.from('veg_evidence').select('*').order('created_at', { ascending: false }).limit(limit);
  if (q.linked_anomaly_id) request = request.eq('linked_anomaly_id', q.linked_anomaly_id);
  if (q.linked_inspection_id) request = request.eq('linked_inspection_id', q.linked_inspection_id);
  if (q.linked_work_order_id) request = request.eq('linked_work_order_id', q.linked_work_order_id);
  if (q.linked_action_id) request = request.eq('linked_action_id', q.linked_action_id);

  const { data, error } = await request;
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ items: data ?? [] });
});

app.post('/vegetacao/evidencias', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const bodyParsed = await parseJsonBody(c, VegEvidenceCreateSchema);
  if (!bodyParsed.ok) return bodyParsed.res;

  const payload = bodyParsed.data;
  const baseRow: Record<string, unknown> = {
    ...(payload.id ? { id: payload.id } : {}),
    ...(payload.evidence_type ? { evidence_type: payload.evidence_type } : {}),
    ...(payload.file_path !== undefined ? { file_path: payload.file_path } : {}),
    ...(payload.text_note !== undefined ? { text_note: payload.text_note } : {}),
    ...(payload.linked_anomaly_id !== undefined ? { linked_anomaly_id: payload.linked_anomaly_id } : {}),
    ...(payload.linked_inspection_id !== undefined ? { linked_inspection_id: payload.linked_inspection_id } : {}),
    ...(payload.linked_work_order_id !== undefined ? { linked_work_order_id: payload.linked_work_order_id } : {}),
    ...(payload.linked_action_id !== undefined ? { linked_action_id: payload.linked_action_id } : {}),
    ...(payload.captured_at !== undefined ? { captured_at: payload.captured_at } : {}),
    ...(payload.metadata ? { metadata: payload.metadata } : {}),
  };

  const row = applyLocationPatch(baseRow, payload.location ?? null);
  const { data, error } = await auth.supabase.from('veg_evidence').insert(row).select('*').maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ item: data });
});

app.get('/vegetacao/evidencias/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const { data, error } = await auth.supabase.from('veg_evidence').select('*').eq('id', id).maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  if (!data) return jsonError(c, 404, 'not_found', 'Evidência não encontrada');
  return c.json({ item: data });
});

app.put('/vegetacao/evidencias/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const bodyParsed = await parseJsonBody(c, VegEvidenceUpdateSchema);
  if (!bodyParsed.ok) return bodyParsed.res;
  const payload = bodyParsed.data;

  const basePatch: Record<string, unknown> = {
    ...(payload.evidence_type !== undefined ? { evidence_type: payload.evidence_type } : {}),
    ...(payload.file_path !== undefined ? { file_path: payload.file_path } : {}),
    ...(payload.text_note !== undefined ? { text_note: payload.text_note } : {}),
    ...(payload.linked_anomaly_id !== undefined ? { linked_anomaly_id: payload.linked_anomaly_id } : {}),
    ...(payload.linked_inspection_id !== undefined ? { linked_inspection_id: payload.linked_inspection_id } : {}),
    ...(payload.linked_work_order_id !== undefined ? { linked_work_order_id: payload.linked_work_order_id } : {}),
    ...(payload.linked_action_id !== undefined ? { linked_action_id: payload.linked_action_id } : {}),
    ...(payload.captured_at !== undefined ? { captured_at: payload.captured_at } : {}),
    ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
  };

  const patch = applyLocationPatch(basePatch, payload.location ?? null);
  const { data, error } = await auth.supabase.from('veg_evidence').update(patch).eq('id', id).select('*').maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  if (!data) return jsonError(c, 404, 'not_found', 'Evidência não encontrada');
  return c.json({ item: data });
});

app.delete('/vegetacao/evidencias/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const { error } = await auth.supabase.from('veg_evidence').delete().eq('id', id);
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ ok: true });
});

app.post('/vegetacao/reports/query', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const bodyParsed = await parseJsonBody(c, VegReportsQuerySchema);
  if (!bodyParsed.ok) return bodyParsed.res;

  const payload = bodyParsed.data;
  const from = new Date(`${payload.date_from}T00:00:00.000Z`).toISOString();
  const to = new Date(`${payload.date_to}T23:59:59.999Z`).toISOString();

  let request = auth.supabase
    .from('veg_action')
    .select('id, action_type, status, executed_at, team_id, operator_id, quantity, unit, metadata')
    .gte('executed_at', from)
    .lte('executed_at', to);

  if (payload.team_id) request = request.eq('team_id', payload.team_id);
  if (payload.operator_id) request = request.eq('operator_id', payload.operator_id);

  const { data, error } = await request;
  if (error) return jsonError(c, 400, 'db_error', error.message);

  const rows = (data ?? []).filter((row: any) => Boolean(row.executed_at));
  const groupBy = payload.group_by;
  const dimension = payload.dimension;

  const toBucket = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'invalid';
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    if (groupBy === 'day') return `${yyyy}-${mm}-${dd}`;
    if (groupBy === 'month') return `${yyyy}-${mm}`;
    // week: ISO week-ish (UTC, Monday start)
    const tmp = new Date(Date.UTC(yyyy, d.getUTCMonth(), d.getUTCDate()));
    const day = (tmp.getUTCDay() + 6) % 7;
    tmp.setUTCDate(tmp.getUTCDate() - day + 3);
    const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
    const firstDay = (firstThursday.getUTCDay() + 6) % 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
    const week = 1 + Math.round((tmp.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  };

  const keyForRow = (row: any) => {
    if (dimension === 'period') return toBucket(row.executed_at);
    if (dimension === 'team') return row.team_id ?? 'unassigned';
    if (dimension === 'operator') return row.operator_id ?? 'unassigned';
    const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    return (meta.address_text as string | undefined) ?? (meta.asset_ref as string | undefined) ?? 'unknown';
  };

  const groups = new Map<string, any>();
  for (const row of rows) {
    const key = keyForRow(row);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        total_actions: 0,
        total_quantity: 0,
        units: new Map<string, number>(),
        by_type: new Map<string, number>(),
      });
    }
    const g = groups.get(key)!;
    g.total_actions += 1;
    const qty = typeof row.quantity === 'number' ? row.quantity : 0;
    g.total_quantity += qty;
    const unit = typeof row.unit === 'string' ? row.unit : 'un';
    g.units.set(unit, (g.units.get(unit) ?? 0) + qty);
    const t = row.action_type ?? 'other';
    g.by_type.set(t, (g.by_type.get(t) ?? 0) + 1);
  }

  const items = Array.from(groups.values()).map((g) => ({
    key: g.key,
    total_actions: g.total_actions,
    total_quantity: g.total_quantity,
    units: Object.fromEntries(g.units.entries()),
    by_type: Object.fromEntries(g.by_type.entries()),
  }));

  return c.json({
    meta: {
      date_from: payload.date_from,
      date_to: payload.date_to,
      group_by: payload.group_by,
      dimension: payload.dimension,
    },
    items,
  });
});

app.post('/vegetacao/ai/species-identify', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const bodyParsed = await parseJsonBody(c, VegSpeciesIdentifyRequestSchema);
  if (!bodyParsed.ok) return bodyParsed.res;

  const provider = (process.env.SMARTLINE_AI_PROVIDER ?? 'external').toLowerCase();
  const url = (process.env.SMARTLINE_AI_URL ?? '').trim();
  const apiKey = (process.env.SMARTLINE_AI_API_KEY ?? '').trim();
  const openAiKey = (process.env.OPENAI_API_KEY ?? process.env.SMARTLINE_OPENAI_API_KEY ?? '').trim();
  const openAiModel = (process.env.SMARTLINE_AI_MODEL ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini').trim();
  const confidenceThreshold = bodyParsed.data.confidence_threshold ?? 0.75;

  let filePath = bodyParsed.data.file_path;
  if (!filePath && bodyParsed.data.evidence_id) {
    const { data: ev, error: evErr } = await auth.supabase
      .from('veg_evidence')
      .select('file_path')
      .eq('id', bodyParsed.data.evidence_id)
      .maybeSingle();
    if (evErr) return jsonError(c, 400, 'db_error', evErr.message);
    filePath = ev?.file_path ?? undefined;
  }

  const stub = {
    species: 'Desconhecida',
    scientific_name: undefined,
    confidence: 0,
    top_k: [],
    model_version: 'stub',
    notes: 'Provider stub ativo (SMARTLINE_AI_PROVIDER=stub)',
  };

  let aiResult: z.infer<typeof AiSpeciesResponseSchema> = stub;

  if (provider === 'openai') {
    if (!openAiKey) {
      return jsonError(c, 501, 'ai_not_configured', 'OPENAI_API_KEY não configurado no ambiente');
    }

    let imageUrl: string | null = null;
    if (bodyParsed.data.image_base64) {
      const raw = bodyParsed.data.image_base64.trim();
      if (raw.startsWith('data:')) {
        imageUrl = raw;
      } else {
        const mime = bodyParsed.data.mime_type?.trim() || 'image/jpeg';
        imageUrl = `data:${mime};base64,${raw}`;
      }
    } else if (filePath) {
      const signed = await createSignedEvidenceUrl(auth.supabase, filePath);
      if (signed.ok === false) {
        return jsonError(c, 501, 'ai_missing_image', 'Não foi possível obter URL assinada da evidência', {
          file_path: filePath,
          error: signed.error,
        });
      }
      imageUrl = signed.url;
    }

    if (!imageUrl) {
      return jsonError(
        c,
        400,
        'ai_missing_image',
        'Informe image_base64 ou evidence_id/file_path para identificação',
      );
    }

    const catalog = [
      'Eucalipto — Eucalyptus spp.',
      'Pinus — Pinus spp.',
      'Acácia-negra — Acacia mearnsii',
      'Acácia — Acacia spp.',
      'Cinamomo — Melia azedarach',
      'Tipuana — Tipuana tipu',
      'Sibipiruna — Poincianella pluviosa (sin. Caesalpinia pluviosa)',
      'Ipê-amarelo — Handroanthus albus',
      'Ipê-roxo — Handroanthus impetiginosus',
      'Jacarandá-mimoso — Jacaranda mimosifolia',
      'Flamboyant — Delonix regia',
      'Oiti — Licania tomentosa',
      'Ficus/Benjamim — Ficus benjamina',
      'Mangueira — Mangifera indica',
      'Goiabeira — Psidium guajava',
      'Pitangueira — Eugenia uniflora',
      'Araucária — Araucaria angustifolia',
      'Bracatinga — Mimosa scabrella',
      'Erva-mate — Ilex paraguariensis',
      'Plátano — Platanus × acerifolia',
      'Salgueiro — Salix humboldtiana',
      'Ligustro/Alfeneiro — Ligustrum lucidum',
      'Grevílea — Grevillea robusta',
      'Aroeira-pimenteira — Schinus terebinthifolia',
    ];

    const systemPrompt = `
Você é um especialista em arborização urbana e vegetação de faixa de servidão (Brasil, especialmente SP e RS).
Sua tarefa é identificar a espécie mais provável a partir de uma foto (folhas, casca, ramificação, flores/frutos, porte e contexto).

Regras:
- Não invente. Se a imagem não permitir, retorne "Desconhecida" com confiança baixa.
- A confiança deve ser um número entre 0 e 1 (probabilidade aproximada). Use >0.9 apenas com evidência visual forte.
- Retorne SEMPRE um único objeto JSON válido, sem markdown, sem texto extra.
- Priorize escolher uma espécie do catálogo abaixo quando fizer sentido; caso contrário use "Desconhecida" (ou um nome comum diferente, se realmente claro).

Catálogo prioritário (nome comum — científico):
${catalog.map((s) => `- ${s}`).join('\n')}

Contrato de saída (JSON):
{
  "species": "string (pt-BR)",
  "scientific_name": "string opcional",
  "confidence": 0.0,
  "top_k": [{"species":"...", "scientific_name":"...", "confidence":0.0}],
  "model_version": "string",
  "notes": "string opcional"
}
`.trim();

    const userPrompt = `
Analise a imagem anexada e identifique a espécie mais provável.
Se houver múltiplas plantas, foque na árvore/vegetação mais proeminente na imagem.
Forneça também top_k (até 5 alternativas) com confidências decrescentes.
Se a imagem estiver desfocada, muito distante ou sem características diagnósticas, use "Desconhecida".

Lembre: confidence ∈ [0,1]. Retorne JSON puro.
`.trim();

    const requestBody: any = {
      model: openAiModel,
      temperature: 0,
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
    };

    let upstreamJson: unknown;
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        return jsonError(c, 502, 'ai_upstream_error', `OpenAI respondeu ${response.status}`, { text });
      }
      upstreamJson = await response.json();
    } catch (err: any) {
      return jsonError(c, 502, 'ai_upstream_error', err?.message ?? 'Falha ao chamar OpenAI');
    }

    const parsedChat = OpenAiChatCompletionSchema.safeParse(upstreamJson);
    if (!parsedChat.success) {
      return jsonError(c, 502, 'ai_invalid_response', 'Resposta OpenAI inesperada', parsedChat.error.flatten());
    }

    const content = parsedChat.data.choices[0]?.message?.content ?? '';
    if (!content) {
      return jsonError(c, 502, 'ai_invalid_response', 'OpenAI retornou conteúdo vazio');
    }

    let contentJson: unknown;
    try {
      contentJson = JSON.parse(extractJsonObject(content));
    } catch (err: any) {
      return jsonError(c, 502, 'ai_invalid_response', 'OpenAI retornou JSON inválido', {
        content,
        error: err?.message ?? String(err),
      });
    }

    const parsed = AiSpeciesResponseSchema.safeParse(contentJson);
    if (!parsed.success) {
      return jsonError(c, 502, 'ai_invalid_response', 'OpenAI retornou objeto fora do contrato', parsed.error.flatten());
    }
    aiResult = { ...parsed.data, model_version: openAiModel };
  } else if (provider !== 'stub') {
    if (!url || !apiKey) {
      return jsonError(
        c,
        501,
        'ai_not_configured',
        'Provider external selecionado, mas SMARTLINE_AI_URL/SMARTLINE_AI_API_KEY não estão configurados',
      );
    }

    const endpoint = `${url.replace(/\/+$/u, '')}/species-identify`;
    const upstreamPayload = {
      evidence_id: bodyParsed.data.evidence_id,
      image_base64: bodyParsed.data.image_base64,
      file_path: filePath,
      mime_type: bodyParsed.data.mime_type,
      confidence_threshold: confidenceThreshold,
    };

    let upstreamJson: unknown;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(upstreamPayload),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        return jsonError(c, 502, 'ai_upstream_error', `Upstream AI respondeu ${response.status}`, { text });
      }
      upstreamJson = await response.json();
    } catch (err: any) {
      return jsonError(c, 502, 'ai_upstream_error', err?.message ?? 'Falha ao chamar upstream AI');
    }

    const parsed = AiSpeciesResponseSchema.safeParse(upstreamJson);
    if (!parsed.success) {
      return jsonError(c, 502, 'ai_invalid_response', 'Resposta do upstream AI fora do contrato', parsed.error.flatten());
    }
    aiResult = parsed.data;
  }

  // Persist suggestion when evidence_id is present
  let saved: any = null;
  if (bodyParsed.data.evidence_id) {
    const insertRow: Record<string, unknown> = {
      evidence_id: bodyParsed.data.evidence_id,
      raw_result: aiResult,
      suggested_species: aiResult.species,
      suggested_scientific_name: aiResult.scientific_name,
      suggested_confidence: aiResult.confidence,
      top_k: aiResult.top_k,
      model_version: aiResult.model_version,
      confidence_threshold: confidenceThreshold,
      status: 'suggested',
    };

    const { data: inserted, error: insertErr } = await auth.supabase
      .from('veg_species_identification')
      .insert(insertRow)
      .select('*')
      .maybeSingle();
    if (insertErr) return jsonError(c, 400, 'db_error', insertErr.message);
    saved = inserted;
  }

  return c.json({ result: aiResult, saved });
});

app.get('/vegetacao/species-identifications', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;

  const queryParsed = parseQuery(c, VegSpeciesIdentificationsQuerySchema);
  if (!queryParsed.ok) return queryParsed.res;

  const q = queryParsed.data as any;
  const limit = (q.limit as number) ?? 20;

  const { data, error } = await auth.supabase
    .from('veg_species_identification')
    .select('*')
    .eq('evidence_id', q.evidence_id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return jsonError(c, 400, 'db_error', error.message);
  return c.json({ items: data ?? [] });
});

app.put('/vegetacao/species-identifications/:id', async (c) => {
  const auth = requireRlsSupabase(c);
  if (!auth.ok) return auth.res;
  const id = c.req.param('id');
  if (!VegUuidSchema.safeParse(id).success) return jsonError(c, 400, 'invalid_id', 'ID inválido');

  const bodyParsed = await parseJsonBody(c, VegSpeciesIdentificationUpdateSchema);
  if (!bodyParsed.ok) return bodyParsed.res;

  const userId = jwtSubject(auth.token);
  if (!userId || !VegUuidSchema.safeParse(userId).success) {
    return jsonError(c, 401, 'invalid_token', 'Token inválido (sub ausente)');
  }

  const payload = bodyParsed.data;
  const patch: Record<string, unknown> = {
    status: payload.status,
    confirmed_species: payload.confirmed_species ?? null,
    confirmed_scientific_name: payload.confirmed_scientific_name ?? null,
    confirmed_by: userId,
    confirmed_at: nowIso(),
  };

  const { data, error } = await auth.supabase
    .from('veg_species_identification')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) return jsonError(c, 400, 'db_error', error.message);
  if (!data) return jsonError(c, 404, 'not_found', 'Registro não encontrado');
  return c.json({ item: data });
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
