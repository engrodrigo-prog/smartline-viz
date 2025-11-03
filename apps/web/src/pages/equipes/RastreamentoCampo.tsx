import { useEffect, useMemo, useState } from "react";
import { MapPin, Users, Truck, Navigation, Trophy } from "lucide-react";
import ModuleLayout from "@/components/ModuleLayout";
import CardKPI from "@/components/CardKPI";
import MapViewGeneric from "@/components/MapViewGeneric";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDatasetData } from "@/context/DatasetContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type DemoUser = { id: string; display_name: string } | null;

const DEMO_USER_STORAGE_KEY = "smartline-demo-user";

const loadDemoUser = (): DemoUser => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DEMO_USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DemoUser) : null;
  } catch {
    return null;
  }
};

const RastreamentoCampo = () => {
  const [viewMode, setViewMode] = useState<'membros' | 'veiculos'>('membros');
  const { membrosEquipe: membrosDataset, veiculos: veiculosDataset, equipes: equipesDataset, checklists: checklistsDataset } = useDatasetData((data) => ({
    membrosEquipe: data.membrosEquipe,
    veiculos: data.veiculos,
    equipes: data.equipes,
    checklists: data.checklists,
  }));

  // Filtros por hierarquia (Região -> Equipe) + visibilidade
  const [selectedRegiao, setSelectedRegiao] = useState<string>("all");
  const [selectedEquipe, setSelectedEquipe] = useState<string>("auto");
  const [verOutrasEquipes, setVerOutrasEquipes] = useState<boolean>(true);

  // Detectar "minha equipe" a partir do usuário demo (se houver)
  const [myEquipeId, setMyEquipeId] = useState<string | null>(null);
  useEffect(() => {
    const user = loadDemoUser();
    if (!user) {
      setMyEquipeId(equipesDataset?.[0]?.id ?? null);
      return;
    }
    // Encontrar membro por nome aproximado e inferir equipe
    const membro = membrosDataset.find((m) =>
      m.nome.toLowerCase().includes(user.display_name?.split(" ")[0]?.toLowerCase() || "")
    );
    const equipe = membro
      ? equipesDataset.find((e) => e.membros.includes(membro.id))
      : equipesDataset?.[0];
    setMyEquipeId(equipe?.id ?? null);
  }, [membrosDataset, equipesDataset]);

  // Equipes disponíveis por região
  const regioes = useMemo(() => Array.from(new Set(equipesDataset.map((e) => e.regiao))), [equipesDataset]);
  const equipesFiltradasPorRegiao = useMemo(
    () => equipesDataset.filter((e) => selectedRegiao === "all" || e.regiao === selectedRegiao),
    [equipesDataset, selectedRegiao]
  );

  // Equipe efetiva selecionada
  const effectiveEquipeId = useMemo(() => {
    if (selectedEquipe === "auto") return myEquipeId || equipesDataset?.[0]?.id || null;
    if (selectedEquipe === "all") return null; // todas
    return selectedEquipe;
  }, [selectedEquipe, myEquipeId, equipesDataset]);

  // Cálculo de XP por equipe (demo): horas de membros + checklists aprovadas + veículos em uso + status
  const xpPorEquipe = useMemo(() => {
    const map = new Map<string, number>();
    for (const eq of equipesDataset) {
      const membrosIds = new Set(eq.membros);
      const horas = membrosDataset
        .filter((m) => membrosIds.has(m.id))
        .reduce((acc, m) => acc + (m.horasTrabalhadas?.mes || 0), 0);
      const checklistsAprovadas = checklistsDataset.filter((c) => c.equipe === eq.id && c.aprovado).length;
      const veiculosEmUso = veiculosDataset.filter((v) => v.equipePrincipal === eq.id && v.status === 'Em Uso').length;
      const statusBonus = eq.status === 'Em Missão' ? 50 : eq.status === 'Ativa' ? 20 : 0;
      const xp = Math.round(horas + checklistsAprovadas * 30 + veiculosEmUso * 20 + statusBonus);
      map.set(eq.id, xp);
    }
    return map;
  }, [equipesDataset, membrosDataset, checklistsDataset, veiculosDataset]);

  const xpEquipeSelecionada = effectiveEquipeId ? xpPorEquipe.get(effectiveEquipeId) || 0 : 0;

  // Filtrar apenas itens com localização
  const membrosEmCampo = useMemo(() => {
    let data = membrosDataset.filter((m) => m.localizacaoAtual && m.status === "Em Campo");
    // Se não pode ver outras equipes, restringe à minha equipe
    if (!verOutrasEquipes && myEquipeId) {
      const eq = equipesDataset.find((e) => e.id === myEquipeId);
      if (eq) data = data.filter((m) => eq.membros.includes(m.id));
      return data;
    }
    // Caso contrário, aplica filtros de hierarquia
    const eqIdsElegiveis = new Set(
      equipesFiltradasPorRegiao
        .filter((e) => !effectiveEquipeId || e.id === effectiveEquipeId)
        .map((e) => e.membros)
        .flat(),
    );
    return data.filter((m) => eqIdsElegiveis.size === 0 || eqIdsElegiveis.has(m.id));
  }, [membrosDataset, verOutrasEquipes, myEquipeId, equipesDataset, equipesFiltradasPorRegiao, effectiveEquipeId]);

  const veiculosRastreados = useMemo(() => {
    let data = veiculosDataset.filter((v) => v.localizacaoAtual);
    if (!verOutrasEquipes && myEquipeId) return data.filter((v) => v.equipePrincipal === myEquipeId);
    return data.filter((v) => {
      const eqOkRegiao = selectedRegiao === "all" || !!equipesDataset.find((e) => e.id === v.equipePrincipal && e.regiao === selectedRegiao);
      const eqOk = !effectiveEquipeId || v.equipePrincipal === effectiveEquipeId;
      return eqOkRegiao && eqOk;
    });
  }, [veiculosDataset, verOutrasEquipes, myEquipeId, selectedRegiao, effectiveEquipeId, equipesDataset]);

  const kpis = useMemo(() => ({
    membrosAtivos: membrosEmCampo.length,
    veiculosAtivos: veiculosRastreados.length,
    totalRastreado: membrosEmCampo.length + veiculosRastreados.length,
  }), [membrosEmCampo, veiculosRastreados]);

  return (
    <ModuleLayout title="Rastreamento em Campo" icon={MapPin}>
      <div className="p-6 space-y-6">
        {/* Barra de filtros por hierarquia */}
        <div className="tech-card p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Região</label>
              <Select value={selectedRegiao} onValueChange={setSelectedRegiao}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {regioes.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Equipe</label>
              <Select value={selectedEquipe} onValueChange={setSelectedEquipe}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Minha equipe</SelectItem>
                  <SelectItem value="all">Todas</SelectItem>
                  {equipesFiltradasPorRegiao.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Ver outras equipes</label>
                <div className="flex items-center gap-2">
                  <Switch checked={verOutrasEquipes} onCheckedChange={setVerOutrasEquipes} id="ver-outras-equipes" />
                  <span className="text-xs text-muted-foreground">Líderes podem visualizar equipes da hierarquia</span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">XP da Equipe</label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                <Trophy className="w-4 h-4 text-primary" />
                <div className="text-sm">
                  <span className="font-semibold">{xpEquipeSelecionada} XP</span>
                </div>
              </div>
            </div>
          </div>
        </div>

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
