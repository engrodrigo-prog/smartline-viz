import { getJSON } from '@/services/api';
import { supabase } from '@/integrations/supabase/client';
import { ENV } from '@/config/env';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IngestaoReportType = 'CD_SC_TR' | 'CD_SC_SIM' | 'TF_TR' | 'TF_SIM';
export type IngestaoRiskModel = 'MAC' | 'MCB' | 'MT' | 'MTR' | 'MEF' | 'MPQ';
export type IngestaoSeverity = 'N1' | 'N2' | 'N3' | 'N4';
export type SurveyStatus = 'processing' | 'complete' | 'failed';

export const REPORT_TYPE_LABELS: Record<IngestaoReportType, string> = {
  CD_SC_TR:  'Distância de Folga — Real',
  CD_SC_SIM: 'Distância de Folga — Simulado',
  TF_TR:     'Queda de Árvore — Real',
  TF_SIM:    'Queda de Árvore — Simulado',
};

export const RISK_MODEL_LABELS: Record<IngestaoRiskModel, string> = {
  MAC: 'MAC — Condutor-Solo',
  MCB: 'MCB — Condutor-Vegetação',
  MT:  'MT — Condutor-Condutor',
  MTR: 'MTR — Condutor-Obstáculo',
  MEF: 'MEF — Estrutura-Faixa',
  MPQ: 'MPQ — Queda de Árvore',
};

export const SEVERITY_LABELS: Record<IngestaoSeverity, string> = {
  N1: 'N1 — Crítico (≤30 dias)',
  N2: 'N2 — Alto (≤90 dias)',
  N3: 'N3 — Médio (≤180 dias)',
  N4: 'N4 — Baixo (monitorar)',
};

export const SEVERITY_COLORS: Record<IngestaoSeverity, string> = {
  N1: '#EF4444',
  N2: '#F97316',
  N3: '#EAB308',
  N4: '#3B82F6',
};

export type Survey = {
  id: string;
  line_name: string;
  report_type: IngestaoReportType;
  survey_date: string | null;
  source_filename: string | null;
  status: SurveyStatus;
  total_rows: number;
  n1_count: number;
  n2_count: number;
  n3_count: number;
  n4_count: number;
  error_count: number;
  created_at: string;
  created_by: string | null;
};

export type Reading = {
  id: string;
  survey_id: string;
  span_id: string;
  structure_from: string | null;
  structure_to: string | null;
  line_name: string;
  risk_model: IngestaoRiskModel;
  clearance_distance: number | null;
  horizontal_distance: number | null;
  vertical_distance: number | null;
  crossing_count: number | null;
  lidarline_type: string | null;
  lidarline_safety_level: string | null;
  created_at: string;
  ingestao_classification: Array<{
    severity: IngestaoSeverity;
    severity_label: string;
    threshold_snapshot: Record<string, unknown>;
  }> | null;
};

export type ThresholdConfig = {
  id: string;
  risk_model: IngestaoRiskModel;
  scenario: string;
  severity: IngestaoSeverity;
  severity_label: string;
  threshold_min: number | null;
  threshold_max: number | null;
  count_min: number | null;
  count_max: number | null;
  unit: string;
  is_default: boolean;
};

export type UploadSummary = {
  survey_id: string;
  report_type: IngestaoReportType;
  summary: { total: number; classified: number; N1: number; N2: number; N3: number; N4: number };
  errors: Array<{ row: number; message: string }>;
};

export type UploadParams = {
  file: File;
  line_name: string;
  survey_date?: string;
  report_type?: IngestaoReportType;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const apiUrl = (path: string) => {
  const base = ENV.API_BASE_URL?.replace(/\/+$/, '') || '';
  return `${base}${path}`;
};

const authHeaders = async (): Promise<Record<string, string>> => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export const ingestaoApi = {
  upload: async (params: UploadParams): Promise<UploadSummary> => {
    const form = new FormData();
    form.append('file', params.file);
    form.append('line_name', params.line_name);
    if (params.survey_date) form.append('survey_date', params.survey_date);
    if (params.report_type) form.append('report_type', params.report_type);

    const headers = await authHeaders();
    const res = await fetch(apiUrl('/api/ingestao/upload'), {
      method: 'POST',
      headers,
      body: form,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message ?? `Upload falhou com status ${res.status}`);
    }
    return res.json() as Promise<UploadSummary>;
  },

  listSurveys: (params?: { limit?: number; offset?: number; line_name?: string; report_type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    if (params?.line_name) qs.set('line_name', params.line_name);
    if (params?.report_type) qs.set('report_type', params.report_type);
    const q = qs.toString();
    return getJSON<{ items: Survey[]; total: number }>(`/api/ingestao/surveys${q ? `?${q}` : ''}`);
  },

  getSurvey: (id: string) =>
    getJSON<{ survey: Survey; readings: Reading[] }>(`/api/ingestao/surveys/${id}`),

  listThresholds: () =>
    getJSON<{ items: ThresholdConfig[] }>('/api/ingestao/thresholds'),
};
