import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { REPORT_TYPE_LABELS, type IngestaoReportType } from '../api/ingestaoApi';

type Props = {
  onUpload: (params: {
    file: File;
    line_name: string;
    survey_date?: string;
    report_type?: IngestaoReportType;
  }) => void;
  isLoading: boolean;
};

const ACCEPTED = '.csv,text/csv,application/vnd.ms-excel';

export const UploadZone = ({ onUpload, isLoading }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [lineName, setLineName] = useState('');
  const [surveyDate, setSurveyDate] = useState('');
  const [reportType, setReportType] = useState<IngestaoReportType | ''>('');
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => setFile(f);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = () => {
    if (!file || !lineName.trim()) return;
    onUpload({
      file,
      line_name: lineName.trim(),
      survey_date: surveyDate || undefined,
      report_type: (reportType as IngestaoReportType) || undefined,
    });
  };

  const canSubmit = Boolean(file && lineName.trim() && !isLoading);

  return (
    <div className="space-y-6">
      {/* Drop area — keyboard accessible via role="button" + tabIndex + onKeyDown */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Área de upload — arraste ou pressione Enter para selecionar arquivo CSV"
        className={[
          'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
        ].join(' ')}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <svg
          aria-hidden="true"
          className="w-10 h-10 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        {file ? (
          <div className="text-center">
            <p className="font-medium text-sm">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium">Arraste o relatório LiPowerline ou pressione Enter para selecionar</p>
            <p className="text-xs text-muted-foreground mt-1">CSV exportado pelo LiPowerline (.csv) — máx. 50 MB, 10.000 linhas</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {/* Metadata fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="line_name">Linha de Transmissão *</Label>
          <Input
            id="line_name"
            placeholder="ex: LT Cubatão – Alemoa 138kV"
            value={lineName}
            onChange={(e) => setLineName(e.target.value)}
            disabled={isLoading}
            aria-required="true"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="survey_date">Data do Levantamento</Label>
          <Input
            id="survey_date"
            type="date"
            value={surveyDate}
            onChange={(e) => setSurveyDate(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2" role="group" aria-labelledby="report-type-label">
          <Label id="report-type-label">Tipo de Relatório</Label>
          <Select
            value={reportType}
            onValueChange={(v) => setReportType(v as IngestaoReportType)}
            disabled={isLoading}
          >
            <SelectTrigger aria-labelledby="report-type-label">
              <SelectValue placeholder="Detectar automaticamente pelo nome do arquivo" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(REPORT_TYPE_LABELS) as [IngestaoReportType, string][]).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
        {isLoading ? 'Processando...' : 'Importar e Classificar'}
      </Button>
    </div>
  );
};
