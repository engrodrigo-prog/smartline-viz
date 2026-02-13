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
import { Scissors, Trees } from "lucide-react";
import type { VegAction, VegActionStatus, VegActionType, VegLocationPayload } from "@/modules/vegetacao/api/vegetacaoApi";
import { useVegDeleteExecucao, useVegExecucaoMutation, useVegExecucoes } from "@/modules/vegetacao/hooks/useVegetacao";
import LocationPicker from "@/modules/vegetacao/components/LocationPicker";
import EvidencePanel from "@/modules/vegetacao/components/EvidencePanel";
import SpeciesSelect from "@/modules/vegetacao/components/SpeciesSelect";
import type { VegSpeciesItem } from "@/modules/vegetacao/constants/species";
import { findVegSpeciesByCommonName } from "@/modules/vegetacao/constants/species";
import { locationPayloadFromRow } from "@/modules/vegetacao/utils/location";
import { useI18n } from "@/context/I18nContext";
import { vegEnumLabel } from "@/modules/vegetacao/i18n";

type FormState = {
  id?: string;
  work_order_id?: string | null;
  anomaly_id?: string | null;
  action_type: VegActionType;
  status: VegActionStatus;
  executed_at?: string | null;
  quantity?: number | null;
  unit?: string | null;
  species: VegSpeciesItem | null;
  notes: string;
  location: VegLocationPayload | null;
};

const emptyForm: FormState = {
  work_order_id: null,
  anomaly_id: null,
  action_type: "pruning",
  status: "planned",
  executed_at: null,
  quantity: null,
  unit: null,
  species: null,
  notes: "",
  location: null,
};

const ACTION_TYPE_VALUES: VegActionType[] = [
  "pruning",
  "mowing",
  "laser_pruning",
  "tree_removal",
  "clearing",
  "inspection",
  "verification",
  "other",
];
const ACTION_STATUS_VALUES: VegActionStatus[] = [
  "planned",
  "assigned",
  "in_progress",
  "executed",
  "verified",
  "closed",
  "canceled",
];

