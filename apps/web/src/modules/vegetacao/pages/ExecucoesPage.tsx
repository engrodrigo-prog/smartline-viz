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

const STATUS_LABEL: Record<VegActionStatus, string> = {
  planned: "Planejada",
  assigned: "Atribuída",
  in_progress: "Em execução",
  executed: "Executada",
  verified: "Verificada",
  closed: "Fechada",
  canceled: "Cancelada",
};

export default function ExecucoesPage() {
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
      toast.success("Execução salva");
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
      toast.success("Execução removida");
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error("Falha ao remover", { description: err?.message ?? String(err) });
    }
  };

  const columns = [
    { key: "action_type", label: "Ação", render: (_: any, row: VegAction) => row.action_type },
    { key: "status", label: "Status", render: (_: any, row: VegAction) => STATUS_LABEL[row.status] ?? row.status },
    { key: "quantity", label: "Qtd.", render: (_: any, row: VegAction) => (row.quantity !== null && row.quantity !== undefined ? `${row.quantity} ${row.unit ?? ""}` : "—") },
    { key: "executed_at", label: "Executada em", render: (_: any, row: VegAction) => (row.executed_at ? new Date(row.executed_at).toLocaleString() : "—") },
    { key: "created_at", label: "Criada em", render: (_: any, row: VegAction) => new Date(row.created_at).toLocaleString() },
  ];

  return (
    <VegetacaoModuleShell>
      <VegetacaoPageHeader
        title="Execuções"
        description="Registro de atuação: poda, roçada, limpeza, remoção e verificação."
        right={
          <Button size="sm" onClick={openCreate}>
            Nova execução
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <CardKPI title="Total" value={resumo.total} icon={Trees} />
        <CardKPI title="Em andamento" value={resumo.emAndamento} icon={Trees} />
        <CardKPI title="Executadas" value={resumo.executadas} icon={Scissors} />
      </div>

      <div className="tech-card p-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : isError ? (
          <div className="text-sm text-muted-foreground">
            Falha ao carregar. <Button variant="link" onClick={() => refetch()}>Tentar novamente</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhuma execução encontrada.</div>
        ) : (
          <DataTableAdvanced data={items} columns={columns} onRowClick={(row) => openEdit(row as VegAction)} exportable />
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar execução" : "Nova execução"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Ação</Label>
              <Select value={form.action_type} onValueChange={(v) => setForm((p) => ({ ...p, action_type: v as VegActionType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as VegActionStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as VegActionStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>OS (opcional)</Label>
              <Input value={form.work_order_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, work_order_id: e.target.value || null }))} />
            </div>
            <div className="space-y-2">
              <Label>Anomalia (opcional)</Label>
              <Input value={form.anomaly_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, anomaly_id: e.target.value || null }))} />
            </div>

            <div className="space-y-2">
              <Label>Executada em</Label>
              <Input
                type="datetime-local"
                value={toLocalInput(form.executed_at)}
                onChange={(e) => setForm((p) => ({ ...p, executed_at: e.target.value ? new Date(e.target.value).toISOString() : null }))}
              />
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  value={form.quantity ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value ? Number(e.target.value) : null }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Input value={form.unit ?? ""} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value || null }))} placeholder="m², m, árvores…" />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Espécie (opcional)</Label>
              <SpeciesSelect value={form.species} onChange={(next) => setForm((p) => ({ ...p, species: next }))} />
              {form.species?.typicalUseOrNotes ? (
                <div className="text-xs text-muted-foreground">{form.species.typicalUseOrNotes}</div>
              ) : null}
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
              <EvidencePanel linked={{ actionId: form.id }} defaultLocation={form.location} />
            </div>
          ) : (
            <div className="mt-4 text-sm text-muted-foreground">Salve a execução para anexar evidências.</div>
          )}

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
