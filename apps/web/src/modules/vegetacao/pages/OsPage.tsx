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
import { ClipboardList, Clock } from "lucide-react";
import type { VegWorkOrder, VegWorkOrderStatus, VegPriority, VegLocationPayload } from "@/modules/vegetacao/api/vegetacaoApi";
import { useVegDeleteOs, useVegOs, useVegOsMutation } from "@/modules/vegetacao/hooks/useVegetacao";
import LocationPicker from "@/modules/vegetacao/components/LocationPicker";
import EvidencePanel from "@/modules/vegetacao/components/EvidencePanel";
import { locationPayloadFromRow } from "@/modules/vegetacao/utils/location";
import { useI18n } from "@/context/I18nContext";

type FormState = {
  id?: string;
  anomaly_id?: string;
  inspection_id?: string;
  status: VegWorkOrderStatus;
  priority: VegPriority;
  team_id?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  notes: string;
  location: VegLocationPayload | null;
};

const emptyForm: FormState = {
  anomaly_id: "",
  inspection_id: "",
  status: "pending",
  priority: "medium",
  team_id: null,
  scheduled_start: null,
  scheduled_end: null,
  notes: "",
  location: null,
};

const WORK_ORDER_STATUS_VALUES: VegWorkOrderStatus[] = [
  "pending",
  "assigned",
  "in_progress",
  "executed",
  "verified",
  "closed",
  "canceled",
];
const PRIORITY_VALUES: VegPriority[] = ["low", "medium", "high", "critical"];

