import { useMemo, useState } from "react";
import { ClipboardList, Filter, MapPin, Plus, RefreshCw } from "lucide-react";
import { format, parseISO } from "date-fns";
import ModuleLayout from "@/components/ModuleLayout";
import CardKPI from "@/components/CardKPI";
import DataTableAdvanced from "@/components/DataTableAdvanced";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useDemandas, useDemandaMutation, useDeleteDemanda } from "@/hooks/useDemandas";
import {
  DEMANDA_EXECUTORES,
  DEMANDA_STATUS,
  DEMANDA_TEMAS,
  type Demanda,
  type DemandaTema
} from "@/services/demandas";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

type FormState = Partial<Demanda>;

const emptyForm: FormState = {
  tipo: "Roçada/Poda",
  status: "Aberta",
  executorTipo: "Própria",
  temas: ["Inspeção de Ativos"],
  evidencias: []
};

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd/MM/yyyy");
  } catch {
    return value;
  }
};

const statusVariant = (status: string) => {
  switch (status) {
    case "Aberta":
      return "outline";
    case "Em Execução":
      return "secondary";
    case "Em Validação":
      return "default";
    case "Concluída":
      return "success";
    default:
      return "outline";
  }
};

const Demandas = () => {
  const [statusTab, setStatusTab] = useState<string>("Todas");
  const [executorFilter, setExecutorFilter] = useState<string>("Todos");
  const [temaFilter, setTemaFilter] = useState<string>("Todos");
  const [periodo, setPeriodo] = useState<{ inicio?: string; fim?: string }>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const filters = useMemo(
    () => ({
      status: statusTab !== "Todas" ? statusTab : undefined,
      executor: executorFilter !== "Todos" ? executorFilter : undefined,
      tema: temaFilter !== "Todos" ? temaFilter : undefined,
      inicio: periodo.inicio,
      fim: periodo.fim
    }),
    [statusTab, executorFilter, temaFilter, periodo]
  );

  const { data, isLoading, refetch } = useDemandas(filters);
  const createMutation = useDemandaMutation();
  const deleteMutation = useDeleteDemanda();

  const items = data?.items ?? [];

  const resumo = useMemo(() => {
    const total = items.length;
    const andamento = items.filter((item) => item.status !== "Concluída").length;
    const concluidas = items.filter((item) => item.status === "Concluída").length;
    const foraSla = items.filter((item) => item.slaSituacao === "Fora").length;
    return { total, andamento, concluidas, foraSla };
  }, [items]);

  const abrirModal = (demanda?: Demanda) => {
    if (demanda) {
      setForm({
        ...demanda,
        temas: demanda.temas ?? [],
        temaPrincipal: demanda.temaPrincipal ?? demanda.temas?.[0]
      });
    } else {
      setForm(emptyForm);
    }
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
  };

  const atualizarForm = (patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const salvarDemanda = async () => {
    if (!form.tipo || !form.status || !form.executorTipo) {
      toast.error("Preencha tipo, status e executora.");
      return;
    }
    if (!form.temaPrincipal) {
      toast.error("Selecione o tema principal.");
      return;
    }
    try {
      await createMutation.mutateAsync(form);
      toast.success("Ordem de serviço salva.");
      fecharModal();
      refetch();
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível salvar a demanda.");
    }
  };

  const removerDemanda = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Demanda removida.");
      refetch();
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível remover.");
    }
  };

  const filteredItems = useMemo(() => {
    if (statusTab === "Todas" && executorFilter === "Todos" && temaFilter === "Todos") {
      return items;
    }
    return items.filter((item) => {
      if (statusTab !== "Todas" && item.status !== statusTab) return false;
      if (executorFilter !== "Todos" && item.executorTipo !== executorFilter) return false;
      if (temaFilter !== "Todos" && !item.temas.includes(temaFilter as DemandaTema)) return false;
      return true;
    });
  }, [items, statusTab, executorFilter, temaFilter]);

  const resumoRegiao = useMemo(() => {
    const mapa = new Map<string, { total: number; atrasadas: number }>();
    filteredItems.forEach((item) => {
      const key = item.regiao ?? item.linhaNome ?? "Não informado";
      if (!mapa.has(key)) {
        mapa.set(key, { total: 0, atrasadas: 0 });
      }
      const entry = mapa.get(key)!;
      entry.total += 1;
      if (item.slaSituacao === "Fora") entry.atrasadas += 1;
    });
    return Array.from(mapa.entries())
      .map(([regiao, valores]) => ({ regiao, ...valores }))
      .sort((a, b) => b.total - a.total);
  }, [filteredItems]);

  const columns = [
    {
      key: "id",
      label: "ID",
      render: (_: any, row: Demanda) => <span className="font-medium">{row.id}</span>
    },
    {
      key: "tipo",
      label: "Tipo"
    },
    {
      key: "linhaNome",
      label: "Linha / Trecho",
      render: (_: any, row: Demanda) => (
        <div className="flex flex-col">
          <span>{row.linhaNome ?? "—"}</span>
          <span className="text-xs text-muted-foreground">{row.trecho ?? "Sem trecho"}</span>
        </div>
      )
    },
    {
      key: "responsavel",
      label: "Responsável",
      render: (_: any, row: Demanda) => (
        <div className="flex flex-col">
          <span>{row.responsavel ?? "Não atribuído"}</span>
          <span className="text-xs text-muted-foreground">{row.executorTipo}</span>
        </div>
      )
    },
    {
      key: "custoReal",
      label: "Custos",
      render: (_: any, row: Demanda) => (
        <div className="flex flex-col">
          <span>{formatCurrency(row.custoReal ?? row.custoEstimado)}</span>
          {row.extensaoKm ? (
            <span className="text-xs text-muted-foreground">
              {formatCurrency(
                row.custoReal && row.extensaoKm ? row.custoReal / row.extensaoKm : row.custoEstimado ?? undefined
              )}{" "}
              / km
            </span>
          ) : null}
        </div>
      )
    },
    {
      key: "prazoFim",
      label: "Prazo",
      render: (_: any, row: Demanda) => (
        <div className="flex flex-col">
          <span>{formatDate(row.prazoFim)}</span>
          {row.slaDias ? (
            <span className="text-xs text-muted-foreground">SLA {row.slaDias} dias</span>
          ) : null}
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (_: any, row: Demanda) => (
        <Badge variant={statusVariant(row.status)} className="mr-2">
          {row.status}
        </Badge>
      )
    },
    {
      key: "temas",
      label: "Temas",
      render: (_: any, row: Demanda) => (
        <div className="flex flex-wrap gap-1">
          {row.temas.map((tema) => (
            <Badge key={tema} variant="outline" className="text-xs">
              {tema}
            </Badge>
          ))}
        </div>
      )
    }
  ];

  return (
    <ModuleLayout title="Gestão de Demandas" icon={ClipboardList}>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          <CardKPI title="Ordens monitoradas" value={resumo.total} icon={ClipboardList} />
          <CardKPI title="Em andamento" value={resumo.andamento} icon={RefreshCw} />
          <CardKPI title="Concluídas" value={resumo.concluidas} icon={MapPin} />
          <CardKPI title="Fora do SLA" value={resumo.foraSla} icon={Filter} />
        </div>

        <div className="tech-card p-4 flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <Tabs value={statusTab} onValueChange={setStatusTab} className="min-w-[280px]">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="Todas">Todas</TabsTrigger>
                <TabsTrigger value="Aberta">Aberta</TabsTrigger>
                <TabsTrigger value="Em Execução">Execução</TabsTrigger>
                <TabsTrigger value="Em Validação">Validação</TabsTrigger>
                <TabsTrigger value="Concluída">Concluída</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Executora</Label>
            <Select value={executorFilter} onValueChange={setExecutorFilter}>
              <SelectTrigger className="min-w-[160px]">
                <SelectValue placeholder="Executora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {DEMANDA_EXECUTORES.map((opcao) => (
                  <SelectItem key={opcao} value={opcao}>
                    {opcao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Tema</Label>
            <Select value={temaFilter} onValueChange={setTemaFilter}>
              <SelectTrigger className="min-w-[210px]">
                <SelectValue placeholder="Tema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {DEMANDA_TEMAS.map((tema) => (
                  <SelectItem key={tema} value={tema}>
                    {tema}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Período inicial</Label>
            <Input
              type="date"
              value={periodo.inicio ?? ""}
              onChange={(event) => setPeriodo((prev) => ({ ...prev, inicio: event.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Período final</Label>
            <Input
              type="date"
              value={periodo.fim ?? ""}
              onChange={(event) => setPeriodo((prev) => ({ ...prev, fim: event.target.value }))}
            />
          </div>

          <div className="flex-1 flex justify-end gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              Atualizar
            </Button>
            <Button onClick={() => abrirModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Nova OS
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <DataTableAdvanced
              data={filteredItems}
              columns={columns}
              onRowClick={(row: Demanda) => abrirModal(row)}
              exportable
              pageSize={12}
            />
          </div>

          <div className="tech-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Insights por Região</h3>
              <Badge variant="outline">{filteredItems.length} OS</Badge>
            </div>
            <ScrollArea className="max-h-[380px]">
              <div className="space-y-3 pr-2">
                {resumoRegiao.map((item) => (
                  <div key={item.regiao} className="rounded-lg border border-border/60 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-semibold">{item.regiao}</span>
                      </div>
                      <Badge variant="secondary">{item.total} OS</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.atrasadas > 0 ? (
                        <span className="text-destructive">{item.atrasadas} fora do SLA</span>
                      ) : (
                        <span>Sem violações de SLA</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar OS" : "Nova Ordem de Serviço"}</DialogTitle>
            <DialogDescription>
              Cadastre ordens vinculando temas, responsáveis e indicadores de SLA. Evidências multimídia podem ser
              anexadas posteriormente via Upload Unificado.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de serviço</Label>
                <Input value={form.tipo ?? ""} onChange={(event) => atualizarForm({ tipo: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(value) => atualizarForm({ status: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEMANDA_STATUS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Executora</Label>
                <Select
                  value={form.executorTipo}
                  onValueChange={(value) => atualizarForm({ executorTipo: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEMANDA_EXECUTORES.map((executor) => (
                      <SelectItem key={executor} value={executor}>
                        {executor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Input
                  value={form.responsavel ?? ""}
                  onChange={(event) => atualizarForm({ responsavel: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Linha / Ativo</Label>
                <Input
                  value={form.linhaNome ?? ""}
                  onChange={(event) => atualizarForm({ linhaNome: event.target.value })}
                  placeholder="Nome ou código da linha"
                />
              </div>
              <div className="space-y-2">
                <Label>Trecho / Região</Label>
                <Input value={form.trecho ?? ""} onChange={(event) => atualizarForm({ trecho: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Custo estimado (R$)</Label>
                <Input
                  type="number"
                  value={form.custoEstimado ?? ""}
                  onChange={(event) => atualizarForm({ custoEstimado: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Custo real (R$)</Label>
                <Input
                  type="number"
                  value={form.custoReal ?? ""}
                  onChange={(event) => atualizarForm({ custoReal: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Extensão (km)</Label>
                <Input
                  type="number"
                  value={form.extensaoKm ?? ""}
                  onChange={(event) => atualizarForm({ extensaoKm: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>SLA (dias)</Label>
                <Input
                  type="number"
                  value={form.slaDias ?? ""}
                  onChange={(event) => atualizarForm({ slaDias: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Início</Label>
                <Input
                  type="date"
                  value={form.prazoInicio?.slice(0, 10) ?? ""}
                  onChange={(event) => atualizarForm({ prazoInicio: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Conclusão</Label>
                <Input
                  type="date"
                  value={form.prazoFim?.slice(0, 10) ?? ""}
                  onChange={(event) => atualizarForm({ prazoFim: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tema principal</Label>
                <Select
                  value={form.temaPrincipal ?? ""}
                  onValueChange={(value) => atualizarForm({ temaPrincipal: value as DemandaTema })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEMANDA_TEMAS.map((tema) => (
                      <SelectItem key={tema} value={tema}>
                        {tema}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Outros temas (separar por vírgula)</Label>
                <Input
                  value={form.temas?.join(", ") ?? ""}
                  onChange={(event) =>
                    atualizarForm({
                      temas: event.target.value
                        .split(",")
                        .map((value) => value.trim())
                        .filter(Boolean) as DemandaTema[]
                    })
                  }
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Notas</Label>
                <Textarea
                  rows={4}
                  value={form.notas ?? ""}
                  onChange={(event) => atualizarForm({ notas: event.target.value })}
                  placeholder="Observações, reincidências, métricas de qualidade, etc."
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="flex justify-between items-center">
            {form.id ? (
              <Button variant="destructive" onClick={() => removerDemanda(form.id!)} disabled={deleteMutation.isPending}>
                Remover OS
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={fecharModal}>
                Cancelar
              </Button>
              <Button onClick={salvarDemanda} disabled={createMutation.isPending}>
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
};

export default Demandas;
