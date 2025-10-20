import { useMemo, useState } from "react";
import { Calendar, Filter, TrendingUp, BarChart3, ShieldAlert } from "lucide-react";
import ModuleLayout from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CardKPI from "@/components/CardKPI";
import { useDemandasAnalytics } from "@/hooks/useDemandas";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";

const ComparativoExecucao = () => {
  const [periodo, setPeriodo] = useState<{ inicio?: string; fim?: string }>({});
  const analyticsQuery = useDemandasAnalytics();
  const analytics = analyticsQuery.data;

  const propria = analytics?.resumos.find((item) => item.executor === "Própria");
  const terceiros = analytics?.resumos.find((item) => item.executor === "Terceiros");

  const chartData = useMemo(() => {
    if (!propria || !terceiros) return [];
    return [
      {
        metric: "Custo Médio (R$/km)",
        propria: propria.custoMedioKm ?? 0,
        terceiros: terceiros.custoMedioKm ?? 0
      },
      {
        metric: "Tempo Médio (dias)",
        propria: propria.tempoMedioDias ?? 0,
        terceiros: terceiros.tempoMedioDias ?? 0
      },
      {
        metric: "Retrabalho (%)",
        propria: propria.retrabalhoPercentual ?? 0,
        terceiros: terceiros.retrabalhoPercentual ?? 0
      },
      {
        metric: "Violação SLA (%)",
        propria: propria.violacaoSlaPercentual ?? 0,
        terceiros: terceiros.violacaoSlaPercentual ?? 0
      }
    ];
  }, [propria, terceiros]);

  return (
    <ModuleLayout title="Analytics - Próprio vs Terceiros" icon={BarChart3}>
      <div className="p-6 space-y-6">
        <section className="tech-card p-4 flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label>Início</Label>
            <Input
              type="date"
              value={periodo.inicio ?? ""}
              onChange={(event) => setPeriodo((prev) => ({ ...prev, inicio: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Fim</Label>
            <Input
              type="date"
              value={periodo.fim ?? ""}
              onChange={(event) => setPeriodo((prev) => ({ ...prev, fim: event.target.value }))}
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2" onClick={() => analyticsQuery.refetch()}>
            <Calendar className="w-4 h-4" />
            Atualizar
          </Button>
          <Badge variant="outline" className="ml-auto">
            Última atualização: {analytics?.atualizadoEm ? new Date(analytics.atualizadoEm).toLocaleString("pt-BR") : "—"}
          </Badge>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardKPI
            title="Custo médio Própria"
            value={propria?.custoMedioKm ? `R$ ${propria.custoMedioKm.toFixed(0)}` : "—"}
            icon={TrendingUp}
          />
          <CardKPI
            title="Custo médio Terceiros"
            value={terceiros?.custoMedioKm ? `R$ ${terceiros.custoMedioKm.toFixed(0)}` : "—"}
            icon={TrendingUp}
          />
          <CardKPI
            title="Retrabalho Própria"
            value={propria?.retrabalhoPercentual ? `${propria.retrabalhoPercentual}%` : "—"}
            icon={Filter}
          />
          <CardKPI
            title="Retrabalho Terceiros"
            value={terceiros?.retrabalhoPercentual ? `${terceiros.retrabalhoPercentual}%` : "—"}
            icon={Filter}
          />
        </section>

        <section className="tech-card p-4">
          <h3 className="text-lg font-semibold mb-4">Comparativo de indicadores</h3>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="propria" name="Turma Própria" fill="#0ea5e9" />
                <Bar dataKey="terceiros" name="Terceiros" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-muted-foreground">Sem dados suficientes para gerar o gráfico.</div>
          )}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="tech-card p-4">
            <h4 className="font-semibold text-lg mb-2">Heat de atrasos</h4>
            <ScrollArea className="max-h-72">
              <div className="space-y-3 pr-2">
                {analytics?.mapaHeat.map((item) => (
                  <div key={`${item.executor}-${item.regiao}`} className="border border-border/60 rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.regiao}</span>
                      <Badge variant={item.executor === "Própria" ? "secondary" : "outline"}>{item.executor}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.total} OS · {item.atrasos} atrasos · {item.reincidencias} reincidências
                    </div>
                  </div>
                ))}
                {(!analytics || analytics.mapaHeat.length === 0) && (
                  <div className="text-sm text-muted-foreground">Sem dados consolidados.</div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="tech-card p-4">
            <h4 className="font-semibold text-lg mb-2">Notas & Riscos</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                • Indicadores marcados como <Badge variant="outline">estimado</Badge> sugerem falta de dados reais.
              </p>
              <p>
                • Priorize missões com violações de SLA superiores a 20%. Avalie plano de ação com equipes terceirizadas
                quando o retrabalho superar 15%.
              </p>
              <p className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="w-4 h-4" />
                Reforce coletas de telemetria em inspeções expressas para reduzir lacunas de dados.
              </p>
            </div>
          </div>
        </section>
      </div>
    </ModuleLayout>
  );
};

export default ComparativoExecucao;
