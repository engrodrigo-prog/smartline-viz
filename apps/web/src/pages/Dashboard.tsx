import { useMemo, useState } from "react";
import { Map, Network, MapPin, Route, TreePine, GitBranch, CheckCircle, AlertTriangle, Activity, Database } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import FilterPanel from "@/components/FilterPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import UnifiedMapView from "@/features/map/UnifiedMapView";
import QuickAccessGrid, { type QuickAccessItem } from "@/features/dashboard/components/QuickAccessGrid";
import KpiGrid, { type KpiCard } from "@/features/dashboard/components/KpiGrid";
import PerformanceCharts from "@/features/dashboard/components/PerformanceCharts";
import TimelineChart from "@/features/dashboard/components/TimelineChart";
import RecentSensorsTable from "@/features/dashboard/components/RecentSensorsTable";
import { useDashboardData } from "@/features/dashboard/hooks/useDashboardData";
import { useSelectionContext } from "@/context/SelectionContext";
import { useLipowerlineKpi } from "@/hooks/useLipowerlineKpi";
import { useSimulacaoRisco } from "@/hooks/useSimulacaoRisco";

const Dashboard = () => {
  const { chartData, metrics, sensorsWithDate } = useDashboardData();
  const {
    linhas,
    linhaSelecionadaId,
    setLinhaSelecionadaId,
    cenarios,
    cenarioSelecionadoId,
    setCenarioSelecionadoId,
  } = useSelectionContext();
  const kpiQuery = useLipowerlineKpi(linhaSelecionadaId, cenarioSelecionadoId);
  const simulacao = useSimulacaoRisco();
  const [simTopN, setSimTopN] = useState(20);
  const numberFormatter = useMemo(() => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }), []);

  // TODO Supabase: substituir quick links por destinos condicionais assim que o dataset LiPowerline estiver conectado.

  const quickLinks: QuickAccessItem[] = [
    {
      id: "mapa-eventos",
      title: "Mapa de Eventos",
      description: "Visualização geográfica de ativos",
      to: "/visual/mapa",
      Icon: Map,
      iconWrapperClass: "bg-primary/10",
      iconClass: "text-primary",
    },
    {
      id: "unifilar",
      title: "Diagrama Unifilar",
      description: "Topologia da linha",
      to: "/visual/unifilar",
      Icon: Network,
      iconWrapperClass: "bg-secondary/10",
      iconClass: "text-secondary",
    },
    {
      id: "rastreamento",
      title: "Rastreamento",
      description: "Equipes em campo",
      to: "/equipes/rastreamento",
      Icon: MapPin,
      iconWrapperClass: "bg-blue-500/10",
      iconClass: "text-blue-500",
    },
  ];

  const kpiCards: KpiCard[] = kpiQuery.data
    ? [
        {
          id: "km-linha",
          title: "Extensão monitorada",
          value: `${numberFormatter.format(kpiQuery.data.kmLinha)} km`,
          icon: Route,
          description: kpiQuery.data.nomeLinha ?? kpiQuery.data.codigoLinha,
        },
        {
          id: "vaos",
          title: "Vãos analisados",
          value: new Intl.NumberFormat("pt-BR").format(kpiQuery.data.totalVaos),
          icon: Network,
        },
        {
          id: "arvores",
          title: "Árvores críticas",
          value: new Intl.NumberFormat("pt-BR").format(kpiQuery.data.arvoresCriticas),
          icon: TreePine,
        },
        {
          id: "cruzamentos",
          title: "Cruzamentos críticos",
          value: new Intl.NumberFormat("pt-BR").format(kpiQuery.data.cruzamentosCriticos),
          icon: GitBranch,
        },
      ]
    : [
        {
          id: "operational",
          title: "Ativos Operacionais",
          value: metrics.operationalAssets,
          icon: CheckCircle,
          trend: { value: 5.2, isPositive: true },
        },
        {
          id: "alerts",
          title: "Alertas Críticos",
          value: metrics.criticalAlerts,
          icon: AlertTriangle,
          trend: { value: 12.3, isPositive: false },
        },
        {
          id: "health",
          title: "Health Score Médio",
          value: `${metrics.avgHealthScore}%`,
          icon: Activity,
          trend: { value: 3.1, isPositive: true },
        },
        {
          id: "sensors",
          title: "Sensores Ativos",
          value: metrics.totalSensors,
          icon: Database,
        },
      ];

  const handleSimular = () => {
    if (!linhaSelecionadaId || !cenarioSelecionadoId) return;
    simulacao.mutate({
      linhaId: linhaSelecionadaId,
      cenarioId: cenarioSelecionadoId,
      topN: simTopN,
    });
  };

  return (
    <AppLayout title="Dashboard Principal" subtitle="Visão geral do sistema AssetHealth">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Linha monitorada</p>
            <Select value={linhaSelecionadaId ?? ""} onValueChange={setLinhaSelecionadaId} disabled={!linhas.length}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma linha" />
              </SelectTrigger>
              <SelectContent>
                {linhas.map((linha) => (
                  <SelectItem key={linha.linhaId} value={linha.linhaId}>
                    {linha.nome ?? linha.codigo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cenário</p>
            <Select
              value={cenarioSelecionadoId ?? ""}
              onValueChange={setCenarioSelecionadoId}
              disabled={!cenarios.length}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cenário" />
              </SelectTrigger>
              <SelectContent>
                {cenarios.map((cenario) => (
                  <SelectItem key={cenario.cenarioId} value={cenario.cenarioId}>
                    {cenario.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {kpiQuery.isFallback && (
          <p className="text-xs text-muted-foreground">
            Aguardando dados do backend. Exibindo valores de demonstração sincronizados com o dataset local.
          </p>
        )}
        <FilterPanel />

        {/* Tabs: Dashboard e Mapa */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="mapa">Mapa</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <QuickAccessGrid links={quickLinks} />
            <KpiGrid cards={kpiCards} />
            <Card>
              <CardHeader>
                <CardTitle>Simulação de Risco (MVP)</CardTitle>
                <CardDescription>
                  Estima a redução de risco ao tratar os vãos mais críticos da linha selecionada (LiPowerline).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-muted-foreground tracking-wide">Top N vãos</p>
                    <Input
                      type="number"
                      min={1}
                      value={simTopN}
                      onChange={(event) => setSimTopN(Math.max(1, Number(event.target.value) || 1))}
                      disabled={!linhaSelecionadaId || !cenarioSelecionadoId}
                    />
                    <Button
                      onClick={handleSimular}
                      disabled={
                        !linhaSelecionadaId ||
                        !cenarioSelecionadoId ||
                        simulacao.isPending
                      }
                    >
                      {simulacao.isPending ? "Simulando..." : "Simular"}
                    </Button>
                    {!linhaSelecionadaId && (
                      <p className="text-xs text-muted-foreground">Selecione uma linha para habilitar a simulação.</p>
                    )}
                  </div>
                  <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <div className="tech-card p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Risco atual</p>
                      <p className="text-2xl font-semibold">
                        {simulacao.data ? numberFormatter.format(simulacao.data.riscoAtual) : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total de vãos monitorados: {simulacao.data?.totalVaos ?? "—"}
                      </p>
                    </div>
                    <div className="tech-card p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Após tratamento</p>
                      <p className="text-2xl font-semibold text-emerald-500">
                        {simulacao.data ? numberFormatter.format(simulacao.data.riscoPosTratamento) : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Redução:{" "}
                        {simulacao.data
                          ? `${numberFormatter.format(simulacao.data.reducaoAbsoluta)} (${numberFormatter.format(
                              simulacao.data.reducaoPercentual,
                            )}%)`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
                {simulacao.error && (
                  <p className="text-xs text-destructive">
                    Não foi possível executar a simulação. Tente novamente.
                  </p>
                )}
              </CardContent>
            </Card>
            <PerformanceCharts chartData={chartData} />
            <TimelineChart data={chartData.timeline} />
            <RecentSensorsTable sensors={sensorsWithDate} />
          </TabsContent>

          {/* Aba Mapa */}
          <TabsContent value="mapa" className="h-[calc(100vh-250px)]">
            <UnifiedMapView />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
