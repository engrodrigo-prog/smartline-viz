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
