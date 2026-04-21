# SmartLine AssetHealth — Full Platform Design Spec
**Date:** 2026-04-20  
**Status:** Approved — ready for milestone execution  
**Audience:** Engineering + Product

---

## 0. Context and Strategic Driver

SmartLine AssetHealth is a B2B SaaS platform for Brazilian power transmission utilities. The pilot client is CPFL Piratininga, whose contract model (v9.0) defines the domain: LiDAR premium surveys (≥1000 pts/m²) priced per km as Unidade de Serviço (US), across 14 service groups G00–G13 and 42 services.

**The current production tool is an Excel spreadsheet** (`MAC_MCB_MT_MTR_MEF.xlsx`) that:
1. Receives exports from LiPowerline (4 report types)
2. Applies risk thresholds from the "Critérios" tab
3. Classifies each span (vão) by risk model and severity (N1–N4)
4. Outputs a MANEJO / PRIORIZAR sheet for field work prioritization

**The platform's core mission is to replace this spreadsheet** — automating ingestion, classification, visualization, and work-order generation at tenant scale.

---

## 1. Architecture — Option B (Clean Skeleton First)

### 1.1 Structural Changes (2–3 weeks)

| Item | Current State | Target State |
|------|--------------|--------------|
| Backend monolith | `_serverless_app.ts` (1000+ lines) | Split into domain routers |
| Standalone API | `apps/api/` (Hono/Node.js) | **Removed** — Vercel Functions only |
| Map renderers | Mapbox + MapLibre both installed | **MapLibre only** |
| Role system | Dual: user_roles + app_user | **Unified: ORG_ADMIN / POWER_USER / VIEWER** |
| Shared packages | `@smartline/db`, `config`, `utils` (skeletons) | Filled or removed |
| Demo/prod mixing | Mockados e reais misturados | Clean `DEMO_MODE` flag + seed data |

### 1.2 Domain Router Split

```
apps/web/api/
  _hono_handler.ts          # Vercel bridge (unchanged)
  _serverless_app.ts        # orchestrator only — imports domain routers
  domains/
    vegetacao/router.ts     # existing routes moved
    erosao/router.ts        # existing routes moved
    media/router.ts         # existing routes moved
    admin/router.ts         # existing routes moved
    risco/router.ts         # NEW — risk models + thresholds
    missoes/router.ts       # NEW — mission library (KMZ, SL-901.x)
    estrutura/router.ts     # NEW — structure inspection (SL-1001.x)
    integracoes/router.ts   # NEW — CREARE, FROTALOG, Webradio, Video
    ingestao/router.ts      # NEW — LiPowerline import pipeline
```

### 1.3 Integration Adapter Layer

All external integrations behind a typed adapter interface:

```typescript
interface IntegrationAdapter<TConfig, TResult> {
  id: string
  validate(config: TConfig): Promise<boolean>
  fetch(params: unknown): Promise<TResult>
  healthCheck(): Promise<{ ok: boolean; latency_ms: number }>
}
```

Adapters: `CreareAdapter` (15min cache), `FrotalogAdapter` (30s polling), `WebradioAdapter`, `VideoAdapter` (RTSP→HLS proxy).

Credentials stored in `integration_configs` table (encrypted), never in code.

---

## 2. Risk Domain — 5 CPFL Models

### 2.1 Risk Model Mapping

| LiPowerline "Type" Column | Risk Model | Code |
|--------------------------|-----------|------|
| Vegetation | Conductor-Vegetation | MCB |
| Ground | Conductor-Ground | MAC |
| Power Line | Conductor-Conductor | MT |
| Road | Conductor-Road/Obstacle | MTR |
| Building | Structure-Right-of-Way | MEF |
| (Tree Fall reports) | Tree Fall | MPQ |

### 2.2 N1–N4 Severity Scale

| Level | Label | SLA | Color |
|-------|-------|-----|-------|
| N1 | CRITICAL | ≤30 days | Red |
| N2 | HIGH | ≤90 days | Orange |
| N3 | MEDIUM | ≤180 days | Yellow |
| N4 | LOW | Monitor | Blue |

### 2.3 Default Thresholds (CPFL v9.0)

**MCB / MTR (Vegetation / Road):**
- ALTO (N2): < 7m
- MEDIO (N3): 7–9m
- BAIXO (N4): 9–11m

**MAC (Ground Clearance):**
- URGENTE (N1): < 2m
- CRITICO (N1): 2–4m
- ALTO (N2): 4–5m
- MEDIO (N3): 5–7m
- BAIXO (N4): > 7m

**MPQ (Tree Fall crossings):**
- CRITICO (N1): > 5 trees
- ALTO (N2): 3–5 trees
- MEDIO (N3): 1–3 trees
- BAIXO (N4): < 1 tree

### 2.4 Tenant-Customizable Thresholds

