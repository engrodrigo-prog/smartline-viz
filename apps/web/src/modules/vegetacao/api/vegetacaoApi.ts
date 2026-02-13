import { deleteJSON, getJSON, postJSON, putJSON } from "@/services/api";

export type VegSeverity = "low" | "medium" | "high" | "critical";
export type VegLocationMethod = "gps" | "map_pin" | "manual_address";

export type VegLocationPayload = {
  method: VegLocationMethod;
  coords?: { lat: number; lng: number };
  captured_at?: string;
  accuracy_m?: number;
  address_text?: string;
};

export type VegDashboardResponse = {
  kpis: {
    anomalies_today: number;
    anomalies_month: number;
    anomalies_open_total: number;
    anomalies_open_by_severity: Record<VegSeverity, number>;
    work_orders_pending: number;
    actions_executed_month: number;
    audits_pending: number;
    pending_sync: number;
  };
  recent: {
    inspections: VegInspection[];
    anomalies: VegAnomaly[];
    actions: VegAction[];
  };
  generated_at: string;
};

export type VegAnomalyStatus =
  | "open"
  | "triaged"
  | "scheduled"
  | "in_progress"
  | "resolved"
  | "canceled";

export type VegAnomalyType =
  | "encroachment"
  | "risk_tree"
  | "regrowth"
  | "fallen_tree"
  | "blocked_access"
  | "environmental_restriction"
  | "other";

export type VegSource = "field" | "satellite" | "lidar" | "drone" | "customer" | "other";

export type VegAnomaly = {
  id: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  status: VegAnomalyStatus;
  severity: VegSeverity;
  anomaly_type: VegAnomalyType;
  source: VegSource;
  title: string;
  description: string | null;
  due_date: string | null;
  asset_ref: string | null;
  address_text: string | null;
  location_method: VegLocationMethod;
  location_captured_at: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  geom: unknown;
};

export type VegInspectionStatus = "open" | "closed";
export type VegActionType =
  | "pruning"
  | "mowing"
  | "laser_pruning"
  | "tree_removal"
  | "clearing"
  | "inspection"
  | "verification"
  | "other";

export type VegInspection = {
  id: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  anomaly_id: string | null;
  status: VegInspectionStatus;
  severity: VegSeverity | null;
  findings: Record<string, unknown>;
  requires_action: boolean;
  suggested_action_type: VegActionType | null;
  notes: string | null;
  address_text: string | null;
  location_method: VegLocationMethod;
  location_captured_at: string | null;
  metadata: Record<string, unknown>;
  geom: unknown;
};

export type VegWorkOrderStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "executed"
  | "verified"
  | "closed"
  | "canceled";
export type VegPriority = "low" | "medium" | "high" | "critical";

export type VegWorkOrder = {
  id: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  anomaly_id: string | null;
  inspection_id: string | null;
  status: VegWorkOrderStatus;
  priority: VegPriority;
  team_id: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  address_text: string | null;
  location_method: VegLocationMethod;
  location_captured_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  geom: unknown;
};

export type VegActionStatus = "planned" | "assigned" | "in_progress" | "executed" | "verified" | "closed" | "canceled";

export type VegAction = {
  id: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  work_order_id: string | null;
  anomaly_id: string | null;
  action_type: VegActionType;
  status: VegActionStatus;
  planned_start: string | null;
  planned_end: string | null;
  executed_at: string | null;
  team_id: string | null;
  operator_id: string | null;
  quantity: number | null;
  unit: string | null;
  address_text: string | null;
  location_method: VegLocationMethod;
  location_captured_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  geom: unknown;
};

export type VegAuditResult = "approved" | "rejected";
export type VegAudit = {
  id: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  work_order_id: string | null;
  action_id: string | null;
  result: VegAuditResult;
  checklist: Record<string, unknown>;
  notes: string | null;
  corrective_required: boolean;
  corrective_notes: string | null;
};

export type VegScheduleStatus = "planned" | "confirmed" | "done" | "canceled";
export type VegScheduleEvent = {
  id: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  title: string;
  start_at: string;
  end_at: string;
  team_id: string | null;
  operator_id: string | null;
  related_anomaly_id: string | null;
  related_work_order_id: string | null;
  related_action_id: string | null;
  status: VegScheduleStatus;
  address_text: string | null;
  location_text: string | null;
  location_method: VegLocationMethod;
  location_captured_at: string | null;
  metadata: Record<string, unknown>;
  geom: unknown;
};

