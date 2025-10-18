import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Play } from "lucide-react";
import { FileTypeSelector } from "@/components/upload/FileTypeSelector";
import { AdditionalFieldsForm } from "@/components/upload/AdditionalFieldsForm";
import { UploadQueueManager, type UploadJob } from "@/components/upload/UploadQueueManager";
import { getFileTypeById } from "@/lib/uploadConfig";
import { supabase } from "@/integrations/supabase/client";

export default function UploadUnificado() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [additionalData, setAdditionalData] = useState<Record<string, any>>({});
  const [uploadQueue, setUploadQueue] = useState<UploadJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedFileTypeConfig = selectedFileType ? getFileTypeById(selectedFileType) : null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (selectedFileTypeConfig) {
      const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (!selectedFileTypeConfig.acceptedFormats.includes(ext)) {
        toast.error(`Formato inválido. Esperado: ${selectedFileTypeConfig.acceptedFormats.join(', ')}`);
        return;
      }

      // Validate file size (100MB max)
      if (file.size > 100 * 1024 * 1024) {
        toast.error('Arquivo muito grande (máximo 100MB)');
        return;
      }
    }

    setSelectedFile(file);
  };

  const handleAdditionalDataChange = (field: string, value: any) => {
    setAdditionalData(prev => ({ ...prev, [field]: value }));
  };

  const addToQueue = () => {
    if (!selectedFile || !selectedFileTypeConfig) {
      toast.error('Selecione um arquivo');
      return;
    }

    // Validate required fields
    const missingFields = selectedFileTypeConfig.requiredFields?.filter(
      field => !additionalData[field]
    ) || [];

    if (missingFields.length > 0) {
      toast.error(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
      return;
    }

    const job: UploadJob = {
      id: crypto.randomUUID(),
      file: selectedFile,
      fileType: selectedFileTypeConfig,
      additionalData: {
        ...additionalData,
        ...selectedFileTypeConfig.metadata // Include metadata like tipo_evento
      },
      status: 'pending'
    };

    setUploadQueue(prev => [...prev, job]);
    
    // Reset form
    setSelectedFile(null);
    setSelectedFileType('');
    setAdditionalData({});
    
    toast.success(`${selectedFileTypeConfig.label} adicionado à fila`);
  };

  const removeFromQueue = (id: string) => {
    setUploadQueue(prev => prev.filter(job => job.id !== id));
  };

  const updateJobStatus = (
    id: string, 
    status: UploadJob['status'], 
    result?: any, 
    error?: string
  ) => {
    setUploadQueue(prev => prev.map(job => 
      job.id === id ? { ...job, status, result, error } : job
    ));
  };

  const processQueue = async () => {
    if (uploadQueue.length === 0) {
      toast.error('Nenhum arquivo na fila');
      return;
    }

    setIsProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('Usuário não autenticado');
      setIsProcessing(false);
      return;
    }

    for (const job of uploadQueue) {
      if (job.status !== 'pending') continue;

      try {
        // 1. Upload to storage
        updateJobStatus(job.id, 'uploading');
        
        const fileName = `${user.id}/${job.fileType.id}/${Date.now()}_${job.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('geodata-uploads')
          .upload(fileName, job.file);

        if (uploadError) throw uploadError;

        // 2. Process file via edge function
        updateJobStatus(job.id, 'processing');

        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          job.fileType.edgeFunction,
          {
            body: {
              file_path: fileName,
              ...job.additionalData
            }
          }
        );

        if (functionError) throw functionError;

        updateJobStatus(
          job.id, 
          'success', 
          functionData.message || 'Processado com sucesso'
        );

      } catch (error: any) {
        console.error('Processing error:', error);
        updateJobStatus(
          job.id, 
          'error', 
          undefined,
          error.message || 'Erro ao processar arquivo'
        );
      }
    }

    setIsProcessing(false);
    
    const successCount = uploadQueue.filter(j => j.status === 'success').length;
    const errorCount = uploadQueue.filter(j => j.status === 'error').length;
    
    if (successCount > 0) {
      toast.success(`${successCount} arquivo(s) processado(s) com sucesso`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} arquivo(s) com erro`);
    }
  };

  return (
    <AppLayout title="Upload Unificado" subtitle="Importe dados geoespaciais">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Upload de Dados Geoespaciais</h1>
          <p className="text-muted-foreground">
            Importe dados de linha, torres, vãos, perigos e mais
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            <FileTypeSelector
              selectedCategory={selectedCategory}
              selectedFileType={selectedFileType}
              onCategoryChange={(cat) => {
                setSelectedCategory(cat);
                setSelectedFileType('');
                setSelectedFile(null);
                setAdditionalData({});
              }}
              onFileTypeChange={setSelectedFileType}
            />

            {selectedFileTypeConfig && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    3. Selecione o Arquivo
                  </label>
                  <Input
                    type="file"
                    accept={selectedFileTypeConfig.acceptedFormats.join(',')}
                    onChange={handleFileSelect}
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Arquivo selecionado: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <AdditionalFieldsForm
                  fileType={selectedFileTypeConfig}
                  values={additionalData}
                  onChange={handleAdditionalDataChange}
                />

                <Button
                  onClick={addToQueue}
                  disabled={!selectedFile}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Adicionar à Fila
                </Button>
              </>
            )}
          </div>
        </Card>

        {uploadQueue.length > 0 && (
          <Card className="p-6">
            <UploadQueueManager
              queue={uploadQueue}
              onRemove={removeFromQueue}
            />

            <div className="flex gap-3 mt-6">
              <Button
                onClick={processQueue}
                disabled={isProcessing || uploadQueue.filter(j => j.status === 'pending').length === 0}
                className="flex-1"
              >
                <Play className="w-4 h-4 mr-2" />
                {isProcessing ? 'Processando...' : 'Processar Fila'}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setUploadQueue([])}
                disabled={isProcessing}
              >
                Limpar Tudo
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
