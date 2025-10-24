import { useState, useMemo } from "react";
import { MapPin, Users, Truck, Navigation } from "lucide-react";
import ModuleLayout from "@/components/ModuleLayout";
import CardKPI from "@/components/CardKPI";
import MapViewGeneric from "@/components/MapViewGeneric";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDatasetData } from "@/context/DatasetContext";

const RastreamentoCampo = () => {
  const [viewMode, setViewMode] = useState<'membros' | 'veiculos'>('membros');
  const { membrosEquipe: membrosDataset, veiculos: veiculosDataset } = useDatasetData((data) => ({
    membrosEquipe: data.membrosEquipe,
    veiculos: data.veiculos,
  }));

  // Filtrar apenas itens com localização
  const membrosEmCampo = useMemo(() => 
    membrosDataset.filter((m) => m.localizacaoAtual && m.status === "Em Campo"),
  [membrosDataset]);

  const veiculosRastreados = useMemo(() => 
    veiculosDataset.filter((v) => v.localizacaoAtual),
  [veiculosDataset]);

  const kpis = useMemo(() => ({
    membrosAtivos: membrosEmCampo.length,
    veiculosAtivos: veiculosRastreados.length,
    totalRastreado: membrosEmCampo.length + veiculosRastreados.length,
  }), [membrosEmCampo, veiculosRastreados]);

  return (
    <ModuleLayout title="Rastreamento em Campo" icon={MapPin}>
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardKPI title="Membros em Campo" value={kpis.membrosAtivos} icon={Users} />
          <CardKPI title="Veículos Rastreados" value={kpis.veiculosAtivos} icon={Truck} />
          <CardKPI title="Total Rastreado" value={kpis.totalRastreado} icon={Navigation} />
          <CardKPI 
            title="Integração Frotolog" 
            value={veiculosRastreados.length > 0 ? "Ativa" : "Inativa"} 
            icon={MapPin} 
          />
        </div>

        {/* Tabs */}
        <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="membros">
              <Users className="w-4 h-4 mr-2" />
              Membros ({membrosEmCampo.length})
            </TabsTrigger>
            <TabsTrigger value="veiculos">
              <Truck className="w-4 h-4 mr-2" />
              Veículos ({veiculosRastreados.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="membros" className="mt-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Mapa */}
              <div className="lg:col-span-2">
                <div className="tech-card p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Localização em Tempo Real
                  </h3>
                  <div className="h-[600px] rounded-lg overflow-hidden">
                    <MapViewGeneric
                      items={membrosEmCampo.map(m => ({
                        id: m.id,
                        coords: m.localizacaoAtual!,
                        nome: m.nome,
                        tipo: m.cargo,
                      }))}
                    />
                  </div>
                </div>
              </div>

              {/* Lista */}
              <div className="space-y-4">
                <div className="tech-card p-4">
                  <h3 className="font-semibold mb-4">Membros Rastreados</h3>
                  <div className="space-y-3">
                    {membrosEmCampo.map((membro) => (
                      <div key={membro.id} className="p-3 bg-muted/20 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-medium">{membro.nome}</div>
                            <div className="text-xs text-muted-foreground">{membro.cargo}</div>
                          </div>
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Ativo
                          </Badge>
                        </div>
                        <div className="text-xs font-mono text-muted-foreground">
                          {membro.localizacaoAtual![0].toFixed(4)}, {membro.localizacaoAtual![1].toFixed(4)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="veiculos" className="mt-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Mapa */}
              <div className="lg:col-span-2">
                <div className="tech-card p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    Rastreamento de Frota
                    <Badge variant="outline" className="ml-auto">Frotolog API</Badge>
                  </h3>
                  <div className="h-[600px] rounded-lg overflow-hidden">
                    <MapViewGeneric
                      items={veiculosRastreados.map(v => ({
                        id: v.id,
                        coords: v.localizacaoAtual!,
                        nome: v.placa,
                        tipo: v.modelo,
                      }))}
                    />
                  </div>
                </div>
              </div>

              {/* Lista */}
              <div className="space-y-4">
                <div className="tech-card p-4">
                  <h3 className="font-semibold mb-4">Veículos Rastreados</h3>
                  <div className="space-y-3">
                    {veiculosRastreados.map((veiculo) => (
                      <div key={veiculo.id} className="p-3 bg-muted/20 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-medium">{veiculo.placa}</div>
                            <div className="text-xs text-muted-foreground">{veiculo.modelo}</div>
                          </div>
                          <Badge 
                            variant={veiculo.status === 'Em Uso' ? 'secondary' : 'outline'}
                            className="flex items-center gap-1"
                          >
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            {veiculo.status}
                          </Badge>
                        </div>
                        <div className="text-xs font-mono text-muted-foreground mb-2">
                          {veiculo.localizacaoAtual![0].toFixed(4)}, {veiculo.localizacaoAtual![1].toFixed(4)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {veiculo.kmRodados.toLocaleString()} km rodados
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info de Integração */}
                <div className="tech-card p-4 border-primary/20">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Integração Frotolog
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Dados de localização sincronizados em tempo real via API Frotolog.
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-medium text-green-500">Conexão Ativa</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Informações Adicionais */}
        <div className="tech-card p-6">
          <h3 className="font-semibold mb-3">Recursos de Rastreamento</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-muted/20 rounded-lg">
              <div className="font-medium mb-1">📍 Localização em Tempo Real</div>
              <p className="text-xs text-muted-foreground">
                Acompanhe a posição de membros e veículos instantaneamente
              </p>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg">
              <div className="font-medium mb-1">🔔 Alertas Geográficos</div>
              <p className="text-xs text-muted-foreground">
                Geofences configuráveis para áreas de trabalho
              </p>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg">
              <div className="font-medium mb-1">📊 Histórico de Trajetos</div>
              <p className="text-xs text-muted-foreground">
                Análise de rotas e otimização de deslocamentos
              </p>
            </div>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
};

export default RastreamentoCampo;