export type VegRiskCategory = "vegetation" | "tree_fall" | "environmental" | "access" | "recurrence" | "other";
export type VegRiskStatus = "open" | "mitigated" | "accepted" | "closed";

export type VegRisk = {
  id: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  related_anomaly_id: string | null;
  related_work_order_id: string | null;
  category: VegRiskCategory;
  probability: number;
  impact: number;
  score: number;
  sla_days: number | null;
  status: VegRiskStatus;
  notes: string | null;
  metadata: Record<string, unknown>;
};

export type VegDocType =
  | "ASV"
  | "license"
  | "environmental_report"
  | "photo_report"
  | "kml"
  | "geojson"
  | "pdf"
  | "other";

export type VegDocument = {
  id: string;
  created_at: string;
  created_by: string | null;
  doc_type: VegDocType;
  title: string;
  description: string | null;
  file_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  sha256: string | null;
  linked_anomaly_id: string | null;
  linked_work_order_id: string | null;
  linked_action_id: string | null;
  tags: string[];
  address_text: string | null;
  location_method: VegLocationMethod;
  location_captured_at: string | null;
  metadata: Record<string, unknown>;
  geom: unknown;
};

export type VegEvidenceType = "photo" | "video" | "pdf" | "note" | "ai_result" | "other";

export type VegEvidence = {
  id: string;
  created_at: string;
  created_by: string | null;
  evidence_type: VegEvidenceType;
  file_path: string | null;
  text_note: string | null;
  address_text: string | null;
  linked_anomaly_id: string | null;
  linked_inspection_id: string | null;
  linked_work_order_id: string | null;
  linked_action_id: string | null;
  captured_at: string | null;
  location_method: VegLocationMethod;
  location_captured_at: string | null;
  metadata: Record<string, unknown>;
  geom: unknown;
};

export type VegSpeciesStatus = "suggested" | "confirmed" | "corrected" | "rejected";

export type VegAiTopK = { species: string; scientific_name?: string; confidence: number };
export type VegAiSpeciesResponse = {
  species: string;
  scientific_name?: string;
  confidence: number;
  top_k: VegAiTopK[];
  model_version: string;
  notes?: string;
};

export type VegSpeciesIdentification = {
  id: string;
  created_at: string;
  created_by: string | null;
  evidence_id: string;
  raw_result: Record<string, unknown>;
  suggested_species: string | null;
  suggested_scientific_name: string | null;
  suggested_confidence: number | null;
  top_k: unknown;
  model_version: string | null;
  confirmed_species: string | null;
  confirmed_scientific_name: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  confidence_threshold: number;
  status: VegSpeciesStatus;
};

export type VegReportsGroupBy = "day" | "week" | "month";
export type VegReportsDimension = "period" | "team" | "operator" | "location";

export type VegReportsQueryRequest = {
  date_from: string; // YYYY-MM-DD
  date_to: string; // YYYY-MM-DD
  group_by?: VegReportsGroupBy;
  dimension?: VegReportsDimension;
  team_id?: string;
  operator_id?: string;
};

export type VegReportsQueryItem = {
  key: string;
  total_actions: number;
  total_quantity: number;
  units: Record<string, number>;
  by_type: Record<string, number>;
};

export type VegReportsQueryResponse = {
  meta: {
    date_from: string;
    date_to: string;
    group_by: VegReportsGroupBy;
    dimension: VegReportsDimension;
  };
  items: VegReportsQueryItem[];
};

const buildQuery = (params: Record<string, string | undefined>) => {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    usp.set(key, value);
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
};

