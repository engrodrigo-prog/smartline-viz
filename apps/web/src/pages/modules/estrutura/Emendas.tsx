import { useState, useMemo } from "react";
import { useFilters } from "@/context/FiltersContext";
import { Zap } from "lucide-react";
import ModuleLayout from "@/components/ModuleLayout";
import ModuleDemoBanner from "@/components/ModuleDemoBanner";
import FiltersBar from "@/components/FiltersBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapLibreUnified } from "@/components/MapLibreUnified";
import DataTableAdvanced from "@/components/DataTableAdvanced";
import DetailDrawer from "@/components/DetailDrawer";
import CardKPI from "@/components/CardKPI";
import StatusBadge from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { useDatasetData } from "@/context/DatasetContext";
import type { Emenda } from "@/lib/mockData";

const Emendas = () => {
  const { filters } = useFilters();
  const [selectedEmenda, setSelectedEmenda] = useState<any>(null);
  const [statusTermicoFilter, setStatusTermicoFilter] = useState<string>('');
  const [tipoFilter, setTipoFilter] = useState<string>('');
  const emendasDataset = useDatasetData((data) => data.emendas);
  
  const filteredData = useMemo(() => {
    let data = emendasDataset;
    
    if (filters.regiao) {
      data = data.filter(e => {
        // Map linha to region (simplified mapping)
        const linha = e.linha;
        if (linha === 'LT-001') return filters.regiao === 'A';
        if (linha === 'LT-002') return filters.regiao === 'B';
        if (linha === 'LT-003') return filters.regiao === 'C';
        return true;
      });
    }
    if (filters.linha) data = data.filter(e => e.linha === filters.linha);
    if (filters.ramal) data = data.filter(e => e.ramal === filters.ramal);
    if (filters.search) data = data.filter(e => 
      e.id.toLowerCase().includes(filters.search!.toLowerCase()) ||
      e.torre.toLowerCase().includes(filters.search!.toLowerCase())
    );
    
    if (statusTermicoFilter) data = data.filter(e => e.statusTermico === statusTermicoFilter);
    if (tipoFilter) data = data.filter(e => e.tipo === tipoFilter);
    
    return data;
  }, [emendasDataset, filters, statusTermicoFilter, tipoFilter]);
  
  const kpis = useMemo(() => ({
    total: filteredData.length,
    comAquecimento: filteredData.filter(e => e.aquecimentoDetectado).length,
    temperaturaMedia: (filteredData.reduce((acc, e) => acc + (e.temperatura || 0), 0) / filteredData.length || 0).toFixed(1),
    manutencaoRequerida: filteredData.filter(e => e.manutencaoRequerida).length,
  }), [filteredData]);

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'torre', label: 'Torre' },
    { key: 'tipo', label: 'Tipo' },
    { 
      key: 'temperatura', 
      label: 'Temperatura (°C)',
      render: (value: number) => (
        <span className={value > 60 ? 'text-destructive font-bold' : value > 45 ? 'text-secondary font-semibold' : ''}>
          {value}°C
        </span>
      )
    },
    { 
      key: 'statusTermico', 
      label: 'Status Térmico',
      render: (value: string) => {
        const variant = value === 'Crítico' ? 'destructive' : value === 'Atenção' ? 'secondary' : 'outline';
        return <Badge variant={variant}>{value}</Badge>;
      }
    },
    { 
      key: 'ultimaInspecao', 
      label: 'Última Inspeção',
      render: (value: string) => new Date(value).toLocaleDateString('pt-BR')
    },
    { 
      key: 'manutencaoRequerida', 
      label: 'Manutenção',
      render: (value: boolean) => (
        <Badge variant={value ? 'destructive' : 'outline'}>
          {value ? 'Requerida' : 'OK'}
        </Badge>
      )
    },
  ];
  
  return (
    <ModuleLayout title="Emendas e Conexões" icon={Zap}>
      <div className="p-6 space-y-6">
        <ModuleDemoBanner />
        
        <FiltersBar>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status Térmico</label>
              <select 
                value={statusTermicoFilter}
                onChange={(e) => setStatusTermicoFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="Normal">Normal</option>
                <option value="Atenção">Atenção</option>
                <option value="Crítico">Crítico</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Emenda</label>
              <select 
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="Compressão">Compressão</option>
                <option value="Explosiva">Explosiva</option>
                <option value="Mecânica">Mecânica</option>
              </select>
            </div>
          </div>
        </FiltersBar>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardKPI title="Total de Emendas" value={kpis.total} icon={Zap} />
          <CardKPI title="Com Aquecimento" value={kpis.comAquecimento} icon={Zap} trend={{ value: 15, isPositive: false }} />
          <CardKPI title="Temperatura Média" value={`${kpis.temperaturaMedia}°C`} icon={Zap} />
          <CardKPI title="Manutenção Requerida" value={kpis.manutencaoRequerida} icon={Zap} />
        </div>
        
        <Tabs defaultValue="lista">
          <TabsList>
            <TabsTrigger value="lista">Lista</TabsTrigger>
            <TabsTrigger value="mapa">Mapa Térmico</TabsTrigger>
          </TabsList>
          
          <TabsContent value="lista" className="mt-4">
            <DataTableAdvanced
              data={filteredData}
              columns={columns}
              onRowClick={(emenda) => setSelectedEmenda(emenda)}
              exportable
            />
          </TabsContent>
          
          <TabsContent value="mapa" className="mt-4">
            <div className="tech-card p-0 overflow-hidden">
              {/* @ts-expect-error MapLibreUnified utiliza props extras não modeladas no tipo padrão */}
              <MapLibreUnified
                filterRegiao={filters.regiao}
                filterEmpresa={filters.empresa}
                filterLinha={filters.linha}
                showEmendas={true}
                showInfrastructure={true}
                initialCenter={[-46.63, -23.55]}
                initialZoom={filters.linha ? 13 : 7}
              />
            </div>
          </TabsContent>
        </Tabs>
        
        <DetailDrawer
          isOpen={!!selectedEmenda}
          onClose={() => setSelectedEmenda(null)}
          title={selectedEmenda?.id || ''}
        >
          {selectedEmenda && (
            <div className="space-y-6 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Torre</span>
                  <p className="font-bold text-lg">{selectedEmenda.torre}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Tipo</span>
                  <p className="font-medium">{selectedEmenda.tipo}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Temperatura Atual</span>
                  <p className={`font-bold text-2xl ${
                    selectedEmenda.temperatura > 60 ? 'text-destructive' : 
                    selectedEmenda.temperatura > 45 ? 'text-secondary' : 
                    'text-green-500'
                  }`}>
                    {selectedEmenda.temperatura}°C
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Status Térmico</span>
                  <div className="mt-1">
                    <Badge variant={
                      selectedEmenda.statusTermico === 'Crítico' ? 'destructive' : 
                      selectedEmenda.statusTermico === 'Atenção' ? 'secondary' : 
                      'outline'
                    }>
                      {selectedEmenda.statusTermico}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <span className="text-sm text-muted-foreground">Aquecimento Detectado</span>
                <p className={`font-bold ${selectedEmenda.aquecimentoDetectado ? 'text-destructive' : 'text-green-500'}`}>
                  {selectedEmenda.aquecimentoDetectado ? 'SIM' : 'NÃO'}
                </p>
              </div>
              
              <div>
                <span className="text-sm text-muted-foreground">Última Inspeção</span>
                <p className="font-medium">{new Date(selectedEmenda.ultimaInspecao).toLocaleDateString('pt-BR')}</p>
              </div>
              
              <div>
                <span className="text-sm text-muted-foreground">Localização</span>
                <p className="font-medium">{selectedEmenda.linha} - {selectedEmenda.ramal}</p>
              </div>
              
              {selectedEmenda.manutencaoRequerida && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="font-semibold text-destructive">⚠️ Manutenção Requerida</p>
                  <p className="text-sm mt-1">Esta emenda requer atenção imediata devido ao status térmico elevado.</p>
                </div>
              )}
            </div>
          )}
        </DetailDrawer>
        
      </div>
    </ModuleLayout>
  );
};

export default Emendas;
