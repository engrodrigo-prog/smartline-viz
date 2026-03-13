import { useMemo, useState } from "react";
import { CalendarClock, FileCheck, Leaf, ShieldCheck } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import CardKPI from "@/components/CardKPI";
import FiltersBar from "@/components/FiltersBar";
import ModuleDemoBanner from "@/components/ModuleDemoBanner";
import ModuleLayout from "@/components/ModuleLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFilters } from "@/context/FiltersContext";
import {
  daysUntil,
  environmentalComplianceItems,
  environmentalProcessSteps,
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

const riskTone = (risk: string) => {
  if (risk === "Alta") return "danger" as const;
  if (risk === "Média") return "warning" as const;
  return "success" as const;
};

const statusTone = (status: string) => {
  if (status === "Pendência de campo") return "danger" as const;
  if (status === "Aguardando protocolo" || status === "Evidências em coleta") return "warning" as const;
  return "success" as const;
};

export default function ComplianceAmbiental() {
  const { filters } = useFilters();
  const [eixoFilter, setEixoFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const filteredData = useMemo(() => {
    return environmentalComplianceItems.filter((item) => {
      if (eixoFilter && item.eixo !== eixoFilter) return false;
      if (statusFilter && item.status !== statusFilter) return false;

      return matchesOperationalFilters(item, filters, [
        item.frente,
        item.municipio,
        item.eixo,
        item.orgao,
        item.obrigacao,
        item.status,
        item.impacto,
      ]);
    });
  }, [eixoFilter, filters, statusFilter]);

  const kpis = useMemo(() => {
    const dueSoon = filteredData.filter((item) => item.status !== "Liberado" && daysUntil(item.vencimento) <= 30).length;
    const blocked = filteredData.filter(
      (item) => item.risco === "Alta" && item.status !== "Liberado" && item.conclusaoPct < 80,
    ).length;
    const avgCompletion =
      filteredData.reduce((acc, item) => acc + item.conclusaoPct, 0) / (filteredData.length || 1);

    return {
      total: filteredData.length,
      dueSoon,
      blocked,
      avgCompletion,
    };
  }, [filteredData]);

  const progressData = useMemo(
    () =>
      [...filteredData]
        .sort((a, b) => a.conclusaoPct - b.conclusaoPct)
        .map((item) => ({
          id: item.id,
          pct: item.conclusaoPct,
          frente: item.frente,
        })),
    [filteredData],
  );

  const byEixo = useMemo(() => {
    const groups = filteredData.reduce<Record<string, { total: number; pct: number }>>((acc, item) => {
      const current = acc[item.eixo] ?? { total: 0, pct: 0 };
      current.total += 1;
      current.pct += item.conclusaoPct;
      acc[item.eixo] = current;
      return acc;
    }, {});

    return Object.entries(groups)
      .map(([label, value]) => ({
        label,
        helper: `${value.total} obrigações`,
        value: value.pct / value.total,
        tone:
          value.pct / value.total < 55 ? "danger" : value.pct / value.total < 80 ? "warning" : "success",
      }))
      .sort((a, b) => a.value - b.value);
  }, [filteredData]);

  const byOrgao = useMemo(() => {
    const groups = filteredData.reduce<Record<string, number>>((acc, item) => {
      acc[item.orgao] = (acc[item.orgao] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(groups)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredData]);

  const agenda = useMemo(
    () => [...filteredData].sort((a, b) => daysUntil(a.vencimento) - daysUntil(b.vencimento)),
    [filteredData],
  );

  const byLine = useMemo(() => {
    const groups = filteredData.reduce<Record<string, { total: number; pct: number }>>((acc, item) => {
      const current = acc[item.linha] ?? { total: 0, pct: 0 };
      current.total += 1;
      current.pct += item.conclusaoPct;
      acc[item.linha] = current;
      return acc;
    }, {});

    return Object.entries(groups).map(([linha, value]) => ({
      label: lineLabel(linha),
      helper: `${value.total} itens rastreados`,
      value: value.pct / value.total,
      tone:
        value.pct / value.total < 55 ? "danger" : value.pct / value.total < 80 ? "warning" : "success",
    }));
  }, [filteredData]);

  return (
    <ModuleLayout title="Compliance Ambiental" icon={ShieldCheck}>
      <div className="space-y-6 p-6">
        <ModuleDemoBanner />

        <ScenarioHero
          eyebrow="Governança operacional com dados simulados"
          title="Condicionantes, evidências e liberação de frente no mesmo cockpit."
          description="O painel traduz o processo típico de gestão ambiental de linhas em uma visão prática: obrigação por trecho, vencimento, estágio de evidência e impacto operacional. Em vez de um placeholder genérico, cada card já mostra como o módulo sustentaria roçada, acessos, inspeção e interlocução com órgãos."
          tags={["CETESB, DAEE, IPHAN e municípios", "Evidência georreferenciada", "Bloqueio automático de frente"]}
          stats={[
            { label: "Regional foco", value: lineRegional(filteredData[0]?.linha ?? "LT-003"), tone: "info" },
            { label: "Ativas no recorte", value: String(kpis.total), tone: "warning" },
            { label: "Vencem em 30 dias", value: String(kpis.dueSoon), tone: "danger" },
            { label: "Cobertura média", value: `${kpis.avgCompletion.toFixed(0)}%`, tone: "success" },
          ]}
        />

        <FiltersBar>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Eixo ambiental</label>
              <select
                value={eixoFilter}
                onChange={(event) => setEixoFilter(event.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="Licenciamento">Licenciamento</option>
                <option value="Supressão e recomposição">Supressão e recomposição</option>
                <option value="Fauna">Fauna</option>
                <option value="APP e drenagem">APP e drenagem</option>
                <option value="Resíduos e terceiros">Resíduos e terceiros</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Status do dossiê</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="Liberado">Liberado</option>
                <option value="Evidências em coleta">Evidências em coleta</option>
                <option value="Aguardando protocolo">Aguardando protocolo</option>
                <option value="Pendência de campo">Pendência de campo</option>
              </select>
            </div>
          </div>
        </FiltersBar>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <CardKPI title="Condicionantes ativas" value={kpis.total} icon={Leaf} />
          <CardKPI title="Vencimento curto" value={kpis.dueSoon} icon={CalendarClock} />
          <CardKPI title="Frentes bloqueadas" value={kpis.blocked} icon={FileCheck} />
          <CardKPI title="Cobertura de evidências" value={`${kpis.avgCompletion.toFixed(0)}%`} icon={ShieldCheck} />
        </div>

        <Tabs defaultValue="condicionantes" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="condicionantes">Condicionantes</TabsTrigger>
            <TabsTrigger value="agenda">Agenda crítica</TabsTrigger>
            <TabsTrigger value="governanca">Governança</TabsTrigger>
          </TabsList>

          <TabsContent value="condicionantes" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.45fr,1fr]">
              <PanelCard
                title="Maturidade dos dossiês por obrigação"
                description="Representa o quanto cada frente já está pronta para protocolo ou liberação."
              >
                <div className="h-[330px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={progressData} margin={{ top: 8, right: 12, left: 0, bottom: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="id" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} unit="%" />
                      <Tooltip formatter={(value: number) => [`${value}%`, "Conclusão"]} />
                      <Bar dataKey="pct" fill="#22c55e" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </PanelCard>

              <PanelCard
                title="Fluxo de governança demonstrado"
                description="O módulo já mostra o encadeamento entre obrigação, evidência, validação e liberação operacional."
              >
                <ProcessRail steps={environmentalProcessSteps} />
              </PanelCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr,0.95fr]">
              <PanelCard
                title="Registro prioritário"
                description="Tabela pronta para a rotina semanal entre ambiental, fiscalização e operação."
                className="overflow-hidden p-0"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Obrigação</TableHead>
                      <TableHead>Órgão</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agenda.slice(0, 6).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.id}</div>
                          <div className="text-xs text-muted-foreground">{item.frente}</div>
                          <div className="mt-2 text-xs text-muted-foreground">{lineLabel(item.linha)}</div>
                        </TableCell>
                        <TableCell>
                          <div>{item.orgao}</div>
                          <div className="text-xs text-muted-foreground">{item.eixo}</div>
                        </TableCell>
                        <TableCell>
                          <div>{formatShortDate(item.vencimento)}</div>
                          <div className="text-xs text-muted-foreground">{daysUntil(item.vencimento)} dias</div>
                        </TableCell>
                        <TableCell>
                          <ToneBadge tone={riskTone(item.risco)}>{item.risco}</ToneBadge>
                        </TableCell>
                        <TableCell>
                          <ToneBadge tone={statusTone(item.status)}>{item.status}</ToneBadge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </PanelCard>

              <PanelCard
                title="Cobertura por eixo"
                description="Ajuda a explicar onde está o gargalo: documentação, fauna, recomposição ou drenagem."
              >
                <MetricBarList items={byEixo} />
              </PanelCard>
            </div>
          </TabsContent>

          <TabsContent value="agenda" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
              <PanelCard
                title="Próximos vencimentos"
                description="Ordem ideal de tratamento para não travar mobilização de frente."
              >
                <div className="space-y-4">
                  {agenda.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-background/45 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{item.id}</span>
                            <ToneBadge tone={riskTone(item.risco)}>{item.risco}</ToneBadge>
                            <ToneBadge tone={statusTone(item.status)}>{item.status}</ToneBadge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {item.frente} · {item.municipio} · {item.orgao}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Vence em</div>
                          <div className={`text-2xl font-semibold ${daysUntil(item.vencimento) <= 10 ? "text-rose-300" : "text-amber-300"}`}>
                            {daysUntil(item.vencimento)} d
                          </div>
                        </div>
                      </div>
                      <p className="mt-4 text-sm text-muted-foreground">{item.obrigacao}</p>
                      <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                        <span className="font-medium">Impacto operacional:</span> {item.impacto}
                      </div>
                    </div>
                  ))}
                </div>
              </PanelCard>

              <PanelCard
                title="Carga por órgão"
                description="Distribuição da agenda regulatória no recorte atual."
              >
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={byOrgao} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" width={95} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => [value, "Itens"]} />
                      <Bar dataKey="total" fill="#0ea5e9" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                  <p>O exemplo mostra como o módulo ajuda a distribuir responsabilidade por órgão e evita concentração invisível de pendências.</p>
                  <p>Em produção, essa mesma lógica pode receber anexos, comprovantes e alertas automáticos por prazo.</p>
                </div>
              </PanelCard>
            </div>
          </TabsContent>

          <TabsContent value="governanca" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
              <PanelCard
                title="Maturidade por linha"
                description="Leitura executiva do quão pronto está cada corredor para seguir sem restrição ambiental."
              >
                <MetricBarList items={byLine} />
              </PanelCard>

              <PanelCard
                title="Frentes que exigem coordenação imediata"
                description="Pontos em que ambiental, fiscalização e operação precisam fechar a pendência na mesma semana."
              >
                <div className="space-y-4">
                  {agenda
                    .filter((item) => item.risco === "Alta" || item.status === "Pendência de campo")
                    .map((item) => (
                      <div key={item.id} className="rounded-2xl border border-border/60 bg-background/45 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">{item.frente}</span>
                              <ToneBadge tone={riskTone(item.risco)}>{item.risco}</ToneBadge>
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                              {lineLabel(item.linha)} · {item.responsavel}
                            </div>
                          </div>
                          <ToneBadge tone={statusTone(item.status)}>{item.status}</ToneBadge>
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground">{item.impacto}</div>
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
