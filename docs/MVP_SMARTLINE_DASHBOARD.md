# MVP SmartLine Dashboard – Fase 3

## Integração LiPowerline

- **Seleção global** (`context/SelectionContext.tsx`)
  - Carrega `GET /api/linhas` e `GET /api/cenarios?linha_id=...` via hooks React Query.
  - Se a API não responder (modo demo), os hooks voltam a usar `DatasetContext` para preencher a UI.
  - O seletor fica no topo do Dashboard (linha + cenário) e também alimenta mapa/listas.

- **KPIs / Overview** (`pages/Dashboard.tsx`)
  - `useLipowerlineKpi` chama `GET /api/kpi-linha?linha_id=...&cenario_id=...` e converte os campos (km, nº de vãos, árvores e cruzamentos críticos) nos cards do `KpiGrid`.
  - Quando não há dados, o componente recua para as métricas mockadas (`DatasetContext`).

## Mapas e camadas

- **Serviços**: `services/lipowerlineApi.ts` expõe `getRiscoVegetacao`, `getRiscoQueda`, `getCruzamentos`, `getTratamentos` e já converte `geom` em GeoJSON.
- **Hooks**: `useLipowerlineRiscoVegetacao`, `useLipowerlineRiscoQueda`, `useLipowerlineCruzamentos`, `useLipowerlineTratamentos` retornam `FeatureCollection`s com fallback no dataset demo.
- **Camadas no mapa** (`features/map/UnifiedMapView`):
  - Novos toggles em `DEFAULT_LAYERS`: Vegetação, Danger Trees, Cruzamentos críticos, Trechos tratados.
  - `useUnifiedMapState` combina as coleções e injeta em `MapLibreUnified` como `customLines` e `customPoints` (cores por classe de risco).
  - Popups ainda são simples; os dados trazem `properties` com `classe_risco_*`, `codigo_vao`, etc., prontos para enriquecer futuros tooltips.

## Listas / Tabelas

- **Travessias** (`pages/modules/Travessias.tsx`)
  - Troca os mocks por `useLipowerlineCruzamentos`. Quando a API responde, o módulo lista apenas os cruzamentos reais (com criticidade, status, posição). Caso contrário, continua usando o dataset demo.
  - O mapa interno continua usando o `MapLibreUnified` mas agora foca nos cruzamentos reais quando disponíveis.

## Simulação de Risco

- **Backend** (`apps/api/src/routes/simulacoes.ts`)
  - Endpoint `POST /api/simulacoes/riscos` recebe `{ linhaId, cenarioId, vaoIds?, topN? }` e calcula um score simples a partir de `tb_risco_vegetacao_vao`, `tb_risco_queda_lateral` e `tb_cruzamento`.
  - Retorna o risco atual, risco pós-tratamento estimado, redução absoluta/percentual e a lista de vãos simulados.
- **Frontend**
  - `useSimulacaoRisco` usa React Query Mutation; em modo demo gera resultados sintéticos baseados no dataset local.
  - O bloco “Simulação de Risco (MVP)” no Dashboard permite escolher “Top N vãos” e mostra o ganho estimado (antes × depois).

## Como testar

1. Garanta um banco com os dados LiPowerline (`pnpm db:migrate` e `pnpm -C apps/api etl:lipowerline -- --dataset data/lipowerline_samples/demo ...`).
2. Rode `pnpm dev:api` e `pnpm dev:web`.
3. No Dashboard:
   - Selecione a linha/cenário (menu superior).
   - Verifique os KPIs reais, o mapa com camadas LiPowerline e a lista de Travessias.
  - Execute a simulação informando o top N desejado.
4. Sem backend, a UI volta automaticamente para os dados demo e o simulador retorna números sintéticos, mantendo a navegação funcionando.

## Inspeções e Mídia (Fase 4)

- **Modelo de dados / API**
  - Migration `0002_media_inspecoes.sql` cria `tb_media_job`, `tb_media_item` e `tb_anomalia_eletromecanica`.
  - Uploads (`/media/upload`) agora registram cada job em `tb_media_job`; o worker Python gera GeoJSON de frames e o script `pnpm -C apps/api etl:media-sync` preenche `tb_media_item`.
  - Novas rotas REST:
    - `GET /api/media/jobs`, `GET /api/media/jobs/:id`, `GET /api/media/items`;
    - `GET/POST/PATCH /api/anomalias`;
    - `GET /api/export/linha/:linhaId.zip` e `/api/export/inspecao/:jobId.zip` (pacotes com GeoJSON/CSV).
- **Serviços / hooks web**
  - `services/mediaJobsApi.ts` encapsula as chamadas à API de mídia/inspeções e converte `geom` em GeoJSON.
  - `hooks/useMedia.ts` ganhou `useMediaJobs`, `useMediaJob`, `useMediaItems`, `useMediaAnomalias`, `useCreateAnomalia` e `useUpdateAnomalia` (todos em React Query).
- **Upload**
  - Página `pages/upload/Midia.tsx` exibe selects de Linha/Cenário/Tipo de inspeção (dados de `SelectionContext`) antes de enviar arquivos.
  - `MediaUploader` envia esses campos como `lineId`, `cenarioId`, `tipo_inspecao` para que o job seja associado corretamente no backend.
- **Tela “Inspeções & Mídia”** (`modules/estrutura/InspecaoTermografica.tsx`)
  - Substitui a versão mockada por uma visão real:
    - Lista de jobs consumindo `useMediaJobs` (status, tipo, nº de itens).
    - Detalhes completos do job (`useMediaJob`): contagens, mapa focado com `MapLibreUnified` e pontos dos frames (`useMediaItems`).
    - Tabela de mídias com link para o arquivo original e botão “Registrar anomalia”.
    - Lista de anomalias ligadas ao job (status + ação rápida para concluir) alimentada por `useMediaAnomalias`.
    - Downloads diretos dos pacotes `/api/export/linha` e `/api/export/inspecao`.
    - Dialog de “Registrar anomalia” salva via `useCreateAnomalia`.
- **Mapa unificado**
  - Novo toggle “Frames / Inspeções” em `DEFAULT_LAYERS`.
  - `useUnifiedMapState` consulta `useMediaItems` (linha/cenário atual) quando a camada está ativa e injeta os frames como `customPoints` coloridos (frame vs foto/vídeo).
- **Monitoramento**
  - O endpoint `/api/media/jobs` simplifica dashboards/relatórios para acompanhar a fila do worker.
  - Exportações (`/api/export/*.zip`) podem ser usadas nos módulos Travessias/Dashboard através dos botões adicionados.