**Critical requirement (confirmed by client):** Every threshold must be editable per tenant.

```sql
CREATE TABLE risk_threshold_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) NOT NULL,
  risk_model text NOT NULL,        -- MAC, MCB, MT, MTR, MEF, MPQ
  scenario text NOT NULL,          -- TR (real) | SIM (simulated)
  level text NOT NULL,             -- N1, N2, N3, N4
  label text NOT NULL,             -- URGENTE, CRITICO, ALTO, etc.
  threshold_min numeric,
  threshold_max numeric,
  unit text DEFAULT 'm',
  effective_from timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE risk_threshold_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid REFERENCES risk_threshold_config(id),
  org_id uuid NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  old_value jsonb,
  new_value jsonb,
  changed_at timestamptz DEFAULT now()
);
```

RLS: SELECT for all tenant members; INSERT/UPDATE/DELETE only for ORG_ADMIN.  
UI: Settings > Risk Thresholds — table editor with reset-to-default per model.

---

## 3. Data Ingestion Pipeline — LiPowerline Import (MOST CRITICAL)

This is the core of the platform. The Excel spreadsheet is the current production tool; the platform must be a drop-in replacement.

### 3.1 LiPowerline Report Types

| Report Type | Code | Contains |
|------------|------|----------|
| Clearance Distance Safety Check — Real | CD_SC_TR | Measured distances from last survey |
| Clearance Distance Safety Check — Simulated | CD_SC_SIM | Wind/load simulation distances |
| Tree Fall — Real | TF_TR | Real tree-fall crossing counts |
| Tree Fall — Simulated | TF_SIM | Simulated tree-fall crossing counts |

### 3.2 Input Schema (LiPowerline CSV/XLSX columns)

```
Section          # Span ID (vão), e.g., "T001-T002"
Type             # Vegetation | Ground | Road | Building | Power Line
Horizontal Dist  # meters
Vertical Dist    # meters  
Clearance Dist   # meters (key classification field)
Safety Level     # LiPowerline's own classification (may differ from tenant thresholds)
Structure From   # Tower ID start
Structure To     # Tower ID end
Line             # Transmission line name
```

### 3.3 Ingestion Flow

```
Upload (XLSX/CSV)
       │
       ▼
[ingestao/parser.ts]
  - detect report type (CD_SC_TR | CD_SC_SIM | TF_TR | TF_SIM)
  - validate required columns present
  - parse rows → IngestionRow[]
       │
       ▼
[ingestao/classifier.ts]
  - map Type → risk_model (Vegetation→MCB, Ground→MAC, etc.)
  - fetch tenant thresholds for (org_id, risk_model, scenario)
  - apply thresholds → severity N1–N4
  - flag discrepancy if LiPowerline Safety Level ≠ platform classification
       │
       ▼
[ingestao/writer.ts]
  - upsert into risk_readings (by span + report_type + survey_id)
  - upsert into risk_classifications (computed severity per span)
  - trigger risk_summary materialized view refresh
       │
       ▼
[Response]
  - summary: { total_rows, classified, N1_count, N2_count, N3_count, N4_count }
  - errors: [ { row, reason } ]
  - survey_id: uuid (for traceability)
```

### 3.4 Database Schema

```sql
CREATE TABLE surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) NOT NULL,
  line_name text NOT NULL,
  report_type text NOT NULL CHECK (report_type IN ('CD_SC_TR','CD_SC_SIM','TF_TR','TF_SIM')),
  survey_date date,
  source_filename text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE risk_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES surveys(id) NOT NULL,
  org_id uuid REFERENCES organizations(id) NOT NULL,
  span_id text NOT NULL,           -- "T001-T002"
  structure_from text,
  structure_to text,
  line_name text NOT NULL,
  risk_model text NOT NULL,        -- MAC, MCB, MT, MTR, MEF, MPQ
  clearance_distance numeric,
  horizontal_distance numeric,
  vertical_distance numeric,
  lidarline_safety_level text,     -- LiPowerline's own label
  created_at timestamptz DEFAULT now()
);

CREATE TABLE risk_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_id uuid REFERENCES risk_readings(id) UNIQUE NOT NULL,
  org_id uuid REFERENCES organizations(id) NOT NULL,
  severity text NOT NULL CHECK (severity IN ('N1','N2','N3','N4')),
  threshold_config_id uuid REFERENCES risk_threshold_config(id),
  classified_at timestamptz DEFAULT now(),
  threshold_snapshot jsonb  -- snapshot of thresholds used at classification time
);
```

### 3.5 API Endpoint

