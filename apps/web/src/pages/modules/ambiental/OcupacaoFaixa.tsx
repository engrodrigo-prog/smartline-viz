import { useState, useMemo } from "react";
import { useFilters } from "@/context/FiltersContext";
import { ocupacoesFaixa } from "@/lib/mockData";
import { Home } from "lucide-react";
import ModuleLayout from "@/components/ModuleLayout";
import FiltersBar from "@/components/FiltersBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MapViewGeneric from "@/components/MapViewGeneric";
import DataTableAdvanced from "@/components/DataTableAdvanced";
import DetailDrawer from "@/components/DetailDrawer";
import CardKPI from "@/components/CardKPI";
import { Badge } from "@/components/ui/badge";

const OcupacaoFaixa = () => {
  const { filters } = useFilters();
  const [selectedOcupacao, setSelectedOcupacao] = useState<any>(null);
  const [tipoFilter, setTipoFilter] = useState<string>('');
  const [situacaoFilter, setSituacaoFilter] = useState<string>('');
  
  const filteredData = useMemo(() => {
    let data = ocupacoesFaixa;
    
    if (filters.regiao) data = data.filter(o => o.regiao === filters.regiao);
    if (filters.linha) data = data.filter(o => o.linha === filters.linha);
    if (filters.ramal) data = data.filter(o => o.ramal === filters.ramal);
    if (filters.search) data = data.filter(o => o.nome.toLowerCase().includes(filters.search!.toLowerCase()));
    
    if (tipoFilter) data = data.filter(o => o.tipo === tipoFilter);
    if (situacaoFilter) data = data.filter(o => o.situacao === situacaoFilter);
    
    return data;
  }, [filters, tipoFilter, situacaoFilter]);
  
  const kpis = useMemo(() => ({
    total: filteredData.length,
    irregulares: filteredData.filter(o => o.situacao === 'Irregular').length,
    emRegularizacao: filteredData.filter(o => o.situacao === 'Em Regularização').length,
    distanciaMedia: (filteredData.reduce((acc, o) => acc + o.distanciaFaixa, 0) / filteredData.length || 0).toFixed(0),
  }), [filteredData]);

  const columns = [
    { key: 'nome', label: 'Nome' },
    { key: 'tipo', label: 'Tipo' },
    { 
      key: 'situacao', 
      label: 'Situação',
      render: (value: string) => (
        <Badge variant={value === 'Irregular' ? 'destructive' : value === 'Em Regularização' ? 'secondary' : 'outline'}>
          {value}
        </Badge>
      )
    },
    { 
      key: 'distanciaFaixa', 
      label: 'Distância (m)',
      render: (value: number) => `${value}m`
    },
    { 
      key: 'prazoRegularizacao', 
      label: 'Prazo',
      render: (value: string | undefined) => value ? new Date(value).toLocaleDateString('pt-BR') : '-'
    },
    { key: 'responsavel', label: 'Responsável', render: (value: string | undefined) => value || '-' },
  ];
  
  return (
    <ModuleLayout title="Ocupação de Faixa" icon={Home}>
      <div className="p-6 space-y-6">
        
        <FiltersBar>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Ocupação</label>
              <select 
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="Residencial">Residencial</option>
                <option value="Comercial">Comercial</option>
                <option value="Agrícola">Agrícola</option>
                <option value="Industrial">Industrial</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Situação Legal</label>
              <select 
                value={situacaoFilter}
                onChange={(e) => setSituacaoFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="Regular">Regular</option>
                <option value="Irregular">Irregular</option>
                <option value="Em Regularização">Em Regularização</option>
              </select>
            </div>
          </div>
        </FiltersBar>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardKPI title="Total de Ocupações" value={kpis.total} icon={Home} />
          <CardKPI title="Irregulares" value={kpis.irregulares} icon={Home} trend={{ value: 8, isPositive: false }} />
          <CardKPI title="Em Regularização" value={kpis.emRegularizacao} icon={Home} />
          <CardKPI title="Distância Média" value={`${kpis.distanciaMedia}m`} icon={Home} />
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
              onRowClick={(ocupacao) => setSelectedOcupacao(ocupacao)}
              exportable
            />
          </TabsContent>
          
          <TabsContent value="mapa" className="mt-4">
            <MapViewGeneric
              items={filteredData}
              markerIcon={Home}
              colorBy="situacao"
              onMarkerClick={(ocupacao) => setSelectedOcupacao(ocupacao)}
            />
          </TabsContent>
        </Tabs>
        
        <DetailDrawer
          isOpen={!!selectedOcupacao}
          onClose={() => setSelectedOcupacao(null)}
          title={selectedOcupacao?.nome || ''}
        >
          {selectedOcupacao && (
            <div className="space-y-6 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Tipo</span>
                  <p className="font-bold text-lg">{selectedOcupacao.tipo}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Situação</span>
                  <div className="mt-1">
                    <Badge variant={selectedOcupacao.situacao === 'Irregular' ? 'destructive' : selectedOcupacao.situacao === 'Em Regularização' ? 'secondary' : 'outline'}>
                      {selectedOcupacao.situacao}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Distância da Faixa</span>
                  <p className="font-bold text-lg">{selectedOcupacao.distanciaFaixa}m</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Região</span>
                  <p className="font-medium">Região {selectedOcupacao.regiao}</p>
                </div>
              </div>
              
              {selectedOcupacao.responsavel && (
                <div>
                  <span className="text-sm text-muted-foreground">Responsável</span>
                  <p className="font-medium">{selectedOcupacao.responsavel}</p>
                </div>
              )}
              
              {selectedOcupacao.prazoRegularizacao && (
                <div>
                  <span className="text-sm text-muted-foreground">Prazo de Regularização</span>
                  <p className="font-medium text-lg">
                    {new Date(selectedOcupacao.prazoRegularizacao).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
              
              <div>
                <span className="text-sm text-muted-foreground">Localização</span>
                <p className="font-medium">{selectedOcupacao.linha} - {selectedOcupacao.ramal}</p>
              </div>
            </div>
          )}
        </DetailDrawer>
        
      </div>
    </ModuleLayout>
  );
};

export default OcupacaoFaixa;
