import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useIngestaoSurvey } from '../hooks/useIngestao';
import { SeverityBadge } from '../components/SeverityBadge';
import {
  REPORT_TYPE_LABELS,
  RISK_MODEL_LABELS,
  SEVERITY_COLORS,
  type IngestaoSeverity,
  type Reading,
} from '../api/ingestaoApi';

const ReadingRow = ({ reading }: { reading: Reading }) => {
  const cls = reading.ingestao_classification?.[0];
  return (
    <tr className="border-b last:border-0 hover:bg-muted/20">
      <td className="px-4 py-2.5 text-sm font-mono font-medium">{reading.span_id}</td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
        {RISK_MODEL_LABELS[reading.risk_model]}
      </td>
      <td className="px-4 py-2.5 text-sm">
        {reading.clearance_distance != null
          ? `${reading.clearance_distance.toFixed(2)} m`
          : reading.crossing_count != null
          ? `${reading.crossing_count} árvores`
          : '—'}
      </td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
        {reading.lidarline_safety_level || '—'}
      </td>
      <td className="px-4 py-2.5">
        {cls ? (
          <SeverityBadge severity={cls.severity} label={cls.severity_label} />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
};

export const SurveyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useIngestaoSurvey(id ?? null);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <p className="text-sm text-red-600">Não foi possível carregar o survey.</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/ingestao')} className="mt-2">
          ← Voltar
        </Button>
      </div>
    );
  }

  const { survey, readings } = data;

  const nCounts = { N1: 0, N2: 0, N3: 0, N4: 0 } as Record<IngestaoSeverity, number>;
  for (const r of readings) {
    const s = r.ingestao_classification?.[0]?.severity;
    if (s) nCounts[s]++;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Back + title */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/ingestao')} className="mb-2 -ml-2">
          ← Voltar
        </Button>
        <h1 className="text-xl font-bold">{survey.line_name}</h1>
        <p className="text-sm text-muted-foreground">
          {REPORT_TYPE_LABELS[survey.report_type]}
          {survey.survey_date && ` · ${survey.survey_date}`}
          {survey.source_filename && ` · ${survey.source_filename}`}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(nCounts) as [IngestaoSeverity, number][]).map(([level, count]) => (
          <Card key={level} className="text-center">
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold" style={{ color: SEVERITY_COLORS[level] }}>
                {count}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{level}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Readings table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            {readings.length} leituras classificadas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Vão</th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Modelo de Risco</th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Medição</th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">LiPowerline</th>
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Classificação SmartLine</th>
              </tr>
            </thead>
            <tbody>
              {readings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhuma leitura encontrada.
                  </td>
                </tr>
              ) : (
                readings.map((r) => <ReadingRow key={r.id} reading={r} />)
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
