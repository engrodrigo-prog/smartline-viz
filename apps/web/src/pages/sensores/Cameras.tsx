import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { SensorFiltersBar } from '@/components/sensors/SensorFiltersBar';
import { useSensorFilters } from '@/hooks/useSensorFilters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import {
  Camera,
  Play,
  Clock,
  ExternalLink,
  MapPin
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import MapLibreViewer from '@/components/MapLibreViewer';

type CameraSource = 'YouTube Demo' | 'Santos Mapeada' | 'Ecovias';
type StreamType = 'youtube' | 'santos-map' | 'external-link';

interface CameraItem {
  id: string;
  name: string;
  camera_type: string;
  status: 'online' | 'offline';
  region: string;
  line_code: string;
  latitude: number;
  longitude: number;
  source: CameraSource;
  streamType: StreamType;
  stream_url?: string;
  external_url?: string;
  thumbnail_url?: string;
  description?: string;
}

const cameraCatalog: CameraItem[] = [
  {
    id: 'demo-santos-orla',
    name: 'Orla Gonzaga - Santos',
    camera_type: 'YouTube Live',
    status: 'online',
    region: 'Santos/SP',
    line_code: 'LT-Santos',
    latitude: -23.967014,
    longitude: -46.328449,
    source: 'YouTube Demo',
    streamType: 'youtube',
    stream_url: 'https://www.youtube.com/embed/1EiC9bvVGnk?autoplay=1&mute=1',
    thumbnail_url: 'https://img.youtube.com/vi/1EiC9bvVGnk/hqdefault.jpg',
    description: 'Transmissão ao vivo na orla do Gonzaga (confirmada: Santos/SP).'
  },
  {
    id: 'santos-boqueirao',
    name: 'Praia do Boqueirão',
    camera_type: 'Santos Mapeada',
    status: 'online',
    region: 'Santos/SP',
    line_code: 'LT-Santos',
    latitude: -23.9655,
    longitude: -46.3308,
    source: 'Santos Mapeada',
    streamType: 'santos-map',
    stream_url: 'https://egov.santos.sp.gov.br/santosmapeada/Gestao/Cameras/MapaCamera/',
    description: 'Vista da praia do Boqueirão. Acesse o painel oficial Santos Mapeada dentro do iframe.'
  },
  {
    id: 'santos-porto',
    name: 'Porto de Santos - Cais',
    camera_type: 'Santos Mapeada',
    status: 'online',
    region: 'Santos/SP',
    line_code: 'LT-Santos',
    latitude: -23.9558,
    longitude: -46.3104,
    source: 'Santos Mapeada',
    streamType: 'santos-map',
    stream_url: 'https://egov.santos.sp.gov.br/santosmapeada/Gestao/Cameras/MapaCamera/',
    description: 'Câmera administrativa voltada ao cais do porto.'
  },
  {
    id: 'praia-grande-guilhermina',
    name: 'Praia Grande - Bairro Guilhermina',
    camera_type: 'Santos Mapeada',
    status: 'online',
    region: 'Praia Grande/SP',
    line_code: 'LT-Litoral-Sul',
    latitude: -24.0017,
    longitude: -46.4059,
    source: 'Santos Mapeada',
    streamType: 'santos-map',
    stream_url: 'https://egov.santos.sp.gov.br/santosmapeada/Gestao/Cameras/MapaCamera/',
    description: 'Cobertura da orla de Praia Grande (Bairro Guilhermina).'
  },
  {
    id: 'ecovias-imigrantes-km40',
    name: 'Ecovias - Imigrantes km 40 Norte',
    camera_type: 'Ecovias',
    status: 'online',
    region: 'Serra do Mar',
    line_code: 'LT-Litoral-Sul',
    latitude: -23.9924,
    longitude: -46.5082,
    source: 'Ecovias',
    streamType: 'external-link',
    external_url: 'https://www.ecovias.com.br/cameras',
    description: 'Câmera operacional da Ecovias na Rodovia dos Imigrantes (km 40 - sentido norte).'
  },
  {
    id: 'ecovias-anchieta-km15',
    name: 'Ecovias - Anchieta km 15 Sul',
    camera_type: 'Ecovias',
    status: 'online',
    region: 'Serra do Mar',
    line_code: 'LT-Baixada',
    latitude: -23.7852,
    longitude: -46.5501,
    source: 'Ecovias',
    streamType: 'external-link',
    external_url: 'https://www.ecovias.com.br/cameras',
    description: 'Monitoramento da Rodovia Anchieta (km 15 - sentido litoral).'
  }
];

