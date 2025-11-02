import { useState, useMemo } from "react";
import { useFilters } from "@/context/FiltersContext";
import { Mountain } from "lucide-react";
import ModuleLayout from "@/components/ModuleLayout";
import ModuleDemoBanner from "@/components/ModuleDemoBanner";
import FiltersBar from "@/components/FiltersBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapLibreUnified } from "@/components/MapLibreUnified";
import DataTableAdvanced from "@/components/DataTableAdvanced";
import DetailDrawer from "@/components/DetailDrawer";
import StatusBadge from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { FeatureCollection } from "geojson";
import { useDatasetData } from "@/context/DatasetContext";
import type { Erosao as ErosaoItem } from "@/lib/mockData";

type SoilSample = {
  id: string;
  latitude: number;
  longitude: number;
  depth: number;
  soilType: string;
  cohesion: number;
  permeability: number;
  moisture: number;
  notes?: string;
};

type FocusFilter = {
  id: string;
  label: string;
  predicate: (item: ErosaoItem) => boolean;
};

const Erosao = () => {
  const { filters } = useFilters();
  const [selectedErosao, setSelectedErosao] = useState<any>(null);
  const [tipoFilter, setTipoFilter] = useState<string>('');
  const [gravidadeFilter, setGravidadeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [focusFilter, setFocusFilter] = useState<FocusFilter | null>(null);
  const [activeTab, setActiveTab] = useState("lista");
  const [soilSamples, setSoilSamples] = useState<SoilSample[]>([]);
  const [soilForm, setSoilForm] = useState({
    latitude: '',
    longitude: '',
    depth: '',
    soilType: '',
    cohesion: '',
    permeability: '',
    moisture: '',
    notes: ''
  });
  const [showSoilLayer, setShowSoilLayer] = useState(true);
  const [erosionLayerTop, setErosionLayerTop] = useState(true);
  const [soilLayerPosition, setSoilLayerPosition] = useState<'top' | 'middle' | 'bottom'>('top');
  const [soilDialogOpen, setSoilDialogOpen] = useState(false);
  const erosoesDataset = useDatasetData((data) => data.erosoes);

  const handleSoilInputChange = (field: keyof typeof soilForm, value: string) => {
    setSoilForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSoilSample = () => {
    const lat = Number(soilForm.latitude);
    const lon = Number(soilForm.longitude);
    const depth = Number(soilForm.depth);
    const cohesion = Number(soilForm.cohesion);
    const permeability = Number(soilForm.permeability);
    const moisture = Number(soilForm.moisture);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      toast.error("Informe coordenadas válidas (lat/lon)");
      return;
    }
    if (!soilForm.soilType.trim()) {
      toast.error("Informe o tipo de solo");
      return;
    }

    const sample: SoilSample = {
      id: crypto.randomUUID(),
      latitude: lat,
      longitude: lon,
      depth: Number.isNaN(depth) ? 0 : depth,
      soilType: soilForm.soilType.trim(),
      cohesion: Number.isNaN(cohesion) ? 0 : cohesion,
      permeability: Number.isNaN(permeability) ? 0 : permeability,
      moisture: Number.isNaN(moisture) ? 0 : moisture,
      notes: soilForm.notes?.trim() || undefined,
    };

    setSoilSamples((prev) => [...prev, sample]);
    setSoilForm({ latitude: '', longitude: '', depth: '', soilType: '', cohesion: '', permeability: '', moisture: '', notes: '' });
    toast.success("Amostra de solo adicionada");
  };

  const handleRemoveSoilSample = (id: string) => {
    setSoilSamples((prev) => prev.filter((sample) => sample.id !== id));
  };
  
  const handleGenerateDemoSoil = () => {
    const gen: SoilSample[] = [];
    const take = Math.min(10, filteredData.length);
    for (let i = 0; i < take; i++) {
      const e = filteredData[i];
      const [lat, lon] = e.coords;
      const jitterLat = lat + (Math.random() - 0.5) * 0.02;
      const jitterLon = lon + (Math.random() - 0.5) * 0.02;
      gen.push({
        id: crypto.randomUUID(),
        latitude: jitterLat,
        longitude: jitterLon,
        depth: Math.round(0.5 + Math.random() * 2 * 10) / 10,
        soilType: ["Argiloso", "Arenoso", "Siltoso"][Math.floor(Math.random() * 3)],
        cohesion: Math.round((0.2 + Math.random() * 0.8) * 100) / 100,
        permeability: Math.round((0.1 + Math.random() * 1.3) * 100) / 100,
        moisture: Math.round((5 + Math.random() * 35) * 10) / 10,
        notes: "amostra simulada",
      });
    }
    setSoilSamples((prev) => [...prev, ...gen]);
    toast.success(`${gen.length} amostras simuladas geradas`);
  };
  
  const filteredData = useMemo(() => {
    let data = erosoesDataset;
    
    if (filters.regiao) data = data.filter(e => e.regiao === filters.regiao);
    if (filters.linha) data = data.filter(e => e.linha === filters.linha);
    if (filters.ramal) data = data.filter(e => e.ramal === filters.ramal);
    if (filters.search) data = data.filter(e => e.nome.toLowerCase().includes(filters.search!.toLowerCase()));
    
    if (tipoFilter) data = data.filter(e => e.tipoErosao === tipoFilter);
    if (gravidadeFilter) data = data.filter(e => e.gravidadeErosao === gravidadeFilter);
    if (statusFilter) data = data.filter(e => e.status === statusFilter);
    
    return data;
  }, [erosoesDataset, filters, tipoFilter, gravidadeFilter, statusFilter]);
  
  const kpis = useMemo(() => ({
    total: filteredData.length,
    criticas: filteredData.filter(e => e.gravidadeErosao === 'Crítica' || e.gravidadeErosao === 'Alta').length,
    areaTotal: filteredData.reduce((acc, e) => acc + e.areaAfetada, 0).toFixed(0),
    torresRisco: new Set(filteredData.flatMap(e => e.torres_proximas)).size,
    emIntervencao: filteredData.filter(e => e.status === 'Em Intervenção').length,
  }), [filteredData]);

  const applyFocus = (id: string, label: string, predicate: FocusFilter["predicate"]) => {
    setFocusFilter({ id, label, predicate });
    setActiveTab("mapa");
  };

  const clearFocus = () => setFocusFilter(null);

  const focusedData = useMemo(() => {
    if (!focusFilter) return filteredData;
    return filteredData.filter(focusFilter.predicate);
  }, [filteredData, focusFilter]);

  const RS_BOUNDS: [[number, number], [number, number]] = [[-57.65, -33.75], [-49.5, -27.0]];

  const points: FeatureCollection = useMemo(
    () => ({
      type: "FeatureCollection",
      features: filteredData
        .filter((item) => {
          const [lat, lon] = item.coords;
          return lon >= RS_BOUNDS[0][0] && lon <= RS_BOUNDS[1][0] && lat >= RS_BOUNDS[0][1] && lat <= RS_BOUNDS[1][1];
        })
        .map((item) => {
          const [lat, lon] = item.coords;
          return {
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [lon, lat] },
            properties: {
              id: item.id,
              status: item.status,
              criticidade: item.gravidadeErosao,
              color:
                item.gravidadeErosao === "Crítica" || item.gravidadeErosao === "Alta"
                  ? "#ef4444"
                  : item.gravidadeErosao === "Média"
                    ? "#facc15"
                    : "#22c55e",
              isFocus: focusFilter ? focusFilter.predicate(item) : false,
            },
          };
        }),
    }),
    [filteredData, focusFilter],
  );

  const bounds = useMemo(() => {
    const src = focusFilter ? focusedData : filteredData;
    if (src.length === 0) return null;
    const lngs = src.map((item) => item.coords[1]);
    const lats = src.map((item) => item.coords[0]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    if (!Number.isFinite(minLng) || !Number.isFinite(maxLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
      return null;
    }
    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ] as [[number, number], [number, number]];
  }, [filteredData, focusedData, focusFilter]);

  const erosionGeoJson = useMemo(() => ({
    type: "FeatureCollection",
    features: filteredData
      // Filtro defensivo: mantém apenas pontos dentro do RS
      .filter((e) => {
        const [lat, lon] = e.coords;
        return lon >= RS_BOUNDS[0][0] && lon <= RS_BOUNDS[1][0] && lat >= RS_BOUNDS[0][1] && lat <= RS_BOUNDS[1][1];
      })
      .map((e) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [e.coords[1], e.coords[0]],
      },
      properties: {
        id: e.id,
        name: e.nome,
        severity: e.gravidadeErosao,
        status: e.status,
        area: e.areaAfetada,
        proximity: e.proximidadeEstrutura,
      },
    })),
  }), [filteredData]);

  const soilGeoJson = useMemo(() => ({
    type: "FeatureCollection",
    features: soilSamples.map((sample) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [sample.longitude, sample.latitude],
      },
      properties: {
        soilType: sample.soilType,
        depth: sample.depth,
        cohesion: sample.cohesion,
        permeability: sample.permeability,
        moisture: sample.moisture,
        notes: sample.notes,
      },
    })),
  }), [soilSamples]);

  const layerOrder = useMemo(() => {
    const base = erosionLayerTop
      ? ["infrastructure-layer", "erosao-points"]
      : ["erosao-points", "infrastructure-layer"];

    if (!showSoilLayer || soilSamples.length === 0) {
      return base;
    }

    if (soilLayerPosition === "bottom") {
      return ["soil-samples", ...base];
    }

    if (soilLayerPosition === "middle") {
      const [first, second] = base;
      if (!second) {
        return [...base, "soil-samples"];
      }
      return [first, "soil-samples", second];
    }

    return [...base, "soil-samples"];
  }, [erosionLayerTop, showSoilLayer, soilLayerPosition, soilSamples]);

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

  const columns = [
    { key: 'nome', label: 'Nome' },
    { 
      key: 'tipoErosao', 
      label: 'Tipo',
      render: (value: string) => (
        <Badge variant="outline">{value}</Badge>
      )
    },
    { 
      key: 'gravidadeErosao', 
      label: 'Gravidade',
      render: (value: string) => <StatusBadge level={value as any} />
    },
    { 
      key: 'areaAfetada', 
      label: 'Área Afetada (m²)',
      render: (value: number) => value.toLocaleString('pt-BR')
    },
    { 
      key: 'proximidadeEstrutura', 
      label: 'Proximidade (m)',
      render: (value: number) => `${value}m`
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (value: string) => (
        <Badge variant={
          value === 'Crítico' ? 'destructive' : 
          value === 'Em Intervenção' ? 'secondary' : 
          'outline'
        }>
          {value}
        </Badge>
      )
    },
    { 
      key: 'ultimaInspecao', 
      label: 'Última Inspeção',
      render: (value: string) => new Date(value).toLocaleDateString('pt-BR')
    },
  ];
  
  return (
    <ModuleLayout title="Erosão" icon={Mountain}>
      <div className="p-6 space-y-6">
        <ModuleDemoBanner />
        
        <FiltersBar>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Erosão</label>
              <select 
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="Superficial">Superficial</option>
                <option value="Laminar">Laminar</option>
                <option value="Voçoroca">Voçoroca</option>
                <option value="Ravina">Ravina</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Gravidade</label>
              <select 
                value={gravidadeFilter}
                onChange={(e) => setGravidadeFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
                <option value="Crítica">Crítica</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="Monitorado">Monitorado</option>
                <option value="Em Intervenção">Em Intervenção</option>
                <option value="Estabilizado">Estabilizado</option>
                <option value="Crítico">Crítico</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => setSoilDialogOpen(true)}>Amostras de Solo</Button>
            <Button size="sm" variant="outline" onClick={handleGenerateDemoSoil}>Gerar amostras demo</Button>
            <div className="text-xs text-muted-foreground ml-2">
              <label className="inline-flex items-center gap-2">
                <Switch checked={showSoilLayer} onCheckedChange={setShowSoilLayer} />
                Exibir amostras no mapa ({soilSamples.length})
              </label>
            </div>
          </div>
        </FiltersBar>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4 border border-border rounded-lg bg-card/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Erosões e Amostras</h3>
                <p className="text-xs text-muted-foreground mt-1">Acesse o cadastro de amostras de solo pelo botão acima. Os pontos cadastrados aparecerão no mapa.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setSoilDialogOpen(true)}>Amostras de Solo</Button>
                <Button size="sm" variant="outline" onClick={handleGenerateDemoSoil}>Gerar amostras demo</Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 border border-border rounded-lg bg-card/60 p-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Camadas do mapa</h3>
              <p className="text-xs text-muted-foreground mt-1">Controle a sobreposição entre infraestrutura, pontos de erosão e dados de solo.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={erosionLayerTop ? "default" : "outline"}
                size="sm"
                onClick={() => setErosionLayerTop(true)}
              >
                Erosão sobre Infraestrutura
              </Button>
              <Button
                variant={!erosionLayerTop ? "default" : "outline"}
                size="sm"
                onClick={() => setErosionLayerTop(false)}
              >
                Infraestrutura sobre Erosão
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="soil-layer-toggle" checked={showSoilLayer} onCheckedChange={setShowSoilLayer} />
              <Label htmlFor="soil-layer-toggle" className="text-sm">Exibir camada de amostras de solo</Label>
            </div>
            {showSoilLayer && soilSamples.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Ordem da camada de solo
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={soilLayerPosition === "top" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSoilLayerPosition("top")}
                  >
                    Sobre todas
                  </Button>
                  <Button
                    variant={soilLayerPosition === "middle" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSoilLayerPosition("middle")}
                  >
                    Entre camadas
                  </Button>
                  <Button
                    variant={soilLayerPosition === "bottom" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSoilLayerPosition("bottom")}
                  >
                    Abaixo de todas
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[{
            id: "total",
            title: "Total de Erosões",
            value: kpis.total,
            color: "text-primary",
            predicate: () => true,
          }, {
            id: "criticas",
            title: "Críticas / Altas",
            value: kpis.criticas,
            color: "text-destructive",
            predicate: (item: ErosaoItem) => item.gravidadeErosao === "Crítica" || item.gravidadeErosao === "Alta",
          }, {
            id: "area",
            title: "Área Total (m²)",
            value: Number(kpis.areaTotal).toLocaleString("pt-BR"),
            color: "text-emerald-400",
            predicate: () => true,
          }, {
            id: "torres",
            title: "Torres em Risco",
            value: kpis.torresRisco,
            color: "text-amber-500",
            predicate: (item: ErosaoItem) => item.torres_proximas.length > 0,
          }, {
            id: "intervencao",
            title: "Em Intervenção",
            value: kpis.emIntervencao,
            color: "text-sky-500",
            predicate: (item: ErosaoItem) => item.status === "Em Intervenção",
          }].map((card) => (
            <button
              key={card.id}
              className={`tech-card p-6 text-left transition ${focusFilter?.id === card.id ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/40"}`}
              onClick={() => applyFocus(card.id, card.title, card.predicate)}
            >
              <div className="text-sm text-muted-foreground mb-1">{card.title}</div>
              <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
            </button>
          ))}
        </div>

        {focusFilter && (
          <div className="flex items-center justify-between px-4 py-2 border border-primary/20 bg-primary/5 rounded-lg text-xs">
            <span className="text-primary font-semibold">Exibindo apenas: {focusFilter.label}</span>
            <button className="underline-offset-2 hover:underline" onClick={clearFocus}>Limpar seleção</button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="lista">Lista</TabsTrigger>
            <TabsTrigger value="mapa">Mapa</TabsTrigger>
          </TabsList>
          
          <TabsContent value="lista" className="mt-4">
            <DataTableAdvanced
              data={focusedData}
              columns={columns}
              onRowClick={(erosao) => setSelectedErosao(erosao)}
              exportable
            />
          </TabsContent>
          
          <TabsContent value="mapa" className="mt-4">
            <div className="relative rounded-lg overflow-hidden border border-border bg-card/30 p-0 map-smooth">
              {/* @ts-expect-error MapLibreUnified possui tipagem restrita para dados customizados */}
              <MapLibreUnified
                filterRegiao={filters.regiao}
                filterEmpresa={filters.empresa}
                filterLinha={filters.linha}
                showErosao={true}
                showInfrastructure={true}
                initialCenter={[-53.0, -30.0]}
                initialZoom={filters.linha ? 12 : 6}
                erosionData={erosionGeoJson}
                soilData={showSoilLayer ? soilGeoJson : null}
                layerOrder={layerOrder}
                customPoints={points}
                customLines={rsDemoLine as any}
                fitBounds={bounds || RS_BOUNDS}
                height="600px"
                initialBasemapId="imagery"
                fallbackBasemapId="imagery"
              />
            </div>
          </TabsContent>
        </Tabs>
        
        <DetailDrawer
          isOpen={!!selectedErosao}
          onClose={() => setSelectedErosao(null)}
          title={selectedErosao?.nome || ''}
        >
          {selectedErosao && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Tipo de Erosão</span>
                  <p className="font-medium mt-1">{selectedErosao.tipoErosao}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Gravidade</span>
                  <div className="mt-1">
                    <StatusBadge level={selectedErosao.gravidadeErosao} />
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Área Afetada</span>
                  <p className="font-bold text-lg">{selectedErosao.areaAfetada.toLocaleString('pt-BR')} m²</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Proximidade Estrutura</span>
                  <p className="font-bold text-lg">{selectedErosao.proximidadeEstrutura}m</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Status</span>
                  <p className="font-medium">{selectedErosao.status}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Última Inspeção</span>
                  <p className="font-medium">{new Date(selectedErosao.ultimaInspecao).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-sm text-muted-foreground">Risco de Desmoronamento</span>
                  <p className="font-medium mt-1">
                    {selectedErosao.riscoDesmoronamento ? (
                      <Badge variant="destructive">Sim - Requer Atenção</Badge>
                    ) : (
                      <Badge variant="outline">Não</Badge>
                    )}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Torres Próximas ({selectedErosao.torres_proximas.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedErosao.torres_proximas.map((torreId: string) => (
                    <div key={torreId} className="p-3 bg-muted/20 rounded-lg">
                      <span className="font-medium">{torreId}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {selectedErosao.acoesPreventivasRealizadas && selectedErosao.acoesPreventivasRealizadas.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Ações Preventivas Realizadas</h4>
                  <ul className="space-y-2">
                    {selectedErosao.acoesPreventivasRealizadas.map((acao: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-1">✓</span>
                        <span className="text-sm">{acao}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DetailDrawer>
        
      </div>

      {/* Dialog de Amostras de Solo */}
      <Dialog open={soilDialogOpen} onOpenChange={setSoilDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Amostras de Solo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="soil-lat2">Latitude *</Label>
                <Input id="soil-lat2" type="number" step="0.0001" value={soilForm.latitude} onChange={(e) => handleSoilInputChange('latitude', e.target.value)} placeholder="-23.5500" />
              </div>
              <div>
                <Label htmlFor="soil-lon2">Longitude *</Label>
                <Input id="soil-lon2" type="number" step="0.0001" value={soilForm.longitude} onChange={(e) => handleSoilInputChange('longitude', e.target.value)} placeholder="-46.6300" />
              </div>
              <div>
                <Label htmlFor="soil-type2">Tipo de Solo *</Label>
                <Input id="soil-type2" value={soilForm.soilType} onChange={(e) => handleSoilInputChange('soilType', e.target.value)} placeholder="Argiloso, arenoso, etc." />
              </div>
              <div>
                <Label htmlFor="soil-depth2">Profundidade (m)</Label>
                <Input id="soil-depth2" type="number" step="0.1" value={soilForm.depth} onChange={(e) => handleSoilInputChange('depth', e.target.value)} placeholder="2.5" />
              </div>
              <div>
                <Label htmlFor="soil-cohesion2">Coesão (kPa)</Label>
                <Input id="soil-cohesion2" type="number" step="0.1" value={soilForm.cohesion} onChange={(e) => handleSoilInputChange('cohesion', e.target.value)} placeholder="45" />
              </div>
              <div>
                <Label htmlFor="soil-permeability2">Permeabilidade (cm/s)</Label>
                <Input id="soil-permeability2" type="number" step="0.0001" value={soilForm.permeability} onChange={(e) => handleSoilInputChange('permeability', e.target.value)} placeholder="0.001" />
              </div>
              <div>
                <Label htmlFor="soil-moisture2">Umidade (%)</Label>
                <Input id="soil-moisture2" type="number" step="0.1" value={soilForm.moisture} onChange={(e) => handleSoilInputChange('moisture', e.target.value)} placeholder="18" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="soil-notes2">Observações</Label>
                <Textarea id="soil-notes2" value={soilForm.notes} onChange={(e) => handleSoilInputChange('notes', e.target.value)} placeholder="Condições adicionais do ponto, presença de lençol freático, etc." rows={3} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleAddSoilSample}>Adicionar amostra</Button>
              <Button variant="outline" onClick={handleGenerateDemoSoil}>Gerar amostras demo</Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-auto border border-dashed border-border rounded-md p-3 bg-background/80">
              {soilSamples.length > 0 ? (
                soilSamples.map((sample) => (
                  <div key={sample.id} className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="font-semibold text-foreground">{sample.soilType}</div>
                      <div>Lat/Lon: {sample.latitude.toFixed(4)}, {sample.longitude.toFixed(4)}</div>
                      <div>Profundidade: {sample.depth} m • Coesão: {sample.cohesion} kPa • Umidade: {sample.moisture}%</div>
                      <div>Permeabilidade: {sample.permeability} cm/s</div>
                      {sample.notes && <div className="italic">{sample.notes}</div>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveSoilSample(sample.id)}>Remover</Button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Nenhuma amostra cadastrada até o momento.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSoilDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
};

export default Erosao;
