import { useState, useMemo } from "react";
import { useFilters } from "@/context/FiltersContext";
import { useQueimadas } from "@/hooks/useQueimadas";
import { useAlarmZones } from "@/hooks/useAlarmZones";
import { Flame, Activity, Clock, AlertTriangle, Eye, Shield } from "lucide-react";
import ModuleLayout from "@/components/ModuleLayout";
import FiltersBar from "@/components/FiltersBar";
import AlarmZoneConfig from "@/components/AlarmZoneConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapboxQueimadas } from "@/components/MapboxQueimadas";
import DataTableAdvanced from "@/components/DataTableAdvanced";
import DetailDrawer from "@/components/DetailDrawer";
import CardKPI from "@/components/CardKPI";
import StatusBadge from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const Queimadas = () => {
  const { filters } = useFilters();
  const { getZone, getZoneLabel, getAcionamento, config } = useAlarmZones(filters.regiao || '');
  const [selectedQueimada, setSelectedQueimada] = useState<any>(null);
  const [zonaFilter, setZonaFilter] = useState<string>('');
  const [confiancaMin, setConfiancaMin] = useState<number>(50);
  const [sateliteFilter, setSateliteFilter] = useState<string>('');
  const [linhaRamalFilter, setLinhaRamalFilter] = useState<string>('');
  
  const [mode, setMode] = useState<'live' | 'archive'>('live');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const { data: geojsonData, isLoading, error } = useQueimadas({
    mode,
    concessao: filters.regiao || 'TODAS',
    minConf: confiancaMin,
    satelite: sateliteFilter || 'ALL',
    maxKm: config.zonaObs / 1000, // Converter para km
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  });
  
  const filteredData = useMemo(() => {
    if (!geojsonData?.features) return [];
    
    let features = geojsonData.features.map((f: any) => {
      const distancia = f.properties.distancia_m || 0;
      const zona = getZone(distancia);
      
      return {
        id: f.properties.id,
        nome: `Queimada ${f.properties.fonte}-${f.properties.id}`,
        coords: { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] },
        dataDeteccao: f.properties.data_aquisicao,
        brilho: f.properties.brilho,
        confianca: f.properties.confianca,
        concessao: f.properties.concessao,
        linha: f.properties.linha_nome || 'N/A',
        ramal: f.properties.ramal || 'N/A',
        distanciaLinha: distancia,
        satelite: f.properties.satelite,
        fonte: f.properties.fonte,
        zona,
        zonaLabel: getZoneLabel(zona),
        acionamento: getAcionamento(zona),
        estruturaProxima: f.properties.estrutura_codigo || 'N/A',
        nivelRisco: f.properties.confianca >= 80 ? 'Crítico' : 
                     f.properties.confianca >= 65 ? 'Alto' :
                     f.properties.confianca >= 50 ? 'Médio' : 'Baixo',
      };
    });
    
    // Aplicar filtros
    if (zonaFilter) features = features.filter((q: any) => q.zona === zonaFilter);
    if (linhaRamalFilter) {
      features = features.filter((q: any) => 
        q.linha.includes(linhaRamalFilter) || q.ramal.includes(linhaRamalFilter)
      );
    }
    
    return features;
  }, [geojsonData, zonaFilter, linhaRamalFilter, getZone, getZoneLabel, getAcionamento]);
  
  const kpis = useMemo(() => ({
    total: filteredData.length,
    zonaCritica: filteredData.filter(q => q.zona === 'critica').length,
    zonaAcomp: filteredData.filter(q => q.zona === 'acompanhamento').length,
    zonaObs: filteredData.filter(q => q.zona === 'observacao').length,
    estruturasAmeacadas: new Set(filteredData.filter(q => q.zona === 'critica').map(q => q.estruturaProxima)).size,
  }), [filteredData]);

  const columns = [
    { 
      key: 'dataDeteccao', 
      label: 'Data Detecção',
      render: (value: string) => new Date(value).toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    { 
      key: 'zona', 
      label: 'Zona de Alarme',
      render: (_: any, row: any) => {
        const variant = row.zona === 'critica' ? 'destructive' : 
                       row.zona === 'acompanhamento' ? 'default' : 
                       'secondary';
        return <Badge variant={variant}>{row.zonaLabel}</Badge>;
      }
    },
    { 
      key: 'distanciaLinha', 
      label: 'Distância',
      render: (value: number) => `${value.toLocaleString('pt-BR')}m`
    },
    { 
      key: 'estruturaProxima', 
      label: 'Estrutura Próxima',
    },
    { 
      key: 'acionamento', 
      label: 'Acionamento',
      render: (value: string) => (
        <Badge variant={
          value === 'Ação Imediata' ? 'destructive' : 
          value === 'Agendar Inspeção' ? 'default' : 
          'outline'
        }>
          {value}
        </Badge>
      )
    },
    { 
      key: 'confianca', 
      label: 'Confiança',
      render: (value: number) => `${value}%`
    },
    { 
      key: 'satelite', 
      label: 'Satélite',
      render: (value: string) => <Badge variant="outline">{value}</Badge>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Filtros de Queimadas</h3>
            <AlarmZoneConfig concessao={filters.regiao || ''} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Zona de Alarme</label>
              <select 
                value={zonaFilter}
                onChange={(e) => setZonaFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todas as Zonas</option>
                <option value="critica">🔴 Crítica</option>
                <option value="acompanhamento">🟡 Acompanhamento</option>
                <option value="observacao">🟢 Observação</option>
                <option value="fora">⚪ Fora de Zona</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Confiança Mínima: {confiancaMin}%</label>
              <Slider
                value={[confiancaMin]}
                onValueChange={(values) => setConfiancaMin(values[0])}
                min={0}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Satélite</label>
              <select 
                value={sateliteFilter}
                onChange={(e) => setSateliteFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="VIIRS">VIIRS</option>
                <option value="MODIS">MODIS</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Linha/Ramal</label>
              <input
                type="text"
                value={linhaRamalFilter}
                onChange={(e) => setLinhaRamalFilter(e.target.value)}
                placeholder="Filtrar por linha..."
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </FiltersBar>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <CardKPI 
            title="Total de Focos" 
            value={kpis.total} 
            icon={Flame} 
          />
          <CardKPI 
            title="🔴 Zona Crítica" 
            value={kpis.zonaCritica} 
            icon={AlertTriangle}
            className="border-destructive/20"
          />
          <CardKPI 
            title="🟡 Acompanhamento" 
            value={kpis.zonaAcomp} 
            icon={Eye}
            className="border-warning/20"
          />
          <CardKPI 
            title="🟢 Observação" 
            value={kpis.zonaObs} 
            icon={Shield}
            className="border-primary/20"
          />
          <CardKPI 
            title="Estruturas Ameaçadas" 
            value={kpis.estruturasAmeacadas} 
            icon={Flame}
          />
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
