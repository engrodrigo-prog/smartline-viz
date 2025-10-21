import { useState, useMemo } from "react";
import { useFilters } from "@/context/FiltersContext";
import { erosoes } from "@/lib/mockData";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { FeatureCollection } from "geojson";

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
  predicate: (item: (typeof erosoes)[number]) => boolean;
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
  
  const filteredData = useMemo(() => {
    let data = erosoes;
    
    if (filters.regiao) data = data.filter(e => e.regiao === filters.regiao);
    if (filters.linha) data = data.filter(e => e.linha === filters.linha);
    if (filters.ramal) data = data.filter(e => e.ramal === filters.ramal);
    if (filters.search) data = data.filter(e => e.nome.toLowerCase().includes(filters.search!.toLowerCase()));
    
    if (tipoFilter) data = data.filter(e => e.tipoErosao === tipoFilter);
    if (gravidadeFilter) data = data.filter(e => e.gravidadeErosao === gravidadeFilter);
    if (statusFilter) data = data.filter(e => e.status === statusFilter);
    
    return data;
  }, [filters, tipoFilter, gravidadeFilter, statusFilter]);
  
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

  const points: FeatureCollection = useMemo(
    () => ({
      type: "FeatureCollection",
      features: filteredData.map((item) => {
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
    features: filteredData.map((e) => ({
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
        </FiltersBar>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4 border border-border rounded-lg bg-card/60 p-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Dados detalhados de solo</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Registre amostras de solo para complementar o diagnóstico das erosões e gerar camadas específicas no mapa.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="soil-lat">Latitude *</Label>
                <Input
                  id="soil-lat"
                  type="number"
                  step="0.0001"
                  value={soilForm.latitude}
                  onChange={(e) => handleSoilInputChange('latitude', e.target.value)}
                  placeholder="-23.5500"
                />
              </div>
              <div>
                <Label htmlFor="soil-lon">Longitude *</Label>
                <Input
                  id="soil-lon"
                  type="number"
                  step="0.0001"
                  value={soilForm.longitude}
                  onChange={(e) => handleSoilInputChange('longitude', e.target.value)}
                  placeholder="-46.6300"
                />
              </div>
              <div>
                <Label htmlFor="soil-type">Tipo de Solo *</Label>
                <Input
                  id="soil-type"
                  value={soilForm.soilType}
                  onChange={(e) => handleSoilInputChange('soilType', e.target.value)}
                  placeholder="Argiloso, arenoso, etc."
                />
              </div>
              <div>
                <Label htmlFor="soil-depth">Profundidade (m)</Label>
                <Input
                  id="soil-depth"
                  type="number"
                  step="0.1"
                  value={soilForm.depth}
                  onChange={(e) => handleSoilInputChange('depth', e.target.value)}
                  placeholder="2.5"
                />
              </div>
              <div>
                <Label htmlFor="soil-cohesion">Coesão (kPa)</Label>
                <Input
                  id="soil-cohesion"
                  type="number"
                  step="0.1"
                  value={soilForm.cohesion}
                  onChange={(e) => handleSoilInputChange('cohesion', e.target.value)}
                  placeholder="45"
                />
              </div>
              <div>
                <Label htmlFor="soil-permeability">Permeabilidade (cm/s)</Label>
                <Input
                  id="soil-permeability"
                  type="number"
                  step="0.0001"
                  value={soilForm.permeability}
                  onChange={(e) => handleSoilInputChange('permeability', e.target.value)}
                  placeholder="0.001"
                />
              </div>
              <div>
                <Label htmlFor="soil-moisture">Umidade (%)</Label>
                <Input
                  id="soil-moisture"
                  type="number"
                  step="0.1"
                  value={soilForm.moisture}
                  onChange={(e) => handleSoilInputChange('moisture', e.target.value)}
                  placeholder="18"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="soil-notes">Observações</Label>
                <Textarea
                  id="soil-notes"
                  value={soilForm.notes}
                  onChange={(e) => handleSoilInputChange('notes', e.target.value)}
                  placeholder="Condições adicionais do ponto, presença de lençol freático, etc."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleAddSoilSample}>Adicionar amostra</Button>
            </div>
            {soilSamples.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-auto border border-dashed border-border rounded-md p-3 bg-background/80">
                {soilSamples.map((sample) => (
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
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma amostra cadastrada até o momento.</p>
            )}
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
            predicate: (item: (typeof erosoes)[number]) => item.gravidadeErosao === "Crítica" || item.gravidadeErosao === "Alta",
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
            predicate: (item: (typeof erosoes)[number]) => item.torres_proximas.length > 0,
          }, {
            id: "intervencao",
            title: "Em Intervenção",
            value: kpis.emIntervencao,
            color: "text-sky-500",
            predicate: (item: (typeof erosoes)[number]) => item.status === "Em Intervenção",
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
            <div className="tech-card p-0 overflow-hidden">
              {/* @ts-ignore */}
              <MapLibreUnified
                filterRegiao={filters.regiao}
                filterEmpresa={filters.empresa}
                filterLinha={filters.linha}
                showErosao={true}
                showInfrastructure={true}
                initialCenter={[-46.63, -23.55]}
                initialZoom={filters.linha ? 12 : 7}
                erosionData={erosionGeoJson}
                soilData={showSoilLayer ? soilGeoJson : null}
                layerOrder={layerOrder}
                customPoints={points}
                fitBounds={bounds}
                height="600px"
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
    </ModuleLayout>
  );
};

export default Erosao;
