import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { FileType } from "@/lib/uploadConfig";

export interface UploadJob {
  id: string;
  file: File;
  fileType: FileType;
  additionalData: Record<string, any>;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
  result?: any;
  error?: string;
}

interface UploadQueueManagerProps {
  queue: UploadJob[];
  onRemove: (id: string) => void;
}

export function UploadQueueManager({ queue, onRemove }: UploadQueueManagerProps) {
  if (queue.length === 0) {
    return null;
  }

  const getStatusBadge = (status: UploadJob['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Aguardando</Badge>;
      case 'uploading':
        return <Badge className="bg-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Enviando</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processando</Badge>;
      case 'success':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Erro</Badge>;
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Fila de Upload ({queue.length})</h3>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {queue.map((job) => (
          <Card key={job.id} className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <job.fileType.icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{job.file.name}</p>
                    {getStatusBadge(job.status)}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    {job.fileType.label}
                  </p>
                  
                  {job.additionalData.line_code && (
                    <p className="text-xs text-muted-foreground">
                      Linha: {job.additionalData.line_code}
                    </p>
                  )}
                  
                  {job.error && (
                    <p className="text-xs text-destructive mt-1">{job.error}</p>
                  )}
                  
                  {job.result && (
                    <p className="text-xs text-green-600 mt-1">{job.result}</p>
                  )}
                </div>
              </div>
              
              {(job.status === 'pending' || job.status === 'error') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(job.id)}
                  className="flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