export default function OsPage() {
  const { t, formatDateTime } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data, isLoading, isError, refetch } = useVegOs({ limit: 200 });
  const saveMutation = useVegOsMutation();
  const deleteMutation = useVegDeleteOs();
  const items = data?.items ?? [];

  const resumo = useMemo(() => {
    const pendentes = items.filter((o) => ["pending", "assigned", "in_progress"].includes(o.status)).length;
    const janela = items.filter((o) => Boolean(o.scheduled_start && o.scheduled_end)).length;
    return { total: items.length, pendentes, janela };
  }, [items]);

  const statusLabel = (status: VegWorkOrderStatus) => t(`vegetacao.enums.workOrderStatus.${status}`) || status;
  const priorityLabel = (priority: VegPriority) => t(`vegetacao.enums.priority.${priority}`) || priority;

  const openCreate = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row: VegWorkOrder) => {
    setForm({
      id: row.id,
      anomaly_id: row.anomaly_id ?? "",
      inspection_id: row.inspection_id ?? "",
      status: row.status,
      priority: row.priority,
      team_id: row.team_id,
      scheduled_start: row.scheduled_start,
      scheduled_end: row.scheduled_end,
      notes: row.notes ?? "",
      location: locationPayloadFromRow(row),
    });
    setModalOpen(true);
  };

  const normalizeLocation = (loc: VegLocationPayload | null) => {
    if (!loc) return undefined;
    if ((loc.method === "gps" || loc.method === "map_pin") && !loc.coords) return undefined;
    if (loc.method === "manual_address" && !loc.address_text && !loc.coords) return undefined;
    return loc;
  };

  const toLocalInput = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const save = async () => {
    try {
      await saveMutation.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        anomaly_id: form.anomaly_id?.trim() ? form.anomaly_id.trim() : undefined,
        inspection_id: form.inspection_id?.trim() ? form.inspection_id.trim() : undefined,
        status: form.status,
        priority: form.priority,
        team_id: form.team_id?.trim() ? form.team_id.trim() : null,
        scheduled_start: form.scheduled_start ? new Date(form.scheduled_start).toISOString() : null,
        scheduled_end: form.scheduled_end ? new Date(form.scheduled_end).toISOString() : null,
        notes: form.notes.trim() ? form.notes.trim() : undefined,
        location: normalizeLocation(form.location),
        metadata: {},
      });
      toast.success(t("vegetacao.pages.os.toasts.saved"));
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(t("vegetacao.pages.os.toasts.saveFailed.title"), { description: err?.message ?? String(err) });
    }
  };

  const remove = async () => {
    if (!form.id) return;
    try {
      await deleteMutation.mutateAsync(form.id);
      toast.success(t("vegetacao.pages.os.toasts.removed"));
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(t("vegetacao.pages.os.toasts.removeFailed.title"), { description: err?.message ?? String(err) });
    }
  };

  const columns = [
    { key: "status", label: t("vegetacao.pages.os.table.status"), render: (_: any, row: VegWorkOrder) => statusLabel(row.status) },
    { key: "priority", label: t("vegetacao.pages.os.table.priority"), render: (_: any, row: VegWorkOrder) => priorityLabel(row.priority) },
    { key: "scheduled_start", label: t("vegetacao.pages.os.table.start"), render: (_: any, row: VegWorkOrder) => (row.scheduled_start ? formatDateTime(row.scheduled_start) : "—") },
    { key: "scheduled_end", label: t("vegetacao.pages.os.table.end"), render: (_: any, row: VegWorkOrder) => (row.scheduled_end ? formatDateTime(row.scheduled_end) : "—") },
    { key: "created_at", label: t("vegetacao.pages.os.table.createdAt"), render: (_: any, row: VegWorkOrder) => formatDateTime(row.created_at) },
  ];

  return (
    <VegetacaoModuleShell>
      <VegetacaoPageHeader
        title={t("sidebar.items.vegOs")}
        description={t("vegetacao.pages.os.description")}
        right={
          <Button size="sm" onClick={openCreate}>
            {t("vegetacao.pages.os.actions.create")}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <CardKPI title={t("vegetacao.pages.os.kpis.total")} value={resumo.total} icon={ClipboardList} />
        <CardKPI title={t("vegetacao.pages.os.kpis.pending")} value={resumo.pendentes} icon={ClipboardList} />
        <CardKPI title={t("vegetacao.pages.os.kpis.windowed")} value={resumo.janela} icon={Clock} />
      </div>

      <div className="tech-card p-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : isError ? (
          <div className="text-sm text-muted-foreground">
            {t("vegetacao.pages.os.states.loadFailed")}{" "}
            <Button variant="link" onClick={() => refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("vegetacao.pages.os.states.empty")}</div>
        ) : (
          <DataTableAdvanced data={items} columns={columns} onRowClick={(row) => openEdit(row as VegWorkOrder)} exportable />
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{form.id ? t("vegetacao.pages.os.dialog.editTitle") : t("vegetacao.pages.os.dialog.createTitle")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.os.form.status")}</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as VegWorkOrderStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_ORDER_STATUS_VALUES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.os.form.priority")}</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v as VegPriority }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_VALUES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {priorityLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("vegetacao.pages.os.form.anomalyOptional")}</Label>
              <Input value={form.anomaly_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, anomaly_id: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.os.form.inspectionOptional")}</Label>
              <Input value={form.inspection_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, inspection_id: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>{t("vegetacao.pages.os.form.scheduledStart")}</Label>
              <Input
                type="datetime-local"
                value={toLocalInput(form.scheduled_start)}
                onChange={(e) => setForm((p) => ({ ...p, scheduled_start: e.target.value ? new Date(e.target.value).toISOString() : null }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.os.form.scheduledEnd")}</Label>
              <Input
                type="datetime-local"
                value={toLocalInput(form.scheduled_end)}
                onChange={(e) => setForm((p) => ({ ...p, scheduled_end: e.target.value ? new Date(e.target.value).toISOString() : null }))}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>{t("vegetacao.pages.os.form.notes")}</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="md:col-span-2">
              <Label>{t("vegetacao.pages.os.form.location")}</Label>
              <div className="mt-2">
                <LocationPicker value={form.location} onChange={(next) => setForm((p) => ({ ...p, location: next }))} />
              </div>
            </div>
          </div>

          {form.id ? (
            <div className="mt-4">
              <EvidencePanel linked={{ workOrderId: form.id }} defaultLocation={form.location} />
            </div>
          ) : (
            <div className="mt-4 text-sm text-muted-foreground">{t("vegetacao.pages.os.states.saveToAttachEvidence")}</div>
          )}

          <DialogFooter className="flex items-center justify-between gap-2">
            <div>
              {form.id ? (
                <Button variant="destructive" onClick={remove}>
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
