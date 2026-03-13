import { useMemo, useState } from "react";
import { Building2, Route, Ruler, ThermometerSun, Trees } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import CardKPI from "@/components/CardKPI";
import FiltersBar from "@/components/FiltersBar";
import ModuleDemoBanner from "@/components/ModuleDemoBanner";
import ModuleLayout from "@/components/ModuleLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFilters } from "@/context/FiltersContext";
import {
  clearanceAlerts,
  clearanceProcessSteps,
  formatShortDate,
  lineLabel,
  lineRegional,
  matchesOperationalFilters,
} from "@/features/placeholder-pages/transmissionOpsMock";
import {
  MetricBarList,
  PanelCard,
  ProcessRail,
  ScenarioHero,
  ToneBadge,
} from "@/features/placeholder-pages/PlaceholderPageKit";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const riskTone = (risk: string) => {
  if (risk === "Alta") return "danger" as const;
  if (risk === "Média") return "warning" as const;
  return "success" as const;
};

const statusTone = (status: string) => {
  if (status === "Reengenharia") return "danger" as const;
  if (status === "Escalonado para faixa" || status === "Janela programada") return "warning" as const;
  return "info" as const;
};

export default function DistanciaSeguranca() {
  const { filters } = useFilters();
  const [elementoFilter, setElementoFilter] = useState<string>("");
  const [criticidadeFilter, setCriticidadeFilter] = useState<string>("");

  const filteredData = useMemo(() => {
    return clearanceAlerts.filter((item) => {
      if (elementoFilter && item.elemento !== elementoFilter) return false;
      if (criticidadeFilter && item.criticidade !== criticidadeFilter) return false;

      return matchesOperationalFilters(item, filters, [
        item.subtrecho,
        item.municipio,
        item.elemento,
        item.status,
        item.origem,
        item.proximaAcao,
      ]);
    });
  }, [criticidadeFilter, elementoFilter, filters]);

  const kpis = useMemo(() => {
    const minDelta = filteredData.reduce((acc, item) => Math.min(acc, item.medidoM - item.exigidoM), 0);
    const avgDelta =
      filteredData.reduce((acc, item) => acc + (item.medidoM - item.exigidoM), 0) / (filteredData.length || 1);

    return {
      total: filteredData.length,
      highRisk: filteredData.filter((item) => item.criticidade === "Alta").length,
      avgDelta,
      dispatched: filteredData.filter((item) => item.status !== "Validar em campo").length,
      minDelta,
    };
  }, [filteredData]);

  const gapChartData = useMemo(
    () =>
      filteredData
        .map((item) => ({
          id: item.id,
          delta: Number((item.medidoM - item.exigidoM).toFixed(1)),
          medido: item.medidoM,
          exigido: item.exigidoM,
          item,
        }))
        .sort((a, b) => a.delta - b.delta),
    [filteredData],
  );

  const byElemento = useMemo(() => {
    const counts = filteredData.reduce<Record<string, number>>((acc, item) => {
      acc[item.elemento] = (acc[item.elemento] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredData]);

  const byMunicipio = useMemo(() => {
    const groups = filteredData.reduce<Record<string, { total: number; score: number }>>((acc, item) => {
      const current = acc[item.municipio] ?? { total: 0, score: 0 };
      current.total += 1;
      current.score += clamp(100 + (item.medidoM - item.exigidoM) * 18, 10, 100);
      acc[item.municipio] = current;
      return acc;
    }, {});

    return Object.entries(groups)
      .map(([label, value]) => ({
        label,
        helper: `${value.total} casos no filtro`,
        value: value.score / value.total,
        tone: value.score / value.total < 55 ? "danger" : value.score / value.total < 75 ? "warning" : "success",
      }))
      .sort((a, b) => a.value - b.value);
  }, [filteredData]);

  const actionQueue = useMemo(
    () => [...filteredData].sort((a, b) => b.score - a.score || a.medidoM - a.exigidoM - (b.medidoM - b.exigidoM)),
    [filteredData],
  );

  const byLine = useMemo(() => {
    const groups = filteredData.reduce<Record<string, { total: number; delta: number }>>((acc, item) => {
      const current = acc[item.linha] ?? { total: 0, delta: 0 };
      current.total += 1;
      current.delta += item.medidoM - item.exigidoM;
      acc[item.linha] = current;
      return acc;
    }, {});

    return Object.entries(groups).map(([linha, value]) => {
      const avgDelta = value.delta / value.total;
      return {
        label: lineLabel(linha),
        helper: `${value.total} casos priorizados`,
        value: clamp(100 + avgDelta * 15, 12, 100),
        valueLabel: `${avgDelta.toFixed(1)} m`,
        tone: avgDelta < -0.6 ? "danger" : avgDelta < 0 ? "warning" : "success",
      };
    });
  }, [filteredData]);

  return (
    <ModuleLayout title="Distâncias de Segurança" icon={Ruler}>
      <div className="space-y-6 p-6">
        <ModuleDemoBanner />

        <ScenarioHero
          eyebrow="Dados simulados aderentes ao fluxo CPFL"
          title="Painel de gabarito para linha, faixa e engenharia trabalharem sobre a mesma régua."
          description="A leitura cruza LiDAR, ortomosaico, comportamento térmico e contexto fundiário para separar o que é poda, o que é ocupação irregular e o que precisa de reengenharia. O objetivo aqui é demonstrar um corredor operacional verossímil, no mesmo tom técnico da landing e já conectado com a jornada de gestão de linhas."
          tags={["LiDAR + ortomosaico", "Fila integrada com faixa", "Critério de gabarito por trecho"]}
          stats={[
            { label: "Corredor foco", value: lineRegional(filteredData[0]?.linha ?? "LT-003"), tone: "info" },
            { label: "Casos no recorte", value: String(kpis.total), tone: "warning" },
            { label: "Maior exposição", value: `${kpis.minDelta.toFixed(1)} m`, tone: "danger" },
            { label: "Ações encaminhadas", value: String(kpis.dispatched), tone: "success" },
          ]}
        />

        <FiltersBar>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Elemento interferente</label>
              <select
                value={elementoFilter}
                onChange={(event) => setElementoFilter(event.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="Vegetação">Vegetação</option>
                <option value="Edificação">Edificação</option>
                <option value="Solo">Solo</option>
                <option value="Flecha térmica">Flecha térmica</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Criticidade</label>
              <select
                value={criticidadeFilter}
                onChange={(event) => setCriticidadeFilter(event.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todas</option>
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Baixa">Baixa</option>
              </select>
            </div>
          </div>
        </FiltersBar>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <CardKPI title="Casos priorizados" value={kpis.total} icon={Route} />
          <CardKPI title="Criticidade alta" value={kpis.highRisk} icon={ThermometerSun} />
          <CardKPI title="Folga média" value={`${kpis.avgDelta.toFixed(1)} m`} icon={Ruler} description="Medição menos exigência" />
          <CardKPI title="Fila já despachada" value={kpis.dispatched} icon={Trees} description="Poda, faixa ou engenharia" />
        </div>

        <Tabs defaultValue="painel" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="painel">Painel executivo</TabsTrigger>
            <TabsTrigger value="fila">Fila de intervenção</TabsTrigger>
            <TabsTrigger value="corredor">Corredor digital</TabsTrigger>
          </TabsList>

          <TabsContent value="painel" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.45fr,1fr]">
              <PanelCard
                title="Folga medida x gabarito por caso"
                description="Valores negativos indicam trechos abaixo do gabarito esperado para a condição modelada."
              >
                <div className="h-[330px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gapChartData} margin={{ top: 8, right: 16, left: 0, bottom: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="id" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} unit="m" />
                      <Tooltip
                        formatter={(value: number) => [`${value.toFixed(1)} m`, "Delta"]}
                        labelFormatter={(label) => `Caso ${label}`}
                      />
                      <Bar dataKey="delta" radius={[8, 8, 0, 0]}>
                        {gapChartData.map((entry) => (
                          <Cell key={entry.id} fill={entry.delta < 0 ? "#f97316" : "#22c55e"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </PanelCard>

              <PanelCard
                title="Cadeia analítica que o módulo demonstra"
                description="Leitura única para operação, faixa e engenharia, sem quebrar o caso em planilhas isoladas."
              >
                <ProcessRail steps={clearanceProcessSteps} />
              </PanelCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr,0.9fr]">
              <PanelCard
                title="Casos mais expostos no filtro"
                description="Recorte pronto para levar à priorização semanal da gestão de linhas."
                className="overflow-hidden p-0"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trecho</TableHead>
                      <TableHead>Conflito</TableHead>
                      <TableHead>Medido</TableHead>
                      <TableHead>Exigido</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actionQueue.slice(0, 6).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.id}</div>
                          <div className="text-xs text-muted-foreground">{item.subtrecho}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <ToneBadge tone={riskTone(item.criticidade)}>{item.criticidade}</ToneBadge>
                            <ToneBadge>{item.elemento}</ToneBadge>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">{lineLabel(item.linha)}</div>
                        </TableCell>
                        <TableCell>{item.medidoM.toFixed(1)} m</TableCell>
                        <TableCell>{item.exigidoM.toFixed(1)} m</TableCell>
                        <TableCell>
                          <ToneBadge tone={statusTone(item.status)}>{item.status}</ToneBadge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </PanelCard>

              <PanelCard
                title="Saúde do corredor por município"
                description="Índice sintético para ilustrar a visão territorial da gestão de linhas."
              >
                <MetricBarList items={byMunicipio} />
              </PanelCard>
            </div>
          </TabsContent>

          <TabsContent value="fila" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
              <PanelCard
                title="Fila operacional do ciclo"
                description="Cada card representa uma decisão provável dentro do fluxo CPFL: poda, faixa, topografia ou reengenharia."
              >
                <div className="space-y-4">
                  {actionQueue.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-background/40 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold">{item.id}</h4>
                            <ToneBadge tone={riskTone(item.criticidade)}>{item.criticidade}</ToneBadge>
                            <ToneBadge tone={statusTone(item.status)}>{item.status}</ToneBadge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {lineLabel(item.linha)} · {item.municipio} · {item.subtrecho}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Score</div>
                          <div className="text-2xl font-semibold">{item.score}</div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-border/50 p-3">
                          <div className="text-xs text-muted-foreground">Leitura</div>
                          <div className="mt-1 font-medium">
                            {item.medidoM.toFixed(1)} m / {item.exigidoM.toFixed(1)} m
                          </div>
                        </div>
                        <div className="rounded-xl border border-border/50 p-3">
                          <div className="text-xs text-muted-foreground">Origem</div>
                          <div className="mt-1 font-medium">{item.origem}</div>
                        </div>
                        <div className="rounded-xl border border-border/50 p-3">
                          <div className="text-xs text-muted-foreground">Responsável</div>
                          <div className="mt-1 font-medium">{item.responsavel}</div>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                        <span className="font-medium">Próxima ação:</span> {item.proximaAcao}
                      </div>
                    </div>
                  ))}
                </div>
              </PanelCard>

              <PanelCard
                title="Distribuição do conflito"
                description="Ajuda a explicar se o gargalo do ciclo está em vegetação, ocupação ou comportamento térmico."
              >
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={byElemento} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => [value, "Casos"]} />
                      <Bar dataKey="total" fill="#0ea5e9" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                  <p>Vegetação e ocupação continuam dominando a agenda, mas o módulo já evidencia quando o assunto é realmente gabarito térmico.</p>
                  <p>Essa separação evita abrir equipe de poda para um caso que deveria seguir para fundiário ou engenharia.</p>
                </div>
              </PanelCard>
            </div>
          </TabsContent>

          <TabsContent value="corredor" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
              <PanelCard
                title="Leitura resumida por linha"
                description="Visão de corredor para explicar como o gêmeo digital alimenta a priorização."
              >
                <MetricBarList items={byLine} />
              </PanelCard>

              <PanelCard
                title="Últimas leituras integradas"
                description="Exemplo de timeline operacional que combina captura, validação e encaminhamento."
              >
                <div className="space-y-4">
                  {gapChartData.slice(0, 5).map(({ item }) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-background/45 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{item.id}</span>
                            <ToneBadge>{item.elemento}</ToneBadge>
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            {item.subtrecho} · {item.municipio} · atualização em {formatShortDate(item.ultimaLeitura)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Delta</div>
                          <div className={`text-2xl font-semibold ${item.medidoM - item.exigidoM < 0 ? "text-amber-300" : "text-emerald-300"}`}>
                            {(item.medidoM - item.exigidoM).toFixed(1)} m
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </PanelCard>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ModuleLayout>
  );
}
