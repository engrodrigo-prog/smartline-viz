import { useFilters } from "@/context/FiltersContext";
import { eventos, ndviJundiai } from "@/lib/mockData";
import { TreePine, MapPin } from "lucide-react";
import FloatingFiltersBar from "@/components/FloatingFiltersBar";
import ModuleLayout from "@/components/ModuleLayout";
import { useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapLibreUnified } from "@/components/MapLibreUnified";

type FocusFilter = {
  id: string;
  label: string;
  predicate: (item: (typeof eventos)[number]) => boolean;
};

const NDVI_LEGEND = [
  { label: "Vegetação densa (NDVI ≥ 0.6)", color: "#15803d" },
  { label: "Vegetação moderada (0.3 – 0.6)", color: "#22c55e" },
  { label: "Solo exposto / urbano (0 – 0.3)", color: "#f97316" },
  { label: "Baixa vegetação (NDVI < 0)", color: "#6366f1" },
];

const Vegetacao = () => {
  const { filters } = useFilters();
  const [activeTab, setActiveTab] = useState("lista");
  const [focusFilter, setFocusFilter] = useState<FocusFilter | null>(null);

  const filteredData = useMemo(() => {
    let data = eventos.filter(e => e.tipo === 'Vegetação');

    if (filters.regiao) data = data.filter(e => e.regiao === filters.regiao);
    if (filters.linha) data = data.filter(e => e.linha === filters.linha);
    if (filters.ramal) data = data.filter(e => e.ramal === filters.ramal);
    if (filters.search) data = data.filter(e => e.nome.toLowerCase().includes(filters.search!.toLowerCase()));

    // Garantir que todos os itens tenham coords no formato correto
    return data.map(item => {
      let coords: [number, number];
      if (item.coords) {
        if (Array.isArray(item.coords)) {
          coords = item.coords as [number, number];
        } else {
          const c = item.coords as any;
          coords = [c.lon, c.lat];
        }
      } else {
        coords = [-47.0, -15.8];
      }
      return { ...item, coords };
    });
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

  const applyFocus = (id: string, label: string, predicate: FocusFilter["predicate"]) => {
    setFocusFilter({ id, label, predicate });
    setActiveTab("mapa");
  };

  const clearFocus = () => setFocusFilter(null);

  const focusedData = useMemo(() => {
    if (!focusFilter) return filteredData;
    return filteredData.filter(focusFilter.predicate);
  }, [filteredData, focusFilter]);

  const points: FeatureCollection = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: filteredData.map((item) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: item.coords },
        properties: {
          id: item.id,
          status: item.status,
          criticidade: item.criticidade,
          color:
            item.status === "OK"
              ? "#22c55e"
              : item.status === "Crítico"
                ? "#ef4444"
                : item.status === "Alerta"
                  ? "#f97316"
                  : "#38bdf8",
          isFocus: focusFilter ? focusFilter.predicate(item) : false,
        },
      })),
    };
  }, [filteredData, focusFilter]);

  const bounds = useMemo(() => {
    const source = focusFilter ? focusedData : filteredData;
    const lngs: number[] = [];
    const lats: number[] = [];

    source.forEach((item) => {
      lngs.push(item.coords[0]);
      lats.push(item.coords[1]);
    });

    ndviJundiai.features.forEach((feature) => {
      if (feature.geometry?.type === "Polygon") {
        feature.geometry.coordinates[0]?.forEach(([lon, lat]) => {
          lngs.push(lon);
          lats.push(lat);
        });
      }
    });

    if (!lngs.length || !lats.length) return null;

    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    if (!Number.isFinite(minLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLng) || !Number.isFinite(maxLat)) {
      return null;
    }
    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ] as [[number, number], [number, number]];
  }, [filteredData, focusedData, focusFilter]);

  return (
    <ModuleLayout title="Gestão de Vegetação" icon={TreePine}>
      <div className="p-6 space-y-6">

        <FloatingFiltersBar />

        {/* KPIs - Status e Criticidade */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <button
            className={`tech-card p-6 text-left transition ${focusFilter?.id === "total" ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/40"}`}
            onClick={() => applyFocus("total", "Todos", () => true)}
          >
            <div className="text-sm text-muted-foreground mb-1">Total</div>
            <div className="text-3xl font-bold text-primary">{kpis.total}</div>
          </button>
          <button
            className={`tech-card p-6 text-left transition ${focusFilter?.id === "concluidos" ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/40"}`}
            onClick={() => applyFocus("concluidos", "Concluídos", (item) => item.status === "OK")}
          >
            <div className="text-sm text-muted-foreground mb-1">Concluídos</div>
            <div className="text-3xl font-bold text-green-500">{kpis.concluidos}</div>
          </button>
          <button
            className={`tech-card p-6 text-left transition ${focusFilter?.id === "andamento" ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/40"}`}
            onClick={() => applyFocus("andamento", "Em andamento", (item) => item.status === "Alerta" || item.status === "Crítico")}
          >
            <div className="text-sm text-muted-foreground mb-1">Em andamento</div>
            <div className="text-3xl font-bold text-amber-500">{kpis.emAndamento}</div>
          </button>
          <button
            className={`tech-card p-6 text-left transition ${focusFilter?.id === "pendentes" ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/40"}`}
            onClick={() => applyFocus("pendentes", "Pendentes", (item) => item.status === "Pendente")}
          >
            <div className="text-sm text-muted-foreground mb-1">Pendentes</div>
            <div className="text-3xl font-bold text-blue-500">{kpis.pendentes}</div>
          </button>
          <button
            className={`tech-card p-6 text-left transition ${focusFilter?.id === "atrasados" ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/40"}`}
            onClick={() => applyFocus("atrasados", "Em atraso", (item) => {
              const ts = new Date(item.data).getTime();
              const deltaDias = (now - ts) / (1000 * 60 * 60 * 24);
              return item.status !== "OK" && deltaDias > prazoDias;
            })}
          >
            <div className="text-sm text-muted-foreground mb-1">Em atraso (&gt; {prazoDias}d)</div>
            <div className="text-3xl font-bold text-destructive">{kpis.atrasados}</div>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            className={`tech-card p-6 text-left transition ${focusFilter?.id === "crit-alta" ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/40"}`}
            onClick={() => applyFocus("crit-alta", "Críticos (Alta)", (item) => item.criticidade === "Alta")}
          >
            <div className="text-sm text-muted-foreground mb-1">Críticos (Alta)</div>
            <div className="text-3xl font-bold text-destructive">{kpis.critAlta}</div>
          </button>
          <button
            className={`tech-card p-6 text-left transition ${focusFilter?.id === "crit-media" ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/40"}`}
            onClick={() => applyFocus("crit-media", "Média criticidade", (item) => item.criticidade === "Média")}
          >
            <div className="text-sm text-muted-foreground mb-1">Média criticidade</div>
            <div className="text-3xl font-bold text-amber-500">{kpis.critMedia}</div>
          </button>
          <button
            className={`tech-card p-6 text-left transition ${focusFilter?.id === "crit-baixa" ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/40"}`}
            onClick={() => applyFocus("crit-baixa", "Baixa criticidade", (item) => item.criticidade === "Baixa")}
          >
            <div className="text-sm text-muted-foreground mb-1">Baixa criticidade</div>
            <div className="text-3xl font-bold text-green-500">{kpis.critBaixa}</div>
          </button>
        </div>

        {focusFilter && (
          <div className="flex items-center justify-between px-4 py-2 border border-primary/20 bg-primary/5 rounded-lg">
            <span className="text-xs text-primary font-medium">Exibindo apenas: {focusFilter.label}</span>
            <button className="text-xs underline-offset-2 hover:underline" onClick={clearFocus}>
              Limpar seleção
            </button>
          </div>
        )}

        {/* Lista */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="lista">Lista</TabsTrigger>
            <TabsTrigger value="mapa">Mapa</TabsTrigger>
          </TabsList>
          
          <TabsContent value="lista" className="mt-4">
            <div className="tech-card p-6">
              <h2 className="text-xl font-semibold mb-4">Interferências de Vegetação</h2>
              <div className="space-y-3">
                {focusedData.slice(0, 30).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <TreePine className="w-5 h-5 text-primary" />
                      <div>
                        <div className="font-medium">{item.nome}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <MapPin className="w-3 h-3" />
                          {item.linha} - {item.ramal}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={item.criticidade === 'Alta' ? 'destructive' : item.criticidade === 'Média' ? 'default' : 'secondary'}>
                        {item.criticidade}
                      </Badge>
                      <Badge variant={item.status === 'OK' ? 'default' : 'outline'}>
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="mapa" className="mt-4 space-y-4">
            <div className="tech-card p-4 flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">NDVI – Município de Jundiaí</h3>
                <p className="text-xs text-muted-foreground">
                  Mapa demonstrativo com valores NDVI simulados para análise rápida de stress hídrico e cobertura vegetal.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {NDVI_LEGEND.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="w-4 h-4 rounded-sm border border-border" style={{ backgroundColor: item.color }} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <MapLibreUnified
              filterRegiao={filters.regiao}
              filterEmpresa={filters.empresa}
              showVegetacao={true}
              showInfrastructure={true}
              initialCenter={[-46.85, -23.20]}
              initialZoom={filters.linha ? 12 : 8}
              customPoints={points}
              customPolygons={ndviJundiai}
              fitBounds={bounds}
            />
          </TabsContent>
        </Tabs>
      </div>
    </ModuleLayout>
  );
};

export default Vegetacao;
