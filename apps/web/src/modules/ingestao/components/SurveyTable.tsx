import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SeverityBadge } from './SeverityBadge';
import {
  REPORT_TYPE_LABELS,
  type Survey,
} from '../api/ingestaoApi';

type Props = {
  surveys: Survey[];
  isLoading: boolean;
};

const StatusBadge = ({ status }: { status: Survey['status'] }) => {
  const map = {
    complete:   { label: 'Completo',     className: 'bg-green-100 text-green-700' },
    processing: { label: 'Processando',  className: 'bg-yellow-100 text-yellow-700' },
    failed:     { label: 'Falhou',       className: 'bg-red-100 text-red-700' },
  };
  const { label, className } = map[status] ?? { label: status, className: '' };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
};

export const SurveyTable = ({ surveys, isLoading }: Props) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (surveys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
        <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm">Nenhum relatório importado ainda.</p>
        <p className="text-xs">Use o botão acima para importar um relatório LiPowerline.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-lg border overflow-hidden">
      {surveys.map((s) => (
        <div
          key={s.id}
          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">{s.line_name}</span>
              <StatusBadge status={s.status} />
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
              <span>{REPORT_TYPE_LABELS[s.report_type]}</span>
              {s.survey_date && <span>· {s.survey_date}</span>}
              <span>· {s.total_rows} vãos</span>
            </div>
          </div>

          {s.status === 'complete' && (
            <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
              <SeverityBadge severity="N1" count={s.n1_count} />
              <SeverityBadge severity="N2" count={s.n2_count} />
              <SeverityBadge severity="N3" count={s.n3_count} />
              <SeverityBadge severity="N4" count={s.n4_count} />
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/ingestao/${s.id}`)}
            className="flex-shrink-0 text-xs"
          >
            Detalhes
          </Button>
        </div>
      ))}
    </div>
  );
};
