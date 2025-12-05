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

async function ensureUser(email: string, fullName: string, role: 'admin' | 'member', expiresDays?: number) {
  // Busca usuário por e-mail. A API não filtra por e-mail, então filtramos em memória.
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw listErr;
  const existing = list?.users?.find((u) => u.email === email);
  const userId = existing?.id;

  if (!userId) {
    console.warn(
      `Usuário ${email} não encontrado no Supabase Auth. ` +
        `Crie manualmente com senha inicial 123456 no painel do Supabase e rode o seed novamente.`
    );
    return;
  }

  console.log(`Usuário ${email} encontrado (${userId})`);

  const expires_at =
    role === 'member' && expiresDays
      ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const { error: upsertErr } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        full_name: fullName,
        role,
        is_active: true,
        must_change_password: true,
        expires_at,
      },
      { onConflict: 'id' }
    );
  if (upsertErr) throw upsertErr;

  console.log(`Profile garantido: ${email} (${role})`);
}

async function main() {
  await ensureUser('eng.rodrigo@gmail.com', 'Rodrigo Nascimento', 'admin');
  await ensureUser('guilherme@gpcad.com.br', 'Guilherme Pelegrini', 'admin');
  // visitante demo de 7 dias (opcional)
  await ensureUser('visitante@smartline.dev', 'Visitante Demo', 'member', 7);
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