```
POST /api/ingestao/upload
  Content-Type: multipart/form-data
  Body: { file: File, line_name: string, survey_date: string, report_type?: string }
  
  Response: {
    survey_id: string,
    summary: { total: number, N1: number, N2: number, N3: number, N4: number },
    errors: Array<{ row: number, message: string }>,
    duration_ms: number
  }

GET /api/ingestao/surveys
  → paginated list of surveys for org

GET /api/ingestao/surveys/:id/readings
  → all risk_readings for survey with classifications
```

### 3.6 Frontend — Upload Module

```
src/modules/ingestao/
  pages/
    IngestaoPage.tsx       # upload zone + survey history
    SurveyDetailPage.tsx   # readings table + map overlay
  components/
    UploadZone.tsx          # drag-drop, file type validation
    IngestionSummary.tsx    # N1/N2/N3/N4 donut chart after upload
    SurveyTable.tsx         # list of past surveys
    ReadingsTable.tsx       # sortable by severity, filterable by model
  hooks/
    useIngestao.ts          # upload mutation + survey query
  api/
    ingestao.client.ts      # typed fetch wrappers
```

Upload experience:
1. Drag-drop or click upload (XLSX or CSV)
2. Report type auto-detected; user can override
3. Progress bar during parse + classify
4. Summary card: "82 spans classified — 3 N1, 12 N2, 47 N3, 20 N4"
5. Button: "View on Map" → opens SurveyDetailPage with MapLibre overlay

---

## 4. Map System — COG + Risk Visualization

### 4.1 Map Layers (MapLibre GL)

| Layer | Source | Toggle |
|-------|--------|--------|
| Transmission lines | PostGIS / GeoJSON | Always on |
| Structures (towers) | PostGIS point layer | On by default |
| Risk heatmap by span | risk_classifications join geometry | On by default |
| COG orthomosaic | Cloud Optimized GeoTIFF (Supabase or CREARE) | Off by default |
| FIRMS hotspots | NASA FIRMS API | Off by default |
| Vegetation corridor | PostGIS polygon | Off by default |

### 4.2 Risk Layer Coloring

Spans colored by worst active N-level:
- N1: `#FF2D2D` (red, pulsing animation)
- N2: `#FF8C00` (orange)
- N3: `#FFD700` (yellow)
- N4: `#4B9CD3` (blue)

Click on span → sidebar with:
- Span ID, line name
- All risk readings for span (by model)
- Worst severity + SLA countdown
- "Create Work Order" button (missoes integration)

### 4.3 COG Serving

```
Supabase Storage bucket: `orthomosaics` (private)
  /{org_id}/{survey_id}/ortho.tif   ← COG format required

Signed URL served via: GET /api/geodata/orthomosaic/:survey_id
  → returns 15min signed URL
  → client passes URL to MapLibre addSource({ type: 'raster', tiles: [url+'/{z}/{x}/{y}'] })
```

For CREARE-hosted COGs: proxy via CreareAdapter with 15min cache.

---

## 5. External Integrations

### 5.1 CREARE (Cloud GIS)

- Auth: `user_id` + `senha` via `integration_configs` table (never in code)
- Capabilities: fetch survey data, COG assets, structure geometries
- Cache: 15min in-memory (Redis or Vercel KV)
- Endpoint: `GET /api/integracoes/creare/surveys` → proxied + cached

### 5.2 FROTALOG (Fleet Tracking)

- 30s polling loop (Vercel Cron or client-side interval)
- Pushes vehicle positions to `fleet_positions` table
- Map layer: real-time vehicle icons with last-seen timestamp
- Alert if vehicle hasn't reported in > 5min

### 5.3 Webradio (DMR/P25)

- Field communication log viewer
- Integration: webhook from radio gateway or polling
- Display: event feed in Operations module sidebar

### 5.4 Video Monitoring (RTSP→HLS)

- RTSP streams transcoded to HLS by edge proxy (not Vercel Functions — needs persistent process)
- Platform fetches HLS manifest URL from `video_streams` table
- Snapshots: periodic capture stored in Supabase Storage
- Display: `<video>` tag with HLS.js player

---

## 6. Mission Library (G09)

### 6.1 Mission Types (SL-901.x)

| Code | Type | Description |
|------|------|-------------|
| SL-901.1 | Expressa | Fast pass, coarse data |
| SL-901.2 | Circular | 360° tower orbit |
| SL-901.3 | Detalhada | Detailed inspection |
| SL-901.4 | Personalizada | Custom parameters |
| SL-901.5 | Fotogramétrica | Photogrammetric survey |

### 6.2 Database

```sql
CREATE TABLE missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('SL-901.1','SL-901.2','SL-901.3','SL-901.4','SL-901.5')),
  name text NOT NULL,
  structure_ids text[],   -- array of tower IDs
  line_name text,
  status text DEFAULT 'planned' CHECK (status IN ('planned','active','completed','cancelled')),
  kmz_file_path text,     -- Supabase Storage path
  planned_date date,
  completed_date date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
```

### 6.3 KMZ Generation

