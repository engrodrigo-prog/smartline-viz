import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function UploadLayerButton() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [layerName, setLayerName] = useState('');
  const [color, setColor] = useState('#FF3333');
  const [opacity, setOpacity] = useState([0.8]);
  const [lineWidth, setLineWidth] = useState([2]);
  const [permanent, setPermanent] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check file type
    const validExtensions = ['.geojson', '.json', '.kml', '.kmz', '.zip', '.shp', '.tif', '.tiff'];
    const extension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(extension)) {
      toast.error('Formato não suportado', {
        description: 'Formatos aceitos: GeoJSON, KML, KMZ, Shapefile (ZIP), GeoTIFF'
      });
      return;
    }

    // Check file size (50MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error('Arquivo muito grande', {
        description: 'Tamanho máximo: 50MB'
      });
      return;
    }

    setFile(selectedFile);
    if (!layerName) {
      setLayerName(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUpload = async () => {
    if (!file || !layerName.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!supabase) {
      toast.error('Supabase não configurado', {
        description: 'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para fazer upload.',
      });
      return;
    }

    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
    if (!supabaseUrl) {
      toast.error('Supabase URL ausente', {
        description: 'Defina VITE_SUPABASE_URL para chamar as Edge Functions.',
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', layerName.trim());
      formData.append('permanent', permanent.toString());
      formData.append('style', JSON.stringify({
        color,
        width: lineWidth[0],
        opacity: opacity[0]
      }));

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Você precisa estar autenticado');
        return;
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/custom-layer-upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          body: formData
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao fazer upload');
      }

      toast.success(result.message || 'Camada carregada com sucesso!', {
        description: 'A camada aparecerá no mapa em instantes'
      });

      // Reset form
      setFile(null);
      setLayerName('');
      setColor('#FF3333');
      setOpacity([0.8]);
      setLineWidth([2]);
      setPermanent(false);
      setOpen(false);

      // Refresh the page to show new layer
      window.location.reload();

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload', {
        description: error instanceof Error ? error.message : 'Tente novamente'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        className="fixed bottom-4 right-4 z-50 shadow-lg"
        variant="default"
      >
        <Upload className="w-4 h-4 mr-2" />
        Upload Camada
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload de Camada Personalizada</DialogTitle>
            <DialogDescription>
              Adicione camadas GeoJSON, KML, Shapefile ou GeoTIFF ao mapa
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file">Arquivo *</Label>
              <Input
                id="file"
                type="file"
                accept=".geojson,.json,.kml,.kmz,.zip,.shp,.tif,.tiff"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Layer Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Camada *</Label>
              <Input
                id="name"
                value={layerName}
                onChange={(e) => setLayerName(e.target.value)}
                placeholder="Ex: Área de Estudo"
                disabled={uploading}
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label htmlFor="color">Cor</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-20 h-10"
                  disabled={uploading}
                />
                <Input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#FF3333"
                  disabled={uploading}
                />
              </div>
            </div>

            {/* Opacity */}
            <div className="space-y-2">
              <Label>Opacidade: {Math.round(opacity[0] * 100)}%</Label>
              <Slider
                value={opacity}
                onValueChange={setOpacity}
                min={0}
                max={1}
                step={0.1}
                disabled={uploading}
              />
            </div>

            {/* Line Width */}
            <div className="space-y-2">
              <Label>Largura da Linha: {lineWidth[0]}px</Label>
              <Slider
                value={lineWidth}
                onValueChange={setLineWidth}
                min={1}
                max={10}
                step={1}
                disabled={uploading}
              />
            </div>

            {/* Permanent */}
            <div className="flex items-center justify-between">
              <Label htmlFor="permanent">Manter permanentemente</Label>
              <Switch
                id="permanent"
                checked={permanent}
                onCheckedChange={setPermanent}
                disabled={uploading}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpload}
                disabled={!file || !layerName.trim() || uploading}
              >
                {uploading ? 'Enviando...' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
