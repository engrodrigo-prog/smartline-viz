import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Image, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RasterUploadProps {
  onUploadSuccess?: (raster: any) => void;
  line_code?: string;
  corridor_id?: string;
}

export function RasterUpload({ onUploadSuccess, line_code, corridor_id }: RasterUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [tsAcquired, setTsAcquired] = useState('');

  const handleUpload = async () => {
    if (!file || !tsAcquired) {
      toast.error('Selecione um arquivo e data de captura');
      return;
    }

    if (!supabase) {
      toast.error('Supabase não configurado neste ambiente. Configure VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY para processar rasters.');
      return;
    }

    setUploading(true);

    try {
      toast.loading('Processando raster...');
      const file_path = `rasters/${Date.now()}_${file.name}`;

      // Chamar edge function para processar (assume que o arquivo já foi entregue ao bucket configurado)
      const { data, error } = await supabase.functions.invoke('process-raster', {
        body: {
          file_path,
          line_code,
          corridor_id,
          ts_acquired: tsAcquired,
          bands: 4, // TODO: Detectar automaticamente
        },
      });

      if (error) throw error;

      toast.success(data.message);
      onUploadSuccess?.(data.raster);
      
      // Limpar formulário
      setFile(null);
      setTsAcquired('');

    } catch (error: any) {
      toast.error(`Erro ao processar: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload de Imagem
        </CardTitle>
        <CardDescription>
          Carregar GeoTIFF (RGB ou RGB+NIR) para análise de vegetação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="file" className="flex items-center gap-2 mb-2">
            <Image className="w-4 h-4" />
            Arquivo GeoTIFF
          </Label>
          <Input
            id="file"
            type="file"
            accept=".tif,.tiff,.geotiff"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={uploading}
          />
          {file && (
            <p className="text-xs text-muted-foreground mt-1">
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="ts_acquired" className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4" />
            Data de Captura
          </Label>
          <Input
            id="ts_acquired"
            type="date"
            value={tsAcquired}
            onChange={(e) => setTsAcquired(e.target.value)}
            disabled={uploading}
          />
        </div>

        <Button
          onClick={handleUpload}
          disabled={uploading || !file || !tsAcquired}
          className="w-full"
        >
          {uploading ? 'Processando...' : 'Processar Raster'}
        </Button>
      </CardContent>
    </Card>
  );
}
