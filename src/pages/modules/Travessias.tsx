import { useFilters } from "@/context/FiltersContext";
import { eventos } from "@/lib/mockData";
import { Cable, MapPin } from "lucide-react";
import FiltersBar from "@/components/FiltersBar";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";

const Travessias = () => {
  const { filters } = useFilters();

  const filteredData = useMemo(() => {
    let data = eventos.filter(e => e.tipo === 'Travessias');

    if (filters.regiao) data = data.filter(e => e.regiao === filters.regiao);
    if (filters.linha) data = data.filter(e => e.linha === filters.linha);
    if (filters.ramal) data = data.filter(e => e.ramal === filters.ramal);
    if (filters.search) data = data.filter(e => e.nome.toLowerCase().includes(filters.search!.toLowerCase()));

    return data;
  }, [filters]);

  const kpis = {
    total: filteredData.length,
    pendentes: filteredData.filter(e => e.status === 'Pendente').length,
    ferroviarias: Math.floor(filteredData.length * 0.3),
    rodoviarias: Math.floor(filteredData.length * 0.45),
    fluviais: Math.floor(filteredData.length * 0.25),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Cable className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Gestão de Travessias</h1>
      </div>

      <FiltersBar />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="tech-card p-6">
          <div className="text-sm text-muted-foreground mb-1">Total de Travessias</div>
          <div className="text-3xl font-bold text-primary">{kpis.total}</div>
        </div>
        <div className="tech-card p-6">
          <div className="text-sm text-muted-foreground mb-1">Pendências</div>
          <div className="text-3xl font-bold text-destructive">{kpis.pendentes}</div>
        </div>
        <div className="tech-card p-6">
          <div className="text-sm text-muted-foreground mb-1">Distribuição</div>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary">Ferroviárias: {kpis.ferroviarias}</Badge>
            <Badge variant="secondary">Rodoviárias: {kpis.rodoviarias}</Badge>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="tech-card p-6">
        <h2 className="text-xl font-semibold mb-4">Travessias Cadastradas</h2>
        <div className="space-y-3">
          {filteredData.slice(0, 20).map(item => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-4">
                <Cable className="w-5 h-5 text-primary" />
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
    </div>
  );
};

export default Travessias;
