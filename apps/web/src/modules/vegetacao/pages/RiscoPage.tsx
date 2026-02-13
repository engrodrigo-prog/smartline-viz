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
import { useI18n } from "@/context/I18nContext";

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

const RISK_CATEGORY_VALUES: VegRiskCategory[] = ["vegetation", "tree_fall", "environmental", "access", "recurrence", "other"];
const RISK_STATUS_VALUES: VegRiskStatus[] = ["open", "mitigated", "accepted", "closed"];

export default function RiscoPage() {
  const { t, formatDateTime } = useI18n();
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
      toast.error(t("vegetacao.pages.risco.toasts.invalidProbability"));
      return;
    }
    if (!Number.isFinite(form.impact) || form.impact < 1 || form.impact > 5) {
      toast.error(t("vegetacao.pages.risco.toasts.invalidImpact"));
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
      toast.success(t("vegetacao.pages.risco.toasts.saved"));
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(t("vegetacao.pages.risco.toasts.saveFailed.title"), { description: err?.message ?? String(err) });
    }
  };

  const remove = async () => {
    if (!form.id) return;
    try {
      await deleteMutation.mutateAsync(form.id);
      toast.success(t("vegetacao.pages.risco.toasts.removed"));
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(t("vegetacao.pages.risco.toasts.removeFailed.title"), { description: err?.message ?? String(err) });
    }
  };

  const columns = [
    { key: "category", label: t("vegetacao.pages.risco.table.category"), render: (_: any, row: VegRisk) => t(`vegetacao.enums.riskCategory.${row.category}`) || row.category },
    { key: "status", label: t("vegetacao.pages.risco.table.status"), render: (_: any, row: VegRisk) => t(`vegetacao.enums.riskStatus.${row.status}`) || row.status },
    { key: "score", label: t("vegetacao.pages.risco.table.score"), render: (_: any, row: VegRisk) => row.score },
    { key: "sla_days", label: t("vegetacao.pages.risco.table.slaDays"), render: (_: any, row: VegRisk) => (row.sla_days ? `${row.sla_days}d` : "—") },
    { key: "created_at", label: t("vegetacao.pages.risco.table.createdAt"), render: (_: any, row: VegRisk) => formatDateTime(row.created_at) },
  ];

  return (
    <VegetacaoModuleShell>
      <VegetacaoPageHeader
        title={t("sidebar.items.vegRisco")}
        description={t("vegetacao.pages.risco.description")}
        right={
          <Button size="sm" onClick={openCreate}>
            {t("vegetacao.pages.risco.actions.create")}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <CardKPI title={t("vegetacao.pages.risco.kpis.total")} value={resumo.total} icon={ShieldAlert} />
        <CardKPI title={t("vegetacao.pages.risco.kpis.open")} value={resumo.abertos} icon={ShieldAlert} />
        <CardKPI title={t("vegetacao.pages.risco.kpis.highScore")} value={resumo.altos} icon={TriangleAlert} />
      </div>

      <div className="tech-card p-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : isError ? (
          <div className="text-sm text-muted-foreground">
            {t("vegetacao.pages.risco.states.loadFailed")}{" "}
            <Button variant="link" onClick={() => refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("vegetacao.pages.risco.states.empty")}</div>
        ) : (
          <DataTableAdvanced data={items} columns={columns} onRowClick={(row) => openEdit(row as VegRisk)} exportable />
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{form.id ? t("vegetacao.pages.risco.dialog.editTitle") : t("vegetacao.pages.risco.dialog.createTitle")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.risco.form.category")}</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v as VegRiskCategory }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_CATEGORY_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`vegetacao.enums.riskCategory.${value}`) || value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("vegetacao.pages.risco.form.status")}</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as VegRiskStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_STATUS_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`vegetacao.enums.riskStatus.${value}`) || value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("vegetacao.pages.risco.form.probability")}</Label>
              <Input type="number" value={form.probability} onChange={(e) => setForm((p) => ({ ...p, probability: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.risco.form.impact")}</Label>
              <Input type="number" value={form.impact} onChange={(e) => setForm((p) => ({ ...p, impact: Number(e.target.value) }))} />
            </div>

            <div className="space-y-2">
              <Label>{t("vegetacao.pages.risco.form.slaDays")}</Label>
              <Input
                type="number"
                value={form.sla_days ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, sla_days: e.target.value ? Number(e.target.value) : null }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("vegetacao.pages.risco.form.anomalyOptional")}</Label>
              <Input value={form.related_anomaly_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, related_anomaly_id: e.target.value || null }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.risco.form.workOrderOptional")}</Label>
              <Input value={form.related_work_order_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, related_work_order_id: e.target.value || null }))} />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>{t("vegetacao.pages.risco.form.notes")}</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2">
            <div>
              {form.id ? (
                <Button variant="destructive" onClick={remove} disabled={deleteMutation.isPending}>
                  {t("common.remove")}
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={save} disabled={saveMutation.isPending}>
                {t("common.save")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </VegetacaoModuleShell>
  );
}
