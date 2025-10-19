import AppLayout from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DataTableAdvanced from "@/components/DataTableAdvanced";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function UploadHistorico() {
  const { data: uploads, isLoading } = useQuery({
    queryKey: ['upload-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dataset_catalog')
        .select('*')
        .order('upload_date', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const columns = [
    {
      key: 'upload_date',
      label: 'Data',
      render: (row: any) => row.upload_date 
        ? format(new Date(row.upload_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })
        : '-'
    },
    {
      key: 'name',
      label: 'Nome'
    },
    {
      key: 'file_type',
      label: 'Tipo',
      render: (row: any) => row.file_type ? (
        <Badge variant="outline">{row.file_type}</Badge>
      ) : '-'
    },
    {
      key: 'line_code',
      label: 'Linha'
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: any) => {
        const status = row.status || 'pending';
        const variant = status === 'completed' ? 'default' : 
                       status === 'failed' ? 'destructive' : 'outline';
        return <Badge variant={variant as any}>{status}</Badge>;
      }
    },
    {
      key: 'source',
      label: 'Origem'
    }
  ];

  if (isLoading) {
    return (
      <AppLayout title="Histórico de Uploads" subtitle="Carregando...">
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Carregando histórico...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Histórico de Uploads" subtitle="Visualize todos os uploads realizados">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="p-6">
          <DataTableAdvanced
            data={uploads || []}
            columns={columns}
          />
        </Card>
      </div>
    </AppLayout>
  );
}
