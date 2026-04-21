/**
 * LiPowerline report parser — converts raw XLSX/CSV rows into typed IngestionRow[].
 *
 * LiPowerline produces 4 report types:
 *   CD_SC_TR  — Clearance Distance Safety Check (real measurements)
 *   CD_SC_SIM — Clearance Distance Safety Check (wind/load simulation)
 *   TF_TR     — Tree Fall (real)
 *   TF_SIM    — Tree Fall (simulated)
 *
 * All four share the same column schema; report type is detected from filename
 * or provided explicitly by the caller.
 */

import { parse as parseCsv } from 'csv-parse/sync';

export type IngestaoReportType = 'CD_SC_TR' | 'CD_SC_SIM' | 'TF_TR' | 'TF_SIM';
export type IngestaoRiskModel = 'MAC' | 'MCB' | 'MT' | 'MTR' | 'MEF' | 'MPQ';
export type IngestaoSeverity = 'N1' | 'N2' | 'N3' | 'N4';

export type IngestionRow = {
  row_index: number;
  span_id: string;
  structure_from: string | null;
  structure_to: string | null;
  line_name: string;
  lidarline_type: string;           // raw "Type" column value
  lidarline_safety_level: string;   // LiPowerline's own classification label
  risk_model: IngestaoRiskModel;
  clearance_distance: number | null;
  horizontal_distance: number | null;
  vertical_distance: number | null;
  crossing_count: number | null;    // for TF reports (tree count crossing span)
};

export type ParseResult = {
  ok: true;
  report_type: IngestaoReportType;
  line_name: string;
  rows: IngestionRow[];
  errors: Array<{ row: number; message: string }>;
} | {
  ok: false;
  message: string;
};

// LiPowerline "Type" column → risk model
const TYPE_TO_MODEL: Record<string, IngestaoRiskModel> = {
  vegetation:  'MCB',
  vegetacao:   'MCB',
  'ground':    'MAC',
  solo:        'MAC',
  terra:       'MAC',
  'power line': 'MT',
  'power lines': 'MT',
  condutor:    'MT',
  road:        'MTR',
  estrada:     'MTR',
  rodovia:     'MTR',
  building:    'MEF',
  edificacao:  'MEF',
  edificação:  'MEF',
  construcao:  'MEF',
  construção:  'MEF',
  'tree fall': 'MPQ',
  queda:       'MPQ',
};

const normalizeType = (raw: string): IngestaoRiskModel | null => {
  const key = raw.trim().toLowerCase();
  return TYPE_TO_MODEL[key] ?? null;
};

const toFloat = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
};

const toInt = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? null : n;
};

// Normalise column header: lowercase, trim, collapse spaces/underscores
const normalizeHeader = (h: string) =>
  h.toLowerCase().trim().replace(/[\s_\-]+/g, '_');

// Prevent CSV formula injection when fields are later exported to Excel/LibreOffice.
// Cells starting with =, +, -, @, tab, or CR are prefixed with a single quote.
const sanitizeCsvField = (v: string): string =>
  /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;

// Detect report type from filename
export const detectReportType = (filename: string): IngestaoReportType | null => {
  const upper = filename.toUpperCase();
  if (upper.includes('CD_SC_SIM') || upper.includes('CDSCSIM') || upper.includes('SIM_CD')) return 'CD_SC_SIM';
  if (upper.includes('CD_SC') || upper.includes('CDSC') || upper.includes('CLEARANCE')) return 'CD_SC_TR';
  if (upper.includes('TF_SIM') || upper.includes('TFSIM')) return 'TF_SIM';
  if (upper.includes('TF_TR') || upper.includes('TREE_FALL') || upper.includes('TREEFALL')) return 'TF_TR';
  return null;
};

const isTfReport = (t: IngestaoReportType) => t === 'TF_TR' || t === 'TF_SIM';

