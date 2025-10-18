import { useFilters } from "@/context/FiltersContext";
import { eventos } from "@/lib/mockData";
import { TreePine, MapPin } from "lucide-react";
import FloatingFiltersBar from "@/components/FloatingFiltersBar";
import ModuleLayout from "@/components/ModuleLayout";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapLibreUnified } from "@/components/MapLibreUnified";

const Vegetacao = () => {
  const { filters } = useFilters();

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

  const kpis = {
    total: filteredData.length,
    criticas: filteredData.filter(e => e.criticidade === 'Alta').length,
    distanciaMedia: '2.5m',
  };

  return (
    <ModuleLayout title="Gestão de Vegetação" icon={TreePine}>
      <div className="p-6 space-y-6">

        <FloatingFiltersBar />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="tech-card p-6">
            <div className="text-sm text-muted-foreground mb-1">Total de Interferências</div>
            <div className="text-3xl font-bold text-primary">{kpis.total}</div>
          </div>
          <div className="tech-card p-6">
            <div className="text-sm text-muted-foreground mb-1">Interferências Críticas</div>
            <div className="text-3xl font-bold text-destructive">{kpis.criticas}</div>
          </div>
          <div className="tech-card p-6">
            <div className="text-sm text-muted-foreground mb-1">Distância Média à Faixa</div>
            <div className="text-3xl font-bold text-green-500">{kpis.distanciaMedia}</div>
          </div>
        </div>

        {/* Lista */}
        <Tabs defaultValue="lista">
          <TabsList>
            <TabsTrigger value="lista">Lista</TabsTrigger>
            <TabsTrigger value="mapa">Mapa</TabsTrigger>
          </TabsList>
          
          <TabsContent value="lista" className="mt-4">
            <div className="tech-card p-6">
              <h2 className="text-xl font-semibold mb-4">Interferências de Vegetação</h2>
              <div className="space-y-3">
                {filteredData.slice(0, 20).map(item => (
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
          
          <TabsContent value="mapa" className="mt-4">
            <MapLibreUnified
              filterRegiao={filters.regiao}
              filterEmpresa={filters.empresa}
              showVegetacao={true}
              showInfrastructure={true}
              initialCenter={[-46.63, -23.55]}
              initialZoom={filters.linha ? 13 : 7}
            />
          </TabsContent>
        </Tabs>
      </div>
    </ModuleLayout>
  );
};

export default Vegetacao;
