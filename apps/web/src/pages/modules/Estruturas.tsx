import { useFilters } from "@/context/FiltersContext";
import { eventos } from "@/lib/mockData";
import { Building2 } from "lucide-react";
import FloatingFiltersBar from "@/components/FloatingFiltersBar";
import ModuleLayout from "@/components/ModuleLayout";
import ModuleDemoBanner from "@/components/ModuleDemoBanner";
import { useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapLibreUnified } from "@/components/MapLibreUnified";

const Estruturas = () => {
  const { filters } = useFilters();
  const [activeTab, setActiveTab] = useState("corrosao");
  const [focusFilter, setFocusFilter] = useState<{
    id: string;
    label: string;
    predicate: (item: (typeof eventos)[number]) => boolean;
  } | null>(null);

  const filteredData = useMemo(() => {
    let data = eventos.filter(e => e.tipo === 'Estruturas');

    if (filters.regiao) data = data.filter(e => e.regiao === filters.regiao);
    if (filters.linha) data = data.filter(e => e.linha === filters.linha);
    if (filters.ramal) data = data.filter(e => e.ramal === filters.ramal);
    if (filters.search) data = data.filter(e => e.nome.toLowerCase().includes(filters.search!.toLowerCase()));

    return data;
  }, [filters]);

  const now = Date.now();
  const prazoDias = 14;
  const emAtraso = filteredData.filter(e => {
    const ts = new Date(e.data).getTime();
    const deltaDias = (now - ts) / (1000 * 60 * 60 * 24);
    return e.status !== 'OK' && deltaDias > prazoDias;
  }).length;

  const kpis = {
    total: filteredData.length,
    concluidos: filteredData.filter(e => e.status === 'OK').length,
    emAndamento: filteredData.filter(e => e.status === 'Alerta' || e.status === 'Crítico').length,
    pendentes: filteredData.filter(e => e.status === 'Pendente').length,
    atrasados: emAtraso,
    critAlta: filteredData.filter(e => e.criticidade === 'Alta').length,
    critMedia: filteredData.filter(e => e.criticidade === 'Média').length,
    critBaixa: filteredData.filter(e => e.criticidade === 'Baixa').length,
  };

  const applyFocus = (id: string, label: string, predicate: (item: (typeof eventos)[number]) => boolean) => {
    setFocusFilter({ id, label, predicate });
    setActiveTab('mapa');
  };

  const clearFocus = () => setFocusFilter(null);

  const focusedData = useMemo(() => {
    if (!focusFilter) return filteredData;
    return filteredData.filter(focusFilter.predicate);
  }, [filteredData, focusFilter]);

  const points: FeatureCollection = useMemo(
    () => ({
      type: "FeatureCollection",
      features: filteredData.map(item => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: item.coords ?? [-46.633, -23.55] },
        properties: {
          id: item.id,
          status: item.status,
          criticidade: item.criticidade,
          color: item.status === 'OK' ? '#22c55e' : item.status === 'Crítico' ? '#ef4444' : item.status === 'Alerta' ? '#f97316' : '#38bdf8',
          isFocus: focusFilter ? focusFilter.predicate(item) : false,
        }
      }))
    }),
    [filteredData, focusFilter]
  );

  const bounds = useMemo(() => {
    const src = focusFilter ? focusedData : filteredData;
    if (src.length === 0) return null;
    const lngs = src.map(item => (item.coords ? item.coords[0] : -46.63));
    const lats = src.map(item => (item.coords ? item.coords[1] : -23.55));
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

  return (
    <ModuleLayout title="Gestão de Estruturas" icon={Building2}>
      <div className="p-6 space-y-6">
      <ModuleDemoBanner />

      <FloatingFiltersBar />

      {/* KPIs - Status e Criticidade */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <button className={`tech-card p-6 text-left transition ${focusFilter?.id === 'total' ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/40'}`} onClick={() => applyFocus('total', 'Total', () => true)}>
          <div className="text-sm text-muted-foreground mb-1">Total</div>
          <div className="text-3xl font-bold text-primary">{kpis.total}</div>
        </button>
        <button className={`tech-card p-6 text-left transition ${focusFilter?.id === 'concluidos' ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/40'}`} onClick={() => applyFocus('concluidos', 'Concluídos', (item) => item.status === 'OK')}>
          <div className="text-sm text-muted-foreground mb-1">Concluídos</div>
          <div className="text-3xl font-bold text-green-500">{kpis.concluidos}</div>
        </button>
        <button className={`tech-card p-6 text-left transition ${focusFilter?.id === 'andamento' ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/40'}`} onClick={() => applyFocus('andamento', 'Em andamento', (item) => item.status === 'Alerta' || item.status === 'Crítico')}>
          <div className="text-sm text-muted-foreground mb-1">Em andamento</div>
          <div className="text-3xl font-bold text-amber-500">{kpis.emAndamento}</div>
        </button>
        <button className={`tech-card p-6 text-left transition ${focusFilter?.id === 'pendentes' ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/40'}`} onClick={() => applyFocus('pendentes', 'Pendentes', (item) => item.status === 'Pendente')}>
          <div className="text-sm text-muted-foreground mb-1">Pendentes</div>
          <div className="text-3xl font-bold text-blue-500">{kpis.pendentes}</div>
        </button>
        <button className={`tech-card p-6 text-left transition ${focusFilter?.id === 'atrasados' ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/40'}`} onClick={() => applyFocus('atrasados', `Em atraso (> ${prazoDias}d)`, (item) => {
          const ts = new Date(item.data).getTime();
          const deltaDias = (now - ts) / (1000 * 60 * 60 * 24);
          return item.status !== 'OK' && deltaDias > prazoDias;
        })}>
          <div className="text-sm text-muted-foreground mb-1">Em atraso (&gt; {prazoDias}d)</div>
          <div className="text-3xl font-bold text-destructive">{kpis.atrasados}</div>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className={`tech-card p-6 text-left transition ${focusFilter?.id === 'crit-alta' ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/40'}`} onClick={() => applyFocus('crit-alta', 'Críticos (Alta)', (item) => item.criticidade === 'Alta')}>
          <div className="text-sm text-muted-foreground mb-1">Críticos (Alta)</div>
          <div className="text-3xl font-bold text-destructive">{kpis.critAlta}</div>
        </button>
        <button className={`tech-card p-6 text-left transition ${focusFilter?.id === 'crit-media' ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/40'}`} onClick={() => applyFocus('crit-media', 'Média criticidade', (item) => item.criticidade === 'Média')}>
          <div className="text-sm text-muted-foreground mb-1">Média criticidade</div>
          <div className="text-3xl font-bold text-amber-500">{kpis.critMedia}</div>
        </button>
        <button className={`tech-card p-6 text-left transition ${focusFilter?.id === 'crit-baixa' ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/40'}`} onClick={() => applyFocus('crit-baixa', 'Baixa criticidade', (item) => item.criticidade === 'Baixa')}>
          <div className="text-sm text-muted-foreground mb-1">Baixa criticidade</div>
          <div className="text-3xl font-bold text-green-500">{kpis.critBaixa}</div>
        </button>
      </div>

      {focusFilter && (
        <div className="flex items-center justify-between px-4 py-2 border border-primary/20 bg-primary/5 rounded-lg">
          <span className="text-xs text-primary font-medium">Exibindo apenas: {focusFilter.label}</span>
          <button className="text-xs underline-offset-2 hover:underline" onClick={clearFocus}>Limpar seleção</button>
        </div>
      )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="tech-card p-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="corrosao">Corrosão</TabsTrigger>
            <TabsTrigger value="furto">Furto</TabsTrigger>
            <TabsTrigger value="integridade">Integridade</TabsTrigger>
            <TabsTrigger value="mapa">🗺️ Mapa</TabsTrigger>
          </TabsList>

          <TabsContent value="corrosao" className="mt-4">
            <div className="space-y-3">
              {focusedData.slice(0, 10).map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                  <div>
                    <div className="font-medium">{item.nome}</div>
                    <div className="text-sm text-muted-foreground">Nível de corrosão detectado</div>
                  </div>
                  <Badge variant={item.criticidade === 'Alta' ? 'destructive' : 'default'}>
                    {item.criticidade}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="furto" className="mt-4">
            <div className="space-y-3">
              {focusedData.slice(0, 8).map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                  <div>
                    <div className="font-medium">{item.nome}</div>
                    <div className="text-sm text-muted-foreground">Furto de componentes</div>
                  </div>
                  <Badge variant="destructive">{item.status}</Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="integridade" className="mt-4">
            <div className="space-y-3">
              {focusedData.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                  <div>
                    <div className="font-medium">{item.nome}</div>
                    <div className="text-sm text-muted-foreground">Avaliação estrutural</div>
                  </div>
                  <Badge variant={item.status === 'OK' ? 'default' : 'outline'}>{item.status}</Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="mapa" className="mt-4">
            <div className="h-[600px]">
              <MapLibreUnified
                filterRegiao={filters.regiao}
                filterEmpresa={filters.empresa}
                filterLinha={filters.linha}
                showEstruturas={true}
                initialZoom={filters.linha ? 12 : 7}
                customPoints={points}
                customLines={rsDemoLine as any}
                fitBounds={bounds}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ModuleLayout>
  );
};

export default Estruturas;
