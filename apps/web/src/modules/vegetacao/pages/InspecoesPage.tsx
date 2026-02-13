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

type FormState = {
  id?: string;
  anomaly_id?: string;
  status: VegInspectionStatus;
  severity: VegSeverity | null;
  requires_action: boolean;
  suggested_action_type: VegActionType | null;
  species: VegSpeciesItem | null;
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
  findingsText: "{}",
  notes: "",
  location: null,
};

const SEVERITY_LABEL: Record<VegSeverity, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

export default function InspecoesPage() {
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

    setForm({
      id: row.id,
      anomaly_id: row.anomaly_id ?? "",
      status: row.status,
      severity: row.severity,
      requires_action: row.requires_action,
      suggested_action_type: row.suggested_action_type,
      species: speciesFromRow,
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
          toast.error("Achados devem ser um JSON de objeto (ex.: {\"campo\":\"valor\"}).");
          return;
        }
        findings = parsed as Record<string, unknown>;
      } catch {
        toast.error("Findings deve ser um JSON válido.");
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
      toast.success("Inspeção salva");
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
      toast.success("Inspeção removida");
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error("Falha ao remover", { description: err?.message ?? String(err) });
    }
  };

  const columns = [
    { key: "status", label: "Status", render: (_: any, row: VegInspection) => row.status },
    { key: "requires_action", label: "Ação?", render: (_: any, row: VegInspection) => (row.requires_action ? "Sim" : "Não") },
    { key: "severity", label: "Sev.", render: (_: any, row: VegInspection) => (row.severity ? SEVERITY_LABEL[row.severity] : "—") },
    { key: "created_at", label: "Criada em", render: (_: any, row: VegInspection) => new Date(row.created_at).toLocaleString() },
  ];

  return (
    <VegetacaoModuleShell>
      <VegetacaoPageHeader
        title="Inspeções"
        description="Inspeções de campo com achados, localização e sugestão de ação."
        right={
          <Button size="sm" onClick={openCreate}>
            Nova inspeção
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <CardKPI title="Total" value={resumo.total} icon={ClipboardList} />
        <CardKPI title="Abertas" value={resumo.abertas} icon={ClipboardList} />
        <CardKPI title="Requer ação" value={resumo.comAcao} icon={AlertTriangle} />
      </div>

      <div className="tech-card p-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : isError ? (
          <div className="text-sm text-muted-foreground">
            Falha ao carregar. <Button variant="link" onClick={() => refetch()}>Tentar novamente</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhuma inspeção encontrada.</div>
        ) : (
          <DataTableAdvanced data={items} columns={columns} onRowClick={(row) => openEdit(row as VegInspection)} exportable />
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar inspeção" : "Nova inspeção"}</DialogTitle>
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
              <Label>Espécie (opcional)</Label>
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
              <Label>Requer ação</Label>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Achados (JSON)</Label>
              <Textarea value={form.findingsText} onChange={(e) => setForm((p) => ({ ...p, findingsText: e.target.value }))} />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="md:col-span-2">
              <Label>Localização</Label>
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
            <div className="mt-4 text-sm text-muted-foreground">Salve a inspeção para anexar evidências.</div>
          )}

          <DialogFooter className="flex items-center justify-between gap-2">
            <div>{form.id ? <Button variant="destructive" onClick={remove}>Remover</Button> : null}</div>
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