export default function ExecucoesPage() {
  const { t, formatDateTime } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data, isLoading, isError, refetch } = useVegExecucoes({ limit: 200 });
  const saveMutation = useVegExecucaoMutation();
  const deleteMutation = useVegDeleteExecucao();
  const items = data?.items ?? [];

  const resumo = useMemo(() => {
    const executadas = items.filter((e) => e.status === "executed").length;
    const emAndamento = items.filter((e) => e.status === "in_progress").length;
    return { total: items.length, executadas, emAndamento };
  }, [items]);

  const openCreate = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row: VegAction) => {
    const speciesFromRow = (() => {
      const meta = row.metadata;
      if (!meta || typeof meta !== "object") return null;
      const raw = (meta as Record<string, unknown>).species;
      if (!raw || typeof raw !== "object") return null;
      const commonName = (raw as Record<string, unknown>).commonName;
      if (typeof commonName !== "string" || !commonName.trim()) return null;
      const found = findVegSpeciesByCommonName(commonName);
      if (found) return found;
      const scientificName = (raw as Record<string, unknown>).scientificName;
      return {
        commonName,
        scientificName: typeof scientificName === "string" ? scientificName : "",
        typicalUseOrNotes: "",
      } satisfies VegSpeciesItem;
    })();

    setForm({
      id: row.id,
      work_order_id: row.work_order_id,
      anomaly_id: row.anomaly_id,
      action_type: row.action_type,
      status: row.status,
      executed_at: row.executed_at,
      quantity: row.quantity,
      unit: row.unit,
      species: speciesFromRow,
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
        work_order_id: form.work_order_id?.trim() ? form.work_order_id.trim() : null,
        anomaly_id: form.anomaly_id?.trim() ? form.anomaly_id.trim() : null,
        action_type: form.action_type,
        status: form.status,
        executed_at: form.executed_at ? new Date(form.executed_at).toISOString() : null,
        quantity: form.quantity ?? null,
        unit: form.unit?.trim() ? form.unit.trim() : null,
        notes: form.notes.trim() ? form.notes.trim() : undefined,
        location: normalizeLocation(form.location),
        metadata: form.species
          ? {
              species: {
                commonName: form.species.commonName,
                scientificName: form.species.scientificName,
              },
            }
          : {},
      });
      toast.success(t("vegetacao.pages.execucoes.toasts.saved"));
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(t("vegetacao.pages.execucoes.toasts.saveFailed.title"), { description: err?.message ?? String(err) });
    }
  };

  const remove = async () => {
    if (!form.id) return;
    try {
      await deleteMutation.mutateAsync(form.id);
      toast.success(t("vegetacao.pages.execucoes.toasts.removed"));
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(t("vegetacao.pages.execucoes.toasts.removeFailed.title"), { description: err?.message ?? String(err) });
    }
  };

  const columns = [
    { key: "action_type", label: t("vegetacao.pages.execucoes.table.actionType"), render: (_: any, row: VegAction) => t(`vegetacao.enums.actionType.${row.action_type}`) || row.action_type },
    { key: "status", label: t("vegetacao.pages.execucoes.table.status"), render: (_: any, row: VegAction) => vegEnumLabel.actionStatus(t, row.status) },
    { key: "quantity", label: t("vegetacao.pages.execucoes.table.quantity"), render: (_: any, row: VegAction) => (row.quantity !== null && row.quantity !== undefined ? `${row.quantity} ${row.unit ?? ""}` : "—") },
    { key: "executed_at", label: t("vegetacao.pages.execucoes.table.executedAt"), render: (_: any, row: VegAction) => (row.executed_at ? formatDateTime(row.executed_at) : "—") },
    { key: "created_at", label: t("vegetacao.pages.execucoes.table.createdAt"), render: (_: any, row: VegAction) => formatDateTime(row.created_at) },
  ];

  return (
    <VegetacaoModuleShell>
      <VegetacaoPageHeader
        title={t("sidebar.items.vegExecucoes")}
        description={t("vegetacao.pages.execucoes.description")}
        right={
          <Button size="sm" onClick={openCreate}>
            {t("vegetacao.pages.execucoes.actions.create")}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <CardKPI title={t("vegetacao.pages.execucoes.kpis.total")} value={resumo.total} icon={Trees} />
        <CardKPI title={t("vegetacao.pages.execucoes.kpis.inProgress")} value={resumo.emAndamento} icon={Trees} />
        <CardKPI title={t("vegetacao.pages.execucoes.kpis.executed")} value={resumo.executadas} icon={Scissors} />
      </div>

      <div className="tech-card p-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : isError ? (
          <div className="text-sm text-muted-foreground">
            {t("vegetacao.pages.execucoes.states.loadFailed")}{" "}
            <Button variant="link" onClick={() => refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("vegetacao.pages.execucoes.states.empty")}</div>
        ) : (
          <DataTableAdvanced data={items} columns={columns} onRowClick={(row) => openEdit(row as VegAction)} exportable />
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {form.id ? t("vegetacao.pages.execucoes.dialog.editTitle") : t("vegetacao.pages.execucoes.dialog.createTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.execucoes.form.actionType")}</Label>
              <Select value={form.action_type} onValueChange={(v) => setForm((p) => ({ ...p, action_type: v as VegActionType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPE_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`vegetacao.enums.actionType.${value}`) || value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.execucoes.form.status")}</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as VegActionStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_STATUS_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {vegEnumLabel.actionStatus(t, value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("vegetacao.pages.execucoes.form.workOrderOptional")}</Label>
              <Input value={form.work_order_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, work_order_id: e.target.value || null }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.execucoes.form.anomalyOptional")}</Label>
              <Input value={form.anomaly_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, anomaly_id: e.target.value || null }))} />
            </div>

            <div className="space-y-2">
              <Label>{t("vegetacao.pages.execucoes.form.executedAt")}</Label>
              <Input
                type="datetime-local"
                value={toLocalInput(form.executed_at)}
                onChange={(e) => setForm((p) => ({ ...p, executed_at: e.target.value ? new Date(e.target.value).toISOString() : null }))}
              />
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("vegetacao.pages.execucoes.form.quantity")}</Label>
                <Input
                  type="number"
                  value={form.quantity ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value ? Number(e.target.value) : null }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("vegetacao.pages.execucoes.form.unit")}</Label>
                <Input
                  value={form.unit ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value || null }))}
                  placeholder={t("vegetacao.pages.execucoes.form.unitPlaceholder")}
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>{t("vegetacao.pages.execucoes.form.speciesOptional")}</Label>
              <SpeciesSelect value={form.species} onChange={(next) => setForm((p) => ({ ...p, species: next }))} />
              {form.species?.typicalUseOrNotes ? (
                <div className="text-xs text-muted-foreground">{form.species.typicalUseOrNotes}</div>
              ) : null}
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>{t("vegetacao.pages.execucoes.form.notes")}</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="md:col-span-2">
              <Label>{t("vegetacao.pages.execucoes.form.location")}</Label>
              <div className="mt-2">
                <LocationPicker value={form.location} onChange={(next) => setForm((p) => ({ ...p, location: next }))} />
              </div>
            </div>
          </div>

          {form.id ? (
            <div className="mt-4">
              <EvidencePanel linked={{ actionId: form.id }} defaultLocation={form.location} />
            </div>
          ) : (
            <div className="mt-4 text-sm text-muted-foreground">{t("vegetacao.pages.execucoes.states.saveToAttachEvidence")}</div>
          )}

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
