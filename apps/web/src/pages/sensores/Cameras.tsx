import { useState, useEffect, useMemo, useCallback, type SyntheticEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { SensorFiltersBar } from '@/components/sensors/SensorFiltersBar';
import { useSensorFilters } from '@/hooks/useSensorFilters';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Camera, ExternalLink, MapPin } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import MapLibreViewer from '@/components/MapLibreViewer';

type CameraSource = 'Ecovias Oficial' | 'Santos Mapeada' | 'Simulado SmartLine';
type StreamType = 'santos-map' | 'external-link' | 'simulated';
type CameraMode = 'real' | 'simulated';

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
  mode: CameraMode;
  streamType: StreamType;
  stream_url?: string;
  external_url?: string;
  thumbnail_url?: string;
  description?: string;
  updatedAt?: string;
  scenarioLabel?: string;
  capabilities?: string[];
  ctaLabel?: string;
}

const SENSOR_DB_ENABLED = import.meta.env.VITE_ENABLE_SENSOR_DB === 'true';
const ECOVIAS_URL = 'https://www.ecoviasimigrantes.com.br/condicoes-da-via';
const SANTOS_MAPEADA_URL = 'https://egov.santos.sp.gov.br/santosmapeada/Gestao/Cameras/MapaCamera/';

const createCameraPlaceholder = (title: string, subtitle: string, accent: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#07111f" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#bg)" />
      <rect x="24" y="24" width="592" height="312" rx="24" fill="none" stroke="${accent}" stroke-opacity="0.6" stroke-width="2" />
      <path d="M80 260 C180 180, 250 300, 340 220 S500 150, 560 210" fill="none" stroke="${accent}" stroke-width="4" stroke-dasharray="10 8" />
      <circle cx="168" cy="172" r="22" fill="none" stroke="${accent}" stroke-width="3" />
      <circle cx="410" cy="150" r="18" fill="${accent}" fill-opacity="0.35" stroke="${accent}" stroke-width="2" />
      <rect x="68" y="72" width="178" height="34" rx="17" fill="${accent}" fill-opacity="0.18" />
      <text x="84" y="94" fill="#e2e8f0" font-family="Arial" font-size="18" font-weight="700">${title}</text>
      <text x="80" y="300" fill="#94a3b8" font-family="Arial" font-size="20">${subtitle}</text>
      <text x="500" y="312" fill="${accent}" font-family="Arial" font-size="16" font-weight="700">SMARTLINE</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const buildFallbackThumbnail = (camera: CameraItem) => {
  if (camera.mode === 'simulated') {
    return createCameraPlaceholder(camera.name, camera.scenarioLabel ?? 'cenario sintetico', '#22c55e');
  }
  if (camera.source === 'Ecovias Oficial') {
    return createCameraPlaceholder(camera.name, 'fonte publica Ecovias', '#38bdf8');
  }
  return createCameraPlaceholder(camera.name, 'fonte publica municipal', '#f59e0b');
};

const resolveThumbnail = (camera: CameraItem) => camera.thumbnail_url || buildFallbackThumbnail(camera);

const cameraCatalog: CameraItem[] = [
  {
    id: 'ecovias-balanca-planalto',
    name: 'Balança Imigrantes Planalto (28,1 km)',
    camera_type: 'CFTV rodoviário',
    status: 'online',
    region: 'São Bernardo do Campo/SP',
    line_code: 'COR-Ecovias-Imigrantes',
    latitude: -23.8278,
    longitude: -46.5074,
    source: 'Ecovias Oficial',
    mode: 'real',
    streamType: 'external-link',
    external_url: ECOVIAS_URL,
    thumbnail_url: 'https://www.ecoviasimigrantes.com.br/boletim/camera/2',
    description: 'Imagem pública da Ecovias útil para validar condição operacional e acesso de campo no topo da serra.',
    updatedAt: 'Fonte pública Ecovias, verificada em 12/03/2026',
    capabilities: ['condição de pista', 'acesso de equipe', 'contexto visual do corredor'],
    ctaLabel: 'Abrir condição da via'
  },
  {
    id: 'ecovias-pedagio-imigrantes',
    name: 'Pedágio Imigrantes (32,4 km)',
    camera_type: 'CFTV rodoviário',
    status: 'online',
    region: 'São Bernardo do Campo/SP',
    line_code: 'COR-Ecovias-Imigrantes',
    latitude: -23.8528,
    longitude: -46.4946,
    source: 'Ecovias Oficial',
    mode: 'real',
    streamType: 'external-link',
    external_url: ECOVIAS_URL,
    thumbnail_url: 'https://www.ecoviasimigrantes.com.br/boletim/camera/4',
    description: 'Ponto público da Ecovias para acompanhar fluxo na praça de pedágio e viabilidade de deslocamento.',
    updatedAt: 'Fonte pública Ecovias, verificada em 12/03/2026',
    capabilities: ['fluxo operacional', 'janela de despacho', 'evidência visual'],
    ctaLabel: 'Abrir condição da via'
  },
  {
    id: 'ecovias-serra-imigrantes',
    name: 'Trecho de Serra Imigrantes (48,0 km)',
    camera_type: 'CFTV rodoviário',
    status: 'online',
    region: 'Serra do Mar/SP',
    line_code: 'COR-Ecovias-Imigrantes',
    latitude: -23.9056,
    longitude: -46.4602,
    source: 'Ecovias Oficial',
    mode: 'real',
    streamType: 'external-link',
    external_url: ECOVIAS_URL,
    thumbnail_url: 'https://www.ecoviasimigrantes.com.br/boletim/camera/6',
    description: 'Visada pública da Serra do Mar para cruzar risco de acesso com alerta de queimadas e condições climáticas.',
    updatedAt: 'Fonte pública Ecovias, verificada em 12/03/2026',
    capabilities: ['condição de serra', 'apoio a contingência', 'monitoramento climático'],
    ctaLabel: 'Abrir condição da via'
  },
  {
    id: 'ecovias-anchieta-serra',
    name: 'Trecho de Serra da Anchieta (43,3 km)',
    camera_type: 'CFTV rodoviário',
    status: 'online',
    region: 'Serra do Mar/SP',
    line_code: 'COR-Ecovias-Anchieta',
    latitude: -23.8915,
    longitude: -46.4707,
    source: 'Ecovias Oficial',
    mode: 'real',
    streamType: 'external-link',
    external_url: ECOVIAS_URL,
    thumbnail_url: 'https://www.ecoviasimigrantes.com.br/boletim/camera/12',
    description: 'Alternativa pública para acompanhamento de serra quando o corredor Anchieta é usado como rota operacional.',
    updatedAt: 'Fonte pública Ecovias, verificada em 12/03/2026',
    capabilities: ['rota alternativa', 'apoio logístico', 'evidência de tráfego'],
    ctaLabel: 'Abrir condição da via'
  },
  {
    id: 'ecovias-trevo-cubatao',
    name: 'Trevo Cubatão (55,3 km)',
    camera_type: 'CFTV rodoviário',
    status: 'online',
    region: 'Cubatão/SP',
    line_code: 'COR-Ecovias-Anchieta',
    latitude: -23.8934,
    longitude: -46.4245,
    source: 'Ecovias Oficial',
    mode: 'real',
    streamType: 'external-link',
    external_url: ECOVIAS_URL,
    thumbnail_url: 'https://www.ecoviasimigrantes.com.br/boletim/camera/1',
    description: 'Ponto público próximo ao polo industrial de Cubatão, aderente aos cenários do MVP para acesso de equipe e logística.',
    updatedAt: 'Fonte pública Ecovias, verificada em 12/03/2026',
    capabilities: ['acesso industrial', 'mobilização de equipe', 'contexto de entorno'],
    ctaLabel: 'Abrir condição da via'
  },
  {
    id: 'ecovias-padre-manoel',
    name: 'Padre Manoel da Nóbrega (272,3 km)',
    camera_type: 'CFTV rodoviário',
    status: 'online',
    region: 'Praia Grande/SP',
    line_code: 'COR-Ecovias-Litoraneo',
    latitude: -24.0281,
    longitude: -46.4745,
    source: 'Ecovias Oficial',
    mode: 'real',
    streamType: 'external-link',
    external_url: ECOVIAS_URL,
    thumbnail_url: 'https://www.ecoviasimigrantes.com.br/boletim/camera/10',
    description: 'Visão pública útil para cenários de deslocamento costeiro e reforço operacional no litoral sul.',
    updatedAt: 'Fonte pública Ecovias, verificada em 12/03/2026',
    capabilities: ['rota litorânea', 'contingência', 'planejamento de despacho'],
    ctaLabel: 'Abrir condição da via'
  },
  {
    id: 'santos-boqueirao',
    name: 'Praia do Boqueirão',
    camera_type: 'Câmera urbana',
    status: 'online',
    region: 'Santos/SP',
    line_code: 'LT-Santos',
    latitude: -23.9655,
    longitude: -46.3308,
    source: 'Santos Mapeada',
    mode: 'real',
    streamType: 'santos-map',
    stream_url: SANTOS_MAPEADA_URL,
    description: 'Fonte pública municipal para demonstrar integração com câmeras abertas de contexto urbano na Baixada.',
    updatedAt: 'Fonte pública municipal',
    capabilities: ['monitoramento urbano', 'contexto de campo', 'comprovação visual'],
    ctaLabel: 'Abrir painel Santos Mapeada'
  },
  {
    id: 'santos-porto',
    name: 'Porto de Santos - Cais',
    camera_type: 'Câmera urbana',
    status: 'online',
    region: 'Santos/SP',
    line_code: 'LT-Santos',
    latitude: -23.9558,
    longitude: -46.3104,
    source: 'Santos Mapeada',
    mode: 'real',
    streamType: 'santos-map',
    stream_url: SANTOS_MAPEADA_URL,
    description: 'Exemplo municipal para validar visualização de área logística crítica próxima ao corredor costeiro.',
    updatedAt: 'Fonte pública municipal',
    capabilities: ['área portuária', 'operação logística', 'contexto visual'],
    ctaLabel: 'Abrir painel Santos Mapeada'
  },
  {
    id: 'smartline-faixa-cubatao',
    name: 'Faixa de Servidão Cubatão -> Alemoa',
    camera_type: 'Vídeo analítico simulado',
    status: 'online',
    region: 'Cubatão/SP',
    line_code: 'LT-Baixada',
    latitude: -23.9062,
    longitude: -46.3924,
    source: 'Simulado SmartLine',
    mode: 'simulated',
    streamType: 'simulated',
    description: 'Cenário do MVP para invasão de faixa com linha simulada, edificações renderizadas e alerta de recuo mínimo.',
    updatedAt: 'Inferência simulada a cada 15 s',
    scenarioLabel: 'invasão de faixa',
    capabilities: ['detecção de telhado', 'distância à linha', 'marcação de faixa crítica']
  },
  {
    id: 'smartline-queimadas-serra',
    name: 'Borda de Mata - Serra do Mar',
    camera_type: 'Vídeo analítico simulado',
    status: 'online',
    region: 'Serra do Mar/SP',
    line_code: 'LT-Litoral-Sul',
    latitude: -23.9174,
    longitude: -46.4527,
    source: 'Simulado SmartLine',
    mode: 'simulated',
    streamType: 'simulated',
    description: 'Cenário sintético para foco de calor e fumaça cruzado com o corredor energético e janela de vento.',
    updatedAt: 'Inferência simulada a cada 20 s',
    scenarioLabel: 'queimadas e fumaça',
    capabilities: ['heat spot', 'pluma de fumaça', 'buffer de risco operacional']
  },
  {
    id: 'smartline-acesso-operacional',
    name: 'Acesso Operacional - Santos / São Vicente',
    camera_type: 'Vídeo analítico simulado',
    status: 'online',
    region: 'São Vicente/SP',
    line_code: 'LT-Baixada',
    latitude: -23.9756,
    longitude: -46.3851,
    source: 'Simulado SmartLine',
    mode: 'simulated',
    streamType: 'simulated',
    description: 'Simulação de câmera fixa para controle de acesso, fila de viaturas e ocupação indevida junto ao ativo.',
    updatedAt: 'Inferência simulada a cada 10 s',
    scenarioLabel: 'acesso e perímetro',
    capabilities: ['fila de veículos', 'controle de acesso', 'ocupação indevida']
  }
];

const sourceTone = (source: CameraSource) => {
  switch (source) {
    case 'Ecovias Oficial':
      return 'border-sky-400/40 bg-sky-500/10 text-sky-100';
    case 'Santos Mapeada':
      return 'border-amber-400/40 bg-amber-500/10 text-amber-100';
    default:
      return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100';
  }
};

const modeTone = (mode: CameraMode) =>
  mode === 'real'
    ? 'border-white/10 bg-white/5 text-slate-200'
    : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100';

export default function Cameras() {
  const { filters, setFilters, regions, lines } = useSensorFilters();
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [modeFilter, setModeFilter] = useState<CameraMode>('real');
  const [sourceFilter, setSourceFilter] = useState<'Todos' | CameraSource>('Todos');
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);

  const fetchCameras = useCallback(async () => {
    const matchesFilters = (camera: CameraItem) => {
      const regionFilter = filters.region?.toLowerCase();
      const lineFilter = filters.lineCode?.toLowerCase();
      const regionMatch = !regionFilter || camera.region.toLowerCase().includes(regionFilter);
      const lineMatch = !lineFilter || camera.line_code.toLowerCase().includes(lineFilter);
      const sourceMatch = sourceFilter === 'Todos' || camera.source === sourceFilter;
      const modeMatch = camera.mode === modeFilter;
      return regionMatch && lineMatch && sourceMatch && modeMatch;
    };

    if (!supabase || !SENSOR_DB_ENABLED) {
      setCameras(cameraCatalog.filter(matchesFilters));
      return;
    }

    let query = supabase.from('cameras').select('*');
    if (filters.region) query = query.eq('region', filters.region);
    if (filters.lineCode) query = query.eq('line_code', filters.lineCode);

    const { data, error } = await query;
    if (error) {
      console.warn('[cameras] Falha ao consultar Supabase; usando catálogo local.', error);
      setCameras(cameraCatalog.filter(matchesFilters));
      return;
    }

    const supabaseCameras: CameraItem[] = (data ?? []).map((camera: any) => ({
      ...camera,
      source: (camera.source as CameraSource) ?? 'Santos Mapeada',
      mode: (camera.mode as CameraMode) ?? 'real',
      streamType: (camera.streamType as StreamType) ?? 'santos-map',
      status: camera.status === 'offline' ? 'offline' : 'online',
      description: camera.description ?? 'Fonte cadastrada no Supabase para operação da plataforma.',
      updatedAt: camera.updatedAt ?? 'Origem sincronizada via Supabase',
      ctaLabel: camera.ctaLabel ?? 'Abrir origem'
    }));

    const combined = [
      ...supabaseCameras,
      ...cameraCatalog.filter(
        (demo) => !supabaseCameras.some((cam) => cam.id === demo.id)
      )
    ].filter(matchesFilters);

    setCameras(combined);
  }, [filters.lineCode, filters.region, modeFilter, sourceFilter]);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

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
          source: camera.source,
          mode: camera.mode
        }
      }));
  }, [cameras]);

  const sources = useMemo(() => {
    return Array.from(
      new Set(
        cameraCatalog
          .filter((camera) => camera.mode === modeFilter)
          .map((camera) => camera.source)
      )
    );
  }, [modeFilter]);

  useEffect(() => {
    setSourceFilter('Todos');
  }, [modeFilter]);

  useEffect(() => {
    setVisibleCount(6);
  }, [modeFilter, sourceFilter, filters.lineCode, filters.region]);

  useEffect(() => {
    if (!selectedCameraId && cameras.length > 0) {
      setSelectedCameraId(cameras[0].id);
      return;
    }

    if (selectedCameraId && !cameras.find((cam) => cam.id === selectedCameraId)) {
      setSelectedCameraId(cameras[0]?.id ?? null);
    }
  }, [cameras, selectedCameraId]);

  const selectedCamera = useMemo(
    () => cameras.find((camera) => camera.id === selectedCameraId) ?? null,
    [cameras, selectedCameraId]
  );

  const handleThumbError = (event: SyntheticEvent<HTMLImageElement>, camera: CameraItem) => {
    const img = event.currentTarget as HTMLImageElement;
    const fallback = buildFallbackThumbnail(camera);
    if (img.src !== fallback) {
      img.src = fallback;
    }
  };

  return (
    <AppLayout title="Câmeras" subtitle="Fontes públicas online e cenários simulados do MVP na Baixada Santista">
      <SensorFiltersBar
        filters={filters}
        onChange={setFilters}
        regions={regions}
        lines={lines}
      />

      <div className="tech-card p-4 mb-6 space-y-4">
        <Tabs value={modeFilter} onValueChange={(value) => setModeFilter(value as CameraMode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="real">Fontes online</TabsTrigger>
            <TabsTrigger value="simulated">Cenários simulados</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary mt-0.5" />
            <span>
              {modeFilter === 'real'
                ? 'Referências públicas vindas da Ecovias Imigrantes e do portal Santos Mapeada para contextualizar acesso, tráfego e entorno.'
                : 'Cenários SmartLine simulando invasão de faixa, acesso operacional e queimadas com analytics sobre o corredor da Baixada Santista.'}
            </span>
          </div>
          <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as 'Todos' | CameraSource)}>
            <SelectTrigger className="w-full md:w-[240px]">
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
      </div>

      {selectedCamera && (
        <Card className="mb-6 border border-emerald-600/30 bg-slate-950/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex flex-wrap items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              {selectedCamera.name}
              <Badge variant="outline" className={sourceTone(selectedCamera.source)}>
                {selectedCamera.source}
              </Badge>
              <Badge variant="outline" className={modeTone(selectedCamera.mode)}>
                {selectedCamera.mode === 'real' ? 'Fonte pública' : 'Simulado'}
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {selectedCamera.region} • Linha {selectedCamera.line_code} • Lat {selectedCamera.latitude.toFixed(4)}, Lon{' '}
              {selectedCamera.longitude.toFixed(4)}
            </p>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {selectedCamera.description ? (
              <p className="text-sm text-muted-foreground">{selectedCamera.description}</p>
            ) : null}
            {selectedCamera.updatedAt ? (
              <p className="text-xs text-muted-foreground">{selectedCamera.updatedAt}</p>
            ) : null}
            {selectedCamera.capabilities?.length ? (
              <div className="flex flex-wrap gap-2">
                {selectedCamera.capabilities.map((capability) => (
                  <Badge key={capability} variant="secondary">
                    {capability}
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardContent>
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
              data={cameraFeatures}
              height="360px"
              onFeatureClick={(feature) => setSelectedCameraId(String(feature.id))}
            />
          </CardContent>
        </Card>
      )}

      {cameras.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma câmera encontrada para os filtros atuais.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cameras.slice(0, visibleCount).map((camera) => {
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
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{camera.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{camera.camera_type}</p>
                    </div>
                    <Badge variant={camera.status === 'online' ? 'default' : 'destructive'}>
                      {camera.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className={sourceTone(camera.source)}>
                      {camera.source}
                    </Badge>
                    <Badge variant="outline" className={modeTone(camera.mode)}>
                      {camera.mode === 'real' ? 'Online' : 'Simulado'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="aspect-video bg-secondary rounded-lg overflow-hidden border border-white/10">
                    {camera.streamType === 'simulated' ? (
                      <div className="relative w-full h-full overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.28),_transparent_45%),linear-gradient(145deg,#07111f_0%,#0f172a_55%,#052e2b_100%)] p-4 text-white">
                        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-emerald-100/80">
                          <span>Simulação SmartLine</span>
                          <span>{camera.updatedAt}</span>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-emerald-300/25 bg-black/20 p-3">
                            <div className="text-[11px] uppercase tracking-[0.14em] text-emerald-100/70">Cenário</div>
                            <div className="mt-2 text-sm font-semibold">{camera.scenarioLabel}</div>
                          </div>
                          <div className="rounded-lg border border-sky-300/25 bg-black/20 p-3">
                            <div className="text-[11px] uppercase tracking-[0.14em] text-sky-100/70">Linha foco</div>
                            <div className="mt-2 text-sm font-semibold">{camera.line_code}</div>
                          </div>
                        </div>
                        <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-3">
                          <div className="text-[11px] uppercase tracking-[0.14em] text-white/60">Analíticas ativas</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(camera.capabilities ?? []).map((capability) => (
                              <span key={capability} className="rounded-full border border-white/15 px-2 py-1 text-[11px] text-white/80">
                                {capability}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,transparent,rgba(2,6,23,0.8))]" />
                        <div className="absolute left-4 bottom-4 right-4 flex items-center justify-between text-xs text-white/75">
                          <span>Overlay de linha e buffer operacional</span>
                          <span>demo</span>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={resolveThumbnail(camera)}
                        alt={camera.name}
                        className="w-full h-full object-cover"
                        onError={(event) => handleThumbError(event, camera)}
                      />
                    )}
                  </div>

                  {camera.description ? (
                    <p className="text-sm text-muted-foreground">{camera.description}</p>
                  ) : null}

                  <div className="text-xs text-muted-foreground flex flex-col gap-1">
                    <span>Região {camera.region} • {camera.line_code || 'Sem linha'}</span>
                    <span>Coordenadas: {camera.latitude.toFixed(4)}, {camera.longitude.toFixed(4)}</span>
                    {camera.updatedAt ? <span>{camera.updatedAt}</span> : null}
                  </div>
                </CardContent>

                {(camera.streamType === 'external-link' && camera.external_url) && (
                  <CardFooter className="pt-0">
                    <Button size="sm" variant="outline" asChild>
                      <a href={camera.external_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3 h-3 mr-2" />
                        {camera.ctaLabel ?? 'Abrir origem'}
                      </a>
                    </Button>
                  </CardFooter>
                )}

                {camera.streamType === 'santos-map' && camera.stream_url && (
                  <CardFooter className="pt-0">
                    <Button size="sm" variant="outline" asChild>
                      <a href={camera.stream_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3 h-3 mr-2" />
                        {camera.ctaLabel ?? 'Abrir origem'}
                      </a>
                    </Button>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {cameras.length > visibleCount && (
        <div className="flex justify-center mt-6">
          <Button variant="secondary" onClick={() => setVisibleCount((current) => current + 6)}>
            Carregar mais
          </Button>
        </div>
      )}
    </AppLayout>
  );
}
