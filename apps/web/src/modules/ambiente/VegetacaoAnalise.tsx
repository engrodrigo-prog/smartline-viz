import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RasterUpload } from '@/components/ambiente/RasterUpload';
import { BeforeAfterComparator } from '@/components/ambiente/BeforeAfterComparator';
import { TimeSlider } from '@/components/ambiente/TimeSlider';
import { useRasters } from '@/hooks/useRasters';
import { useChangeDetection } from '@/hooks/useChangeDetection';
import { format } from 'date-fns';
import { Loader2, TrendingDown, TrendingUp, Scissors, TreePine } from 'lucide-react';

export default function VegetacaoAnalise() {
  const [selectedT0, setSelectedT0] = useState<any>(null);
  const [selectedT1, setSelectedT1] = useState<any>(null);
  const [timeIndex, setTimeIndex] = useState(0);

  const { data: rasters = [], isLoading, refetch } = useRasters({});
  const { mutate: detectChanges, isPending: isDetecting } = useChangeDetection();

  const handleDetectChanges = () => {
    if (!selectedT0 || !selectedT1) return;

    detectChanges({
      raster_t0_id: selectedT0.id,
      raster_t1_id: selectedT1.id,
      context: 'vegetation_management',
      threshold: 0.15,
      min_area_m2: 50,
    });
  };

  const dates = rasters.map((r: any) => new Date(r.ts_acquired));

  return (
    <div className="space-y-6">
      {/* Upload de Raster */}
      <RasterUpload onUploadSuccess={() => refetch()} />

      {/* Seleção de Períodos para Comparação */}
      <Card>
        <CardHeader>
          <CardTitle>Comparação Temporal</CardTitle>
          <CardDescription>
            Selecione duas datas para detectar mudanças na vegetação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Período Base (T0)</Label>
              <Select
                value={selectedT0?.id}
                onValueChange={(id) => {
                  const raster = rasters.find((r: any) => r.id === id);
                  setSelectedT0(raster);
                }}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {rasters.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      {format(new Date(r.ts_acquired), 'dd/MM/yyyy')} - {r.name}
                      {r.bands >= 4 && <Badge className="ml-2" variant="secondary">NDVI</Badge>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedT0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedT0.bands >= 4 ? 'NDVI' : 'VARI'} Médio:{' '}
                  {(selectedT0.stats_json?.ndvi_mean || selectedT0.stats_json?.vari_mean)?.toFixed(3)}
                </p>
              )}
            </div>

            <div>
              <Label>Período Recente (T1)</Label>
              <Select
                value={selectedT1?.id}
                onValueChange={(id) => {
                  const raster = rasters.find((r: any) => r.id === id);
                  setSelectedT1(raster);
                }}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {rasters.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      {format(new Date(r.ts_acquired), 'dd/MM/yyyy')} - {r.name}
                      {r.bands >= 4 && <Badge className="ml-2" variant="secondary">NDVI</Badge>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedT1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedT1.bands >= 4 ? 'NDVI' : 'VARI'} Médio:{' '}
                  {(selectedT1.stats_json?.ndvi_mean || selectedT1.stats_json?.vari_mean)?.toFixed(3)}
                </p>
              )}
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleDetectChanges}
            disabled={!selectedT0 || !selectedT1 || isDetecting}
          >
            {isDetecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Detectando Mudanças...
              </>
            ) : (
              'Detectar Mudanças'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Time Slider */}
      {dates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Navegação Temporal</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeSlider dates={dates} value={timeIndex} onChange={setTimeIndex} />
          </CardContent>
        </Card>
      )}

      {/* Comparador Before/After */}
      {selectedT0 && selectedT1 && (
        <Card>
          <CardHeader>
            <CardTitle>Comparação Visual</CardTitle>
            <CardDescription>
              Arraste o controle para comparar as imagens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BeforeAfterComparator
              imageT0={selectedT0.thumbnail_url}
              imageT1={selectedT1.thumbnail_url}
              labelT0={format(new Date(selectedT0.ts_acquired), 'dd/MM/yyyy')}
              labelT1={format(new Date(selectedT1.ts_acquired), 'dd/MM/yyyy')}
            />
          </CardContent>
        </Card>
      )}

      {/* KPIs de Vegetação */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Imagens Disponíveis</div>
                <div className="text-3xl font-bold">{rasters.length}</div>
              </div>
              <TreePine className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">NDVI Médio Atual</div>
                <div className="text-3xl font-bold text-green-600">
                  {selectedT1 ? (selectedT1.stats_json?.ndvi_mean || selectedT1.stats_json?.vari_mean)?.toFixed(2) : '-'}
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Variação</div>
                <div className="text-3xl font-bold text-orange-500">
                  {selectedT0 && selectedT1 ? (
                    ((selectedT1.stats_json?.ndvi_mean || selectedT1.stats_json?.vari_mean || 0) -
                      (selectedT0.stats_json?.ndvi_mean || selectedT0.stats_json?.vari_mean || 0)).toFixed(3)
                  ) : '-'}
                </div>
              </div>
              <TrendingDown className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Com NIR (NDVI)</div>
                <div className="text-3xl font-bold">
                  {rasters.filter((r: any) => r.bands >= 4).length}
                </div>
              </div>
              <Scissors className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
