import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Cable, Gauge, Layers, Zap } from "lucide-react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { useDatasetData } from "@/context/DatasetContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

import type {
  DiagramaRegime,
  UnifilarAlimentador,
  UnifilarAlimentadorStatus,
  UnifilarBarra,
  UnifilarBarraStatus,
  UnifilarDiagram,
  UnifilarLinha,
  UnifilarLinhaStatus,
} from "@/lib/mockData";

const SVG_WIDTH = 820;
const SVG_HEIGHT = 360;

const BAR_STYLE: Record<UnifilarBarraStatus, { fill: string; stroke: string }> = {
  Energizada: { fill: "#2563eb", stroke: "#1d4ed8" },
  "Sob Vigilância": { fill: "#f97316", stroke: "#ea580c" },
  Desligada: { fill: "#94a3b8", stroke: "#64748b" },
};

const LINE_COLOR: Record<UnifilarLinhaStatus, string> = {
  Normal: "#16a34a",
  Sobrecarga: "#f97316",
  Desligada: "#94a3b8",
};

const LINE_DASH: Record<UnifilarLinhaStatus, string | undefined> = {
  Normal: undefined,
  Sobrecarga: "6 4",
  Desligada: "4 8",
};

const FEEDER_STYLE: Record<UnifilarAlimentadorStatus, { color: string; dash?: string }> = {
  Normal: { color: "#0ea5e9" },
  Restrição: { color: "#eab308", dash: "4 4" },
  Desligado: { color: "#ef4444", dash: "2 8" },
};

const FEEDER_BADGE: Record<UnifilarAlimentadorStatus, string> = {
  Normal: "bg-sky-500/15 text-sky-600 border border-sky-500/30",
  Restrição: "bg-amber-500/15 text-amber-600 border border-amber-500/30",
  Desligado: "bg-rose-500/15 text-rose-600 border border-rose-500/30",
};

const ALARM_BADGE: Record<'Alta' | 'Média' | 'Baixa', string> = {
  Alta: "bg-rose-500/15 text-rose-600 border border-rose-500/30",
  Média: "bg-amber-500/15 text-amber-600 border border-amber-500/30",
  Baixa: "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30",
};

const REGIME_BADGE: Record<DiagramaRegime, string> = {
  Normal: "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30",
  Contingência: "bg-orange-500/15 text-orange-600 border border-orange-500/30",
  "Manutenção Programada": "bg-sky-500/15 text-sky-600 border border-sky-500/30",
};

const LAYER_LABELS = {
  linhas: "Linhas de transmissão",
  barras: "Barras e chaves",
  alimentadores: "Alimentadores e cargas",
} as const;

type LayerKey = keyof typeof LAYER_LABELS;
type VisibleLayers = Record<LayerKey, boolean>;

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, "dd/MM HH:mm");
};

const formatMw = (value: number) => `${Math.round(value)} MW`;
const formatCurrent = (value: number) => `${Math.round(value)} A`;
const formatAvailability = (value: number) => `${Math.round(value * 100)}%`;
const formatLosses = (value: number) => `${value.toFixed(1)}%`;

