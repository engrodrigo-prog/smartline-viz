import { useFilters } from "@/context/FiltersContext";
import { eventos } from "@/lib/mockData";
import { Building2 } from "lucide-react";
import FiltersBar from "@/components/FiltersBar";
import ModuleLayout from "@/components/ModuleLayout";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const kpis = {
    totalTorres: filteredData.length,
    comCorrosao: Math.floor(filteredData.length * 0.35),
    furtos: Math.floor(filteredData.length * 0.12),
    integridadeMedia: '87%',
  };

  return (
    <ModuleLayout title="Gestão de Estruturas" icon={Building2}>
      <div className="p-6 space-y-6">

      <FiltersBar />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="tech-card p-6">
          <div className="text-sm text-muted-foreground mb-1">Total de Torres</div>
          <div className="text-3xl font-bold text-primary">{kpis.totalTorres}</div>
        </div>
        <div className="tech-card p-6">
          <div className="text-sm text-muted-foreground mb-1">Torres com Corrosão</div>
          <div className="text-3xl font-bold text-destructive">{kpis.comCorrosao}</div>
        </div>
        <div className="tech-card p-6">
          <div className="text-sm text-muted-foreground mb-1">Ocorrências de Furto</div>
          <div className="text-3xl font-bold text-orange-500">{kpis.furtos}</div>
        </div>
        <div className="tech-card p-6">
          <div className="text-sm text-muted-foreground mb-1">Integridade Média</div>
          <div className="text-3xl font-bold text-green-500">{kpis.integridadeMedia}</div>
        </div>
      </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="tech-card p-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="corrosao">Corrosão</TabsTrigger>
            <TabsTrigger value="furto">Furto</TabsTrigger>
            <TabsTrigger value="integridade">Integridade</TabsTrigger>
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
        </Tabs>
      </div>
    </ModuleLayout>
  );
};

export default Estruturas;
