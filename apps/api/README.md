# SmartLine API (Hono)

API mínima construída com [Hono](https://hono.dev) para atuar como backend do monorepo.

## Scripts

- `pnpm dev` – inicia o servidor com recarregamento.
- `pnpm build` – transpila TypeScript para `dist/`.
- `pnpm start` – executa a versão compilada.

## Rotas

- `GET /health` – status do serviço.
- `POST /auth/login` – login demo com `demo@smartline.ai` / `smartline`.
- `POST /media/upload` – registra lote de mídia (fotos, vídeos, SRT) usando armazenamento local.
- `GET /media/:id/frames` – retorna GeoJSON com frames e metadados extraídos.
- `GET /media/:id/frames/archive` – compacta os frames gerados em um `.zip` para download local.
- `GET /media/files/*` – serve arquivos derivados (frames, thumbnails) diretamente do disco.

## ETL LiPowerline

- `pnpm etl:lipowerline -- --dataset <pasta> --line <codigo> --cenario <descricao>` executa o pipeline de staging → normalização.
- Novas rotas REST em `/api/linhas`, `/api/cenarios`, `/api/kpi-linha`, `/api/risco-vegetacao`, `/api/risco-queda`, `/api/cruzamentos`, `/api/tratamentos` fornecem dados normalizados para o dashboard.
- `POST /api/simulacoes/riscos` calcula um cenário hipotético de redução de risco tratando os vãos mais críticos.
- Migrations SQL ficam em `packages/db/migrations` e devem ser aplicadas com `pnpm db:migrate` antes de rodar o ETL.
