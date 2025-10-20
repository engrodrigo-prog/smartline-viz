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

### Como rodar (macOS)
1. Habilite o pnpm via Corepack e selecione a versão desejada (`corepack enable && corepack prepare pnpm@10.18.3 --activate`).
2. Execute `pnpm install` na raiz do monorepo.
3. Preencha `apps/web/.env` (chaves `VITE_MAPBOX_TOKEN`, `VITE_JOTFORM_URL`) e `apps/api/.env`.
4. Em terminais separados, rode `pnpm dev:web` e `pnpm dev:api`. A API expõe o health check em `http://localhost:8080/health`.
# >>> SMARTLINE-EROSION: readme
## SmartLine™ – Erosion Risk Automation (Starter Kit)
Fluxo:
1) Ingerir chuva observada (INMET + IMERG NRT) e prevista (GFS/ECMWF).
2) Processar DTM por linha/corredor (Fill/Breach, Slope, TWI, SPI, LS canônico).
3) Calcular A_RUSLE e compor risco (0–100).
4) Publicar COGs p/ SmartLine-Viz (raster source).
### Instalação
```bash
python -m venv .venv && source .venv/bin/activate      # Win: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```
### Execução (exemplos)
```bash
python ingest/gpm_imerg_nrt.py --line-geojson data/sample/line.geojson --hours 24
python ingest/gfs_nomads.py --bbox -47.2 -23.2 -46.9 -22.9 --lead-hours 120
python process/dtm_derivatives.py --dtm data/sample/XX_DTM.tif --ls-m 0.5 --ls-n 1.3 --fa-type cells
python process/risk_index.py --dtm data/sample/XX_DTM.tif --soil data/sample/soil_polygons.geojson --ndvi-c 1.0
python scripts/build_cogs.py outputs/*.tif
```
# <<< SMARTLINE-EROSION: readme
