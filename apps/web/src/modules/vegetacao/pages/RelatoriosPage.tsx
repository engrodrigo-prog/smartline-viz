import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { VegetacaoPageHeader } from "@/modules/vegetacao/components/VegetacaoPageHeader";
import VegetacaoModuleShell from "@/modules/vegetacao/VegetacaoModuleShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CardKPI from "@/components/CardKPI";
import DataTableAdvanced from "@/components/DataTableAdvanced";
import { BarChart3, CalendarDays, Download, Hand, Scissors, Trees, Zap } from "lucide-react";
import { vegApi } from "@/modules/vegetacao/api/vegetacaoApi";
import type {
  VegActionType,
  VegReportsDimension,
  VegReportsGroupBy,
  VegReportsQueryItem,
  VegReportsQueryRequest,
} from "@/modules/vegetacao/api/vegetacaoApi";

const GROUP_LABEL: Record<VegReportsGroupBy, string> = { day: "Dia", week: "Semana", month: "Mês" };
const ACTION_LABEL: Record<VegActionType, string> = {
  pruning: "Poda",
  mowing: "Roçada",
  laser_pruning: "Poda a laser",
  tree_removal: "Supressão",
  clearing: "Limpeza",
  inspection: "Inspeção",
  verification: "Verificação",
  other: "Outros",
};

const tabLabel = (tab: VegReportsDimension) => {
  if (tab === "period") return "Por Período";
  if (tab === "team") return "Por Equipe";
  if (tab === "operator") return "Por Operador";
  return "Por Localização";
};

const keyLabel = (tab: VegReportsDimension) => {
  if (tab === "period") return "Período";
  if (tab === "team") return "Equipe";
  if (tab === "operator") return "Operador";
  return "Localização";
};

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

