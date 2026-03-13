import { useMemo, useState } from "react";
import { AlertTriangle, ShieldAlert, Skull, Wrench } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import CardKPI from "@/components/CardKPI";
import FiltersBar from "@/components/FiltersBar";
import ModuleDemoBanner from "@/components/ModuleDemoBanner";
import ModuleLayout from "@/components/ModuleLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFilters } from "@/context/FiltersContext";
import {
  formatShortDate,
  lineLabel,
  lineRegional,
  matchesOperationalFilters,
  structuralIntegrityCases,
  structuralProcessSteps,
} from "@/features/placeholder-pages/transmissionOpsMock";
import {
  MetricBarList,
  PanelCard,
  ProcessRail,
  ScenarioHero,
  ToneBadge,
} from "@/features/placeholder-pages/PlaceholderPageKit";

const riskTone = (risk: string) => {
  if (risk === "Alta") return "danger" as const;
  if (risk === "Média") return "warning" as const;
  return "success" as const;
};

const statusTone = (status: string) => {
  if (status === "Reforço emergencial") return "danger" as const;
  if (status === "Ronda patrimonial" || status === "Tratamento programado") return "warning" as const;
  return "info" as const;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function CorrosaoFurto() {
  const { filters } = useFilters();
  const [ambienteFilter, setAmbienteFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const filteredData = useMemo(() => {
    return structuralIntegrityCases.filter((item) => {
      if (ambienteFilter && item.ambiente !== ambienteFilter) return false;
      if (statusFilter && item.status !== statusFilter) return false;

      return matchesOperationalFilters(item, filters, [
        item.estrutura,
        item.municipio,
        item.componente,
        item.ambiente,
        item.status,
        item.acao,
      ]);
    });
  }, [ambienteFilter, filters, statusFilter]);

  const kpis = useMemo(() => {
    const avgMetal =
      filteredData.reduce((acc, item) => acc + item.perdaMetalPct, 0) / (filteredData.length || 1);
    const missingParts = filteredData.reduce((acc, item) => acc + item.itensFaltantes, 0);

    return {
      total: filteredData.length,
      highRisk: filteredData.filter((item) => item.criticidade === "Alta").length,
      avgMetal,
      missingParts,
    };
  }, [filteredData]);

  const metalLossData = useMemo(
    () =>
      [...filteredData]
        .sort((a, b) => b.perdaMetalPct - a.perdaMetalPct)
        .map((item) => ({
          estrutura: item.estrutura,
          perda: item.perdaMetalPct,
          itens: item.itensFaltantes,
        })),
    [filteredData],
  );

  const componentData = useMemo(() => {
    const groups = filteredData.reduce<Record<string, { total: number; score: number }>>((acc, item) => {
      const current = acc[item.componente] ?? { total: 0, score: 0 };
      current.total += 1;
      current.score += item.score;
      acc[item.componente] = current;
      return acc;
    }, {});

    return Object.entries(groups)
      .map(([label, value]) => ({
        label,
        helper: `${value.total} estruturas`,
        value: value.score / value.total,
        tone:
          value.score / value.total >= 85 ? "danger" : value.score / value.total >= 65 ? "warning" : "success",
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const patrimonialData = useMemo(
    () =>
      [...filteredData]
        .filter((item) => item.itensFaltantes > 0 || item.status === "Ronda patrimonial")
        .sort((a, b) => b.itensFaltantes - a.itensFaltantes || b.score - a.score),
    [filteredData],
  );

  const byAmbiente = useMemo(() => {
    const groups = filteredData.reduce<Record<string, { total: number; metal: number }>>((acc, item) => {
      const current = acc[item.ambiente] ?? { total: 0, metal: 0 };
      current.total += 1;
      current.metal += item.perdaMetalPct;
      acc[item.ambiente] = current;
      return acc;
    }, {});

    return Object.entries(groups).map(([label, value]) => {
      const avg = value.metal / value.total;
      return {
        label,
        helper: `${value.total} estruturas`,
        value: clamp(100 - avg * 2.2, 12, 100),
        valueLabel: `${avg.toFixed(0)}%`,
        tone: avg >= 22 ? "danger" : avg >= 12 ? "warning" : "success",
      };
    });
  }, [filteredData]);

  const byLine = useMemo(() => {
    const groups = filteredData.reduce<Record<string, { total: number; score: number }>>((acc, item) => {
      const current = acc[item.linha] ?? { total: 0, score: 0 };
      current.total += 1;
      current.score += item.score;
      acc[item.linha] = current;
      return acc;
    }, {});

    return Object.entries(groups).map(([linha, value]) => ({
      label: lineLabel(linha),
      helper: `${value.total} estruturas críticas ou em atenção`,
      value: clamp(100 - value.score / value.total, 8, 100),
      tone:
        value.score / value.total >= 85 ? "danger" : value.score / value.total >= 65 ? "warning" : "success",
    }));
  }, [filteredData]);

  return (
    <ModuleLayout title="Corrosão e Furto de Peças" icon={Skull}>
      <div className="space-y-6 p-6">
        <ModuleDemoBanner />

        <ScenarioHero
          eyebrow="Saúde estrutural e patrimonial em um só backlog"
          title="O caso deixa de ser só corrosão ou só furto: passa a ser integridade da estrutura."
          description="O módulo demonstra uma visão aderente à operação de linhas: inspeção dirigida, triagem por componente, ambiência corrosiva, reincidência patrimonial e fechamento com evidência. É a materialização do discurso da landing sobre estudo preditivo em corrosão e análise estrutural com resposta rápida."
          tags={["Corrosão preditiva", "Patrimonial integrado", "Plano de manutenção por componente"]}
          stats={[
            { label: "Regional foco", value: lineRegional(filteredData[0]?.linha ?? "LT-003"), tone: "info" },
            { label: "Estruturas no recorte", value: String(kpis.total), tone: "warning" },
            { label: "Perda metálica média", value: `${kpis.avgMetal.toFixed(0)}%`, tone: "danger" },
            { label: "Itens faltantes", value: String(kpis.missingParts), tone: "warning" },
          ]}
        />

        <FiltersBar>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Ambiente de exposição</label>
              <select
                value={ambienteFilter}
                onChange={(event) => setAmbienteFilter(event.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="Salino">Salino</option>
                <option value="Industrial">Industrial</option>
                <option value="Urbano">Urbano</option>
                <option value="Rural">Rural</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Tipo de resposta</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="Monitoramento">Monitoramento</option>
                <option value="Tratamento programado">Tratamento programado</option>
                <option value="Ronda patrimonial">Ronda patrimonial</option>
                <option value="Reforço emergencial">Reforço emergencial</option>
              </select>
            </div>
          </div>
        </FiltersBar>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <CardKPI title="Estruturas priorizadas" value={kpis.total} icon={ShieldAlert} />
          <CardKPI title="Criticidade alta" value={kpis.highRisk} icon={AlertTriangle} />
          <CardKPI title="Perda metálica média" value={`${kpis.avgMetal.toFixed(0)}%`} icon={Wrench} />
          <CardKPI title="Peças ausentes" value={kpis.missingParts} icon={Skull} />
        </div>

        <Tabs defaultValue="saude" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="saude">Saúde estrutural</TabsTrigger>
            <TabsTrigger value="patrimonial">Patrimonial</TabsTrigger>
            <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
          </TabsList>

          <TabsContent value="saude" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.45fr,1fr]">
              <PanelCard
                title="Perda metálica por estrutura"
                description="Exemplo de recorte usado para definir reforço, tratamento ou simples monitoramento."
              >
                <div className="h-[330px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metalLossData} margin={{ top: 8, right: 12, left: 0, bottom: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="estrutura" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} unit="%" />
                      <Tooltip formatter={(value: number, name) => [`${value}`, name === "perda" ? "Perda metálica" : "Itens faltantes"]} />
                      <Bar dataKey="perda" fill="#f97316" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </PanelCard>

              <PanelCard
                title="Pipeline do módulo"
                description="A lógica combina inspeção, classificação do componente e fechamento com evidência."
              >
                <ProcessRail steps={structuralProcessSteps} />
              </PanelCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr,0.95fr]">
              <PanelCard
                title="Estruturas mais críticas"
                description="Backlog técnico para manutenção e engenharia de ativos."
                className="overflow-hidden p-0"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estrutura</TableHead>
                      <TableHead>Componente</TableHead>
                      <TableHead>Perda</TableHead>
                      <TableHead>Furto</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData
                      .slice()
                      .sort((a, b) => b.score - a.score)
                      .slice(0, 6)
                      .map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">{item.estrutura}</div>
                            <div className="text-xs text-muted-foreground">{lineLabel(item.linha)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <ToneBadge>{item.componente}</ToneBadge>
                              <ToneBadge tone={riskTone(item.criticidade)}>{item.criticidade}</ToneBadge>
                            </div>
                          </TableCell>
                          <TableCell>{item.perdaMetalPct}%</TableCell>
                          <TableCell>{item.itensFaltantes}</TableCell>
                          <TableCell>
                            <ToneBadge tone={statusTone(item.status)}>{item.status}</ToneBadge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </PanelCard>

              <PanelCard
                title="Pressão por componente"
                description="Mostra onde a carteira está mais exposta entre base, topo, parafusos e acessos."
              >
                <MetricBarList items={componentData} />
              </PanelCard>
            </div>
          </TabsContent>

          <TabsContent value="patrimonial" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
              <PanelCard
                title="Casos com desvio patrimonial"
                description="Estruturas com peças faltantes ou acionamento de ronda integrada."
              >
                <div className="space-y-4">
                  {patrimonialData.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-background/45 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{item.estrutura}</span>
                            <ToneBadge tone={riskTone(item.criticidade)}>{item.criticidade}</ToneBadge>
                            <ToneBadge tone={statusTone(item.status)}>{item.status}</ToneBadge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {item.municipio} · {item.componente} · {item.ambiente}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Itens faltantes</div>
                          <div className={`text-2xl font-semibold ${item.itensFaltantes > 0 ? "text-rose-300" : "text-amber-300"}`}>
                            {item.itensFaltantes}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                        <span className="font-medium">Ação prevista:</span> {item.acao}
                      </div>
                    </div>
                  ))}
                </div>
              </PanelCard>

              <PanelCard
                title="Carga por ambiente"
                description="Exemplo de leitura que separa corrosão costeira, industrial e exposição urbana."
              >
                <MetricBarList items={byAmbiente} />
              </PanelCard>
            </div>
          </TabsContent>

          <TabsContent value="campanhas" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
              <PanelCard
                title="Temperatura da carteira por linha"
                description="Visão executiva para decidir qual corredor entra primeiro em tratamento ou reforço."
              >
                <MetricBarList items={byLine} />
              </PanelCard>

              <PanelCard
                title="Últimas inspeções direcionadas"
                description="Exemplo de fila consolidada para retroalimentar o ciclo de manutenção."
              >
                <div className="space-y-4">
                  {filteredData
                    .slice()
                    .sort((a, b) => (a.ultimaInspecao < b.ultimaInspecao ? 1 : -1))
                    .map((item) => (
                      <div key={item.id} className="rounded-2xl border border-border/60 bg-background/45 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">{item.id}</span>
                              <ToneBadge>{item.componente}</ToneBadge>
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                              {lineLabel(item.linha)} · inspeção em {formatShortDate(item.ultimaInspecao)}
                            </div>
                          </div>
                          <ToneBadge tone={statusTone(item.status)}>{item.status}</ToneBadge>
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground">{item.responsavel}</div>
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
