import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileIcon, Trash2, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { LayersStorage } from '@/lib/storage/layers';
import AppLayout from '@/components/AppLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const ACCEPTED_FILE_TYPES = {
  'application/zip': ['.zip'],
  'application/json': ['.json', '.geojson'],
  'application/geo+json': ['.geojson'],
  'application/vnd.mapbox-vector-tile': ['.mbtiles'],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function LayerUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const queryClient = useQueryClient();
  const supabaseEnabled = Boolean(supabase);

  const { data: userId } = useQuery({
    queryKey: ['current-user'],
    enabled: supabaseEnabled,
    queryFn: async () => {
      if (!supabase) return null;
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id;
    },
  });

  const { data: userLayers, isLoading } = useQuery({
    queryKey: ['user-layers', userId],
    queryFn: async () => {
      if (!userId) return [];
      return LayersStorage.listUserLayers(userId);
    },
    enabled: !!userId && supabaseEnabled,
  });

  const deleteMutation = useMutation({
    mutationFn: async (filename: string) => {
      if (!supabase) throw new Error('Supabase não configurado');
      if (!userId) throw new Error('User not authenticated');
      await LayersStorage.deleteCustomLayer(userId, filename);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-layers'] });
      toast.success('Camada deletada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao deletar: ${error.message}`);
    },
  });

  const onDrop = async (acceptedFiles: File[]) => {
    if (!supabaseEnabled) {
      toast.error('Supabase não configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
      return;
    }

    if (!userId) {
      toast.error('Usuário não autenticado');
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Máximo: 50MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simular progresso (Supabase Storage não tem eventos de progresso)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      await LayersStorage.uploadCustomLayer(file, userId);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      queryClient.invalidateQueries({ queryKey: ['user-layers'] });
      toast.success(`${file.name} enviado com sucesso`);
    } catch (error: any) {
      toast.error(`Erro no upload: ${error.message}`);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxFiles: 1,
    multiple: false,
  });

  const handleDownload = (filename: string) => {
    if (!userId) return;
    const url = LayersStorage.getCustomLayerUrl(userId, filename);
    window.open(url, '_blank');
  };

  return (
    <AppLayout title="Upload de Camadas Geográficas">
      <div className="space-y-6">
        {/* Zona de Upload */}
        <Card className="p-8">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground mb-2">
              {isDragActive ? 'Solte o arquivo aqui' : 'Arraste e solte ou clique para selecionar'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Formatos aceitos: .zip, .geojson, .json, .mbtiles
            </p>
            <p className="text-xs text-muted-foreground">Tamanho máximo: 50MB</p>
          </div>

          {uploading && (
            <div className="mt-6">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center mt-2">
                Enviando... {uploadProgress}%
              </p>
            </div>
          )}
        </Card>

        {/* Lista de Camadas */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Minhas Camadas</h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : userLayers && userLayers.length > 0 ? (
            <div className="space-y-2">
              {userLayers.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileIcon className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.metadata?.size || 0 / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(file.name)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(file.name)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma camada enviada ainda
            </p>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
