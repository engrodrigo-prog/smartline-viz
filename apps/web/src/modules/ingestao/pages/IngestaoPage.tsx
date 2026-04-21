import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useIngestaoSurveys, useIngestaoUpload } from '../hooks/useIngestao';
import { UploadZone } from '../components/UploadZone';
import { IngestionSummary } from '../components/IngestionSummary';
import { SurveyTable } from '../components/SurveyTable';
import type { UploadSummary } from '../api/ingestaoApi';

export const IngestaoPage = () => {
  const [uploadResult, setUploadResult] = useState<UploadSummary | null>(null);

  const { data: surveysData, isLoading: surveysLoading } = useIngestaoSurveys({ limit: 50 });
  const uploadMutation = useIngestaoUpload();

  const handleUpload = (params: Parameters<typeof uploadMutation.mutate>[0]) => {
    setUploadResult(null);
    uploadMutation.mutate(params, {
      onSuccess: (result) => setUploadResult(result),
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ingestão LiPowerline</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Importe relatórios de distância de folga e queda de árvore exportados pelo LiPowerline.
          O sistema classifica automaticamente cada vão em N1–N4 conforme os limiares CPFL v9.0.
        </p>
      </div>

      {/* Upload card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {uploadResult ? 'Resultado da importação' : 'Importar relatório'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {uploadMutation.error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start justify-between gap-3">
              <span>
                {(uploadMutation.error as Error).message}{' '}
                Selecione o arquivo novamente para tentar.
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-red-700 hover:text-red-800 hover:bg-red-100 -mt-0.5"
                onClick={() => uploadMutation.reset()}
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {uploadResult ? (
            <IngestionSummary
              result={uploadResult}
              onReset={() => {
                setUploadResult(null);
                uploadMutation.reset();
              }}
            />
          ) : (
            <UploadZone onUpload={handleUpload} isLoading={uploadMutation.isPending} />
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de importações</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <SurveyTable
            surveys={surveysData?.items ?? []}
            isLoading={surveysLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
};
