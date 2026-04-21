/**
 * Risk classifier — applies tenant thresholds to IngestionRow[] and returns
 * classified rows ready to insert into ingestao_classification.
 *
 * Thresholds are loaded from risk_threshold_config for the tenant.
 * Default CPFL v9.0 thresholds are used as fallback when tenant has none.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { IngestionRow, IngestaoRiskModel, IngestaoSeverity } from './_ingestao_parser.js';

export type ThresholdRow = {
  id: string;
  risk_model: IngestaoRiskModel;
  scenario: string;       // TR | SIM | ALL
  severity: IngestaoSeverity;
  severity_label: string;
  threshold_min: number | null;
  threshold_max: number | null;
  count_min: number | null;
  count_max: number | null;
  unit: string;
  is_default: boolean;
};

export type ClassifiedRow = {
  reading: IngestionRow;
  severity: IngestaoSeverity;
  severity_label: string;
  threshold_config_id: string | null;
  threshold_snapshot: Record<string, unknown>;
};

type ScenarioCode = 'TR' | 'SIM';

const reportTypeToScenario = (report_type: string): ScenarioCode =>
  report_type.includes('SIM') ? 'SIM' : 'TR';

// Built-in CPFL v9.0 fallback thresholds (no DB call required)
const CPFL_DEFAULTS: ThresholdRow[] = [
  // MAC
  { id: 'cpfl-mac-n1-urgente', risk_model: 'MAC', scenario: 'ALL', severity: 'N1', severity_label: 'URGENTE',  threshold_min: null, threshold_max: 2,    count_min: null, count_max: null, unit: 'm', is_default: true },
  { id: 'cpfl-mac-n1-critico', risk_model: 'MAC', scenario: 'ALL', severity: 'N1', severity_label: 'CRITICO',  threshold_min: 2,    threshold_max: 4,    count_min: null, count_max: null, unit: 'm', is_default: true },
  { id: 'cpfl-mac-n2',         risk_model: 'MAC', scenario: 'ALL', severity: 'N2', severity_label: 'ALTO',     threshold_min: 4,    threshold_max: 5,    count_min: null, count_max: null, unit: 'm', is_default: true },
  { id: 'cpfl-mac-n3',         risk_model: 'MAC', scenario: 'ALL', severity: 'N3', severity_label: 'MEDIO',    threshold_min: 5,    threshold_max: 7,    count_min: null, count_max: null, unit: 'm', is_default: true },
  { id: 'cpfl-mac-n4',         risk_model: 'MAC', scenario: 'ALL', severity: 'N4', severity_label: 'BAIXO',    threshold_min: 7,    threshold_max: null, count_min: null, count_max: null, unit: 'm', is_default: true },
  // MCB
  { id: 'cpfl-mcb-n2', risk_model: 'MCB', scenario: 'ALL', severity: 'N2', severity_label: 'ALTO',  threshold_min: null, threshold_max: 7,    count_min: null, count_max: null, unit: 'm', is_default: true },
  { id: 'cpfl-mcb-n3', risk_model: 'MCB', scenario: 'ALL', severity: 'N3', severity_label: 'MEDIO', threshold_min: 7,    threshold_max: 9,    count_min: null, count_max: null, unit: 'm', is_default: true },
  { id: 'cpfl-mcb-n4', risk_model: 'MCB', scenario: 'ALL', severity: 'N4', severity_label: 'BAIXO', threshold_min: 9,    threshold_max: null, count_min: null, count_max: null, unit: 'm', is_default: true },
  // MTR — same as MCB
  { id: 'cpfl-mtr-n2', risk_model: 'MTR', scenario: 'ALL', severity: 'N2', severity_label: 'ALTO',  threshold_min: null, threshold_max: 7,    count_min: null, count_max: null, unit: 'm', is_default: true },
  { id: 'cpfl-mtr-n3', risk_model: 'MTR', scenario: 'ALL', severity: 'N3', severity_label: 'MEDIO', threshold_min: 7,    threshold_max: 9,    count_min: null, count_max: null, unit: 'm', is_default: true },
  { id: 'cpfl-mtr-n4', risk_model: 'MTR', scenario: 'ALL', severity: 'N4', severity_label: 'BAIXO', threshold_min: 9,    threshold_max: null, count_min: null, count_max: null, unit: 'm', is_default: true },
  // MPQ — count-based
  { id: 'cpfl-mpq-n1', risk_model: 'MPQ', scenario: 'ALL', severity: 'N1', severity_label: 'CRITICO', threshold_min: null, threshold_max: null, count_min: 5,    count_max: null, unit: 'trees', is_default: true },
  { id: 'cpfl-mpq-n2', risk_model: 'MPQ', scenario: 'ALL', severity: 'N2', severity_label: 'ALTO',    threshold_min: null, threshold_max: null, count_min: 3,    count_max: 5,    unit: 'trees', is_default: true },
  { id: 'cpfl-mpq-n3', risk_model: 'MPQ', scenario: 'ALL', severity: 'N3', severity_label: 'MEDIO',   threshold_min: null, threshold_max: null, count_min: 1,    count_max: 3,    unit: 'trees', is_default: true },
  { id: 'cpfl-mpq-n4', risk_model: 'MPQ', scenario: 'ALL', severity: 'N4', severity_label: 'BAIXO',   threshold_min: null, threshold_max: null, count_min: null, count_max: 1,    unit: 'trees', is_default: true },
];

const matchesThreshold = (t: ThresholdRow, value: number): boolean => {
  const min = t.threshold_min ?? t.count_min ?? null;
  const max = t.threshold_max ?? t.count_max ?? null;
  const aboveMin = min === null || value >= min;
  const belowMax = max === null || value < max;
  return aboveMin && belowMax;
};

const classifyValue = (
  value: number | null,
  model: IngestaoRiskModel,
  scenario: ScenarioCode,
  thresholds: ThresholdRow[],
): { severity: IngestaoSeverity; severity_label: string; config_id: string | null } | null => {
  if (value === null) return null;

  const candidates = thresholds.filter(
    (t) => t.risk_model === model && (t.scenario === 'ALL' || t.scenario === scenario),
  );

  // Prefer tenant-specific over default
  const ordered = [...candidates].sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? 1 : -1;
    // N1 > N2 > N3 > N4 (most severe first for correct range matching)
    const sev = ['N1', 'N2', 'N3', 'N4'];
    return sev.indexOf(a.severity) - sev.indexOf(b.severity);
  });

  for (const t of ordered) {
    if (matchesThreshold(t, value)) {
      return {
        severity: t.severity,
        severity_label: t.severity_label,
        config_id: t.is_default ? null : t.id,
      };
    }
  }
  return null;
};

export const loadTenantThresholds = async (
  supabase: SupabaseClient,
): Promise<ThresholdRow[]> => {
  const { data, error } = await supabase
    .from('risk_threshold_config')
    .select('id,risk_model,scenario,severity,severity_label,threshold_min,threshold_max,count_min,count_max,unit,is_default');

  if (error || !data) return CPFL_DEFAULTS;
  return data.length > 0 ? (data as ThresholdRow[]) : CPFL_DEFAULTS;
};

export const classifyRows = (
  rows: IngestionRow[],
  report_type: string,
  thresholds: ThresholdRow[],
): ClassifiedRow[] => {
  const scenario = reportTypeToScenario(report_type);
  // Only append CPFL defaults when tenant has custom (non-default) thresholds.
  // If loadTenantThresholds already returned CPFL_DEFAULTS, concatenating again
  // would double every entry and corrupt the threshold snapshot audit.
  const hasTenantCustom = thresholds.some((t) => !t.is_default);
  const combined = hasTenantCustom ? [...thresholds, ...CPFL_DEFAULTS] : CPFL_DEFAULTS;
  const thresholdSnapshot: Record<string, unknown> = {};
  for (const t of combined) {
    if (!thresholdSnapshot[t.risk_model]) {
      thresholdSnapshot[t.risk_model] = combined
        .filter((x) => x.risk_model === t.risk_model)
        .map((x) => ({
          severity: x.severity,
          label: x.severity_label,
          min: x.threshold_min ?? x.count_min,
          max: x.threshold_max ?? x.count_max,
          unit: x.unit,
        }));
    }
  }

  const classified: ClassifiedRow[] = [];
  for (const row of rows) {
    const measureValue =
      row.risk_model === 'MPQ'
        ? row.crossing_count
        : row.clearance_distance;

    const result = classifyValue(measureValue, row.risk_model, scenario, combined);
    if (!result) continue;

    classified.push({
      reading: row,
      severity: result.severity,
      severity_label: result.severity_label,
      threshold_config_id: result.config_id,
      threshold_snapshot: { [row.risk_model]: thresholdSnapshot[row.risk_model] },
    });
  }

  return classified;
};
