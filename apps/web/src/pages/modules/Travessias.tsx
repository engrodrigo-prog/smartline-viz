import { useMemo, useState } from "react";
import { Cable, Camera, MapPin, Route, TrainTrack } from "lucide-react";
import { toast } from "sonner";

import ModuleLayout from "@/components/ModuleLayout";
import ModuleDemoBanner from "@/components/ModuleDemoBanner";
import FiltersBar from "@/components/FiltersBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapLibreUnified } from "@/components/MapLibreUnified";
import { useFilters } from "@/context/FiltersContext";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import { useFeatureStatuses, useSaveFeatureStatus } from "@/hooks/useFeatureStatus";
import { useDatasetData } from "@/context/DatasetContext";
import type { Evento } from "@/lib/mockData";

type TravessiaItem = Evento;

const STATUS_OPTIONS = ["Identificada", "Notificada", "Judicializada", "Regularizada"] as const;
const STATUS_FILTERS = [...STATUS_OPTIONS, "Sem status"] as const;

const statusVariant = (status?: string) => {
  switch (status) {
    case "Regularizada":
      return "secondary";
    case "Judicializada":
      return "destructive";
    case "Notificada":
      return "default";
    case "Identificada":
    default:
      return "outline";
  }
};

const stableId = (item: TravessiaItem) => {
  if (item.id) return `trav-${item.id}`;
  const slug = `${item.nome ?? ""}-${item.linha ?? ""}-${item.ramal ?? ""}`.toLowerCase().replace(/\s+/g, "-");
  return `trav-${slug}`;
};