export default function Cameras() {
  const { filters, setFilters, regions, lines } = useSensorFilters();
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [viewMode, setViewMode] = useState<'live' | 'historic'>('live');
  const [sourceFilter, setSourceFilter] = useState<'Todos' | CameraSource>('Todos');
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  useEffect(() => {
    fetchCameras();
  }, [filters, sourceFilter]);

  const fetchCameras = async () => {
    const matchesFilters = (camera: CameraItem) => {
      const regionFilter = filters.region?.toLowerCase();
      const lineFilter = filters.lineCode?.toLowerCase();
      const regionMatch = !regionFilter || camera.region.toLowerCase().includes(regionFilter);
      const lineMatch = !lineFilter || camera.line_code.toLowerCase().includes(lineFilter);
      const sourceMatch = sourceFilter === 'Todos' || camera.source === sourceFilter;
      return regionMatch && lineMatch && sourceMatch;
    };

    if (!supabase) {
      const fallback = cameraCatalog.filter(matchesFilters);
      setCameras(fallback);
      return;
    }

    let query = supabase.from('cameras').select('*');
    if (filters.region) query = query.eq('region', filters.region);
    if (filters.lineCode) query = query.eq('line_code', filters.lineCode);

    const { data } = await query;
    const supabaseCameras: CameraItem[] = (data ?? []).map((camera: any) => ({
      ...camera,
      source: 'Santos Mapeada',
      streamType: 'santos-map'
    }));

    const combined = [
      ...supabaseCameras,
      ...cameraCatalog.filter(
        (demo) => !supabaseCameras.some((cam) => cam.id === demo.id)
      )
    ].filter(matchesFilters);

    setCameras(combined);
  };

  const cameraFeatures = useMemo(() => {
    return cameras
      .filter((camera) => camera.longitude && camera.latitude)
      .map((camera) => ({
        id: camera.id,
        geometry: {
          type: 'Point',
          coordinates: [Number(camera.longitude), Number(camera.latitude)]
        },
        properties: {
          name: camera.name,
          status: camera.status,
          region: camera.region,
          source: camera.source
        }
      }));
  }, [cameras]);

  const sources = useMemo(() => {
    const base = Array.from(new Set(cameraCatalog.map((camera) => camera.source)));
    return base;
  }, []);

  useEffect(() => {
    if (!selectedCameraId && cameras.length > 0) {
      setSelectedCameraId(cameras[0].id);
    } else if (selectedCameraId && !cameras.find((cam) => cam.id === selectedCameraId)) {
      setSelectedCameraId(cameras[0]?.id ?? null);
    }
  }, [cameras, selectedCameraId]);

  const selectedCamera = useMemo(
    () => cameras.find((camera) => camera.id === selectedCameraId) ?? null,
    [cameras, selectedCameraId]
  );

  return (
    <AppLayout title="Câmeras" subtitle="Monitoramento visual em tempo real e histórico">
      <SensorFiltersBar 
        filters={filters}
        onChange={setFilters}
        regions={regions}
        lines={lines}
      />

      <div className="tech-card p-4 mb-6">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList>
            <TabsTrigger value="live">
              <Play className="w-4 h-4 mr-2" />
              Tempo Real
            </TabsTrigger>
            <TabsTrigger value="historic">
              <Clock className="w-4 h-4 mr-2" />
              Gravações Históricas
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="tech-card p-4 mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 text-primary" />
          <span>Selecione a origem das câmeras para visualizar pontos na Baixada Santista.</span>
        </div>
        <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as 'Todos' | CameraSource)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Origem das câmeras" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todas as origens</SelectItem>
            {sources.map((source) => (
              <SelectItem key={source} value={source}>
                {source}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCamera && (
        <Card className="mb-6 border border-emerald-600/40 bg-emerald-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              {selectedCamera.name}
              <Badge variant="outline">{selectedCamera.source}</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {selectedCamera.region} • Linha {selectedCamera.line_code} • Lat {selectedCamera.latitude.toFixed(4)}, Lon{' '}
              {selectedCamera.longitude.toFixed(4)}
            </p>
          </CardHeader>
          {selectedCamera.description && (
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">{selectedCamera.description}</p>
            </CardContent>
          )}
        </Card>
      )}

      {cameraFeatures.length > 0 && (
        <Card className="mb-6 border border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" /> Mapa de Câmeras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MapLibreViewer
              key={selectedCameraId ?? 'map'}
              data={cameraFeatures}
              height="360px"
              onFeatureClick={(feature) => setSelectedCameraId(String(feature.id))}
            />
          </CardContent>
        </Card>
      )}

      {cameras.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma câmera encontrada. Configure câmeras para começar o monitoramento visual.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cameras.map(camera => {
            const isSelected = camera.id === selectedCameraId;
            return (
              <Card
                key={camera.id}
                className={`
                  cursor-pointer transition-all border-border/60
                  ${isSelected ? 'border-primary shadow-lg shadow-primary/20' : 'hover:border-primary/50'}
                `}
                onClick={() => setSelectedCameraId(camera.id)}
              >
                <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{camera.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{camera.camera_type}</p>
                  </div>
                  <Badge variant={camera.status === 'online' ? 'default' : 'destructive'}>
                    {camera.status}
                  </Badge>
                </div>
                  <Badge variant="secondary" className="w-fit mt-2">{camera.source}</Badge>
                </CardHeader>
                <CardContent>
                <div className="aspect-video bg-secondary rounded-lg mb-3 flex items-center justify-center">
                  {camera.streamType === 'youtube' && camera.stream_url ? (
                    <iframe
                      src={camera.stream_url}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full rounded-lg border border-border"
                      title={camera.name}
                    />
                  ) : camera.streamType === 'santos-map' && camera.stream_url ? (
                    <iframe
                      src={camera.stream_url}
                      className="w-full h-full rounded-lg border border-border"
                      title={`Mapa Santos Mapeada - ${camera.name}`}
                    />
                  ) : camera.thumbnail_url ? (
                    <img src={camera.thumbnail_url} alt={camera.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Camera className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground flex flex-col gap-1">
                  Região {camera.region} • {camera.line_code || 'Sem linha'}
                  <span>
                    Coordenadas: {camera.latitude.toFixed(4)}, {camera.longitude.toFixed(4)}
                  </span>
                </div>
                </CardContent>
                {camera.streamType === 'external-link' && camera.external_url && (
                  <CardFooter className="pt-0">
                    <Button size="sm" variant="outline" asChild>
                      <a href={camera.external_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3 h-3 mr-2" />
                        Abrir câmera oficial (Ecovias)
                      </a>
                    </Button>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