export const vegApi = {
  dashboard: () => getJSON<VegDashboardResponse>("/vegetacao/dashboard"),

  reportsQuery: (payload: VegReportsQueryRequest) =>
    postJSON<VegReportsQueryResponse>("/vegetacao/reports/query", payload),

  speciesIdentify: (payload: {
    evidence_id?: string;
    image_base64?: string;
    file_path?: string;
    mime_type?: string;
    confidence_threshold?: number;
  }) =>
    postJSON<{ result: VegAiSpeciesResponse; saved: VegSpeciesIdentification | null }>(
      "/vegetacao/ai/species-identify",
      payload,
    ),
  listSpeciesIdentifications: (params: { evidence_id: string; limit?: number }) =>
    getJSON<{ items: VegSpeciesIdentification[] }>(
      `/vegetacao/species-identifications${buildQuery({
        evidence_id: params.evidence_id,
        limit: params.limit ? String(params.limit) : undefined,
      })}`,
    ),
  updateSpeciesIdentification: (
    id: string,
    payload: {
      status: VegSpeciesStatus;
      confirmed_species?: string | null;
      confirmed_scientific_name?: string | null;
    },
  ) => putJSON<{ item: VegSpeciesIdentification }>(`/vegetacao/species-identifications/${id}`, payload),

  listAnomalias: (params: { limit?: number; status?: VegAnomalyStatus; severity?: VegSeverity; q?: string } = {}) =>
    getJSON<{ items: VegAnomaly[] }>(
      `/vegetacao/anomalias${buildQuery({
        limit: params.limit ? String(params.limit) : undefined,
        status: params.status,
        severity: params.severity,
        q: params.q,
      })}`,
    ),
  createAnomalia: (payload: {
    id?: string;
    status?: VegAnomalyStatus;
    severity?: VegSeverity;
    anomaly_type?: VegAnomalyType;
    source?: VegSource;
    title: string;
    description?: string;
    asset_ref?: string;
    due_date?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    location?: VegLocationPayload;
  }) => postJSON<{ item: VegAnomaly }>("/vegetacao/anomalias", payload),
  updateAnomalia: (
    id: string,
    payload: Partial<{
      status: VegAnomalyStatus;
      severity: VegSeverity;
      anomaly_type: VegAnomalyType;
      source: VegSource;
      title: string;
      description: string;
      asset_ref: string;
      due_date: string;
      tags: string[];
      metadata: Record<string, unknown>;
      location: VegLocationPayload;
    }>,
  ) => putJSON<{ item: VegAnomaly }>(`/vegetacao/anomalias/${id}`, payload),
  deleteAnomalia: (id: string) => deleteJSON<{ ok: true }>(`/vegetacao/anomalias/${id}`),

  listInspecoes: (params: { limit?: number } = {}) =>
    getJSON<{ items: VegInspection[] }>(`/vegetacao/inspecoes${buildQuery({ limit: params.limit ? String(params.limit) : undefined })}`),
  createInspecao: (payload: {
    id?: string;
    anomaly_id?: string;
    status?: VegInspectionStatus;
    severity?: VegSeverity | null;
    requires_action?: boolean;
    suggested_action_type?: VegActionType | null;
    findings?: Record<string, unknown>;
    notes?: string;
    metadata?: Record<string, unknown>;
    location?: VegLocationPayload;
  }) => postJSON<{ item: VegInspection }>("/vegetacao/inspecoes", payload),
  updateInspecao: (
    id: string,
    payload: Partial<{
      anomaly_id: string | null;
      status: VegInspectionStatus;
      severity: VegSeverity | null;
      requires_action: boolean;
      suggested_action_type: VegActionType | null;
      findings: Record<string, unknown>;
      notes: string;
      metadata: Record<string, unknown>;
      location: VegLocationPayload;
    }>,
  ) => putJSON<{ item: VegInspection }>(`/vegetacao/inspecoes/${id}`, payload),
  deleteInspecao: (id: string) => deleteJSON<{ ok: true }>(`/vegetacao/inspecoes/${id}`),

  listOs: (params: { limit?: number } = {}) =>
    getJSON<{ items: VegWorkOrder[] }>(`/vegetacao/os${buildQuery({ limit: params.limit ? String(params.limit) : undefined })}`),
  createOs: (payload: {
    id?: string;
    anomaly_id?: string;
    inspection_id?: string;
    status?: VegWorkOrderStatus;
    priority?: VegPriority;
    team_id?: string | null;
    scheduled_start?: string | null;
    scheduled_end?: string | null;
    notes?: string;
    metadata?: Record<string, unknown>;
    location?: VegLocationPayload;
  }) => postJSON<{ item: VegWorkOrder }>("/vegetacao/os", payload),
  updateOs: (
    id: string,
    payload: Partial<{
      anomaly_id: string | null;
      inspection_id: string | null;
      status: VegWorkOrderStatus;
      priority: VegPriority;
      team_id: string | null;
      scheduled_start: string | null;
      scheduled_end: string | null;
      notes: string;
      metadata: Record<string, unknown>;
      location: VegLocationPayload;
    }>,
  ) => putJSON<{ item: VegWorkOrder }>(`/vegetacao/os/${id}`, payload),
  deleteOs: (id: string) => deleteJSON<{ ok: true }>(`/vegetacao/os/${id}`),

  listExecucoes: (params: { limit?: number } = {}) =>
    getJSON<{ items: VegAction[] }>(`/vegetacao/execucoes${buildQuery({ limit: params.limit ? String(params.limit) : undefined })}`),
  createExecucao: (payload: {
    id?: string;
    work_order_id?: string | null;
    anomaly_id?: string | null;
    action_type: VegActionType;
    status?: VegActionStatus;
    planned_start?: string | null;
    planned_end?: string | null;
    executed_at?: string | null;
    team_id?: string | null;
    operator_id?: string | null;
    quantity?: number | null;
    unit?: string | null;
    notes?: string;
    metadata?: Record<string, unknown>;
    location?: VegLocationPayload;
  }) => postJSON<{ item: VegAction }>("/vegetacao/execucoes", payload),
  updateExecucao: (
    id: string,
    payload: Partial<{
      work_order_id: string | null;
      anomaly_id: string | null;
      action_type: VegActionType;
      status: VegActionStatus;
      planned_start: string | null;
      planned_end: string | null;
      executed_at: string | null;
      team_id: string | null;
      operator_id: string | null;
      quantity: number | null;
      unit: string | null;
      notes: string;
      metadata: Record<string, unknown>;
      location: VegLocationPayload;
    }>,
  ) => putJSON<{ item: VegAction }>(`/vegetacao/execucoes/${id}`, payload),
  deleteExecucao: (id: string) => deleteJSON<{ ok: true }>(`/vegetacao/execucoes/${id}`),

  listAuditorias: (params: { limit?: number } = {}) =>
    getJSON<{ items: VegAudit[] }>(`/vegetacao/auditorias${buildQuery({ limit: params.limit ? String(params.limit) : undefined })}`),
  createAuditoria: (payload: {
    id?: string;
    work_order_id?: string | null;
    action_id?: string | null;
    result: VegAuditResult;
    checklist?: Record<string, unknown>;
    notes?: string;
    corrective_required?: boolean;
    corrective_notes?: string | null;
  }) => postJSON<{ item: VegAudit }>("/vegetacao/auditorias", payload),
  updateAuditoria: (
    id: string,
    payload: Partial<{
      work_order_id: string | null;
      action_id: string | null;
      result: VegAuditResult;
      checklist: Record<string, unknown>;
      notes: string;
      corrective_required: boolean;
      corrective_notes: string | null;
    }>,
  ) => putJSON<{ item: VegAudit }>(`/vegetacao/auditorias/${id}`, payload),
  deleteAuditoria: (id: string) => deleteJSON<{ ok: true }>(`/vegetacao/auditorias/${id}`),

  listAgenda: (params: { limit?: number } = {}) =>
    getJSON<{ items: VegScheduleEvent[] }>(`/vegetacao/agenda${buildQuery({ limit: params.limit ? String(params.limit) : undefined })}`),
  createAgenda: (payload: {
    id?: string;
    title: string;
    start_at: string;
    end_at: string;
    team_id?: string | null;
    operator_id?: string | null;
    related_anomaly_id?: string | null;
    related_work_order_id?: string | null;
    related_action_id?: string | null;
    status?: VegScheduleStatus;
    location_text?: string | null;
    metadata?: Record<string, unknown>;
    location?: VegLocationPayload;
  }) => postJSON<{ item: VegScheduleEvent }>("/vegetacao/agenda", payload),
  updateAgenda: (
    id: string,
    payload: Partial<{
      title: string;
      start_at: string;
      end_at: string;
      team_id: string | null;
      operator_id: string | null;
      related_anomaly_id: string | null;
      related_work_order_id: string | null;
      related_action_id: string | null;
      status: VegScheduleStatus;
      location_text: string | null;
      metadata: Record<string, unknown>;
      location: VegLocationPayload;
    }>,
  ) => putJSON<{ item: VegScheduleEvent }>(`/vegetacao/agenda/${id}`, payload),
  deleteAgenda: (id: string) => deleteJSON<{ ok: true }>(`/vegetacao/agenda/${id}`),

  listRiscos: (params: { limit?: number } = {}) =>
    getJSON<{ items: VegRisk[] }>(`/vegetacao/risco${buildQuery({ limit: params.limit ? String(params.limit) : undefined })}`),
  createRisco: (payload: {
    id?: string;
    related_anomaly_id?: string | null;
    related_work_order_id?: string | null;
    category?: VegRiskCategory;
    probability: number;
    impact: number;
    sla_days?: number | null;
    status?: VegRiskStatus;
    notes?: string;
    metadata?: Record<string, unknown>;
  }) => postJSON<{ item: VegRisk }>("/vegetacao/risco", payload),
  updateRisco: (
    id: string,
    payload: Partial<{
      related_anomaly_id: string | null;
      related_work_order_id: string | null;
      category: VegRiskCategory;
      probability: number;
      impact: number;
      sla_days: number | null;
      status: VegRiskStatus;
      notes: string;
      metadata: Record<string, unknown>;
    }>,
  ) => putJSON<{ item: VegRisk }>(`/vegetacao/risco/${id}`, payload),
  deleteRisco: (id: string) => deleteJSON<{ ok: true }>(`/vegetacao/risco/${id}`),

  listDocumentos: (params: { limit?: number } = {}) =>
    getJSON<{ items: VegDocument[] }>(`/vegetacao/documentos${buildQuery({ limit: params.limit ? String(params.limit) : undefined })}`),
  createDocumento: (payload: {
    id?: string;
    doc_type?: VegDocType;
    title: string;
    description?: string | null;
    file_path: string;
    mime_type?: string | null;
    size_bytes?: number | null;
    sha256?: string | null;
    linked_anomaly_id?: string | null;
    linked_work_order_id?: string | null;
    linked_action_id?: string | null;
    tags?: string[];
    metadata?: Record<string, unknown>;
    location?: VegLocationPayload;
  }) => postJSON<{ item: VegDocument }>("/vegetacao/documentos", payload),
  updateDocumento: (
    id: string,
    payload: Partial<{
      doc_type: VegDocType;
      title: string;
      description: string | null;
      file_path: string;
      mime_type: string | null;
      size_bytes: number | null;
      sha256: string | null;
      linked_anomaly_id: string | null;
      linked_work_order_id: string | null;
      linked_action_id: string | null;
      tags: string[];
      metadata: Record<string, unknown>;
      location: VegLocationPayload;
    }>,
  ) => putJSON<{ item: VegDocument }>(`/vegetacao/documentos/${id}`, payload),
  deleteDocumento: (id: string) => deleteJSON<{ ok: true }>(`/vegetacao/documentos/${id}`),

  listEvidencias: (params: {
    limit?: number;
    linked_anomaly_id?: string;
    linked_inspection_id?: string;
    linked_work_order_id?: string;
    linked_action_id?: string;
  } = {}) =>
    getJSON<{ items: VegEvidence[] }>(
      `/vegetacao/evidencias${buildQuery({
        limit: params.limit ? String(params.limit) : undefined,
        linked_anomaly_id: params.linked_anomaly_id,
        linked_inspection_id: params.linked_inspection_id,
        linked_work_order_id: params.linked_work_order_id,
        linked_action_id: params.linked_action_id,
      })}`,
    ),
  createEvidencia: (payload: {
    id?: string;
    evidence_type?: VegEvidenceType;
    file_path?: string | null;
    text_note?: string | null;
    linked_anomaly_id?: string | null;
    linked_inspection_id?: string | null;
    linked_work_order_id?: string | null;
    linked_action_id?: string | null;
    captured_at?: string | null;
    metadata?: Record<string, unknown>;
    location?: VegLocationPayload;
  }) => postJSON<{ item: VegEvidence }>("/vegetacao/evidencias", payload),
  deleteEvidencia: (id: string) => deleteJSON<{ ok: true }>(`/vegetacao/evidencias/${id}`),
};

export default vegApi;