- Input: selected structures on map
- Output: KMZ with waypoints + flight parameters per mission type
- Library: `togeojson` + custom KMZ writer
- Download: `GET /api/missoes/:id/kmz`

---

## 7. Structure Inspection (G10)

### 7.1 Thermographic Risk Scale (SL-1001.x)

| ΔT (°C) | Severity |
|---------|---------|
| > 25 | N1 — Critical |
| 10–25 | N2 — High |
| < 10 | N3 — Medium |

### 7.2 Inspection Form

Fields per SL-1001a–d:
- Structure ID, GPS coordinates
- Inspector name + date
- Component (insulator, jumper, stay, conductor, tower)
- Defect code (from CPFL catalog)
- Thermal image upload (Supabase Storage)
- ΔT reading → auto-computed severity
- Notes

---

## 8. Tenant Onboarding

### 8.1 New Tenant Flow

1. ORG_ADMIN signs up → `signup_requests` table (approval required)
2. Superadmin approves → org created in `organizations`, admin role assigned
3. Org setup wizard:
   - Upload transmission line geometries (GeoJSON/KMZ)
   - Configure integration credentials (CREARE, FROTALOG, etc.)
   - Review and optionally customize risk thresholds
   - Invite team members (email → `user_invites` table)

### 8.2 Demo Mode

- `DEMO_MODE=true` env var activates seeded Baixada Santista dataset
- All writes go to `demo_` prefixed tables or are no-ops
- Banner displayed: "Modo demonstração — dados fictícios"
- Demo data: ~50km line, 120 structures, sample surveys with N1–N4 spread

---

## 9. Roles and RLS

### 9.1 Unified Role Model

| Role | Capabilities |
|------|-------------|
| ORG_ADMIN | Full access including threshold config, user management, integrations |
| POWER_USER | Read + write all operational data, upload surveys, create missions |
| VIEWER | Read-only access to dashboards and map |

### 9.2 RLS Pattern (all tables)

```sql
-- Example for risk_readings
ALTER TABLE risk_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON risk_readings
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "admin_write" ON risk_readings
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ORG_ADMIN', 'POWER_USER')
  );
```

---

## 10. Implementation Sequence (Milestone Order)

### Phase 1 — Clean Skeleton (Weeks 1–2)
- [ ] Split `_serverless_app.ts` into domain routers
- [ ] Remove `apps/api` standalone
- [ ] Remove Mapbox, MapLibre only
- [ ] Unify role tables (migration + RLS update)
- [ ] All existing routes passing smoke tests

### Phase 2 — Ingestão (Weeks 3–4) ← START HERE
- [ ] `surveys`, `risk_readings`, `risk_classifications` migrations
- [ ] `risk_threshold_config` + default seed for CPFL thresholds
- [ ] `ingestao/parser.ts` — LiPowerline XLSX/CSV parser
- [ ] `ingestao/classifier.ts` — threshold-based N1–N4 classification
- [ ] `POST /api/ingestao/upload` endpoint
- [ ] `IngestaoPage.tsx` — upload + summary UI
- [ ] `SurveyDetailPage.tsx` — readings table + basic map overlay

### Phase 3 — Risk Map (Weeks 5–6)
- [ ] Risk layer on MapLibre (span coloring by N-level)
- [ ] Span popup with readings breakdown
- [ ] Threshold config UI (Settings > Risk Thresholds)
- [ ] COG orthomosaic layer

### Phase 4 — Integrations (Weeks 7–8)
- [ ] CREARE adapter + proxy endpoint
- [ ] FROTALOG adapter + fleet map layer
- [ ] Integration health dashboard

### Phase 5 — Missions + Inspection (Weeks 9–10)
- [ ] Mission library CRUD + KMZ generator
- [ ] Structure inspection forms (SL-1001)
- [ ] Thermographic risk classification

### Phase 6 — Tenant Onboarding + Demo (Week 11)
- [ ] Signup request flow
- [ ] Demo mode with Baixada Santista seed
- [ ] Onboarding wizard

---

## 11. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend consolidation | Vercel Functions only | Remove ops complexity of standalone Hono server |
| Map renderer | MapLibre GL only | Open source, Mapbox GL compatible API, no token cost |
| Ingestão format | XLSX + CSV both supported | LiPowerline exports both; CSV for scripted pipelines |
| Threshold storage | DB per tenant | Audit trail, multi-tenant isolation, runtime configurability |
| COG serving | Supabase Storage signed URL | Leverage existing infra; CREARE proxy for client-hosted |
| Demo isolation | Env flag + seed data | Clean separation, no prod contamination |
| Classification timing | At upload (eager) | Immediate feedback; re-classify on threshold change via job |

---

*Generated by SmartLine AssetHealth brainstorming session — 2026-04-20*  
*Ready for /gsd-complete-milestone execution*
