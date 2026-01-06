#!/usr/bin/env tsx
/**
 * Seed de administradores e usuário visitante padrão.
 * Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY definidos no ambiente.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type AppRole = 'admin' | 'visitor';

function defaultOrgForEmail(email: string): string {
  if (email.endsWith('@gpcad.com.br')) return 'GPCAD';
  if (email.endsWith('@cpfl.com.br') || email.endsWith('@cpflenergia.com.br')) return 'CPFL';
  return 'SmartLine';
}

async function ensureUser(email: string, fullName: string, role: AppRole) {
  // Busca usuário por e-mail. A API não filtra por e-mail, então filtramos em memória.
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw listErr;
  const existing = list?.users?.find((u) => u.email === email);
  const existingId = existing?.id;

  const organization = defaultOrgForEmail(email);
  const password = '123456';
  let userId = existingId ?? null;

  if (!userId) {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        smartline_role: role,
      },
      user_metadata: {
        full_name: fullName,
        organization,
        must_change_password: true,
      },
    });
    if (createErr) throw createErr;
    userId = created.user?.id ?? null;
    if (!userId) throw new Error(`Falha ao criar usuário ${email}`);
    console.log(`Usuário criado: ${email} (${userId})`);
  } else {
    const mergedMeta = {
      ...(existing?.user_metadata ?? {}),
      full_name: fullName,
      organization,
      must_change_password: true,
    };
    const mergedAppMeta = {
      ...(existing?.app_metadata ?? {}),
      smartline_role: role,
    };
    const { error: updUserErr } = await supabase.auth.admin.updateUserById(userId, {
      password,
      user_metadata: mergedMeta,
      app_metadata: mergedAppMeta,
      email_confirm: true,
    });
    if (updUserErr) throw updUserErr;
    console.log(`Usuário atualizado: ${email} (${userId})`);
  }

  const { error: upsertErr } = await supabase
    .from('profiles')
    .upsert({ id: userId, full_name: fullName }, { onConflict: 'id' });
  if (upsertErr) {
    console.warn('[profiles] falha ao upsert (ok para MVP):', upsertErr.message);
  }

  if (role === 'admin') {
    const { error: roleErr } = await supabase.from('user_roles').upsert(
      { user_id: userId, role: 'admin' },
      { onConflict: 'user_id,role' }
    );
    if (roleErr) {
      console.warn('[user_roles] falha ao atribuir admin (ok para MVP):', roleErr.message);
    }
  }

  console.log(`Acesso garantido: ${email} (role=${role}, senha inicial=123456)`);
}

async function main() {
  await ensureUser('guilherme@gpcad.com.br', 'Guilherme Pelegrini', 'admin');
  await ensureUser('eng.rodrigo@gmail.com', 'Rodrigo Nascimento', 'admin');
}

main()
  .then(() => {
    console.log('Seed concluído.');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
