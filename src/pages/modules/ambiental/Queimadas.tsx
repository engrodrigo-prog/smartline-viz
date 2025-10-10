import { useState, useMemo } from "react";
import { useFilters } from "@/context/FiltersContext";
import { useQueimadas } from "@/hooks/useQueimadas";
import { Flame, Activity, Clock } from "lucide-react";
import ModuleLayout from "@/components/ModuleLayout";
import FiltersBar from "@/components/FiltersBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapboxQueimadas } from "@/components/MapboxQueimadas";
import DataTableAdvanced from "@/components/DataTableAdvanced";
import DetailDrawer from "@/components/DetailDrawer";
import CardKPI from "@/components/CardKPI";
import StatusBadge from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const Queimadas = () => {
  const { filters } = useFilters();
  const [selectedQueimada, setSelectedQueimada] = useState<any>(null);
  const [tipoFilter, setTipoFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [nivelRiscoFilter, setNivelRiscoFilter] = useState<string>('');
  
  const [mode, setMode] = useState<'live' | 'archive'>('live');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const { data: geojsonData, isLoading, error } = useQueimadas({
    mode,
    concessao: filters.regiao || 'TODAS',
    minConf: 50,
    satelite: 'ALL',
    maxKm: 1,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  });
  
  const filteredData = useMemo(() => {
    if (!geojsonData?.features) return [];
    
    let features = geojsonData.features.map((f: any) => ({
      id: f.properties.id,
      nome: `Queimada ${f.properties.fonte}-${f.properties.id}`,
      coords: { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] },
      dataDeteccao: f.properties.data_aquisicao,
      brilho: f.properties.brilho,
      confianca: f.properties.confianca,
      concessao: f.properties.concessao,
      linha: f.properties.linha_nome || 'N/A',
      ramal: f.properties.ramal || 'N/A',
      distanciaLinha: f.properties.distancia_m || 0,
      satelite: f.properties.satelite,
      fonte: f.properties.fonte,
      tipoQueimada: 'Natural',
      statusIncendio: 'Ativo',
      nivelRisco: f.properties.confianca >= 80 ? 'Crítico' : 
                   f.properties.confianca >= 65 ? 'Alto' :
                   f.properties.confianca >= 50 ? 'Médio' : 'Baixo',
      extensaoQueimada: 0,
      torres_ameacadas: [],
      climaNoMomento: { temperatura: 0, umidade: 0, ventoKmh: 0 }
    }));
    
    if (tipoFilter) features = features.filter((q: any) => q.tipoQueimada === tipoFilter);
    if (statusFilter) features = features.filter((q: any) => q.statusIncendio === statusFilter);
    if (nivelRiscoFilter) features = features.filter((q: any) => q.nivelRisco === nivelRiscoFilter);
    
    return features;
  }, [geojsonData, tipoFilter, statusFilter, nivelRiscoFilter]);
  
  const kpis = useMemo(() => ({
    total: filteredData.length,
    ativos: filteredData.filter(q => q.statusIncendio === 'Ativo').length,
    areaTotal: filteredData.reduce((acc, q) => acc + q.extensaoQueimada, 0).toFixed(1),
    torresAmeacadas: new Set(filteredData.flatMap(q => q.torres_ameacadas)).size,
    controladosExtintos: filteredData.filter(q => q.statusIncendio === 'Controlado' || q.statusIncendio === 'Extinto').length,
  }), [filteredData]);

  const columns = [
    { key: 'nome', label: 'Nome' },
    { 
      key: 'dataDeteccao', 
      label: 'Data de Detecção',
      render: (value: string) => new Date(value).toLocaleDateString('pt-BR')
    },
    { 
      key: 'tipoQueimada', 
      label: 'Tipo',
      render: (value: string) => (
        <Badge variant={value === 'Criminosa' ? 'destructive' : 'outline'}>
          {value}
        </Badge>
      )
    },
    { 
      key: 'extensaoQueimada', 
      label: 'Extensão (ha)',
      render: (value: number) => `${value.toFixed(1)} ha`
    },
    { 
      key: 'statusIncendio', 
      label: 'Status',
      render: (value: string) => (
        <Badge variant={
          value === 'Ativo' ? 'destructive' : 
          value === 'Controlado' ? 'secondary' : 
          'outline'
        }>
          {value}
        </Badge>
      )
    },
    { 
      key: 'nivelRisco', 
      label: 'Nível de Risco',
      render: (value: string) => <StatusBadge level={value as any} />
    },
    { 
      key: 'distanciaLinha', 
      label: 'Distância (m)',
      render: (value: number) => `${value.toLocaleString('pt-BR')}m`
    },
  ];
  
  return (
    <ModuleLayout title="Queimadas" icon={Flame}>
      <div className="p-6 space-y-6">
        
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant={mode === 'live' ? 'default' : 'outline'}
              onClick={() => setMode('live')}
              className="gap-2"
              size="sm"
            >
              <Activity className="w-4 h-4" />
              Últimas 24h (Ao vivo)
            </Button>
            <Button
              variant={mode === 'archive' ? 'default' : 'outline'}
              onClick={() => setMode('archive')}
              className="gap-2"
              size="sm"
            >
              <Clock className="w-4 h-4" />
              Histórico
            </Button>
          </div>

          {mode === 'archive' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="border border-border rounded px-3 py-1.5 text-sm bg-background"
              />
              <span className="text-sm text-muted-foreground">até</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="border border-border rounded px-3 py-1.5 text-sm bg-background"
              />
            </div>
          )}
        </div>
        
        <FiltersBar>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Queimada</label>
              <select 
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="Controlada">Controlada</option>
                <option value="Acidental">Acidental</option>
                <option value="Criminosa">Criminosa</option>
                <option value="Natural">Natural</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Status do Incêndio</label>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="Ativo">Ativo</option>
                <option value="Controlado">Controlado</option>
                <option value="Extinto">Extinto</option>
              </select>
            </div>
            
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
                <option value="Crítico">Crítico</option>
              </select>
            </div>
          </div>
        </FiltersBar>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <CardKPI title="Total de Queimadas" value={kpis.total} icon={Flame} />
          <CardKPI title="Incêndios Ativos" value={kpis.ativos} icon={Flame} trend={{ value: 15, isPositive: false }} />
          <CardKPI title="Área Queimada (ha)" value={kpis.areaTotal} icon={Flame} />
          <CardKPI title="Torres Ameaçadas" value={kpis.torresAmeacadas} icon={Flame} />
          <CardKPI title="Controlados/Extintos" value={kpis.controladosExtintos} icon={Flame} />
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
              onRowClick={(queimada) => setSelectedQueimada(queimada)}
              exportable
            />
          </TabsContent>
          
          <TabsContent value="mapa" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-[600px] border border-border rounded-lg bg-background">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  <p className="text-sm text-muted-foreground">Carregando dados de queimadas...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-[600px] border border-border rounded-lg bg-background">
                <div className="text-center p-6">
                  <p className="text-destructive mb-2">Erro ao carregar dados</p>
                  <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
                </div>
              </div>
            ) : geojsonData && geojsonData.features.length > 0 ? (
              <MapboxQueimadas
                geojson={geojsonData}
                onFeatureClick={(props) => {
                  const queimada = filteredData.find(q => q.id === props.id);
                  if (queimada) setSelectedQueimada(queimada);
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-[600px] border border-border rounded-lg bg-background">
                <p className="text-muted-foreground">Nenhuma queimada detectada no período selecionado</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <DetailDrawer
          isOpen={!!selectedQueimada}
          onClose={() => setSelectedQueimada(null)}
          title={selectedQueimada?.nome || ''}
        >
          {selectedQueimada && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Data de Detecção</span>
                  <p className="font-medium mt-1">{new Date(selectedQueimada.dataDeteccao).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Tipo</span>
                  <div className="mt-1">
                    <Badge variant={selectedQueimada.tipoQueimada === 'Criminosa' ? 'destructive' : 'outline'}>
                      {selectedQueimada.tipoQueimada}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Extensão</span>
                  <p className="font-bold text-lg">{selectedQueimada.extensaoQueimada.toFixed(1)} ha</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Status do Incêndio</span>
                  <div className="mt-1">
                    <Badge variant={
                      selectedQueimada.statusIncendio === 'Ativo' ? 'destructive' : 
                      selectedQueimada.statusIncendio === 'Controlado' ? 'secondary' : 
                      'outline'
                    }>
                      {selectedQueimada.statusIncendio}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Nível de Risco</span>
                  <div className="mt-1">
                    <StatusBadge level={selectedQueimada.nivelRisco} />
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Distância da Linha</span>
                  <p className="font-bold text-lg">{selectedQueimada.distanciaLinha.toLocaleString('pt-BR')}m</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Condições Climáticas</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted/20 p-3 rounded-lg">
                    <span className="text-xs text-muted-foreground">Temperatura</span>
                    <p className="font-bold text-lg">{selectedQueimada.climaNoMomento.temperatura}°C</p>
                  </div>
                  <div className="bg-muted/20 p-3 rounded-lg">
                    <span className="text-xs text-muted-foreground">Umidade</span>
                    <p className="font-bold text-lg">{selectedQueimada.climaNoMomento.umidade}%</p>
                  </div>
                  <div className="bg-muted/20 p-3 rounded-lg">
                    <span className="text-xs text-muted-foreground">Vento</span>
                    <p className="font-bold text-lg">{selectedQueimada.climaNoMomento.ventoKmh} km/h</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Torres Ameaçadas ({selectedQueimada.torres_ameacadas.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedQueimada.torres_ameacadas.map((torreId: string) => (
                    <div key={torreId} className="p-3 bg-muted/20 rounded-lg">
                      <span className="font-medium">{torreId}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {selectedQueimada.equipesAcionadas && selectedQueimada.equipesAcionadas.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Equipes Acionadas</h4>
                  <ul className="space-y-2">
                    {selectedQueimada.equipesAcionadas.map((equipe: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2 p-2 bg-muted/20 rounded">
                        <Badge variant="secondary">{equipe}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {selectedQueimada.danosCausados && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Danos Causados</h4>
                  <p className="text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                    {selectedQueimada.danosCausados}
                  </p>
                </div>
              )}
            </div>
          )}
        </DetailDrawer>
        
      </div>
    </ModuleLayout>
  );
};

export default Queimadas;