export const parseLiPowerlineBuffer = (
  buffer: Buffer | Uint8Array,
  opts: {
    filename: string;
    report_type?: IngestaoReportType;
    default_line_name?: string;
  },
): ParseResult => {
  const { filename, default_line_name = '' } = opts;

  const report_type = opts.report_type ?? detectReportType(filename);
  if (!report_type) {
    return {
      ok: false,
      message: `Não foi possível detectar o tipo de relatório a partir do nome "${filename}". ` +
        'Informe o tipo explicitamente (CD_SC_TR, CD_SC_SIM, TF_TR ou TF_SIM).',
    };
  }

  // Parse CSV bytes
  let rawRows: Record<string, string>[];
  try {
    rawRows = parseCsv(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      bom: true,
    }) as Record<string, string>[];
  } catch (err: unknown) {
    return { ok: false, message: `Erro ao parsear CSV: ${(err as Error).message}` };
  }

  if (rawRows.length === 0) {
    return { ok: false, message: 'Arquivo sem linhas de dados.' };
  }

  // Map headers to canonical names
  const sampleKeys = Object.keys(rawRows[0]).map(normalizeHeader);
  const headerMap: Record<string, string> = {};
  for (const original of Object.keys(rawRows[0])) {
    headerMap[normalizeHeader(original)] = original;
  }

  const col = (row: Record<string, string>, ...candidates: string[]) => {
    for (const c of candidates) {
      const orig = headerMap[c];
      if (orig && row[orig] !== undefined) return row[orig];
    }
    return '';
  };

  const rows: IngestionRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  const lineNames = new Set<string>();

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const rowNum = i + 2; // 1-based + header row

    const lidarline_type = sanitizeCsvField(col(raw, 'type', 'tipo', 'obstacle_type', 'obstruction_type') || '');
    const risk_model = normalizeType(lidarline_type);

    // For TF reports, accept rows without a "Type" column — they're always MPQ
    const effective_model: IngestaoRiskModel | null =
      isTfReport(report_type) && !risk_model ? 'MPQ' : risk_model;

    if (!effective_model) {
      errors.push({ row: rowNum, message: `Tipo "${lidarline_type}" não reconhecido — linha ignorada.` });
      continue;
    }

    const span_id_raw = sanitizeCsvField(col(raw, 'section', 'span', 'span_id', 'vao', 'vão', 'trecho', 'section_id'));
    if (!span_id_raw) {
      errors.push({ row: rowNum, message: 'Campo "Section/Span" ausente — linha ignorada.' });
      continue;
    }

    const line_name = sanitizeCsvField(
      col(raw, 'line', 'line_name', 'linha', 'transmission_line') || default_line_name,
    );

    lineNames.add(line_name);

    const clearance_distance = toFloat(
      col(raw, 'clearance_distance', 'clearance_dist', 'clearance', 'distancia_folga', 'folga', 'distance')
    );
    const horizontal_distance = toFloat(
      col(raw, 'horizontal_distance', 'horizontal_dist', 'distancia_horizontal', 'horiz_dist')
    );
    const vertical_distance = toFloat(
      col(raw, 'vertical_distance', 'vertical_dist', 'distancia_vertical', 'vert_dist')
    );
    const crossing_count = isTfReport(report_type)
      ? toInt(col(raw, 'count', 'crossing_count', 'tree_count', 'contagem', 'quantidade'))
      : null;

    const lidarline_safety_level = sanitizeCsvField(
      col(raw, 'safety_level', 'safety', 'nivel_seguranca', 'nivel', 'classification', 'class') || '',
    );

    // Split "T001-T002" into structure_from / structure_to
    const spanParts = span_id_raw.split(/[-–—]/);
    const structure_from = spanParts[0]?.trim() || null;
    const structure_to = spanParts[1]?.trim() || null;

    rows.push({
      row_index: rowNum,
      span_id: span_id_raw.trim(),
      structure_from,
      structure_to,
      line_name,
      lidarline_type,
      lidarline_safety_level,
      risk_model: effective_model,
      clearance_distance,
      horizontal_distance,
      vertical_distance,
      crossing_count,
    });
  }

  const line_name = lineNames.size === 1
    ? (lineNames.values().next().value as string)
    : default_line_name;

  return { ok: true, report_type, line_name, rows, errors };
};
