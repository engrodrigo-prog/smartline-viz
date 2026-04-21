import { SEVERITY_COLORS, type IngestaoSeverity } from '../api/ingestaoApi';

type Props = {
  severity: IngestaoSeverity;
  label?: string;
  count?: number;
};

/**
 * count mode: shows a numeric pill (hides when count === 0)
 * label mode: shows "N1 — CRITICO" badge
 */
export const SeverityBadge = ({ severity, label, count }: Props) => {
  if (count !== undefined && count === 0) return null;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold text-white"
      style={{ backgroundColor: SEVERITY_COLORS[severity] }}
      aria-label={label ? `${severity}: ${label}` : undefined}
    >
      {count !== undefined ? count : `${severity}${label ? ` — ${label}` : ''}`}
    </span>
  );
};
