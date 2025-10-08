import { useState, useMemo } from "react";
import { useFilters } from "@/context/FiltersContext";
import { erosoes } from "@/lib/mockData";
import { Mountain } from "lucide-react";
import ModuleLayout from "@/components/ModuleLayout";
import FiltersBar from "@/components/FiltersBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MapViewGeneric from "@/components/MapViewGeneric";
import DataTableAdvanced from "@/components/DataTableAdvanced";
import DetailDrawer from "@/components/DetailDrawer";
import CardKPI from "@/components/CardKPI";
import StatusBadge from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";

const Erosao = () => {
  const { filters } = useFilters();
  const [selectedErosao, setSelectedErosao] = useState<any>(null);
  const [tipoFilter, setTipoFilter] = useState<string>('');
  const [gravidadeFilter, setGravidadeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
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
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <CardKPI title="Total de Erosões" value={kpis.total} icon={Mountain} />
          <CardKPI title="Críticas/Altas" value={kpis.criticas} icon={Mountain} trend={{ value: 8, isPositive: false }} />
          <CardKPI title="Área Total (m²)" value={kpis.areaTotal} icon={Mountain} />
          <CardKPI title="Torres em Risco" value={kpis.torresRisco} icon={Mountain} />
          <CardKPI title="Em Intervenção" value={kpis.emIntervencao} icon={Mountain} />
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
              onRowClick={(erosao) => setSelectedErosao(erosao)}
              exportable
            />
          </TabsContent>
          
          <TabsContent value="mapa" className="mt-4">
            <MapViewGeneric
              items={filteredData}
              markerIcon={Mountain}
              colorBy="gravidadeErosao"
              onMarkerClick={(erosao) => setSelectedErosao(erosao)}
            />
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
