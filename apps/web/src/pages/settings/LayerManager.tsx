import { useState } from 'react';
import { FileIcon, Trash2, Download, Upload as UploadIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { LayersStorage } from '@/lib/storage/layers';
import AppLayout from '@/components/AppLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

export default function LayerManager() {
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

  const handleDownload = (filename: string) => {
    if (!userId) return;
    const url = LayersStorage.getCustomLayerUrl(userId, filename);
    window.open(url, '_blank');
  };

  return (
    <AppLayout title="Gerenciar Camadas Geográficas">
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Minhas Camadas</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Gerencie suas camadas geográficas customizadas
              </p>
            </div>
            <Link to="/upload/layers">
              <Button>
                <UploadIcon className="w-4 h-4 mr-2" />
                Upload Nova Camada
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : userLayers && userLayers.length > 0 ? (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tamanho
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {userLayers.map((file) => (
                    <tr key={file.name} className="hover:bg-accent/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <FileIcon className="w-5 h-5 text-primary" />
                          <span className="font-medium text-foreground">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {((file.metadata?.size || 0) / 1024).toFixed(2)} KB
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {file.created_at ? new Date(file.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground mb-2">
                Nenhuma camada encontrada
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Comece fazendo upload de sua primeira camada geográfica
              </p>
              <Link to="/upload/layers">
                <Button>
                  <UploadIcon className="w-4 h-4 mr-2" />
                  Upload Camada
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
