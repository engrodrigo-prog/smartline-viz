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

const STATUS_LABEL: Record<VegWorkOrderStatus, string> = {
  pending: "Pendente",
  assigned: "Atribuída",
  in_progress: "Em execução",
  executed: "Executada",
  verified: "Verificada",
  closed: "Fechada",
  canceled: "Cancelada",
};

const PRIORITY_LABEL: Record<VegPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

export default function OsPage() {
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
      toast.success("OS salva");
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
      toast.success("OS removida");
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error("Falha ao remover", { description: err?.message ?? String(err) });
    }
  };

  const columns = [
    { key: "status", label: "Status", render: (_: any, row: VegWorkOrder) => STATUS_LABEL[row.status] ?? row.status },
    { key: "priority", label: "Prior.", render: (_: any, row: VegWorkOrder) => PRIORITY_LABEL[row.priority] ?? row.priority },
    { key: "scheduled_start", label: "Início", render: (_: any, row: VegWorkOrder) => (row.scheduled_start ? new Date(row.scheduled_start).toLocaleString() : "—") },
    { key: "scheduled_end", label: "Fim", render: (_: any, row: VegWorkOrder) => (row.scheduled_end ? new Date(row.scheduled_end).toLocaleString() : "—") },
    { key: "created_at", label: "Criada em", render: (_: any, row: VegWorkOrder) => new Date(row.created_at).toLocaleString() },
  ];

  return (
    <VegetacaoModuleShell>
      <VegetacaoPageHeader
        title="Ordens de Serviço (OS)"
        description="Planejamento e despacho: priorização, equipe, janela e execução."
        right={
          <Button size="sm" onClick={openCreate}>
            Criar OS
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <CardKPI title="Total" value={resumo.total} icon={ClipboardList} />
        <CardKPI title="Pendentes" value={resumo.pendentes} icon={ClipboardList} />
        <CardKPI title="Com janela" value={resumo.janela} icon={Clock} />
      </div>

      <div className="tech-card p-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : isError ? (
          <div className="text-sm text-muted-foreground">
            Falha ao carregar. <Button variant="link" onClick={() => refetch()}>Tentar novamente</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhuma OS encontrada.</div>
        ) : (
          <DataTableAdvanced data={items} columns={columns} onRowClick={(row) => openEdit(row as VegWorkOrder)} exportable />
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar OS" : "Criar OS"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as VegWorkOrderStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as VegWorkOrderStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v as VegPriority }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABEL) as VegPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Anomalia (opcional)</Label>
              <Input value={form.anomaly_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, anomaly_id: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Inspeção (opcional)</Label>
              <Input value={form.inspection_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, inspection_id: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Início previsto</Label>
              <Input
                type="datetime-local"
                value={toLocalInput(form.scheduled_start)}
                onChange={(e) => setForm((p) => ({ ...p, scheduled_start: e.target.value ? new Date(e.target.value).toISOString() : null }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Fim previsto</Label>
              <Input
                type="datetime-local"
                value={toLocalInput(form.scheduled_end)}
                onChange={(e) => setForm((p) => ({ ...p, scheduled_end: e.target.value ? new Date(e.target.value).toISOString() : null }))}
              />
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
              <EvidencePanel linked={{ workOrderId: form.id }} defaultLocation={form.location} />
            </div>
          ) : (
            <div className="mt-4 text-sm text-muted-foreground">Salve a OS para anexar evidências.</div>
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
