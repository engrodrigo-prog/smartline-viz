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
import { Checkbox } from "@/components/ui/checkbox";
import DataTableAdvanced from "@/components/DataTableAdvanced";
import CardKPI from "@/components/CardKPI";
import { ClipboardList, AlertTriangle } from "lucide-react";
import type { VegInspection, VegInspectionStatus, VegSeverity, VegActionType, VegLocationPayload } from "@/modules/vegetacao/api/vegetacaoApi";
import { useVegDeleteInspecao, useVegInspecaoMutation, useVegInspecoes } from "@/modules/vegetacao/hooks/useVegetacao";
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
  anomaly_id?: string;
  status: VegInspectionStatus;
  severity: VegSeverity | null;
  requires_action: boolean;
  suggested_action_type: VegActionType | null;
  species: VegSpeciesItem | null;
  tree_height_m: string;
  tree_canopy_diameter_m: string;
  tree_trunk_diameter_cm: string;
  findingsText: string;
  notes: string;
  location: VegLocationPayload | null;
};

const emptyForm: FormState = {
  anomaly_id: "",
  status: "open",
  severity: null,
  requires_action: false,
  suggested_action_type: null,
  species: null,
  tree_height_m: "",
  tree_canopy_diameter_m: "",
  tree_trunk_diameter_cm: "",
  findingsText: "{}",
  notes: "",
  location: null,
};

