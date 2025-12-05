# Arquitetura do Front-end SmartLine Viz

Este documento descreve como o app web está estruturado atualmente (abril/2024) e onde os dados são orquestrados entre mocks locais e integrações reais (Supabase + API Hono).

## Rotas e layout geral
- `App.tsx` monta `BrowserRouter` + `ProtectedRoute`, `DatasetProvider`, `FiltersProvider`, `React Query` e toasters globais.
- Núcleos de navegação:
  - **Landing e auth:** `/`, `/login`, `/signup-request`, `/change-password`, `/legal`.
  - **Dashboard:** `/dashboard` com guia principal + mapa integrado.
  - **Visualizações:** `/visual/mapa` (mapa operacional) e `/visual/unifilar`.
  - **Ambiental:** `/ambiental/*` (alagadas, erosão, queimadas, firms-viewer, vegetação, ocupação), além de `/ambiente`.
  - **Estrutura:** `/estrutura/*` (estruturas, emendas, travessias, perfil da linha, inspeção termográfica).
  - **Uploads:** `/upload` (wizard unificado) + rotas legadas `/upload/*` (bases, traçados, KML, histórico, mídia, layers).
  - **Operação / Equipes / Sensores:** `/operacao/*`, `/equipes/rastreamento`, `/sensores/*`.
  - **Analytics e treinamento:** `/analytics/comparativo`, `/treinamento/*`.
  - **Configurações/admin:** `/config/*`, `/admin/requests`.
  - Rotas não implementadas reutilizam `ModulePlaceholder`.

## DatasetContext + defaultDataset
`DatasetContext.tsx` mantém um dataset mockado (`defaultDataset.ts`) em `localStorage`. O dataset é clonado no load, pode ser importado/exportado pelo usuário e é a fonte padrão para filtros e cards quando não há backend real.

Páginas/Componentes que consomem diretamente o `DatasetContext` hoje:

- **Dashboard principal:** `pages/Dashboard.tsx`.
- **Módulos ambientais:** `pages/modules/ambiental/AreasAlagadas.tsx`, `Erosao.tsx`, `OcupacaoFaixa.tsx`, `Vegetacao.tsx`.
- **Módulos de estrutura:** `pages/modules/Estruturas.tsx`, `modules/Travessias.tsx`, `modules/estrutura/Emendas.tsx`, `InspecaoTermografica.tsx`, `PerfilLinha.tsx` (baseline para filtros), `pages/MapView.tsx`, `pages/Unifilar.tsx`.
- **Operação/equipes:** `pages/operacao/VeiculosOnline.tsx`, `pages/equipes/RastreamentoCampo.tsx`.
- **Sensores/treinamentos auxiliares:** `pages/treinamento/Quizzes.tsx`, `QuizRunner.tsx`, `components/FiltersBar.tsx`, `FilterPanel.tsx`, `components/Header.tsx`, `pages/settings/DatasetManager.tsx`.

> **Nota:** Estas telas estão prontas para trocar os mock arrays por consultas Supabase (`line_asset`, `tower_asset`, `span_analysis`) via hook dedicado. Comentários `TODO` sinalizam os pontos de injeção (ver `Dashboard.tsx` e `features/dashboard/hooks/useDashboardData.ts`).

## Telas com dados reais (Supabase / API Hono / hooks em `src/hooks`)

- **Supabase Auth + tabelas:**
  - Auth flows: `pages/Login.tsx`, `SignupRequest.tsx`, `ChangePassword.tsx`.
  - Upload histórico (`pages/upload/UploadHistorico.tsx`) lê `dataset_catalog`.
  - Layer manager/upload (`pages/upload/LayerUpload.tsx`, `pages/settings/LayerManager.tsx`) usa `LayersStorage` em Supabase Storage.
  - Sensores (`pages/sensores/PainelSensores.tsx`, `SensorDashboard.tsx`) e mapas (`pages/sensores/Cameras.tsx`, `pages/operacao/VeiculosOnline.tsx`) consultam tabelas `sensors`, `sensor_readings`, `telemetria`.
  - Operação (`pages/operacao/Demandas.tsx`) e analytics (`pages/analytics/ComparativoExecucao.tsx`) utilizam `useDemandas*` com RPC/rest Supabase.
  - Admin (`pages/admin/Requests.tsx`) lista `signup_requests`.
  - Missões (`pages/missoes/index.tsx`) e uploads KML/bases/traçados usam `useMissoes`, `useGeodataQuery`, `useUpload*` hooks (Supabase functions + Storage).

- **Supabase Edge Functions / hooks geoespaciais:**
  - `useQueimadas`, `useFirmsData`, `useFirmsFootprints`, `useFirmsRisk`, `useFootprintAlerts`, `useWeather` alimentam `Dashboard` (mapa), `pages/modules/ambiental/Queimadas.tsx`, `FirmsViewer.tsx` e `components/map/UnifiedMapView`.
  - `useAmbienteAlerts`, `useAlarmZones`, `useChangeDetection` suportam módulos Ambientais (chamados em `modules/afins`).

- **API Hono (ENV.API_BASE_URL):**
  - Upload unificado (`pages/upload/UploadUnificado.tsx`) usa `useMediaUpload`, `usePointcloud*`, `useMediaRecord/Frames` para interagir com endpoints `/media/*`, `/pointcloud/*`.
  - `MediaUploader`, `FramesPreview`, `UploadQueueManager` compartilham mesma API (utilizada também por `pages/upload/Midia.tsx`).

- **Simulações e workers:**
  - `usePointcloudProfile`, `usePointcloudPlan` (em `PerfilLinha.tsx`) disparam jobs em workers (provavelmente Hono + supabase storage).
  - `pages/modules/ambiental/Queimadas.tsx` mistura dados reais (`useFirmsRisk`) com simulações fallback; comentários novos indicam onde conectar saídas de simulações de risco.

## Organização de pastas após a refatoração

```
apps/web/src
├── pages/               # Entradas de rota (mantidas)
├── components/          # UI reutilizável/atômica
├── features/
│   ├── dashboard/       # Hooks e componentes específicos do Dashboard
│   ├── map/             # UnifiedMapView + subcomponentes
│   ├── ambiental/       # (novo namespace para lógicas de módulos ambientais)
│   ├── estrutura/       # (novo namespace para módulos de estrutura)
│   └── upload/          # (novo namespace para workflows de upload)
├── context/             # Dataset/Filters providers
├── data/                # defaultDataset
├── hooks/               # Integrações com Supabase/API
└── services/, lib/, etc
```

As pastas `features/ambiental`, `features/estrutura` e `features/upload` já existem para acomodar, nas próximas iterações, as regras de negócio que hoje residem nos arquivos de página. O Dashboard já delega KPIs/gráficos para `features/dashboard`, e o mapa unificado foi migrado para `features/map/UnifiedMapView`.

## Integrações futuras anotadas no código
- **Supabase LiPowerline (line_asset/tower_asset/span_analysis):** comentários em `pages/Dashboard.tsx` e `features/dashboard/hooks/useDashboardData.ts` indicam onde substituir `defaultDataset`.
- **API Hono `/upload/media/processed`:** comentários em `pages/upload/UploadUnificado.tsx` delimitam o ponto de integração para status de processamento e ingestão final.
- **Simulações de risco:** comentários em `pages/modules/ambiental/Queimadas.tsx` e `features/map/UnifiedMapView/useUnifiedMapState.ts` destacam onde injetar outputs de risk engines (ex.: `span_analysis` + modelos de propagação).

Esses marcadores garantem rastreabilidade quando os dados passarem a vir 100% dos serviços gerenciados.
