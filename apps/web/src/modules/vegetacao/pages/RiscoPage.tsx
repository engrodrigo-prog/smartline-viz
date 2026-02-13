import { useMemo, useState } from "react";
import { toast } from "sonner";
import VegetacaoModuleShell from "@/modules/vegetacao/VegetacaoModuleShell";
import { VegetacaoPageHeader } from "@/modules/vegetacao/components/VegetacaoPageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTableAdvanced from "@/components/DataTableAdvanced";
import CardKPI from "@/components/CardKPI";
import { ShieldAlert, TriangleAlert } from "lucide-react";
import type { VegRisk, VegRiskCategory, VegRiskStatus } from "@/modules/vegetacao/api/vegetacaoApi";
import { useVegDeleteRisco, useVegRiscoMutation, useVegRiscos } from "@/modules/vegetacao/hooks/useVegetacao";

type FormState = {
  id?: string;
  related_anomaly_id?: string | null;
  related_work_order_id?: string | null;
  category: VegRiskCategory;
  probability: number;
  impact: number;
  sla_days?: number | null;
  status: VegRiskStatus;
  notes: string;
};

const emptyForm: FormState = {
  related_anomaly_id: null,
  related_work_order_id: null,
  category: "vegetation",
  probability: 3,
  impact: 3,
  sla_days: null,
  status: "open",
  notes: "",
};

const CATEGORY_LABEL: Record<VegRiskCategory, string> = {
  vegetation: "Vegetação",
  tree_fall: "Queda de árvore",
  environmental: "Ambiental",
  access: "Acesso",
  recurrence: "Recorrência",
  other: "Outro",
};

const STATUS_LABEL: Record<VegRiskStatus, string> = {
  open: "Aberto",
  mitigated: "Mitigado",
  accepted: "Aceito",
  closed: "Fechado",
};

export default function RiscoPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data, isLoading, isError, refetch } = useVegRiscos({ limit: 200 });
  const saveMutation = useVegRiscoMutation();
  const deleteMutation = useVegDeleteRisco();
  const items = data?.items ?? [];

  const resumo = useMemo(() => {
    const abertos = items.filter((r) => r.status === "open").length;
    const altos = items.filter((r) => r.score >= 16).length;
    return { total: items.length, abertos, altos };
  }, [items]);

  const openCreate = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row: VegRisk) => {
    setForm({
      id: row.id,
      related_anomaly_id: row.related_anomaly_id,
      related_work_order_id: row.related_work_order_id,
      category: row.category,
      probability: row.probability,
      impact: row.impact,
      sla_days: row.sla_days,
      status: row.status,
      notes: row.notes ?? "",
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!Number.isFinite(form.probability) || form.probability < 1 || form.probability > 5) {
      toast.error("Probabilidade deve ser 1..5.");
      return;
    }
    if (!Number.isFinite(form.impact) || form.impact < 1 || form.impact > 5) {
      toast.error("Impacto deve ser 1..5.");
      return;
    }

    try {
      await saveMutation.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        related_anomaly_id: form.related_anomaly_id?.trim() ? form.related_anomaly_id.trim() : null,
        related_work_order_id: form.related_work_order_id?.trim() ? form.related_work_order_id.trim() : null,
        category: form.category,
        probability: form.probability,
        impact: form.impact,
        sla_days: form.sla_days ?? null,
        status: form.status,
        notes: form.notes.trim() ? form.notes.trim() : undefined,
        metadata: {},
      });
      toast.success("Risco salvo");
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error("Falha ao salvar", { description: err?.message ?? String(err) });
    }
  };

  const remove = async () => {
    if (!form.id) return;
    try {
      await deleteMutation.mutateAsync(form.id);
      toast.success("Risco removido");
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error("Falha ao remover", { description: err?.message ?? String(err) });
    }
  };

  const columns = [
    { key: "category", label: "Categoria", render: (_: any, row: VegRisk) => CATEGORY_LABEL[row.category] ?? row.category },
    { key: "status", label: "Status", render: (_: any, row: VegRisk) => STATUS_LABEL[row.status] ?? row.status },
    { key: "score", label: "Score", render: (_: any, row: VegRisk) => row.score },
    { key: "sla_days", label: "SLA", render: (_: any, row: VegRisk) => (row.sla_days ? `${row.sla_days}d` : "—") },
    { key: "created_at", label: "Criado em", render: (_: any, row: VegRisk) => new Date(row.created_at).toLocaleString() },
  ];

  return (
    <VegetacaoModuleShell>
      <VegetacaoPageHeader
        title="Risco"
        description="Registro de risco, score, SLA e mitigação."
        right={
          <Button size="sm" onClick={openCreate}>
            Novo risco
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <CardKPI title="Total" value={resumo.total} icon={ShieldAlert} />
        <CardKPI title="Abertos" value={resumo.abertos} icon={ShieldAlert} />
        <CardKPI title="Score alto (≥16)" value={resumo.altos} icon={TriangleAlert} />
      </div>

      <div className="tech-card p-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : isError ? (
          <div className="text-sm text-muted-foreground">
            Falha ao carregar. <Button variant="link" onClick={() => refetch()}>Tentar novamente</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhum risco encontrado.</div>
        ) : (
          <DataTableAdvanced data={items} columns={columns} onRowClick={(row) => openEdit(row as VegRisk)} exportable />
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar risco" : "Novo risco"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v as VegRiskCategory }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABEL) as VegRiskCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as VegRiskStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as VegRiskStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Probabilidade (1..5)</Label>
              <Input type="number" value={form.probability} onChange={(e) => setForm((p) => ({ ...p, probability: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Impacto (1..5)</Label>
              <Input type="number" value={form.impact} onChange={(e) => setForm((p) => ({ ...p, impact: Number(e.target.value) }))} />
            </div>

            <div className="space-y-2">
              <Label>SLA (dias)</Label>
              <Input
                type="number"
                value={form.sla_days ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, sla_days: e.target.value ? Number(e.target.value) : null }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Anomalia (opcional)</Label>
              <Input value={form.related_anomaly_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, related_anomaly_id: e.target.value || null }))} />
            </div>
            <div className="space-y-2">
              <Label>OS (opcional)</Label>
              <Input value={form.related_work_order_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, related_work_order_id: e.target.value || null }))} />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2">
            <div>{form.id ? <Button variant="destructive" onClick={remove} disabled={deleteMutation.isPending}>Remover</Button> : null}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={save} disabled={saveMutation.isPending}>
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </VegetacaoModuleShell>
  );
}