const Unifilar = () => {
  const diagrams = useDatasetData((data) => data.unifilarDiagramas ?? []);

  const [substationFilter, setSubstationFilter] = useState<string>("all");
  const [regimeFilter, setRegimeFilter] = useState<DiagramaRegime | "all">("all");
  const [selectedDiagramId, setSelectedDiagramId] = useState<string | null>(null);
  const [visibleLayers, setVisibleLayers] = useState<VisibleLayers>({
    linhas: true,
    barras: true,
    alimentadores: true,
  });

  const substations = useMemo(() => {
    const values = new Set<string>();
    diagrams.forEach((diagram) => values.add(diagram.subestacao));
    return Array.from(values).sort();
  }, [diagrams]);

  const regimes = useMemo(() => {
    const values = new Set<DiagramaRegime>();
    diagrams.forEach((diagram) => values.add(diagram.regimeOperacao));
    return Array.from(values);
  }, [diagrams]);

  const filteredDiagrams = useMemo(
    () =>
      diagrams.filter((diagram) => {
        if (substationFilter !== "all" && diagram.subestacao !== substationFilter) return false;
        if (regimeFilter !== "all" && diagram.regimeOperacao !== regimeFilter) return false;
        return true;
      }),
    [diagrams, substationFilter, regimeFilter],
  );

  useEffect(() => {
    if (!filteredDiagrams.length) {
      setSelectedDiagramId(null);
      return;
    }

    if (!selectedDiagramId || !filteredDiagrams.some((diagram) => diagram.id === selectedDiagramId)) {
      setSelectedDiagramId(filteredDiagrams[0]!.id);
    }
  }, [filteredDiagrams, selectedDiagramId]);

  const selectedDiagram = useMemo<UnifilarDiagram | null>(
    () => filteredDiagrams.find((diagram) => diagram.id === selectedDiagramId) ?? null,
    [filteredDiagrams, selectedDiagramId],
  );

  const layout = useMemo(() => {
    if (!selectedDiagram) {
      return {
        barPositions: new Map<string, { x: number; y: number }>(),
        lineSegments: [] as Array<{ line: UnifilarLinha; start: { x: number; y: number }; end: { x: number; y: number } }>,
        feederSegments: [] as Array<{ feed: UnifilarAlimentador; start: { x: number; y: number }; end: { x: number; y: number } }>,
      };
    }

    const positions = new Map<string, { x: number; y: number }>();
    selectedDiagram.barras.forEach((bar) => {
      positions.set(bar.id, {
        x: (bar.x / 100) * SVG_WIDTH,
        y: (bar.y / 100) * SVG_HEIGHT,
      });
    });

    const lineSegments = selectedDiagram.linhas
      .map((line) => {
        const start = positions.get(line.origem);
        const end = positions.get(line.destino);
        if (!start || !end) return null;
        return { line, start, end };
      })
      .filter(Boolean) as Array<{ line: UnifilarLinha; start: { x: number; y: number }; end: { x: number; y: number } }>;

    const counts = new Map<string, number>();
    selectedDiagram.alimentadores.forEach((feed) => {
      counts.set(feed.conectadoABarra, (counts.get(feed.conectadoABarra) ?? 0) + 1);
    });

    const used = new Map<string, number>();
    const spacing = 26;

    const feederSegments = selectedDiagram.alimentadores
      .map((feed) => {
        const base = positions.get(feed.conectadoABarra);
        if (!base) return null;
        const total = counts.get(feed.conectadoABarra) ?? 1;
        const index = used.get(feed.conectadoABarra) ?? 0;
        used.set(feed.conectadoABarra, index + 1);
        const offset = (index - (total - 1) / 2) * spacing;
        const start = { x: base.x, y: base.y + 22 };
        const end = { x: base.x + offset, y: base.y + 90 };
        return { feed, start, end };
      })
      .filter(Boolean) as Array<{ feed: UnifilarAlimentador; start: { x: number; y: number }; end: { x: number; y: number } }>;

    return { barPositions: positions, lineSegments, feederSegments };
  }, [selectedDiagram]);

  const barLookup = useMemo(() => {
    if (!selectedDiagram) return new Map<string, UnifilarBarra>();
    return new Map(selectedDiagram.barras.map((bar) => [bar.id, bar]));
  }, [selectedDiagram]);

  const barrasCriticas = selectedDiagram
    ? selectedDiagram.barras.filter((bar) => bar.status !== "Energizada").length
    : 0;
  const alimentadoresCriticos = selectedDiagram
    ? selectedDiagram.alimentadores.filter((feed) => feed.status !== "Normal").length
    : 0;

  const lineMarkerId: Record<UnifilarLinhaStatus, string> = {
    Normal: "arrow-normal",
    Sobrecarga: "arrow-sobrecarga",
    Desligada: "arrow-desligada",
  };

  const handleLayerChange = (layer: LayerKey, checked: boolean) => {
    setVisibleLayers((prev) => ({ ...prev, [layer]: checked }));
  };

  const handleClearFilters = () => {
    setSubstationFilter("all");
    setRegimeFilter("all");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title="Diagramas Unifilares"
          subtitle="Simulações operacionais com barras, linhas e alimentadores para acompanhamento tático"
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Filtros de cenário</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Explore diferentes subestações e regimes de operação para demonstrar as estratégias de manobra.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">Subestação</Label>
                    <Select value={substationFilter} onValueChange={(value) => setSubstationFilter(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {substations.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">Regime de operação</Label>
                    <Select value={regimeFilter} onValueChange={(value) => setRegimeFilter(value as DiagramaRegime | "all")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {regimes.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button variant="ghost" size="sm" className="px-3" onClick={handleClearFilters}>
                    Limpar filtros
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cenários disponíveis</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Escolha um diagrama para navegar pelo protótipo e apresentar o fluxo de energia.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {filteredDiagrams.length ? (
                    filteredDiagrams.map((diagram) => (
                      <button
                        key={diagram.id}
                        type="button"
                        onClick={() => setSelectedDiagramId(diagram.id)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-3 text-left transition",
                          selectedDiagramId === diagram.id
                            ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                            : "border-border hover:bg-muted/60",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-foreground">{diagram.titulo}</div>
                            <div className="text-xs text-muted-foreground">
                              {diagram.tensao} · {diagram.subestacao}
                            </div>
                          </div>
                          <Badge className={REGIME_BADGE[diagram.regimeOperacao]}>{diagram.regimeOperacao}</Badge>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed border-border/60 bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                      Ajuste os filtros para visualizar um cenário disponível.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {selectedDiagram ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex flex-wrap items-center gap-3 text-lg">
                        {selectedDiagram.titulo}
                        <Badge className={REGIME_BADGE[selectedDiagram.regimeOperacao]}>{selectedDiagram.regimeOperacao}</Badge>
                        <Badge variant="outline">{selectedDiagram.tensao}</Badge>
                        <Badge variant="outline">{selectedDiagram.linhaPrincipal}</Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{selectedDiagram.descricao}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Layers className="h-4 w-4" />
                          Camadas visíveis
                        </div>
                        {(Object.entries(LAYER_LABELS) as Array<[LayerKey, string]>).map(([layer, label]) => (
                          <div key={layer} className="flex items-center gap-2">
                            <Switch
                              id={`toggle-${layer}`}
                              checked={visibleLayers[layer]}
                              onCheckedChange={(checked) => handleLayerChange(layer, checked)}
                            />
                            <Label htmlFor={`toggle-${layer}`} className="text-xs text-muted-foreground">
                              {label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Card>
                      <CardContent className="flex items-center justify-between gap-3 py-4">
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Carga total</p>
                          <p className="text-xl font-semibold text-foreground">
                            {formatMw(selectedDiagram.indicadores.cargaTotalMW)}
                          </p>
                          <p className="text-xs text-muted-foreground">Soma dos circuitos energizados</p>
                        </div>
                        <Zap className="h-6 w-6 text-emerald-500" />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="flex items-center justify-between gap-3 py-4">
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Corrente máxima</p>
                          <p className="text-xl font-semibold text-foreground">
                            {formatCurrent(selectedDiagram.indicadores.correnteMaximaA)}
                          </p>
                          <p className="text-xs text-muted-foreground">Pior caso no horizonte de simulação</p>
                        </div>
                        <Activity className="h-6 w-6 text-sky-500" />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="flex items-center justify-between gap-3 py-4">
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Disponibilidade</p>
                          <p className="text-xl font-semibold text-foreground">
                            {formatAvailability(selectedDiagram.indicadores.disponibilidade)}
                          </p>
                          <p className="text-xs text-muted-foreground">Considerando redundâncias ativas</p>
                        </div>
                        <Gauge className="h-6 w-6 text-indigo-500" />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="flex items-center justify-between gap-3 py-4">
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Perdas estimadas</p>
                          <p className="text-xl font-semibold text-foreground">
                            {formatLosses(selectedDiagram.indicadores.perdasPercentual)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Criticidades: {barrasCriticas} barras · {alimentadoresCriticos} alimentadores
                          </p>
                        </div>
                        <AlertTriangle className="h-6 w-6 text-orange-500" />
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Diagrama unifilar simulado</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Visualização didática das barras, linhas e alimentadores com destaque para contingências e manobras.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full overflow-auto">
                        <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full max-w-full">
                          <defs>
                            <marker id="arrow-normal" markerWidth="12" markerHeight="12" refX="12" refY="6" orient="auto" markerUnits="strokeWidth">
                              <path d="M0,0 L12,6 L0,12 z" fill={LINE_COLOR.Normal} />
                            </marker>
                            <marker id="arrow-sobrecarga" markerWidth="12" markerHeight="12" refX="12" refY="6" orient="auto" markerUnits="strokeWidth">
                              <path d="M0,0 L12,6 L0,12 z" fill={LINE_COLOR.Sobrecarga} />
                            </marker>
                            <marker id="arrow-desligada" markerWidth="12" markerHeight="12" refX="12" refY="6" orient="auto" markerUnits="strokeWidth">
                              <path d="M0,0 L12,6 L0,12 z" fill={LINE_COLOR.Desligada} />
                            </marker>
                          </defs>

                          <rect x={0} y={0} width={SVG_WIDTH} height={SVG_HEIGHT} rx={16} fill="var(--card)" />

                          {visibleLayers.linhas &&
                            layout.lineSegments.map(({ line, start, end }) => {
                              const midX = (start.x + end.x) / 2;
                              const midY = (start.y + end.y) / 2;
                              return (
                                <g key={line.id}>
                                  <line
                                    x1={start.x}
                                    y1={start.y}
                                    x2={end.x}
                                    y2={end.y}
                                    stroke={LINE_COLOR[line.status]}
                                    strokeWidth={line.status === "Sobrecarga" ? 8 : 6}
                                    strokeDasharray={LINE_DASH[line.status]}
                                    strokeLinecap="round"
                                    markerEnd={`url(#${lineMarkerId[line.status]})`}
                                  />
                                  <text
                                    x={midX}
                                    y={midY - 10}
                                    textAnchor="middle"
                                    className="fill-foreground text-[11px] font-semibold"
                                  >
                                    {line.nome}
                                  </text>
                                  <text
                                    x={midX}
                                    y={midY + 12}
                                    textAnchor="middle"
                                    className="fill-muted-foreground text-[10px]"
                                  >
                                    {line.cargaMW} MW · {line.correnteA} A
                                  </text>
                                </g>
                              );
                            })}

                          {visibleLayers.barras &&
                            selectedDiagram.barras.map((bar) => {
                              const position = layout.barPositions.get(bar.id);
                              if (!position) return null;
                              const width = 100;
                              const height = 28;
                              const x = position.x - width / 2;
                              const y = position.y - height / 2;
                              return (
                                <g key={bar.id}>
                                  <rect
                                    x={x}
                                    y={y}
                                    width={width}
                                    height={height}
                                    rx={10}
                                    fill={BAR_STYLE[bar.status].fill}
                                    stroke={BAR_STYLE[bar.status].stroke}
                                    strokeWidth={2}
                                  />
                                  <text
                                    x={position.x}
                                    y={position.y - 2}
                                    textAnchor="middle"
                                    className="fill-white text-[11px] font-semibold"
                                  >
                                    {bar.nome}
                                  </text>
                                  <text
                                    x={position.x}
                                    y={position.y + 12}
                                    textAnchor="middle"
                                    className="fill-white/80 text-[10px]"
                                  >
                                    {bar.tensao}
                                  </text>
                                </g>
                              );
                            })}

                          {visibleLayers.alimentadores &&
                            layout.feederSegments.map(({ feed, start, end }) => {
                              const style = FEEDER_STYLE[feed.status];
                              return (
                                <g key={feed.id}>
                                  <line
                                    x1={start.x}
                                    y1={start.y}
                                    x2={end.x}
                                    y2={end.y}
                                    stroke={style.color}
                                    strokeWidth={4}
                                    strokeDasharray={style.dash}
                                    strokeLinecap="round"
                                  />
                                  <circle cx={end.x} cy={end.y} r={6} fill={style.color} />
                                  <text
                                    x={end.x}
                                    y={end.y - 14}
                                    textAnchor="middle"
                                    className="fill-foreground text-[10px] font-semibold"
                                  >
                                    {feed.nome}
                                  </text>
                                  <text
                                    x={end.x}
                                    y={end.y + 12}
                                    textAnchor="middle"
                                    className="fill-muted-foreground text-[9px]"
                                  >
                                    {feed.cargaMW} MW
                                  </text>
                                </g>
                              );
                            })}
                        </svg>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-5 rounded-full" style={{ backgroundColor: LINE_COLOR.Normal }} />
                          <span>Fluxo normal</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-5 rounded-full" style={{ backgroundColor: LINE_COLOR.Sobrecarga }} />
                          <span>Sobrecarga em análise</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-5 rounded-full" style={{ backgroundColor: LINE_COLOR.Desligada }} />
                          <span>Trecho desligado</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-5 rounded-full" style={{ backgroundColor: FEEDER_STYLE.Normal.color }} />
                          <span>Alimentador priorizado</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-2">
                        <CardTitle>Alarmes e eventos</CardTitle>
                        <Badge variant="outline">{selectedDiagram.alarmes.length}</Badge>
                      </CardHeader>
                      <CardContent>
                        {selectedDiagram.alarmes.length ? (
                          <div className="space-y-3">
                            {selectedDiagram.alarmes.map((alarm) => (
                              <div key={alarm.id} className="rounded-md border border-border/60 p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <Badge className={ALARM_BADGE[alarm.severidade]}>{alarm.severidade}</Badge>
                                  <span className="text-xs text-muted-foreground">{formatDateTime(alarm.timestamp)}</span>
                                </div>
                                <p className="mt-2 text-sm text-foreground">{alarm.mensagem}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Nenhum alarme ativo para o cenário selecionado.
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-2">
                        <CardTitle>Planos e manobras sugeridas</CardTitle>
                        <Badge variant="outline">{selectedDiagram.sugestoes.length}</Badge>
                      </CardHeader>
                      <CardContent>
                        {selectedDiagram.sugestoes.length ? (
                          <div className="space-y-3">
                            {selectedDiagram.sugestoes.map((step) => (
                              <div key={step.id} className="rounded-md border border-border/60 p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-semibold text-foreground">{step.titulo}</p>
                                  {step.tempoEstimadoMin != null && (
                                    <span className="text-xs text-muted-foreground">~{step.tempoEstimadoMin} min</span>
                                  )}
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">{step.descricao}</p>
                                <p className="mt-2 text-xs font-medium text-foreground">Impacto: {step.impacto}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Nenhuma manobra recomendada para este cenário.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2">
                      <CardTitle>Alimentadores monitorados</CardTitle>
                      <Badge variant="outline">{selectedDiagram.alimentadores.length}</Badge>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedDiagram.alimentadores.map((feed) => {
                        const bar = barLookup.get(feed.conectadoABarra);
                        return (
                          <div
                            key={feed.id}
                            className="flex flex-col gap-2 rounded-md border border-border/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">{feed.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatMw(feed.cargaMW)} · Barra {bar?.nome ?? feed.conectadoABarra}
                              </p>
                            </div>
                            <Badge className={FEEDER_BADGE[feed.status]}>{feed.status}</Badge>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Nenhum cenário encontrado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Ajuste os filtros para visualizar um diagrama unifilar simulado e demonstrar as funcionalidades do MVP.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Unifilar;
