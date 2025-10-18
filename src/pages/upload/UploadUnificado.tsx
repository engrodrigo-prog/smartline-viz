import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileTypeGrid } from "@/components/upload/FileTypeGrid";
import { AdditionalFieldsForm } from "@/components/upload/AdditionalFieldsForm";
import { UploadQueueManager, type UploadJob } from "@/components/upload/UploadQueueManager";
import { getFileTypesByCategory, type FileType } from "@/lib/uploadConfig";
import AppLayout from "@/components/AppLayout";
import { ChevronDown, ChevronUp, Play, Trash } from "lucide-react";

export default function UploadUnificado() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<FileType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [additionalData, setAdditionalData] = useState<Record<string, any>>({});
  const [uploadQueue, setUploadQueue] = useState<UploadJob[]>([]);
  const [queueMinimized, setQueueMinimized] = useState(false);

  const handleFileTypeSelect = (fileType: FileType) => {
    setSelectedType(fileType);
    setSelectedFile(null);
    setAdditionalData({});
    setDialogOpen(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedType) return;

    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!selectedType.acceptedFormats.includes(extension)) {
      toast.error(`Formato inválido. Aceitos: ${selectedType.acceptedFormats.join(', ')}`);
      return;
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande. Máximo: 100MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleAdditionalDataChange = (field: string, value: any) => {
    setAdditionalData(prev => ({ ...prev, [field]: value }));
  };

  const addToQueue = () => {
    if (!selectedFile || !selectedType) {
      toast.error('Selecione um arquivo');
      return;
    }

    const requiredFields = selectedType.requiredFields || [];
    for (const field of requiredFields) {
      if (!additionalData[field]) {
        toast.error(`Campo obrigatório: ${field}`);
        return;
      }
    }

    const job: UploadJob = {
      id: crypto.randomUUID(),
      file: selectedFile,
      fileType: selectedType,
      additionalData: { 
        ...additionalData,
        ...selectedType.metadata 
      },
      status: 'pending'
    };

    setUploadQueue(prev => [...prev, job]);
    setDialogOpen(false);
    setSelectedFile(null);
    setAdditionalData({});
    toast.success('Adicionado à fila de upload');
  };

  const removeFromQueue = (id: string) => {
    setUploadQueue(prev => prev.filter(job => job.id !== id));
  };

  const updateJobStatus = (id: string, status: UploadJob['status'], result?: any, error?: string) => {
    setUploadQueue(prev => prev.map(job => 
      job.id === id ? { ...job, status, result, error } : job
    ));
  };

  const clearQueue = () => {
    const hasProcessing = uploadQueue.some(j => j.status === 'uploading' || j.status === 'processing');
    if (hasProcessing) {
      toast.error('Aguarde o processamento atual terminar');
      return;
    }
    setUploadQueue([]);
    toast.success('Fila limpa');
  };

  const processQueue = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    const pendingJobs = uploadQueue.filter(j => j.status === 'pending');
    if (pendingJobs.length === 0) {
      toast.error('Nenhum item pendente na fila');
      return;
    }

    for (const job of pendingJobs) {
      try {
        updateJobStatus(job.id, 'uploading');

        const fileExtension = job.file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${crypto.randomUUID()}.${fileExtension}`;
        
        const { error: uploadError } = await supabase.storage
          .from('geodata-uploads')
          .upload(fileName, job.file);

        if (uploadError) throw uploadError;

        updateJobStatus(job.id, 'processing');

        const { data, error: functionError } = await supabase.functions.invoke(
          job.fileType.edgeFunction,
          {
            body: {
              file_path: fileName,
              ...job.additionalData,
            }
          }
        );

        if (functionError) throw functionError;

        updateJobStatus(job.id, 'success', data?.message || 'Processado com sucesso');
        toast.success(`${job.fileType.label} processado`);

      } catch (error: any) {
        console.error('Upload error:', error);
        updateJobStatus(job.id, 'error', undefined, error.message || 'Erro desconhecido');
        toast.error(`Erro: ${error.message}`);
      }
    }
  };

  const toggleQueue = () => setQueueMinimized(!queueMinimized);

  return (
    <AppLayout title="Upload de Dados Geoespaciais" subtitle="Selecione o tipo de dado que deseja importar">
      <div className="space-y-8 pb-32">
        
        {/* Grid de Categorias */}
        <FileTypeGrid 
          category="linha" 
          fileTypes={getFileTypesByCategory('linha')} 
          onSelect={handleFileTypeSelect}
        />

        <FileTypeGrid 
          category="estrutura" 
          fileTypes={getFileTypesByCategory('estrutura')} 
          onSelect={handleFileTypeSelect}
        />

        <FileTypeGrid 
          category="analise" 
          fileTypes={getFileTypesByCategory('analise')} 
          onSelect={handleFileTypeSelect}
        />

        <FileTypeGrid 
          category="perigo" 
          fileTypes={getFileTypesByCategory('perigo')} 
          onSelect={handleFileTypeSelect}
        />

        <FileTypeGrid 
          category="outros" 
          fileTypes={getFileTypesByCategory('outros')} 
          onSelect={handleFileTypeSelect}
        />

        {/* Dialog de Upload (Sheet lateral) */}
        <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
          <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {selectedType && <selectedType.icon className="w-5 h-5" />}
                {selectedType?.label}
              </SheetTitle>
              {selectedType?.subtitle && (
                <SheetDescription>{selectedType.subtitle}</SheetDescription>
              )}
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <p className="text-sm text-muted-foreground">{selectedType?.description}</p>

              <div>
                <label className="text-sm font-medium mb-2 block">Selecione o arquivo</label>
                <Input 
                  type="file" 
                  accept={selectedType?.acceptedFormats.join(',')} 
                  onChange={handleFileSelect}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos aceitos: {selectedType?.acceptedFormats.join(', ')}
                </p>
              </div>

              {selectedType && (
                <AdditionalFieldsForm 
                  fileType={selectedType}
                  values={additionalData}
                  onChange={handleAdditionalDataChange}
                />
              )}

              <Button 
                onClick={addToQueue} 
                className="w-full"
                disabled={!selectedFile}
              >
                Adicionar à Fila
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Fila Fixada no Canto (Minimizável) */}
        {uploadQueue.length > 0 && (
          <div className="fixed bottom-6 right-6 w-96 z-50 max-w-[calc(100vw-3rem)]">
            <Card className="shadow-2xl border-2">
              <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
                <div>
                  <CardTitle className="text-base">Fila de Upload</CardTitle>
                  <CardDescription>{uploadQueue.length} arquivo(s)</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={toggleQueue}>
                  {queueMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CardHeader>

              {!queueMinimized && (
                <CardContent className="px-4 pb-4">
                  <UploadQueueManager queue={uploadQueue} onRemove={removeFromQueue} />
                  
                  <div className="flex gap-2 mt-4">
                    <Button 
                      onClick={processQueue} 
                      className="flex-1"
                      disabled={uploadQueue.every(j => j.status !== 'pending')}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Processar Fila
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={clearQueue}
                      disabled={uploadQueue.some(j => j.status === 'uploading' || j.status === 'processing')}
                    >
                      <Trash className="w-4 h-4 mr-2" />
                      Limpar
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
