import { useMemo, useState } from "react";
import { toast } from "sonner";
import VegetacaoModuleShell from "@/modules/vegetacao/VegetacaoModuleShell";
import { VegetacaoPageHeader } from "@/modules/vegetacao/components/VegetacaoPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTableAdvanced from "@/components/DataTableAdvanced";
import CardKPI from "@/components/CardKPI";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useVegAnomaliaMutation, useVegAnomalias, useVegDeleteAnomalia } from "@/modules/vegetacao/hooks/useVegetacao";
import type {
  VegAnomaly,
  VegAnomalyStatus,
  VegAnomalyType,
  VegSeverity,
  VegSource,
  VegLocationPayload,
} from "@/modules/vegetacao/api/vegetacaoApi";
import LocationPicker from "@/modules/vegetacao/components/LocationPicker";
import EvidencePanel from "@/modules/vegetacao/components/EvidencePanel";
import { locationPayloadFromRow } from "@/modules/vegetacao/utils/location";
import { useI18n } from "@/context/I18nContext";
import { vegEnumLabel } from "@/modules/vegetacao/i18n";

type FormState = {
  id?: string;
  title: string;
  description?: string;
  status: VegAnomalyStatus;
  severity: VegSeverity;
  anomaly_type: VegAnomalyType;
  source: VegSource;
  due_date?: string;
  asset_ref?: string;
  tagsText: string;
  tree_height_m?: string;
  tree_canopy_diameter_m?: string;
  tree_trunk_diameter_cm?: string;
  metadata?: Record<string, unknown>;
  location: VegLocationPayload | null;
};

const emptyForm: FormState = {
  title: "",
  description: "",
  status: "open",
  severity: "low",
  anomaly_type: "other",
  source: "field",
  due_date: "",
  asset_ref: "",
  tagsText: "",
  tree_height_m: "",
  tree_canopy_diameter_m: "",
  tree_trunk_diameter_cm: "",
  metadata: {},
  location: null,
};

const STATUS_VALUES: VegAnomalyStatus[] = ["open", "triaged", "scheduled", "in_progress", "resolved", "canceled"];
const SEVERITY_VALUES: VegSeverity[] = ["low", "medium", "high", "critical"];
const TYPE_VALUES: VegAnomalyType[] = [
  "encroachment",
  "risk_tree",
  "regrowth",
  "fallen_tree",
  "blocked_access",
  "environmental_restriction",
  "other",
];
const SOURCE_VALUES: VegSource[] = ["field", "satellite", "lidar", "drone", "customer", "other"];