export default function InspecoesPage() {
  const { t, formatDateTime } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data, isLoading, isError, refetch } = useVegInspecoes({ limit: 200 });
  const saveMutation = useVegInspecaoMutation();
  const deleteMutation = useVegDeleteInspecao();
  const items = data?.items ?? [];

  const resumo = useMemo(() => {
    const abertas = items.filter((i) => i.status === "open").length;
    const comAcao = items.filter((i) => i.requires_action).length;
    return { total: items.length, abertas, comAcao };
  }, [items]);

  const openCreate = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row: VegInspection) => {
    const speciesFromRow = (() => {
      const f = row.findings;
      if (!f || typeof f !== "object") return null;
      const raw = (f as Record<string, unknown>).species;
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

    const measurementsFromRow = (() => {
      const f = row.findings;
      if (!f || typeof f !== "object") return { h: "", c: "", d: "" };
      const raw = (f as Record<string, unknown>).tree_measurements;
      if (!raw || typeof raw !== "object") return { h: "", c: "", d: "" };
      const height = (raw as Record<string, unknown>).height_m;
      const canopy = (raw as Record<string, unknown>).canopy_diameter_m;
      const trunk = (raw as Record<string, unknown>).trunk_diameter_cm;
      return {
        h: typeof height === "number" ? String(height) : typeof height === "string" ? height : "",
        c: typeof canopy === "number" ? String(canopy) : typeof canopy === "string" ? canopy : "",
        d: typeof trunk === "number" ? String(trunk) : typeof trunk === "string" ? trunk : "",
      };
    })();

    setForm({
      id: row.id,
      anomaly_id: row.anomaly_id ?? "",
      status: row.status,
      severity: row.severity,
      requires_action: row.requires_action,
      suggested_action_type: row.suggested_action_type,
      species: speciesFromRow,
      tree_height_m: measurementsFromRow.h,
      tree_canopy_diameter_m: measurementsFromRow.c,
      tree_trunk_diameter_cm: measurementsFromRow.d,
      findingsText: JSON.stringify(row.findings ?? {}, null, 2),
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

  const save = async () => {
    let findings: Record<string, unknown> = {};
    if (form.findingsText.trim()) {
      try {
        const parsed: unknown = JSON.parse(form.findingsText);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          toast.error(t("vegetacao.pages.inspecoes.toasts.findingsObject"));
          return;
        }
        findings = parsed as Record<string, unknown>;
      } catch {
        toast.error(t("vegetacao.pages.inspecoes.toasts.findingsValidJson"));
        return;
      }
    }

    if (form.species) {
      findings.species = {
        commonName: form.species.commonName,
        scientificName: form.species.scientificName,
      };
    } else if ("species" in findings) {
      delete findings.species;
    }

    const parseNum = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const n = Number(trimmed.replace(",", "."));
      if (!Number.isFinite(n)) return null;
      return n;
    };

    const height_m = parseNum(form.tree_height_m);
    const canopy_diameter_m = parseNum(form.tree_canopy_diameter_m);
    const trunk_diameter_cm = parseNum(form.tree_trunk_diameter_cm);
    if (height_m !== null || canopy_diameter_m !== null || trunk_diameter_cm !== null) {
      findings.tree_measurements = {
        ...(height_m !== null ? { height_m } : {}),
        ...(canopy_diameter_m !== null ? { canopy_diameter_m } : {}),
        ...(trunk_diameter_cm !== null ? { trunk_diameter_cm } : {}),
      };
    } else if ("tree_measurements" in findings) {
      delete findings.tree_measurements;
    }

    try {
      await saveMutation.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        anomaly_id: form.anomaly_id?.trim() ? form.anomaly_id.trim() : undefined,
        status: form.status,
        severity: form.severity,
        requires_action: form.requires_action,
        suggested_action_type: form.suggested_action_type,
        findings,
        notes: form.notes.trim() ? form.notes.trim() : undefined,
        location: normalizeLocation(form.location),
        metadata: {},
      });
      toast.success(t("vegetacao.pages.inspecoes.toasts.saved"));
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(t("vegetacao.pages.inspecoes.toasts.saveFailed.title"), { description: err?.message ?? String(err) });
    }
  };

  const remove = async () => {
    if (!form.id) return;
    try {
      await deleteMutation.mutateAsync(form.id);
      toast.success(t("vegetacao.pages.inspecoes.toasts.removed"));
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(t("vegetacao.pages.inspecoes.toasts.removeFailed.title"), { description: err?.message ?? String(err) });
    }
  };

  const columns = [
    { key: "status", label: t("vegetacao.pages.inspecoes.table.status"), render: (_: any, row: VegInspection) => row.status },
    { key: "requires_action", label: t("vegetacao.pages.inspecoes.table.requiresAction"), render: (_: any, row: VegInspection) => (row.requires_action ? t("common.yes") : t("common.no")) },
    { key: "severity", label: t("vegetacao.pages.inspecoes.table.severity"), render: (_: any, row: VegInspection) => (row.severity ? vegEnumLabel.severity(t, row.severity) : "—") },
    { key: "created_at", label: t("vegetacao.pages.inspecoes.table.createdAt"), render: (_: any, row: VegInspection) => formatDateTime(row.created_at) },
  ];

  return (
    <VegetacaoModuleShell>
      <VegetacaoPageHeader
        title={t("sidebar.items.vegInspecoes")}
        description={t("vegetacao.pages.inspecoes.description")}
        right={
          <Button size="sm" onClick={openCreate}>
            {t("vegetacao.pages.inspecoes.actions.create")}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <CardKPI title={t("vegetacao.pages.inspecoes.kpis.total")} value={resumo.total} icon={ClipboardList} />
        <CardKPI title={t("vegetacao.pages.inspecoes.kpis.open")} value={resumo.abertas} icon={ClipboardList} />
        <CardKPI title={t("vegetacao.pages.inspecoes.kpis.requiresAction")} value={resumo.comAcao} icon={AlertTriangle} />
      </div>

      <div className="tech-card p-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : isError ? (
          <div className="text-sm text-muted-foreground">
            {t("vegetacao.pages.inspecoes.loadError")}{" "}
            <Button variant="link" onClick={() => refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("vegetacao.pages.inspecoes.empty")}</div>
        ) : (
          <DataTableAdvanced data={items} columns={columns} onRowClick={(row) => openEdit(row as VegInspection)} exportable />
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {form.id ? t("vegetacao.pages.inspecoes.dialog.editTitle") : t("vegetacao.pages.inspecoes.dialog.createTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as VegInspectionStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Aberta</SelectItem>
                  <SelectItem value="closed">Fechada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severidade</Label>
              <Select
                value={form.severity ?? "none"}
                onValueChange={(v) => setForm((p) => ({ ...p, severity: v === "none" ? null : (v as VegSeverity) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {(Object.keys(SEVERITY_LABEL) as VegSeverity[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {SEVERITY_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("vegetacao.pages.inspecoes.tree.height")}</Label>
              <Input
                inputMode="decimal"
                value={form.tree_height_m}
                onChange={(e) => setForm((p) => ({ ...p, tree_height_m: e.target.value }))}
                placeholder={t("vegetacao.pages.inspecoes.tree.heightPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.inspecoes.tree.canopy")}</Label>
              <Input
                inputMode="decimal"
                value={form.tree_canopy_diameter_m}
                onChange={(e) => setForm((p) => ({ ...p, tree_canopy_diameter_m: e.target.value }))}
                placeholder={t("vegetacao.pages.inspecoes.tree.canopyPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.inspecoes.tree.trunk")}</Label>
              <Input
                inputMode="decimal"
                value={form.tree_trunk_diameter_cm}
                onChange={(e) => setForm((p) => ({ ...p, tree_trunk_diameter_cm: e.target.value }))}
                placeholder={t("vegetacao.pages.inspecoes.tree.trunkPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label>Anomalia vinculada (opcional)</Label>
              <Input value={form.anomaly_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, anomaly_id: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Sugestão de ação</Label>
              <Select
                value={form.suggested_action_type ?? "none"}
          onValueChange={(v) =>
            setForm((p) => ({ ...p, suggested_action_type: v === "none" ? null : (v as VegActionType) }))
          }
        >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {(
                    [
                      "pruning",
                      "mowing",
                      "laser_pruning",
                      "tree_removal",
                      "clearing",
                      "inspection",
                      "verification",
                      "other",
                    ] as VegActionType[]
                  ).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>{t("vegetacao.pages.inspecoes.form.speciesOptional")}</Label>
              <SpeciesSelect value={form.species} onChange={(next) => setForm((p) => ({ ...p, species: next }))} />
              {form.species?.typicalUseOrNotes ? (
                <div className="text-xs text-muted-foreground">{form.species.typicalUseOrNotes}</div>
              ) : null}
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <Checkbox
                checked={form.requires_action}
                onCheckedChange={(v) => setForm((p) => ({ ...p, requires_action: Boolean(v) }))}
              />
              <Label>{t("vegetacao.pages.inspecoes.form.requiresAction")}</Label>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>{t("vegetacao.pages.inspecoes.form.findingsJson")}</Label>
              <Textarea value={form.findingsText} onChange={(e) => setForm((p) => ({ ...p, findingsText: e.target.value }))} />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>{t("vegetacao.pages.inspecoes.form.notes")}</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="md:col-span-2">
              <Label>{t("vegetacao.pages.inspecoes.form.location")}</Label>
              <div className="mt-2">
                <LocationPicker value={form.location} onChange={(next) => setForm((p) => ({ ...p, location: next }))} />
              </div>
            </div>
          </div>

          {form.id ? (
            <div className="mt-4">
              <EvidencePanel linked={{ inspectionId: form.id }} defaultLocation={form.location} />
            </div>
          ) : (
            <div className="mt-4 text-sm text-muted-foreground">{t("vegetacao.pages.inspecoes.states.saveToAttachEvidence")}</div>
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
