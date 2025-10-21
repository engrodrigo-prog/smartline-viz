import { useState, useMemo } from "react";
import { useFilters } from "@/context/FiltersContext";
import { areasAlagadas, protecoesPássaros } from "@/lib/mockData";
import { Droplets } from "lucide-react";
import ModuleLayout from "@/components/ModuleLayout";
import FiltersBar from "@/components/FiltersBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapLibreUnified } from "@/components/MapLibreUnified";
import DataTableAdvanced from "@/components/DataTableAdvanced";
import DetailDrawer from "@/components/DetailDrawer";
import CardKPI from "@/components/CardKPI";
import StatusBadge from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";

const AreasAlagadas = () => {
  const { filters } = useFilters();
  const [selectedArea, setSelectedArea] = useState<any>(null);
  const [protecaoFilter, setProtecaoFilter] = useState<string>('');
  const [nivelRiscoFilter, setNivelRiscoFilter] = useState<string>('');
  
  const filteredData = useMemo(() => {
    let data = areasAlagadas;
    
    if (filters.regiao) data = data.filter(a => a.regiao === filters.regiao);
    if (filters.linha) data = data.filter(a => a.linha === filters.linha);
    if (filters.ramal) data = data.filter(a => a.ramal === filters.ramal);
    if (filters.search) data = data.filter(a => a.nome.toLowerCase().includes(filters.search!.toLowerCase()));
    
    if (nivelRiscoFilter) data = data.filter(a => a.nivelRisco === nivelRiscoFilter);
    
    if (protecaoFilter) {
      data = data.filter(area => {
        const torresNaArea = area.torres_afetadas;
        const temProtecao = torresNaArea.some(torreId =>
          protecoesPássaros.find(p => p.torre === torreId && p.status === 'Instalado')
        );
        return protecaoFilter === 'sim' ? temProtecao : !temProtecao;
      });
    }
    
    return data;
  }, [filters, nivelRiscoFilter, protecaoFilter]);
  
  const kpis = useMemo(() => ({
    total: filteredData.length,
    criticas: filteredData.filter(a => a.nivelRisco === 'Alto').length,
    areaTotal: filteredData.reduce((acc, a) => acc + a.areaCritica, 0).toFixed(2),
    torresRisco: new Set(filteredData.flatMap(a => a.torres_afetadas)).size,
    comProtecao: filteredData.filter(area => 
      area.torres_afetadas.some(torreId =>
        protecoesPássaros.find(p => p.torre === torreId && p.status === 'Instalado')
      )
    ).length,
  }), [filteredData]);

  const columns = [
    { key: 'nome', label: 'Nome' },
    { 
      key: 'nivelRisco', 
      label: 'Nível de Risco',
      render: (value: string) => <StatusBadge level={value as any} />
    },
    { 
      key: 'areaCritica', 
      label: 'Área (km²)',
      render: (value: number) => value.toFixed(2)
    },
    { 
      key: 'torres_afetadas', 
      label: 'Torres Afetadas',
      render: (value: string[]) => value.length
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'Crítico' ? 'destructive' : value === 'Alerta' ? 'secondary' : 'outline'}>
          {value}
        </Badge>
      )
    },
    { 
      key: 'ultimaAtualizacao', 
      label: 'Última Atualização',
      render: (value: string) => new Date(value).toLocaleDateString('pt-BR')
    },
  ];
  
  return (
    <ModuleLayout title="Áreas Alagadas" icon={Droplets}>
      <div className="p-6 space-y-6">
        
        <FiltersBar>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Nível de Risco</label>
              <select 
                value={nivelRiscoFilter}
                onChange={(e) => setNivelRiscoFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="Baixo">Baixo</option>
                <option value="Médio">Médio</option>
                <option value="Alto">Alto</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Proteção Instalada</label>
              <select 
                value={protecaoFilter}
                onChange={(e) => setProtecaoFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>
          </div>
        </FiltersBar>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <CardKPI title="Total de Áreas" value={kpis.total} icon={Droplets} />
          <CardKPI title="Nível Crítico" value={kpis.criticas} icon={Droplets} trend={{ value: 12, isPositive: false }} />
          <CardKPI title="Área Total (km²)" value={kpis.areaTotal} icon={Droplets} />
          <CardKPI title="Torres em Risco" value={kpis.torresRisco} icon={Droplets} />
          <CardKPI title="Com Proteção" value={kpis.comProtecao} icon={Droplets} />
        </div>
        
        <Tabs defaultValue="lista">
          <TabsList>
            <TabsTrigger value="lista">Lista</TabsTrigger>
            <TabsTrigger value="mapa">Mapa</TabsTrigger>
          </TabsList>
          
          <TabsContent value="lista" className="mt-4">
            <DataTableAdvanced
              data={filteredData}
              columns={columns}
              onRowClick={(area) => setSelectedArea(area)}
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
                showAreasAlagadas={true}
                showInfrastructure={true}
                initialCenter={[-46.63, -23.55]}
                initialZoom={filters.linha ? 12 : 8}
                height="600px"
              />
            </div>
          </TabsContent>
        </Tabs>
        
        <DetailDrawer
          isOpen={!!selectedArea}
          onClose={() => setSelectedArea(null)}
          title={selectedArea?.nome || ''}
        >
          {selectedArea && (
            <div className="space-y-6 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Nível de Risco</span>
                  <div className="mt-1">
                    <StatusBadge level={selectedArea.nivelRisco} />
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Área Crítica</span>
                  <p className="font-bold text-lg">{selectedArea.areaCritica} km²</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Status</span>
                  <p className="font-medium">{selectedArea.status}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Última Atualização</span>
                  <p className="font-medium">{new Date(selectedArea.ultimaAtualizacao).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Torres Afetadas ({selectedArea.torres_afetadas.length})</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedArea.torres_afetadas.map((torreId: string) => {
                    const protecao = protecoesPássaros.find(p => p.torre === torreId && p.status === 'Instalado');
                    return (
                      <div key={torreId} className="p-3 bg-muted/20 rounded-lg flex justify-between items-center">
                        <span className="font-medium">{torreId}</span>
                        {protecao && (
                          <Badge className="bg-green-500 hover:bg-green-600 text-white">
                            Proteção Instalada
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DetailDrawer>
        
      </div>
    </ModuleLayout>
  );
};

export default AreasAlagadas;
