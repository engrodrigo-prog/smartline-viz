import { useFilters } from "@/context/FiltersContext";
import { eventos } from "@/lib/mockData";
import { Building2 } from "lucide-react";
import FloatingFiltersBar from "@/components/FloatingFiltersBar";
import ModuleLayout from "@/components/ModuleLayout";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapLibreUnified } from "@/components/MapLibreUnified";

const Estruturas = () => {
  const { filters } = useFilters();
  const [activeTab, setActiveTab] = useState("corrosao");

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

  return (
    <ModuleLayout title="Gestão de Estruturas" icon={Building2}>
      <div className="p-6 space-y-6">

      <FloatingFiltersBar />

      {/* KPIs - Status e Criticidade */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="tech-card p-6">
          <div className="text-sm text-muted-foreground mb-1">Total</div>
          <div className="text-3xl font-bold text-primary">{kpis.total}</div>
        </div>
        <div className="tech-card p-6">
          <div className="text-sm text-muted-foreground mb-1">Concluídos</div>
          <div className="text-3xl font-bold text-green-500">{kpis.concluidos}</div>
        </div>
        <div className="tech-card p-6">
          <div className="text-sm text-muted-foreground mb-1">Em andamento</div>
          <div className="text-3xl font-bold text-amber-500">{kpis.emAndamento}</div>
        </div>
        <div className="tech-card p-6">
          <div className="text-sm text-muted-foreground mb-1">Pendentes</div>
          <div className="text-3xl font-bold text-blue-500">{kpis.pendentes}</div>
        </div>
        <div className="tech-card p-6">
          <div className="text-sm text-muted-foreground mb-1">Em atraso (&gt; {prazoDias}d)</div>
          <div className="text-3xl font-bold text-destructive">{kpis.atrasados}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="tech-card p-6">
          <div className="text-sm text-muted-foreground mb-1">Críticos (Alta)</div>
          <div className="text-3xl font-bold text-destructive">{kpis.critAlta}</div>
        </div>
        <div className="tech-card p-6">
          <div className="text-sm text-muted-foreground mb-1">Média criticidade</div>
          <div className="text-3xl font-bold text-amber-500">{kpis.critMedia}</div>
        </div>
        <div className="tech-card p-6">
          <div className="text-sm text-muted-foreground mb-1">Baixa criticidade</div>
          <div className="text-3xl font-bold text-green-500">{kpis.critBaixa}</div>
        </div>
      </div>

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
              {filteredData.slice(0, 10).map(item => (
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
              {filteredData.slice(0, 8).map(item => (
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
              {filteredData.map(item => (
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
                initialZoom={filters.linha ? 13 : 7}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ModuleLayout>
  );
};

export default Estruturas;
