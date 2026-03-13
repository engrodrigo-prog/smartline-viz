import { useMemo, useState } from "react";
import { CalendarClock, GitBranch, Shield, ShieldCheck } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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
  crossingComplianceItems,
  crossingProcessSteps,
  daysUntil,
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
  if (status === "Adequação de gabarito") return "danger" as const;
  if (status === "Renovação documental" || status === "Nova vistoria") return "warning" as const;
  return "success" as const;
};

const pieColors = ["#0ea5e9", "#22c55e", "#f97316", "#facc15", "#a855f7"];

export default function ComplianceTravessias() {
  const { filters } = useFilters();
  const [tipoFilter, setTipoFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const filteredData = useMemo(() => {
    return crossingComplianceItems.filter((item) => {
      if (tipoFilter && item.tipo !== tipoFilter) return false;
      if (statusFilter && item.status !== statusFilter) return false;

      return matchesOperationalFilters(item, filters, [
        item.travessia,
        item.municipio,
        item.tipo,
        item.orgao,
        item.norma,
        item.status,
        item.proximaAcao,
      ]);
    });
  }, [filters, statusFilter, tipoFilter]);

  const kpis = useMemo(() => {
    const avgDelta =
      filteredData.reduce((acc, item) => acc + (item.gabaritoMedidoM - item.gabaritoExigidoM), 0) /
      (filteredData.length || 1);

    return {
      total: filteredData.length,
      highRisk: filteredData.filter((item) => item.criticidade === "Alta").length,
      dueSoon: filteredData.filter((item) => daysUntil(item.validade) <= 30).length,
      avgDelta,
    };
  }, [filteredData]);

  const gapData = useMemo(
    () =>
      filteredData
        .map((item) => ({
          id: item.id,
          delta: Number((item.gabaritoMedidoM - item.gabaritoExigidoM).toFixed(1)),
          item,
        }))
        .sort((a, b) => a.delta - b.delta),
    [filteredData],
  );

  const byTipo = useMemo(() => {
    const groups = filteredData.reduce<Record<string, number>>((acc, item) => {
      acc[item.tipo] = (acc[item.tipo] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const byOrgao = useMemo(() => {
    const groups = filteredData.reduce<Record<string, { total: number; delta: number }>>((acc, item) => {
      const current = acc[item.orgao] ?? { total: 0, delta: 0 };
      current.total += 1;
      current.delta += item.gabaritoMedidoM - item.gabaritoExigidoM;
      acc[item.orgao] = current;
      return acc;
    }, {});

    return Object.entries(groups).map(([label, value]) => {
      const avgDelta = value.delta / value.total;
      return {
        label,
        helper: `${value.total} travessias`,
        value: clamp(100 + avgDelta * 18, 10, 100),
        valueLabel: `${avgDelta.toFixed(1)} m`,
        tone: avgDelta < -0.5 ? "danger" : avgDelta < 0 ? "warning" : "success",
      };
    });
  }, [filteredData]);

  const agenda = useMemo(
    () => [...filteredData].sort((a, b) => daysUntil(a.validade) - daysUntil(b.validade)),
    [filteredData],
  );

  const byLine = useMemo(() => {
    const groups = filteredData.reduce<Record<string, { total: number; delta: number }>>((acc, item) => {
      const current = acc[item.linha] ?? { total: 0, delta: 0 };
      current.total += 1;
      current.delta += item.gabaritoMedidoM - item.gabaritoExigidoM;
      acc[item.linha] = current;
      return acc;
    }, {});

    return Object.entries(groups).map(([linha, value]) => ({
      label: lineLabel(linha),
      helper: `${value.total} ativos regulados`,
      value: clamp(100 + (value.delta / value.total) * 16, 14, 100),
      tone:
        value.delta / value.total < -0.5 ? "danger" : value.delta / value.total < 0 ? "warning" : "success",
    }));
  }, [filteredData]);

  return (
    <ModuleLayout title="Compliance de Travessias" icon={Shield}>
      <div className="space-y-6 p-6">
        <ModuleDemoBanner />

        <ScenarioHero
          eyebrow="NBR 5422 em formato de painel"
          title="Travessia, gabarito e documentação no mesmo fluxo de conformidade."
          description="A proposta aqui é sair do placeholder e mostrar um cockpit plausível para o processo de travessias: o trecho medido, a exigência normativa, a concessionária envolvida, a validade do dossiê e a próxima ação. É o tipo de painel que conversa diretamente com o argumento de compliance automatizado da landing."
          tags={["NBR 5422", "Validade documental", "Topografia + engenharia + regulatório"]}
          stats={[
            { label: "Regional foco", value: lineRegional(filteredData[0]?.linha ?? "LT-002"), tone: "info" },
            { label: "Travessias no recorte", value: String(kpis.total), tone: "warning" },
            { label: "Vencendo em 30 dias", value: String(kpis.dueSoon), tone: "danger" },
            { label: "Delta médio", value: `${kpis.avgDelta.toFixed(1)} m`, tone: "success" },
          ]}
        />

        <FiltersBar>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Tipo de travessia</label>
              <select
                value={tipoFilter}
                onChange={(event) => setTipoFilter(event.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="Rodovia">Rodovia</option>
                <option value="Ferrovia">Ferrovia</option>
                <option value="Duto">Duto</option>
                <option value="Canal">Canal</option>
                <option value="Linha adjacente">Linha adjacente</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Status do caso</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="Conforme com ressalva">Conforme com ressalva</option>
                <option value="Renovação documental">Renovação documental</option>
                <option value="Adequação de gabarito">Adequação de gabarito</option>
                <option value="Nova vistoria">Nova vistoria</option>
              </select>
            </div>
          </div>
        </FiltersBar>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <CardKPI title="Travessias priorizadas" value={kpis.total} icon={GitBranch} />
          <CardKPI title="Criticidade alta" value={kpis.highRisk} icon={ShieldCheck} />
          <CardKPI title="Vencimento próximo" value={kpis.dueSoon} icon={CalendarClock} />
          <CardKPI title="Delta médio" value={`${kpis.avgDelta.toFixed(1)} m`} icon={Shield} description="Medição menos exigência" />
        </div>

        <Tabs defaultValue="painel" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="painel">Painel técnico</TabsTrigger>
            <TabsTrigger value="agenda">Agenda regulatória</TabsTrigger>
            <TabsTrigger value="governanca">Governança</TabsTrigger>
          </TabsList>

          <TabsContent value="painel" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.45fr,1fr]">
              <PanelCard
                title="Delta de gabarito por travessia"
                description="Negativo significa insuficiência frente à exigência documentada para o caso."
              >
                <div className="h-[330px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gapData} margin={{ top: 8, right: 12, left: 0, bottom: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="id" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} unit="m" />
                      <Tooltip formatter={(value: number) => [`${value.toFixed(1)} m`, "Delta"]} />
                      <Bar dataKey="delta" radius={[8, 8, 0, 0]}>
                        {gapData.map((entry) => (
                          <Cell key={entry.id} fill={entry.delta < 0 ? "#f97316" : "#22c55e"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </PanelCard>

              <PanelCard
                title="Workflow demonstrado"
                description="O foco é mostrar a travessia como um caso completo, e não só uma medição solta."
              >
                <ProcessRail steps={crossingProcessSteps} />
              </PanelCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr,0.95fr]">
              <PanelCard
                title="Matriz prioritária"
                description="Recorte pronto para reunião de engenharia, cadastro e regulatório."
                className="overflow-hidden p-0"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Travessia</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Medido</TableHead>
                      <TableHead>Exigido</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agenda.slice(0, 6).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.id}</div>
                          <div className="text-xs text-muted-foreground">{item.travessia}</div>
                          <div className="mt-2 text-xs text-muted-foreground">{lineLabel(item.linha)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <ToneBadge>{item.tipo}</ToneBadge>
                            <ToneBadge tone={riskTone(item.criticidade)}>{item.criticidade}</ToneBadge>
                          </div>
                        </TableCell>
                        <TableCell>{item.gabaritoMedidoM.toFixed(1)} m</TableCell>
                        <TableCell>{item.gabaritoExigidoM.toFixed(1)} m</TableCell>
                        <TableCell>
                          <ToneBadge tone={statusTone(item.status)}>{item.status}</ToneBadge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </PanelCard>

              <PanelCard
                title="Risco médio por órgão"
                description="Índice sintético para mostrar concentração de esforço regulatório."
              >
                <MetricBarList items={byOrgao} />
              </PanelCard>
            </div>
          </TabsContent>

          <TabsContent value="agenda" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
              <PanelCard
                title="Próximas renovações e vistorias"
                description="Fila priorizada por prazo e criticidade."
              >
                <div className="space-y-4">
                  {agenda.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-background/45 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{item.travessia}</span>
                            <ToneBadge tone={riskTone(item.criticidade)}>{item.criticidade}</ToneBadge>
                            <ToneBadge tone={statusTone(item.status)}>{item.status}</ToneBadge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {item.orgao} · {item.municipio} · validade em {formatShortDate(item.validade)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Prazo</div>
                          <div className={`text-2xl font-semibold ${daysUntil(item.validade) <= 15 ? "text-rose-300" : "text-amber-300"}`}>
                            {daysUntil(item.validade)} d
                          </div>
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
                title="Distribuição por tipo de travessia"
                description="Ajuda a explicar se o backlog está concentrado em rodovias, dutos ou ativos adjacentes."
              >
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byTipo} dataKey="value" nameKey="name" outerRadius={84} innerRadius={46} paddingAngle={3}>
                        {byTipo.map((entry, index) => (
                          <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value, "Travessias"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid gap-2">
                  {byTipo.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }} />
                        {item.name}
                      </div>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </PanelCard>
            </div>
          </TabsContent>

          <TabsContent value="governanca" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
              <PanelCard
                title="Conformidade por linha"
                description="Leitura resumida da saúde documental e física das travessias no corredor."
              >
                <MetricBarList items={byLine} />
              </PanelCard>

              <PanelCard
                title="Casos que exigem ação conjunta"
                description="Exemplo de backlog com dependência clara entre cadastro, topografia e engenharia."
              >
                <div className="space-y-4">
                  {agenda
                    .filter((item) => item.criticidade === "Alta" || item.status !== "Conforme com ressalva")
                    .map((item) => (
                      <div key={item.id} className="rounded-2xl border border-border/60 bg-background/45 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">{item.id}</span>
                              <ToneBadge tone={riskTone(item.criticidade)}>{item.criticidade}</ToneBadge>
                              <ToneBadge>{item.tipo}</ToneBadge>
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                              {lineLabel(item.linha)} · {item.responsavel}
                            </div>
                          </div>
                          <ToneBadge tone={statusTone(item.status)}>{item.status}</ToneBadge>
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground">{item.norma}</div>
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