const parseIsoDay = (value: string) => {
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const inclusiveDays = (from: string, to: string) => {
  const a = parseIsoDay(from);
  const b = parseIsoDay(to);
  if (!a || !b) return null;
  const diff = Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
  return diff >= 0 ? diff + 1 : null;
};

const csvEscape = (value: unknown) => {
  const s = String(value ?? "");
  return `"${s.replace(/"/g, '""')}"`;
};

const buildCsv = (items: VegReportsQueryItem[]) => {
  const unitKeys = new Set<string>();
  const typeKeys = new Set<string>();
  for (const item of items) {
    for (const k of Object.keys(item.units ?? {})) unitKeys.add(k);
    for (const k of Object.keys(item.by_type ?? {})) typeKeys.add(k);
  }
  const units = Array.from(unitKeys).sort();
  const types = Array.from(typeKeys).sort();

  const header = [
    "key",
    "total_actions",
    "total_quantity",
    ...units.map((u) => `unit_${u}`),
    ...types.map((t) => `type_${t}`),
  ];

  const lines = [header.map(csvEscape).join(",")];
  for (const item of items) {
    const row = [
      item.key,
      item.total_actions,
      item.total_quantity,
      ...units.map((u) => item.units?.[u] ?? 0),
      ...types.map((t) => item.by_type?.[t] ?? 0),
    ];
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\n");
};

export default function RelatoriosPage() {
  const today = useMemo(() => new Date(), []);
  const [tab, setTab] = useState<VegReportsDimension>("period");
  const [filters, setFilters] = useState<{
    date_from: string;
    date_to: string;
    group_by: VegReportsGroupBy;
    team_id: string;
    operator_id: string;
  }>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);
    return {
      date_from: isoDate(from),
      date_to: isoDate(to),
      group_by: "day",
      team_id: "",
      operator_id: "",
    };
  });

  const queryMutation = useMutation({
    mutationFn: (payload: VegReportsQueryRequest) => vegApi.reportsQuery(payload),
  });

  const payload = useMemo<VegReportsQueryRequest>(() => {
    return {
      date_from: filters.date_from,
      date_to: filters.date_to,
      group_by: filters.group_by,
      dimension: tab,
      ...(filters.team_id.trim() ? { team_id: filters.team_id.trim() } : {}),
      ...(filters.operator_id.trim() ? { operator_id: filters.operator_id.trim() } : {}),
    };
  }, [filters.date_from, filters.date_to, filters.group_by, filters.operator_id, filters.team_id, tab]);

  const run = async () => {
    const days = inclusiveDays(filters.date_from, filters.date_to);
    if (!days) {
      toast.error("Período inválido", { description: "Verifique data inicial/final (YYYY-MM-DD)." });
      return;
    }
    try {
      await queryMutation.mutateAsync(payload);
    } catch (err: any) {
      toast.error("Falha ao gerar relatório", { description: err?.message ?? String(err) });
    }
  };

  const report = queryMutation.data;
  const items = report?.items ?? [];

  const totals = useMemo(() => {
    if (!report) return null;
    const unitTotals: Record<string, number> = {};
    const typeTotals: Record<string, number> = {};
    let totalActions = 0;
    let totalQuantity = 0;

    for (const item of report.items) {
      totalActions += item.total_actions ?? 0;
      totalQuantity += item.total_quantity ?? 0;
      for (const [unit, value] of Object.entries(item.units ?? {})) {
        unitTotals[unit] = (unitTotals[unit] ?? 0) + (typeof value === "number" ? value : 0);
      }
      for (const [t, value] of Object.entries(item.by_type ?? {})) {
        typeTotals[t] = (typeTotals[t] ?? 0) + (typeof value === "number" ? value : 0);
      }
    }

    const laser = typeTotals.laser_pruning ?? 0;
    const mowing = typeTotals.mowing ?? 0;
    const manual = Math.max(0, totalActions - laser - mowing);
    const pct = (n: number) => (totalActions > 0 ? Math.round((n / totalActions) * 100) : 0);

    const days = inclusiveDays(report.meta.date_from, report.meta.date_to) ?? 1;
    const avgPerDay = totalActions / Math.max(1, days);

    return {
      totalActions,
      totalQuantity,
      unitTotals,
      typeTotals,
      pctLaser: pct(laser),
      pctMowing: pct(mowing),
      pctManual: pct(manual),
      avgPerDay,
      days,
    };
  }, [report]);

  const exportCsv = () => {
    if (!report || report.items.length === 0) {
      toast.error("Nada para exportar");
      return;
    }
    const csv = buildCsv(report.items);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vegetacao_relatorio_${report.meta.dimension}_${report.meta.date_from}_${report.meta.date_to}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const keyColLabel = keyLabel(tab);

  const columns = [
    {
      key: "key",
      label: keyColLabel,
      render: (_: unknown, row: VegReportsQueryItem) => <span className="font-medium">{row.key}</span>,
    },
    { key: "total_actions", label: "Atuações", render: (_: unknown, row: VegReportsQueryItem) => row.total_actions ?? 0 },
    {
      key: "total_quantity",
      label: "Qtd.",
      render: (_: unknown, row: VegReportsQueryItem) => row.total_quantity ?? 0,
    },
    {
      key: "units",
      label: "Unidades",
      sortable: false,
      render: (_: unknown, row: VegReportsQueryItem) => {
        const entries = Object.entries(row.units ?? {}).filter(([, v]) => typeof v === "number" && v !== 0);
        if (entries.length === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="text-sm">
            {entries
              .slice(0, 4)
              .map(([k, v]) => `${v} ${k}`)
              .join(" • ")}
            {entries.length > 4 ? " …" : ""}
          </span>
        );
      },
    },
    {
      key: "by_type",
      label: "Tipos",
      sortable: false,
      render: (_: unknown, row: VegReportsQueryItem) => {
        const entries = Object.entries(row.by_type ?? {}).filter(([, v]) => typeof v === "number" && v !== 0);
        if (entries.length === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="text-sm">
            {entries
              .slice(0, 4)
              .map(([k, v]) => `${ACTION_LABEL[k as VegActionType] ?? k}: ${v}`)
              .join(" • ")}
            {entries.length > 4 ? " …" : ""}
          </span>
        );
      },
    },
  ];

  return (
    <VegetacaoModuleShell>
      <VegetacaoPageHeader
        title="Relatórios"
        description="Análises por período, equipe, operador e localização com export CSV."
        right={
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!report || report.items.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as VegReportsDimension)}>
        <TabsList className="w-full justify-start">
          {(["period", "team", "operator", "location"] as VegReportsDimension[]).map((dim) => (
            <TabsTrigger key={dim} value={dim}>
              {tabLabel(dim)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab}>
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-6">
              <div className="space-y-1">
                <Label>Data inicial</Label>
                <Input
                  type="date"
                  value={filters.date_from}
                  max={isoDate(today)}
                  onChange={(e) => setFilters((s) => ({ ...s, date_from: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Data final</Label>
                <Input
                  type="date"
                  value={filters.date_to}
                  max={isoDate(today)}
                  onChange={(e) => setFilters((s) => ({ ...s, date_to: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Agrupar por</Label>
                <Select value={filters.group_by} onValueChange={(v) => setFilters((s) => ({ ...s, group_by: v as VegReportsGroupBy }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(GROUP_LABEL) as VegReportsGroupBy[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {GROUP_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Equipe (opcional)</Label>
                <Input
                  value={filters.team_id}
                  onChange={(e) => setFilters((s) => ({ ...s, team_id: e.target.value }))}
                  placeholder="UUID"
                />
              </div>
              <div className="space-y-1">
                <Label>Operador (opcional)</Label>
                <Input
                  value={filters.operator_id}
                  onChange={(e) => setFilters((s) => ({ ...s, operator_id: e.target.value }))}
                  placeholder="UUID"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={run} disabled={queryMutation.isPending} className="w-full">
                  {queryMutation.isPending ? "Gerando…" : "Gerar"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {queryMutation.isError ? (
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="text-base">Falha ao gerar relatório</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Verifique autenticação, permissões e período selecionado.
              </CardContent>
            </Card>
          ) : !report ? (
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="text-base">Gere um relatório</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Selecione período e clique em <span className="font-medium text-foreground">Gerar</span>.
              </CardContent>
            </Card>
          ) : report.items.length === 0 ? (
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="text-base">Sem dados</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Nenhuma execução encontrada no período selecionado.
              </CardContent>
            </Card>
          ) : (
            <>
              {totals ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <CardKPI title="Total atuações" value={totals.totalActions} icon={Scissors} />
                  <CardKPI
                    title="Qtd. total"
                    value={Math.round(totals.totalQuantity * 100) / 100}
                    icon={Trees}
                    description={Object.entries(totals.unitTotals)
                      .slice(0, 3)
                      .map(([k, v]) => `${Math.round(v * 100) / 100} ${k}`)
                      .join(" • ") || "—"}
                  />
                  <CardKPI
                    title="Média por dia"
                    value={totals.avgPerDay.toFixed(2)}
                    icon={CalendarDays}
                    description={`${totals.days} dia(s) no período`}
                  />
                  <CardKPI title="% Laser" value={`${totals.pctLaser}%`} icon={Zap} />
                  <CardKPI title="% Manual" value={`${totals.pctManual}%`} icon={Hand} />
                  <CardKPI title="% Roçada" value={`${totals.pctMowing}%`} icon={Trees} />
                </div>
              ) : null}

              <div className="tech-card p-4">
                <DataTableAdvanced
                  columns={columns as any}
                  data={items}
                  title={`Resultado (${items.length})`}
                  loading={queryMutation.isPending}
                />
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </VegetacaoModuleShell>
  );
}
