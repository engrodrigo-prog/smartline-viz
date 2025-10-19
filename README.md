# SmartLine Viz Monorepo

SmartLine Viz agora opera como um monorepo focado em visualização geoespacial e serviços de apoio. O frontend original foi movido intacto para `apps/web` e será acompanhado por uma API Hono e pacotes compartilhados.

## Estrutura

- `apps/web`: aplicação Vite/React original.
- `apps/api`: serviço Hono (em construção) para endpoints REST.
- `packages/db`: utilitários de acesso a dados e scripts SQL.
- `packages/config`: configuração compartilhada (lint, tsconfig, etc.).
- `packages/utils`: funções comuns entre apps.
- `workers/media`: jobs assíncronos para processamento de mídia.
- `infra/devcontainer`: configuração do Dev Container.
- `infra/github`: automações de CI/CD.
- `infra/scripts`: scripts auxiliares.

## Pré-requisitos

- Node.js 20+ com `corepack enable` (pnpm 9).
- pnpm (`corepack prepare pnpm@9 --activate`).

## Desenvolvimento

```bash
pnpm install
pnpm dev:web      # inicia o frontend
pnpm dev:api      # inicia a API Hono
```

A seção de instruções específicas para cada pacote encontra-se dentro de seus respectivos diretórios.

## Dev Container

A pasta `infra/devcontainer` fornece uma configuração baseada em Ubuntu 24.04 com Python 3.14, GDAL, PDAL, Exiftool e FFmpeg.

Para usar, abra o projeto no VS Code e selecione **“Reopen in Container”**. O ambiente executará `pnpm i` automaticamente e tentará instalar as dependências Python listadas em `workers/media/requirements.txt`.

## Convenções

- Prefira pnpm scripts com `pnpm -C <path>` para rodar comandos nas aplicações.
- Mantenha secrets fora do repositório (usar `.env`, `.env.example`).
