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
import { useI18n } from "@/context/I18nContext";

export default function VegetacaoDashboardPage() {
  const { data, isLoading, isError, refetch } = useVegDashboard();
  const offline = useVegOfflineStatus();
  const { t, formatDateTime } = useI18n();

  return (
    <VegetacaoModuleShell>
      <VegetacaoPageHeader
        title={t("vegetacao.dashboard.title")}
        description={t("vegetacao.dashboard.description")}
        right={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/vegetacao/agenda">{t("vegetacao.dashboard.actions.viewAgenda")}</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/vegetacao/inspecoes">{t("vegetacao.dashboard.actions.newInspection")}</Link>
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
            <CardTitle className="text-base">{t("vegetacao.dashboard.error.title")}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t("common.retry")}
            </Button>
            <span className="text-sm text-muted-foreground">
              {offline.online
                ? t("vegetacao.dashboard.error.onlineHint")
                : t("vegetacao.dashboard.error.offlineHint", { count: offline.pendingCount })}
            </span>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <CardKPI title={t("vegetacao.dashboard.kpis.anomaliesToday")} value={data.kpis.anomalies_today} icon={AlertTriangle} />
            <CardKPI title={t("vegetacao.dashboard.kpis.anomaliesMonth")} value={data.kpis.anomalies_month} icon={AlertTriangle} />
            <CardKPI title={t("vegetacao.dashboard.kpis.open")} value={data.kpis.anomalies_open_total} icon={AlertTriangle} />
            <CardKPI title={t("vegetacao.dashboard.kpis.workOrdersPending")} value={data.kpis.work_orders_pending} icon={ClipboardList} />
            <CardKPI title={t("vegetacao.dashboard.kpis.actionsMonth")} value={data.kpis.actions_executed_month} icon={Scissors} />
            <CardKPI title={t("vegetacao.dashboard.kpis.auditsPending")} value={data.kpis.audits_pending} icon={ClipboardCheck} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-card/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{t("vegetacao.dashboard.quickActions.title")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link to="/vegetacao/anomalias">{t("vegetacao.dashboard.quickActions.createAnomaly")}</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/vegetacao/execucoes">{t("vegetacao.dashboard.quickActions.newAction")}</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/vegetacao/auditorias">{t("vegetacao.dashboard.quickActions.newAudit")}</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/vegetacao/agenda">{t("vegetacao.dashboard.quickActions.agenda")}</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{t("vegetacao.dashboard.pendingSync.title")}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t("vegetacao.dashboard.pendingSync.body", { count: offline.pendingCount })}{" "}
                {offline.online ? t("vegetacao.dashboard.pendingSync.hintOnline") : t("vegetacao.dashboard.pendingSync.hintOffline")}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-card/50 md:col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {t("vegetacao.dashboard.recent.anomalies")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.recent.anomalies.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t("vegetacao.dashboard.recent.none")}</div>
                ) : (
                  data.recent.anomalies.map((a) => (
                    <div key={a.id} className="text-sm">
                      <div className="font-medium truncate">{a.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {a.status} • {a.severity} • {formatDateTime(a.created_at)}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/50 md:col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" /> {t("vegetacao.dashboard.recent.inspections")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.recent.inspections.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t("vegetacao.dashboard.recent.none")}</div>
                ) : (
                  data.recent.inspections.map((i) => (
                    <div key={i.id} className="text-sm">
                      <div className="font-medium truncate">{i.status}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {i.requires_action ? t("vegetacao.dashboard.recent.requiresAction") : t("vegetacao.dashboard.recent.noAction")} •{" "}
                        {formatDateTime(i.created_at)}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/50 md:col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trees className="w-4 h-4" /> {t("vegetacao.dashboard.recent.actions")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.recent.actions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t("vegetacao.dashboard.recent.none")}</div>
                ) : (
                  data.recent.actions.map((e) => (
                    <div key={e.id} className="text-sm">
                      <div className="font-medium truncate">{e.action_type}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {e.status} • {formatDateTime(e.created_at)}
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
