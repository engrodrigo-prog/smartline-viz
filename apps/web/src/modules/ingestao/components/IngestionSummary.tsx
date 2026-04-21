import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SEVERITY_COLORS, type IngestaoSeverity, type UploadSummary } from '../api/ingestaoApi';

type Props = {
  result: UploadSummary;
  onReset: () => void;
};

// Icon shapes that convey severity beyond colour (for colorblind users)
const SEVERITY_ICONS: Record<IngestaoSeverity, { symbol: string; ariaLabel: string }> = {
  N1: { symbol: '▲', ariaLabel: 'Crítico' },
  N2: { symbol: '◆', ariaLabel: 'Alto' },
  N3: { symbol: '●', ariaLabel: 'Médio' },
  N4: { symbol: '○', ariaLabel: 'Baixo' },
};

type NLevel = { level: IngestaoSeverity; label: string; sla: string; count: number };

const LEVELS: Omit<NLevel, 'count'>[] = [
  { level: 'N1', label: 'N1 — Crítico',  sla: '≤30 dias' },
  { level: 'N2', label: 'N2 — Alto',     sla: '≤90 dias' },
  { level: 'N3', label: 'N3 — Médio',    sla: '≤180 dias' },
  { level: 'N4', label: 'N4 — Baixo',    sla: 'Monitorar' },
];

export const IngestionSummary = ({ result, onReset }: Props) => {
  const navigate = useNavigate();
  const { summary, errors } = result;

  const levels: NLevel[] = LEVELS.map((l) => ({
    ...l,
    count: summary[l.level],
  }));

  const hasN1 = summary.N1 > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <span aria-label="Importação concluída" role="img">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-2" aria-hidden="true">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </span>
        <h3 className="font-semibold text-lg">Importação concluída</h3>
        <p className="text-sm text-muted-foreground">
          {summary.classified} de {summary.total} vãos classificados
        </p>
      </div>

      {/* N-level bars — color + shape symbol + text for accessibility */}
      <div className="space-y-3" role="list" aria-label="Distribuição de severidade">
        {levels.map(({ level, label, sla, count }) => {
          const { symbol, ariaLabel } = SEVERITY_ICONS[level];
          return (
            <div key={level} className="flex items-center gap-3" role="listitem">
              <span
                aria-label={ariaLabel}
                className="w-5 text-center text-xs font-bold flex-shrink-0 select-none"
                style={{ color: SEVERITY_COLORS[level] }}
              >
                {symbol}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{label}</span>
                  <span className="text-xs text-muted-foreground">{sla}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden" role="progressbar"
                  aria-valuenow={count} aria-valuemax={summary.total} aria-label={`${label}: ${count} vãos`}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: summary.total > 0 ? `${(count / summary.total) * 100}%` : '0%',
                      backgroundColor: SEVERITY_COLORS[level],
                    }}
                  />
                </div>
              </div>
              <span className="text-sm font-bold w-8 text-right" aria-hidden="true">{count}</span>
            </div>
          );
        })}
      </div>

      {hasN1 && (
        <Alert variant="destructive">
          <AlertDescription>
            <strong>{summary.N1} vã{summary.N1 > 1 ? 'os' : 'o'} em nível N1 (Crítico)</strong> — ação imediata recomendada em até 30 dias.
          </AlertDescription>
        </Alert>
      )}

      {errors.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium">
            {errors.length} linha{errors.length > 1 ? 's' : ''} ignorada{errors.length > 1 ? 's' : ''}
          </summary>
          <ul className="mt-2 space-y-1 pl-2">
            {errors.slice(0, 10).map((e, i) => (
              <li key={i}>Linha {e.row}: {e.message}</li>
            ))}
            {errors.length > 10 && <li>…e mais {errors.length - 10}</li>}
          </ul>
        </details>
      )}

      {/* Actions — "Ver detalhes" instead of "Ver no mapa" since it goes to a table view */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onReset} className="flex-1">
          Nova importação
        </Button>
        <Button onClick={() => navigate(`/ingestao/${result.survey_id}`)} className="flex-1">
          Ver detalhes
        </Button>
      </div>
    </div>
  );
};
