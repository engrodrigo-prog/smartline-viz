import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import ModuleLayout from "@/components/ModuleLayout";
import { Scissors } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useVegOfflineStatus } from "@/modules/vegetacao/offline/useVegOfflineStatus";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/vegetacao" },
  { label: "Anomalias", path: "/vegetacao/anomalias" },
  { label: "Inspeções", path: "/vegetacao/inspecoes" },
  { label: "OS", path: "/vegetacao/os" },
  { label: "Execuções", path: "/vegetacao/execucoes" },
  { label: "Auditorias", path: "/vegetacao/auditorias" },
  { label: "Agenda", path: "/vegetacao/agenda" },
  { label: "Risco", path: "/vegetacao/risco" },
  { label: "Relatórios", path: "/vegetacao/relatorios" },
  { label: "Documentos", path: "/vegetacao/documentos" },
];

export function VegetacaoModuleShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const offline = useVegOfflineStatus();

  return (
    <ModuleLayout title="Vegetação (Poda & Roçada)" icon={Scissors}>
      <div className="px-6 py-6 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap rounded-lg border bg-card/50 px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            {!offline.online ? <Badge variant="destructive">Modo Offline</Badge> : <Badge variant="secondary">Online</Badge>}
            {offline.pendingCount > 0 ? (
              <Badge variant="outline">Pendentes sync: {offline.pendingCount}</Badge>
            ) : (
              <span className="text-sm text-muted-foreground">Sem pendências</span>
            )}
            {offline.lastError ? (
              <span className="text-xs text-muted-foreground">Último erro: {offline.lastError}</span>
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
              {offline.isSyncing ? "Sincronizando…" : "Sincronizar agora"}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm border transition-colors",
                  active
                    ? "bg-sidebar-accent text-slate-100 border-sidebar-border"
                    : "text-slate-300 border-border hover:bg-sidebar-accent/50 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        {children}
      </div>
    </ModuleLayout>
  );
}

export default VegetacaoModuleShell;
