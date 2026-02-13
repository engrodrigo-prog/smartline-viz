import { Button } from "@/components/ui/button";
import { VegetacaoPageHeader } from "@/modules/vegetacao/components/VegetacaoPageHeader";
import VegetacaoModuleShell from "@/modules/vegetacao/VegetacaoModuleShell";
import { Link } from "react-router-dom";
import CardKPI from "@/components/CardKPI";
import { AlertTriangle, ClipboardList, ClipboardCheck, Scissors, Trees } from "lucide-react";
import { useVegDashboard } from "@/modules/vegetacao/hooks/useVegetacao";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVegOfflineStatus } from "@/modules/vegetacao/offline/useVegOfflineStatus";

export default function VegetacaoDashboardPage() {
  const { data, isLoading, isError, refetch } = useVegDashboard();
  const offline = useVegOfflineStatus();

  return (
    <VegetacaoModuleShell>
      <VegetacaoPageHeader
        title="Dashboard"
        description="KPIs, pendências de sincronização e ações rápidas para operação de campo."
        right={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/vegetacao/agenda">Ver agenda</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/vegetacao/inspecoes">Nova inspeção</Link>
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-[120px] rounded-xl" />
          ))}
        </div>
      ) : isError || !data ? (
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">Falha ao carregar dashboard</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
            <span className="text-sm text-muted-foreground">
              {offline.online
                ? "Verifique autenticação e configuração do backend (/api)."
                : `Você está offline. Pendentes de sync: ${offline.pendingCount}.`}
            </span>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <CardKPI title="Anomalias hoje" value={data.kpis.anomalies_today} icon={AlertTriangle} />
            <CardKPI title="Anomalias mês" value={data.kpis.anomalies_month} icon={AlertTriangle} />
            <CardKPI title="Abertas" value={data.kpis.anomalies_open_total} icon={AlertTriangle} />
            <CardKPI title="OS pendentes" value={data.kpis.work_orders_pending} icon={ClipboardList} />
            <CardKPI title="Execuções no mês" value={data.kpis.actions_executed_month} icon={Scissors} />
            <CardKPI title="Auditorias pendentes" value={data.kpis.audits_pending} icon={ClipboardCheck} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-card/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Ações rápidas</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link to="/vegetacao/anomalias">Criar anomalia</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/vegetacao/execucoes">Nova execução</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/vegetacao/auditorias">Nova auditoria</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/vegetacao/agenda">Agenda</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Pendentes de sync</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {offline.pendingCount} pendente(s). {offline.online ? "Use o botão 'Sincronizar agora' no topo do módulo." : "Conecte-se para sincronizar."}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-card/50 md:col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Anomalias recentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.recent.anomalies.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nenhuma anomalia.</div>
                ) : (
                  data.recent.anomalies.map((a) => (
                    <div key={a.id} className="text-sm">
                      <div className="font-medium truncate">{a.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {a.status} • {a.severity} • {new Date(a.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/50 md:col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" /> Inspeções recentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.recent.inspections.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nenhuma inspeção.</div>
                ) : (
                  data.recent.inspections.map((i) => (
                    <div key={i.id} className="text-sm">
                      <div className="font-medium truncate">{i.status}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {i.requires_action ? "Requer ação" : "Sem ação"} •{" "}
                        {new Date(i.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/50 md:col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trees className="w-4 h-4" /> Execuções recentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.recent.actions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nenhuma execução.</div>
                ) : (
                  data.recent.actions.map((e) => (
                    <div key={e.id} className="text-sm">
                      <div className="font-medium truncate">{e.action_type}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {e.status} • {new Date(e.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </VegetacaoModuleShell>
  );
}