export default function AnomaliasPage() {
  const { t, formatDateTime } = useI18n();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<VegAnomalyStatus | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<VegSeverity | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const filters = useMemo(
    () => ({
      q: q.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      severity: severityFilter === "all" ? undefined : severityFilter,
      limit: 200,
    }),
    [q, severityFilter, statusFilter],
  );

  const { data, isLoading, isError, refetch } = useVegAnomalias(filters);
  const createOrUpdate = useVegAnomaliaMutation();
  const deleteMutation = useVegDeleteAnomalia();
  const items = data?.items ?? [];

  const resumo = useMemo(() => {
    const abertas = items.filter((i) => ["open", "triaged", "scheduled", "in_progress"].includes(i.status)).length;
    const criticas = items.filter((i) => i.severity === "critical" || i.severity === "high").length;
    return { total: items.length, abertas, criticas };
  }, [items]);

  const openCreate = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row: VegAnomaly) => {
    const meta = row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, any>) : {};
    const measurements =
      meta.tree_measurements && typeof meta.tree_measurements === "object" ? (meta.tree_measurements as Record<string, any>) : {};

    setForm({
      id: row.id,
      title: row.title,
      description: row.description ?? "",
      status: row.status,
      severity: row.severity,
      anomaly_type: row.anomaly_type,
      source: row.source,
      due_date: row.due_date ?? "",
      asset_ref: row.asset_ref ?? "",
      tagsText: (row.tags ?? []).join(", "),
      tree_height_m: typeof measurements.tree_height_m === "number" ? String(measurements.tree_height_m) : "",
      tree_canopy_diameter_m:
        typeof measurements.tree_canopy_diameter_m === "number" ? String(measurements.tree_canopy_diameter_m) : "",
      tree_trunk_diameter_cm:
        typeof measurements.tree_trunk_diameter_cm === "number" ? String(measurements.tree_trunk_diameter_cm) : "",
      metadata: meta,
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

  const save = async () => {
    const title = form.title.trim();
    if (!title) {
      toast.error(t("vegetacao.pages.anomalias.toasts.missingTitle"));
      return;
    }

    const tags = form.tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const parseOptionalNumber = (raw: string | undefined) => {
      const s = (raw ?? "").trim();
      if (!s) return null;
      const n = Number(s.replace(",", "."));
      return Number.isFinite(n) ? n : null;
    };

    const tree_height_m = parseOptionalNumber(form.tree_height_m);
    const tree_canopy_diameter_m = parseOptionalNumber(form.tree_canopy_diameter_m);
    const tree_trunk_diameter_cm = parseOptionalNumber(form.tree_trunk_diameter_cm);

    const metadata = { ...(form.metadata ?? {}) } as Record<string, unknown>;
    const hasMeasurements = tree_height_m !== null || tree_canopy_diameter_m !== null || tree_trunk_diameter_cm !== null;
    if (hasMeasurements) {
      metadata.tree_measurements = {
        tree_height_m,
        tree_canopy_diameter_m,
        tree_trunk_diameter_cm,
      };
    } else if ("tree_measurements" in metadata) {
      delete metadata.tree_measurements;
    }

    try {
      await createOrUpdate.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        title,
        description: form.description?.trim() ? form.description.trim() : undefined,
        status: form.status,
        severity: form.severity,
        anomaly_type: form.anomaly_type,
        source: form.source,
        due_date: form.due_date?.trim() ? form.due_date.trim() : undefined,
        asset_ref: form.asset_ref?.trim() ? form.asset_ref.trim() : undefined,
        tags,
        metadata,
        location: normalizeLocation(form.location),
      });
      toast.success(t("vegetacao.pages.anomalias.toasts.saved"));
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(t("vegetacao.pages.anomalias.toasts.saveFailed.title"), {
        description: err?.message ?? String(err),
      });
    }
  };

  const remove = async () => {
    if (!form.id) return;
    try {
      await deleteMutation.mutateAsync(form.id);
      toast.success(t("vegetacao.pages.anomalias.toasts.removed"));
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(t("vegetacao.pages.anomalias.toasts.removeFailed.title"), {
        description: err?.message ?? String(err),
      });
    }
  };

  const columns = [
    { key: "title", label: t("vegetacao.pages.anomalias.table.title"), render: (_: any, row: VegAnomaly) => <span className="font-medium">{row.title}</span> },
    { key: "status", label: t("vegetacao.pages.anomalias.table.status"), render: (_: any, row: VegAnomaly) => vegEnumLabel.anomalyStatus(t, row.status) },
    { key: "severity", label: t("vegetacao.pages.anomalias.table.severity"), render: (_: any, row: VegAnomaly) => vegEnumLabel.severity(t, row.severity) },
    { key: "anomaly_type", label: t("vegetacao.pages.anomalias.table.type"), render: (_: any, row: VegAnomaly) => vegEnumLabel.anomalyType(t, row.anomaly_type) },
    { key: "due_date", label: t("vegetacao.pages.anomalias.table.dueDate"), render: (_: any, row: VegAnomaly) => row.due_date ?? "—" },
    { key: "created_at", label: t("vegetacao.pages.anomalias.table.createdAt"), render: (_: any, row: VegAnomaly) => formatDateTime(row.created_at) },
  ];

  return (
    <VegetacaoModuleShell>
      <VegetacaoPageHeader
        title={t("sidebar.items.vegAnomalias")}
        description={t("vegetacao.pages.anomalias.description")}
        right={
          <Button size="sm" onClick={openCreate}>
            {t("vegetacao.pages.anomalias.actions.create")}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <CardKPI title={t("vegetacao.pages.anomalias.kpis.total")} value={resumo.total} icon={AlertTriangle} />
        <CardKPI title={t("vegetacao.pages.anomalias.kpis.open")} value={resumo.abertas} icon={AlertTriangle} />
        <CardKPI title={t("vegetacao.pages.anomalias.kpis.highCritical")} value={resumo.criticas} icon={ShieldAlert} />
      </div>

      <div className="tech-card p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label>{t("vegetacao.pages.anomalias.filters.search")}</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("vegetacao.pages.anomalias.filters.searchPlaceholder")} />
          </div>
          <div className="space-y-1">
            <Label>{t("vegetacao.pages.anomalias.filters.status")}</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder={t("common.all")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {STATUS_VALUES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {vegEnumLabel.anomalyStatus(t, s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t("vegetacao.pages.anomalias.filters.severity")}</Label>
            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder={t("common.all")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {SEVERITY_VALUES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {vegEnumLabel.severity(t, s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : isError ? (
          <div className="text-sm text-muted-foreground">
            {t("vegetacao.pages.anomalias.states.loadFailed")}{" "}
            <Button variant="link" onClick={() => refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("vegetacao.pages.anomalias.states.empty")}</div>
        ) : (
          <DataTableAdvanced data={items} columns={columns} onRowClick={(row) => openEdit(row as VegAnomaly)} exportable />
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {form.id ? t("vegetacao.pages.anomalias.dialog.editTitle") : t("vegetacao.pages.anomalias.dialog.createTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.anomalias.form.title")}</Label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.anomalias.form.type")}</Label>
              <Select
                value={form.anomaly_type}
                onValueChange={(v) => setForm((p) => ({ ...p, anomaly_type: v as VegAnomalyType }))}
              >
                <SelectTrigger>
                <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {vegEnumLabel.anomalyType(t, value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("vegetacao.pages.anomalias.form.status")}</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as VegAnomalyStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {vegEnumLabel.anomalyStatus(t, value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.anomalias.form.severity")}</Label>
              <Select value={form.severity} onValueChange={(v) => setForm((p) => ({ ...p, severity: v as VegSeverity }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {vegEnumLabel.severity(t, value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("vegetacao.pages.anomalias.form.source")}</Label>
              <Select value={form.source} onValueChange={(v) => setForm((p) => ({ ...p, source: v as VegSource }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {vegEnumLabel.source(t, value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.anomalias.form.dueDate")}</Label>
              <Input
                type="date"
                value={form.due_date ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>{t("vegetacao.pages.anomalias.form.description")}</Label>
              <Textarea
                value={form.description ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>{t("vegetacao.pages.anomalias.form.tree.sectionTitle")}</Label>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("vegetacao.pages.anomalias.form.tree.height")}</Label>
                  <Input
                    inputMode="decimal"
                    placeholder={t("vegetacao.pages.anomalias.form.tree.heightPlaceholder")}
                    value={form.tree_height_m ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, tree_height_m: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("vegetacao.pages.anomalias.form.tree.canopy")}</Label>
                  <Input
                    inputMode="decimal"
                    placeholder={t("vegetacao.pages.anomalias.form.tree.canopyPlaceholder")}
                    value={form.tree_canopy_diameter_m ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, tree_canopy_diameter_m: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("vegetacao.pages.anomalias.form.tree.trunk")}</Label>
                  <Input
                    inputMode="decimal"
                    placeholder={t("vegetacao.pages.anomalias.form.tree.trunkPlaceholder")}
                    value={form.tree_trunk_diameter_cm ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, tree_trunk_diameter_cm: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("vegetacao.pages.anomalias.form.assetRef")}</Label>
              <Input value={form.asset_ref ?? ""} onChange={(e) => setForm((p) => ({ ...p, asset_ref: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.anomalias.form.tags")}</Label>
              <Input
                value={form.tagsText}
                onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))}
                placeholder={t("vegetacao.pages.anomalias.form.tagsPlaceholder")}
              />
            </div>

            <div className="md:col-span-2">
              <Label>{t("vegetacao.pages.anomalias.form.location")}</Label>
              <div className="mt-2">
                <LocationPicker value={form.location} onChange={(next) => setForm((p) => ({ ...p, location: next }))} />
              </div>
            </div>
          </div>

          {form.id ? (
            <div className="mt-4">
              <EvidencePanel linked={{ anomalyId: form.id }} defaultLocation={form.location} />
            </div>
          ) : (
            <div className="mt-4 text-sm text-muted-foreground">
              {t("vegetacao.pages.anomalias.states.saveToAttachEvidence")}
            </div>
          )}

          <DialogFooter className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {form.id ? (
                <Button type="button" variant="destructive" onClick={remove} disabled={deleteMutation.isPending}>
                  {t("common.remove")}
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="button" onClick={save} disabled={createOrUpdate.isPending}>
                {t("common.save")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </VegetacaoModuleShell>
  );
}
