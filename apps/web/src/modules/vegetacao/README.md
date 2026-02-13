# SmartLine — Módulo Vegetação (Poda & Roçada)

Módulo operacional para **poda/roçada/remoção**, com trilha auditável, evidências (fotos/vídeos/notas), geolocalização (GPS/mapa/endereço manual), relatórios e suporte offline (PWA + fila de sincronização).

## Rotas
- `/vegetacao` (Dashboard)
- `/vegetacao/anomalias`
- `/vegetacao/inspecoes`
- `/vegetacao/os`
- `/vegetacao/execucoes`
- `/vegetacao/auditorias`
- `/vegetacao/agenda`
- `/vegetacao/risco`
- `/vegetacao/relatorios`
- `/vegetacao/documentos`

## API (Vercel Functions)
Os endpoints são servidos em `/api/*` (Vercel Functions) e seguem contrato JSON com validação via Zod.

- Dashboard: `GET /api/vegetacao/dashboard`
- Relatórios: `POST /api/vegetacao/reports/query`
- IA espécie: `POST /api/vegetacao/ai/species-identify`
- CRUD: `/api/vegetacao/anomalias`, `/inspecoes`, `/os`, `/execucoes`, `/auditorias`, `/agenda`, `/risco`, `/documentos`

### IA — Identificação por foto (OpenAI)
O endpoint `POST /api/vegetacao/ai/species-identify` aceita:
- `image_base64` (data URL ou base64 puro + `mime_type`)
- ou `evidence_id` / `file_path` (gera URL assinada do bucket `veg-evidence`)

Resposta:
- `result.confidence`: número `0..1` (a UI converte para `0..100%`)
- `result.top_k`: alternativas ordenadas por confiança (até 5)

## Storage (Supabase)
- `veg-evidence`: fotos/vídeos/capturas de campo
- `veg-docs`: ASVs/PDFs/KML/GeoJSON e anexos

## Variáveis de ambiente

### Frontend (Vite) — `apps/web/.env.local`
- `VITE_APP_NAME=SmartLine`
- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_ANON_KEY=...`
- `VITE_MAP_PROVIDER=mapbox|leaflet`
- `VITE_MAPBOX_TOKEN=...` (se `mapbox`)

> Importante: **NUNCA** coloque secrets no frontend (variáveis `VITE_*` são expostas no bundle).

### Backend (Vercel) — Environment Variables do projeto
- `SUPABASE_URL=...`
- `SUPABASE_SERVICE_ROLE_KEY=...` (opcional; útil para assinar URLs no Storage quando RLS impedir)
- `SMARTLINE_AI_PROVIDER=openai|external|stub`
- `SMARTLINE_AI_MODEL=gpt-4o` (recomendado) ou `gpt-4o-mini` (mais barato)
- `OPENAI_API_KEY=sk-...`

Provider externo (alternativo):
- `SMARTLINE_AI_URL=...`
- `SMARTLINE_AI_API_KEY=...`

## Rodando local (rápido)
1. `pnpm install`
2. `cp apps/web/.env.example apps/web/.env.local` e preencher `VITE_*`.
3. Para testar `/api/*` localmente, use o Vercel CLI (`npx vercel dev`) **ou** publique em Preview/Prod e teste no ambiente publicado.

## Comandos úteis
- `pnpm -C apps/web lint`
- `pnpm -C apps/web build`

## Checklist de deploy
- ENVs configuradas no Vercel (Production/Preview)
- Buckets `veg-evidence` e `veg-docs` criados no Supabase Storage
- Migrações aplicadas no Supabase
- Smoke test: login → criar registro → anexar foto → rodar IA → gerar relatório → testar offline (modo avião + sync)

