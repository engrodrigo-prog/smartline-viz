# Backend - Arquitetura Atual

## Stack resumida

- **Linguagem / framework**: Node.js 20 + TypeScript com [Hono](https://hono.dev) (`apps/api`). Entrypoint oficial em `apps/api/src/server.ts`, que instancia `apps/api/src/app.ts`.
- **Exposição de rotas**: cada domínio possui um arquivo próprio em `apps/api/src/routes`. O `app.ts` monta o middleware (CORS/log) e faz `app.route("/<prefix>", ...)` para publicar endpoints REST simples.
- **Persistência**: a partir desta fase adotamos PostgreSQL + PostGIS. A conexão compartilhada mora no pacote `@smartline/db` (`packages/db`) usando `pg`. Não há ORM pesado; trabalhamos com SQL parametrizado e helpers finos.
- **Migrations / DDL**: SQL versionado em `packages/db/migrations`. Rodamos com `pnpm db:migrate`, que usa `packages/db/src/migrate.ts` para aplicar os arquivos e registrar em `schema_migrations`.
- **ETL / jobs**: scripts batch vivem ao lado do backend em `apps/api/src/etl`. Cada job tem um comando CLI em `apps/api/src/scripts`; por exemplo `pnpm -C apps/api tsx src/scripts/import-lipowerline.ts` roda o ETL desta fase.

## Componentes principais

| Componente | Local | Observações |
| --- | --- | --- |
| HTTP server | `apps/api/src/app.ts` / `server.ts` | Inicializa Hono, middlewares e agrupa rotas (upload, weather, demandas etc.). |
| Rotas atuais | `apps/api/src/routes/*.ts` | Cada arquivo define um sub-router (ex.: `routes/weather.ts`). Novas rotas ETL ficam em `routes/lipowerline.ts`. |
| Conexão com banco | `packages/db/src/index.ts` | Exporta `getDbPool`, `withDbClient`, `runInTransaction`. Todas as camadas (API, ETL, scripts) devem reutilizar esse pacote. |
| Migrations | `packages/db/migrations/*.sql` | Base Postgres + PostGIS com staging (`stg_*`), tabelas normalizadas (`tb_*`) e views (`vw_*`). |
| Jobs/ETL | `apps/api/src/etl/**` | Implementação do pipeline LiPowerline (parsers, staging, normalização). Comandos CLI em `apps/api/src/scripts`. |
| Simulações | `apps/api/src/routes/simulacoes.ts` | Endpoint `POST /api/simulacoes/riscos` calcula score atual vs. pós-tratamento com base nos riscos LiPowerline. |

## Fluxo atual de dados

1. **Entrada HTTP**: app Hono recebe requests nos endpoints (`/upload`, `/weather`, `/api/linhas`, etc.).
2. **Camada de dados**: rotas que precisam de banco importam `@smartline/db` e executam SQL parametrizado. Outras rotas que lidam apenas com arquivos continuam lendo de `apps/api/.data`.
3. **ETL / batch**: o job LiPowerline lê arquivos KML/CSV, grava staging (`stg_*`), depois normaliza para `tb_*` e popula views analíticas. Logs/resumos são emitidos no console e podem ser consultados via `tb_lipowerline_dataset`.

## Uploads, mídia e workers

- **Rotas de upload bruto (`apps/api/src/routes/upload.ts`)**:
  - `/upload/init` recebe lista de arquivos (nome, tipo, tamanho) e responde com URLs pré-assinadas (S3 via `lib/storage.ts`) ou endpoints locais (`/upload/file`). Os arquivos ficam em `apps/api/.data/raw/<sessionId>/`.
  - `/upload/file` persiste streams localmente usando `putObjectLocal`.
  - `/upload/commit` cria um `MediaJob` (ID + sessão + metadados do payload) e o enfileira via `lib/queue.ts`. O job inclui opções como `frameIntervalSec` e metadados para direcionar o processamento (ex.: detectar termografia e direcionar módulos específicos).
- **Rotas legadas de mídia (`apps/api/src/routes/media.ts`)**:
  - `/media/upload` aceita formulário multiparte, salva os binários em `apps/api/.data/media/raw/<batchId>` e grava metadados em `apps/api/.data/media/meta/<batchId>.json`.
  - Também expõe `/media/:id/frames`, `/media/:id/assets`, `/media/files/*`, `/media/search` e `/media/:id/frames/archive` para consultar ou baixar frames derivados (`yazl` gera ZIP).
- **Queue (`apps/api/src/lib/queue.ts`)**:
  - Se `REDIS_URL` estiver definido, os jobs são empurrados para `media_jobs` no Redis.
  - Caso contrário, cada job é salvo como JSON em `workers/media/inbox/<jobId>.json`. O status pode ser escrito em `workers/media/outbox` via `writeStatus`.
- **Worker Python (`workers/media/python/main.py`)**:
  - Loop infinito monitora `workers/media/inbox`, lê os jobs, marca status como `processing`, e trata cada ativo:
    - Fotos → extrai EXIF (GPS, timestamp) com `exifread`.
    - Vídeos → usa OpenCV para extrair frames a cada `frameInterval`, alinhar com trilhas `.srt`, computar intensidade média.
  - Gera GeoJSON (`frames.geojson`) em `apps/api/.data/media/derived/frames/<mediaId>` com features por frame/foto (POINT + properties).
  - Serializa manifestos/frames e atualiza `apps/api/.data/media/meta/<id>.json` (status `done`, resumo de distância percorrida). Também escreve `workers/media/outbox/<jobId>.status.json`.
- **Exports / missões (`apps/api/src/routes/missoes.ts`)**:
  - Mantém missões em `apps/api/.data/missoes/<missionId>/mission.json`, com templates de LiDAR/Express etc.
  - Endpoints permitem criar missões, listar e gerar pacotes (`yazl` + helpers de `lib/geo.ts`) contendo KML/CSV/JSON para os planos e anexos.
  - `lib/geo.ts` centraliza utilidades de parsing de CSV/KML para GeoJSON e normalização de bounding boxes usados nesses exports.

## Execução diária

- **Desenvolvimento**: `pnpm dev:api` inicia o Hono server (porta 8080). A UI (`pnpm dev:web`) consome os endpoints.
- **Migrations**: `pnpm db:migrate` aplica o SQL no banco apontado por `DATABASE_URL` (definido em `apps/api/.env`).
- **ETL**: `pnpm -C apps/api tsx src/scripts/import-lipowerline.ts --dataset ./data/lipowerline_samples/demo --line LT-DEMO-01 --cenario "Pré 2025-01" --cenario-type pre_manejo` importa um lote LiPowerline fictício e alimenta o dashboard.

> Esta documentação cobre o estado atual; ajustes futuros (novos schemas, filas, ou troca de framework) devem atualizar este arquivo.