const Travessias = () => {
  const { filters } = useFilters();
  const [activeTab, setActiveTab] = useState("lista");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TravessiaItem | null>(null);
  const [formStatus, setFormStatus] = useState<string>(STATUS_OPTIONS[0]);
  const [formNotes, setFormNotes] = useState<string>("");
  const [formCameraUrl, setFormCameraUrl] = useState<string>("");
  const [focusFilter, setFocusFilter] = useState<{ id: string; label: string; predicate: (item: TravessiaItem) => boolean } | null>(null);
  const [showRodovias, setShowRodovias] = useState(true);
  const [showFerrovias, setShowFerrovias] = useState(true);
  const eventosDataset = useDatasetData((data) => data.eventos);

  const travessias = useMemo(() => eventosDataset.filter((evento) => evento.tipo === "Travessias"), [eventosDataset]);
  const allIds = useMemo(() => travessias.map((item) => stableId(item)), [travessias]);

  const { data: statusList = [] } = useFeatureStatuses("travessias", allIds);
  const saveStatusMutation = useSaveFeatureStatus("travessias");

  const statusMap = useMemo(() => {
    const map = new Map<string, (typeof statusList)[number]>();
    statusList.forEach((status) => map.set(status.id, status));
    return map;
  }, [statusList]);

  const filteredData = useMemo(() => {
    let data = [...travessias];

    if (filters.regiao) data = data.filter((item) => item.regiao === filters.regiao);
    if (filters.linha) data = data.filter((item) => item.linha === filters.linha);
    if (filters.ramal) data = data.filter((item) => item.ramal === filters.ramal);
    if (filters.search) {
      const query = filters.search.toLowerCase();
      data = data.filter((item) => item.nome.toLowerCase().includes(query));
    }

    if (statusFilters.length > 0) {
      data = data.filter((item) => {
        const id = stableId(item);
        const currentStatus = statusMap.get(id)?.status ?? "Sem status";
        return statusFilters.includes(currentStatus);
      });
    }

    return data;
  }, [filters, statusFilters, travessias, statusMap]);

  const applyFocus = (id: string, label: string, predicate: (item: TravessiaItem) => boolean, statuses?: string[]) => {
    setFocusFilter({ id, label, predicate });
    if (statuses) {
      setStatusFilters(statuses);
    } else {
      setStatusFilters([]);
    }
    setActiveTab("mapa");
  };

  const clearFocus = () => {
    setFocusFilter(null);
    setStatusFilters([]);
  };

  const focusedData = useMemo(() => {
    if (!focusFilter) return filteredData;
    return filteredData.filter(focusFilter.predicate);
  }, [filteredData, focusFilter]);

  const points: FeatureCollection = useMemo(
    () => ({
      type: "FeatureCollection",
      features: filteredData.map((item) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: item.coords ?? [-46.63, -23.55] },
        properties: {
          id: item.id,
          status: statusMap.get(stableId(item))?.status ?? "Sem status",
          color: (() => {
            const status = statusMap.get(stableId(item))?.status;
            if (status === "Regularizada") return "#22c55e";
            if (status === "Judicializada") return "#ef4444";
            if (status === "Notificada") return "#f97316";
            return "#38bdf8";
          })(),
          isFocus: focusFilter ? focusFilter.predicate(item) : false,
        },
      })),
    }),
    [filteredData, focusFilter, statusMap]
  );

  const bounds = useMemo(() => {
    const src = focusFilter ? focusedData : filteredData;
    if (src.length === 0) return null;
    const lngs = src.map((item) => (item.coords ? item.coords[0] : -46.63));
    const lats = src.map((item) => (item.coords ? item.coords[1] : -23.55));
    return [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ] as [[number, number], [number, number]];
  }, [filteredData, focusedData, focusFilter]);

  const rsDemoLine = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [-57.08, -29.75],
            [-55.60, -29.50],
            [-54.10, -29.65],
            [-53.10, -30.00],
            [-52.00, -30.10],
            [-51.23, -30.03],
            [-51.18, -29.16]
          ]
        },
        properties: { color: "#0284c7", width: 3, opacity: 0.9 }
      }
    ]
  }), []);

  // Camadas OSM simuladas (rodovias/ferrovias) e detecção de cruzamentos com o corredor acima
  const rodovias = useMemo<FeatureCollection<LineString>>(() => ({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [-56.8, -29.6],
            [-55.0, -29.55],
            [-53.6, -29.85],
            [-51.4, -29.7],
          ],
        },
        properties: { name: 'BR-XYZ', color: '#f59e0b', width: 2.5, opacity: 0.8 },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [-56.2, -29.9],
            [-54.8, -29.4],
            [-52.8, -29.9],
          ],
        },
        properties: { name: 'SP-123', color: '#fbbf24', width: 2, opacity: 0.75 },
      },
    ],
  }), []);

  const ferrovias = useMemo<FeatureCollection<LineString>>(() => ({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [-56.9, -29.2],
            [-55.7, -29.8],
            [-54.2, -30.05],
            [-52.2, -29.95],
          ],
        },
        properties: { name: 'ALL Ramal 7', color: '#7c3aed', width: 2.2, opacity: 0.75 },
      },
    ],
  }), []);

  // Helpers geométricos mínimos para intersecção de segmentos
  type XY = [number, number];
  const segIntersect = (a: XY, b: XY, c: XY, d: XY): XY | null => {
    const x1 = a[0], y1 = a[1];
    const x2 = b[0], y2 = b[1];
    const x3 = c[0], y3 = c[1];
    const x4 = d[0], y4 = d[1];
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom === 0) return null;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = ((x1 - x3) * (y1 - y2) - (y1 - y3) * (x1 - x2)) / denom;
    if (t < 0 || t > 1 || u < 0 || u > 1) return null;
    return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
  };

  const lineSegments = (line: LineString): XY[][] => {
    const coords = line.coordinates as XY[];
    const segs: XY[][] = [];
    for (let i = 0; i < coords.length - 1; i++) segs.push([coords[i], coords[i + 1]]);
    return segs;
  };

  const collectIntersections = (
    base: FeatureCollection<LineString>,
    target: FeatureCollection<LineString>,
    tag: 'rodovia' | 'ferrovia',
  ): FeatureCollection<Point> => {
    const features: Feature<Point, { tipo: string }>[] = [];
    base.features.forEach((bf) => {
      target.features.forEach((tf) => {
        lineSegments(bf.geometry).forEach(([a, b]) => {
          lineSegments(tf.geometry).forEach(([c, d]) => {
            const p = segIntersect(a, b, c, d);
            if (p) features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: { tipo: tag } });
          });
        });
      });
    });
    return { type: 'FeatureCollection', features };
  };

  const cruzRodovias = useMemo(() => collectIntersections(rsDemoLine as any, rodovias, 'rodovia'), [rsDemoLine, rodovias]);
  const cruzFerrovias = useMemo(() => collectIntersections(rsDemoLine as any, ferrovias, 'ferrovia'), [rsDemoLine, ferrovias]);

  // Score de risco por travessia: vão (simulado), corrosão (derivado), proximidade de cruzamentos
  const hash = (s: string) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  const dist2 = (p: XY, q: XY) => { const dx = p[0] - q[0]; const dy = p[1] - q[1]; return dx * dx + dy * dy; };
  const nearestCrossingFactor = (coord: XY): number => {
    const all = [...cruzRodovias.features, ...cruzFerrovias.features];
    if (!all.length) return 0;
    let best = Infinity;
    for (const f of all) { const q = f.geometry.coordinates as XY; const d = dist2(coord, q); if (d < best) best = d; }
    const approx = 1 / Math.max(1e-8, best * 5);
    return Math.min(1, approx);
  };

  const enriched = useMemo(() => {
    return filteredData.map((e) => {
      const h = hash(e.id + (e.nome || ''));
      const randA = (h % 1000) / 1000; const randB = ((h >>> 10) % 1000) / 1000;
      const vaoMaior = Math.round(80 + Math.max(randA, randB) * 370);
      const corrosaoIndex = (e.criticidade === 'Alta' ? 0.75 : e.criticidade === 'Média' ? 0.45 : 0.2) + (e.status === 'Crítico' ? 0.2 : e.status === 'Alerta' ? 0.1 : 0);
      const crossFactor = nearestCrossingFactor((e.coords ?? [-46.63, -23.55]) as XY);
      const vaoNorm = (vaoMaior - 80) / (450 - 80);
      const score = Math.min(1, vaoNorm * 0.4 + Math.min(1, corrosaoIndex) * 0.35 + crossFactor * 0.25);
      return { ...e, vaoMaior, corrosaoIndex: Math.min(1, corrosaoIndex), crossFactor, riskScore: score } as TravessiaItem & { vaoMaior: number; corrosaoIndex: number; crossFactor: number; riskScore: number };
    });
  }, [filteredData, cruzRodovias, cruzFerrovias]);

  const statusCounts = useMemo(() => {
    const now = Date.now();
    const prazoDias = 30;
    let concluidas = 0, emAndamento = 0, pendentes = 0, atrasadas = 0;
    let critAlta = 0, critMedia = 0, critBaixa = 0;

    filteredData.forEach((item) => {
      const id = stableId(item);
      const s = statusMap.get(id)?.status;
      if (s === 'Regularizada') concluidas += 1;
      else if (s === 'Notificada' || s === 'Judicializada') emAndamento += 1;
      else pendentes += 1; // Sem status

      const ts = new Date(item.data).getTime();
      const delta = (now - ts) / (1000 * 60 * 60 * 24);
      if (s !== 'Regularizada' && delta > prazoDias) atrasadas += 1;

      if (item.criticidade === 'Alta') critAlta += 1;
      else if (item.criticidade === 'Média') critMedia += 1;
      else critBaixa += 1;
    });

    return {
      total: filteredData.length,
      concluidas,
      emAndamento,
      pendentes,
      atrasadas,
      critAlta,
      critMedia,
      critBaixa,
      prazoDias,
    };
  }, [filteredData, statusMap]);

  const openStatusDialog = (item: TravessiaItem) => {
    const id = stableId(item);
    const current = statusMap.get(id);
    setSelectedItem(item);
    setFormStatus(current?.status ?? STATUS_OPTIONS[0]);
    setFormNotes(current?.notes ?? "");
    setFormCameraUrl(current?.cameraUrl ?? "");
    setDialogOpen(true);
  };

  const handleToggleStatusFilter = (value: string) => {
    setStatusFilters((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const handleSaveStatus = () => {
    if (!selectedItem) return;
    const payload = {
      id: stableId(selectedItem),
      status: formStatus,
      notes: formNotes?.trim() ? formNotes.trim() : undefined,
      cameraUrl: formCameraUrl?.trim() ? formCameraUrl.trim() : undefined
    };
    saveStatusMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Status atualizado com sucesso");
        setDialogOpen(false);
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Não foi possível atualizar o status. Tente novamente."
        );
      }
    });
  };

  return (
    <ModuleLayout title="Gestão de Travessias" icon={Cable}>
      <div className="p-6 space-y-6">
        <ModuleDemoBanner />
        <FiltersBar>
          <div className="flex flex-wrap gap-2 mt-4">
            {STATUS_FILTERS.map((status) => {
              const active = statusFilters.includes(status);
              return (
                <Button
                  key={status}
                  size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={() => handleToggleStatusFilter(status)}
                >
                  {status}
                </Button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Sobreposições OSM (simuladas):</span>
            <Button size="sm" variant={showRodovias ? 'default' : 'outline'} onClick={() => setShowRodovias(v => !v)}>
              <Route className="w-4 h-4 mr-1" /> Rodovias
            </Button>
            <Button size="sm" variant={showFerrovias ? 'default' : 'outline'} onClick={() => setShowFerrovias(v => !v)}>
              <TrainTrack className="w-4 h-4 mr-1" /> Ferrovias
            </Button>
            <div className="text-xs text-muted-foreground ml-2">
              Cruzamentos: <span className="text-foreground font-medium">{(showRodovias ? cruzRodovias.features.length : 0) + (showFerrovias ? cruzFerrovias.features.length : 0)}</span>
            </div>
          </div>
        </FiltersBar>

        {/* KPIs - Status e Criticidade */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <button className={`tech-card p-6 text-left transition ${focusFilter?.id === 'total' ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/40'}`} onClick={() => applyFocus('total', 'Todas as travessias', () => true)}>
            <div className="text-sm text-muted-foreground mb-1">Travessias catalogadas</div>
            <div className="text-3xl font-bold text-primary">{statusCounts.total}</div>
          </button>
          <button className={`tech-card p-6 text-left transition ${focusFilter?.id === 'concluidas' ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/40'}`} onClick={() => applyFocus('concluidas', 'Regularizadas', (item) => statusMap.get(stableId(item))?.status === 'Regularizada', ['Regularizada'])}>
            <div className="text-sm text-muted-foreground mb-1">Regularizadas</div>
            <div className="text-3xl font-bold text-green-500">{statusCounts.concluidas}</div>
          </button>
          <button className={`tech-card p-6 text-left transition ${focusFilter?.id === 'andamento' ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/40'}`} onClick={() => applyFocus('andamento', 'Em andamento', (item) => {
            const s = statusMap.get(stableId(item))?.status;
            return s === 'Notificada' || s === 'Judicializada';
          }, ['Notificada', 'Judicializada'])}>
            <div className="text-sm text-muted-foreground mb-1">Em andamento</div>
            <div className="text-3xl font-bold text-amber-500">{statusCounts.emAndamento}</div>
          </button>
          <button className={`tech-card p-6 text-left transition ${focusFilter?.id === 'pendentes' ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/40'}`} onClick={() => applyFocus('pendentes', 'Sem status', (item) => !statusMap.get(stableId(item))?.status, ['Sem status'])}>
            <div className="text-sm text-muted-foreground mb-1">Sem status</div>
            <div className="text-3xl font-bold text-sky-500">{statusCounts.pendentes}</div>
          </button>
          <button className={`tech-card p-6 text-left transition ${focusFilter?.id === 'atrasadas' ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/40'}`} onClick={() => applyFocus('atrasadas', `Em atraso (> ${statusCounts.prazoDias}d)`, (item) => {
            const s = statusMap.get(stableId(item))?.status;
            const ts = new Date(item.data).getTime();
            return s !== 'Regularizada' && (Date.now() - ts) / (1000 * 60 * 60 * 24) > statusCounts.prazoDias;
          })}>
            <div className="text-sm text-muted-foreground mb-1">Em atraso (&gt; {statusCounts.prazoDias}d)</div>
            <div className="text-3xl font-bold text-destructive">{statusCounts.atrasadas}</div>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className={`tech-card p-6 text-left transition ${focusFilter?.id === 'crit-alta' ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/40'}`} onClick={() => applyFocus('crit-alta', 'Críticos (Alta)', (item) => item.criticidade === 'Alta')}>
            <div className="text-sm text-muted-foreground mb-1">Críticos (Alta)</div>
            <div className="text-3xl font-bold text-destructive">{statusCounts.critAlta}</div>
          </button>
          <button className={`tech-card p-6 text-left transition ${focusFilter?.id === 'crit-media' ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/40'}`} onClick={() => applyFocus('crit-media', 'Média criticidade', (item) => item.criticidade === 'Média')}>
            <div className="text-sm text-muted-foreground mb-1">Média criticidade</div>
            <div className="text-3xl font-bold text-amber-500">{statusCounts.critMedia}</div>
          </button>
          <button className={`tech-card p-6 text-left transition ${focusFilter?.id === 'crit-baixa' ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/40'}`} onClick={() => applyFocus('crit-baixa', 'Baixa criticidade', (item) => item.criticidade === 'Baixa')}>
            <div className="text-sm text-muted-foreground mb-1">Baixa criticidade</div>
            <div className="text-3xl font-bold text-green-500">{statusCounts.critBaixa}</div>
          </button>
        </div>

        {focusFilter && (
          <div className="flex items-center justify-between px-4 py-2 border border-primary/20 bg-primary/5 rounded-lg text-xs">
            <span className="text-primary font-semibold">Exibindo apenas: {focusFilter.label}</span>
            <button className="underline-offset-2 hover:underline" onClick={clearFocus}>Limpar seleção</button>
          </div>
        )}

        {/* Ranking de risco consolidado (vão + corrosão + cruzamentos) */}
        <div className="tech-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">Pontos de atenção ranqueados por risco consolidado</div>
            <div className="text-xs text-muted-foreground">Critérios: vão, corrosão, cruzamentos próximos</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {enriched
              .slice()
              .sort((a, b) => b.riskScore - a.riskScore)
              .slice(0, 9)
              .map((it) => (
                <div key={it.id} className="p-3 border border-border/70 rounded-md bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{it.nome}</div>
                    <Badge variant={it.riskScore > 0.7 ? 'destructive' : it.riskScore > 0.45 ? 'default' : 'secondary'}>
                      {Math.round(it.riskScore * 100)}%
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Vão: <span className="text-foreground font-medium">{it.vaoMaior}m</span> · Corrosão: <span className="text-foreground font-medium">{Math.round(it.corrosaoIndex * 100)}%</span> · Cruzamentos prox.: <span className="text-foreground font-medium">{it.crossFactor > 0.01 ? 'sim' : 'não'}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="tech-card p-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="lista">📋 Lista</TabsTrigger>
            <TabsTrigger value="mapa">🗺️ Mapa</TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="mt-4 space-y-4">
            {focusedData.map((item) => {
              const id = stableId(item);
              const status = statusMap.get(id);
              return (
                <div
                  key={id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 border border-border/60 rounded-lg bg-background/80"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Cable className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold">{item.nome}</h3>
                        <Badge variant={statusVariant(status?.status)}>
                          {status?.status ?? "Sem status"}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        {item.linha} · {item.ramal} · Região {item.regiao}
                      </div>
                      {status?.notes && (
                        <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                          {status.notes}
                        </p>
                      )}
                      {status?.updatedAt && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Atualizado em {new Date(status.updatedAt).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {status?.cameraUrl ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open(status.cameraUrl!, "_blank", "noopener")}
                      >
                        <Camera className="w-4 h-4 mr-1" />
                        Ver câmera
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => openStatusDialog(item)}>
                        Associar câmera
                      </Button>
                    )}
                    <Button size="sm" onClick={() => openStatusDialog(item)}>
                      Atualizar status
                    </Button>
                  </div>
                </div>
              );
            })}
            {filteredData.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma travessia encontrada com os filtros selecionados.
              </p>
            )}
          </TabsContent>

          <TabsContent value="mapa" className="mt-4">
            <div className="h-[600px] rounded-lg overflow-hidden border border-border/60">
              <MapLibreUnified
                filterRegiao={filters.regiao}
                filterEmpresa={filters.empresa}
                filterLinha={filters.linha}
                showTravessias
                initialZoom={filters.linha ? 12 : 7}
                customPoints={{
                  type: 'FeatureCollection',
                  features: [
                    ...points.features,
                    ...(showRodovias ? cruzRodovias.features.map(f => ({ type: 'Feature', geometry: f.geometry, properties: { color: '#f97316', size: 10 } })) : []),
                    ...(showFerrovias ? cruzFerrovias.features.map(f => ({ type: 'Feature', geometry: f.geometry, properties: { color: '#7c3aed', size: 10 } })) : []),
                  ],
                } as FeatureCollection}
                customLines={{
                  type: 'FeatureCollection',
                  features: [
                    ...(rsDemoLine.features as Feature<LineString, any>[]),
                    ...(showRodovias ? (rodovias.features as Feature<LineString, any>[]) : []).map(g => ({ ...g, properties: { ...(g.properties || {}), color: '#f59e0b', width: 2.5, opacity: 0.8 } })),
                    ...(showFerrovias ? (ferrovias.features as Feature<LineString, any>[]) : []).map(g => ({ ...g, properties: { ...(g.properties || {}), color: '#7c3aed', width: 2.2, opacity: 0.75 } })),
                  ],
                } as FeatureCollection}
                fitBounds={bounds}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar status da travessia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <select
                value={formStatus}
                onChange={(event) => setFormStatus(event.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formNotes}
                onChange={(event) => setFormNotes(event.target.value)}
                placeholder="Detalhes sobre o status, intervenções, pendências..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="cameraUrl">URL da câmera associada</Label>
              <Input
                id="cameraUrl"
                type="url"
                value={formCameraUrl}
                onChange={(event) => setFormCameraUrl(event.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveStatus} disabled={saveStatusMutation.isPending}>
              {saveStatusMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
};

export default Travessias;
