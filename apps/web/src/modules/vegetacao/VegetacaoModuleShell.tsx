import type { ReactNode } from "react";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useVegOfflineStatus } from "@/modules/vegetacao/offline/useVegOfflineStatus";
import { useI18n } from "@/context/I18nContext";

export function VegetacaoModuleShell({ children }: { children: ReactNode }) {
  const offline = useVegOfflineStatus();
  const { t } = useI18n();

  return (
    <AppLayout title={t("sidebar.categories.vegetationOps")} subtitle={t("vegetacao.moduleSubtitle")}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap rounded-lg border bg-card/50 px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            {!offline.online ? (
              <Badge variant="destructive">{t("vegetacao.offline.badge.offline")}</Badge>
            ) : (
              <Badge variant="secondary">{t("vegetacao.offline.badge.online")}</Badge>
            )}
            {offline.pendingCount > 0 ? (
              <Badge variant="outline">{t("vegetacao.offline.pending", { count: offline.pendingCount })}</Badge>
            ) : (
              <span className="text-sm text-muted-foreground">{t("vegetacao.offline.noPending")}</span>
            )}
            {offline.lastError ? (
              <span className="text-xs text-muted-foreground">{t("vegetacao.offline.lastError", { error: offline.lastError })}</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={offline.syncNow}
              disabled={!offline.canSync}
            >
              {offline.isSyncing ? t("vegetacao.offline.syncing") : t("vegetacao.offline.syncNow")}
            </Button>
          </div>
        </div>
        {children}
      </div>
    </AppLayout>
  );
}

export default VegetacaoModuleShell;
