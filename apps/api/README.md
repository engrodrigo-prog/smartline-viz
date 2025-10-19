# SmartLine API (Hono)

API mínima construída com [Hono](https://hono.dev) para atuar como backend do monorepo.

## Scripts

- `pnpm dev` – inicia o servidor com recarregamento.
- `pnpm build` – transpila TypeScript para `dist/`.
- `pnpm start` – executa a versão compilada.

## Rotas

- `GET /health` – status do serviço.
- `POST /auth/login` – login demo com `demo@smartline.ai` / `smartline`.
