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
  metadata: {},
  location: null,
};

const STATUS_LABEL: Record<VegAnomalyStatus, string> = {
  open: "Aberta",
  triaged: "Triada",
  scheduled: "Agendada",
  in_progress: "Em execução",
  resolved: "Resolvida",
  canceled: "Cancelada",
};

const SEVERITY_LABEL: Record<VegSeverity, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

const TYPE_LABEL: Record<VegAnomalyType, string> = {
  encroachment: "Intrusão",
  risk_tree: "Árvore de risco",
  regrowth: "Rebrota",
  fallen_tree: "Árvore caída",
  blocked_access: "Acesso bloqueado",
  environmental_restriction: "Restrição ambiental",
  other: "Outro",
};

export default function AnomaliasPage() {
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
      metadata: row.metadata ?? {},
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
      toast.error("Informe o título.");
      return;
    }

    const tags = form.tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

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
        metadata: form.metadata ?? {},
        location: normalizeLocation(form.location),
      });
      toast.success("Anomalia salva");
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
      toast.success("Anomalia removida");
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error("Falha ao remover", { description: err?.message ?? String(err) });
    }
  };

  const columns = [
    { key: "title", label: "Título", render: (_: any, row: VegAnomaly) => <span className="font-medium">{row.title}</span> },
    { key: "status", label: "Status", render: (_: any, row: VegAnomaly) => STATUS_LABEL[row.status] ?? row.status },
    { key: "severity", label: "Severidade", render: (_: any, row: VegAnomaly) => SEVERITY_LABEL[row.severity] ?? row.severity },
    { key: "anomaly_type", label: "Tipo", render: (_: any, row: VegAnomaly) => TYPE_LABEL[row.anomaly_type] ?? row.anomaly_type },
    { key: "due_date", label: "Venc.", render: (_: any, row: VegAnomaly) => row.due_date ?? "—" },
    { key: "created_at", label: "Criada em", render: (_: any, row: VegAnomaly) => new Date(row.created_at).toLocaleString() },
  ];

  return (
    <VegetacaoModuleShell>
      <VegetacaoPageHeader
        title="Anomalias"
        description="Registro e triagem de ocorrências de poda/roçada e árvores de risco."
        right={
          <Button size="sm" onClick={openCreate}>
            Criar anomalia
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <CardKPI title="Total" value={resumo.total} icon={AlertTriangle} />
        <CardKPI title="Abertas" value={resumo.abertas} icon={AlertTriangle} />
        <CardKPI title="Altas/Críticas" value={resumo.criticas} icon={ShieldAlert} />
      </div>

      <div className="tech-card p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label>Buscar</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Título…" />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(Object.keys(STATUS_LABEL) as VegAnomalyStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Severidade</Label>
            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {(Object.keys(SEVERITY_LABEL) as VegSeverity[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {SEVERITY_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : isError ? (
          <div className="text-sm text-muted-foreground">
            Falha ao carregar. <Button variant="link" onClick={() => refetch()}>Tentar novamente</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhuma anomalia encontrada.</div>
        ) : (
          <DataTableAdvanced data={items} columns={columns} onRowClick={(row) => openEdit(row as VegAnomaly)} exportable />
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar anomalia" : "Criar anomalia"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.anomaly_type}
                onValueChange={(v) => setForm((p) => ({ ...p, anomaly_type: v as VegAnomalyType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABEL) as VegAnomalyType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as VegAnomalyStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as VegAnomalyStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severidade</Label>
              <Select value={form.severity} onValueChange={(v) => setForm((p) => ({ ...p, severity: v as VegSeverity }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SEVERITY_LABEL) as VegSeverity[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {SEVERITY_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={form.source} onValueChange={(v) => setForm((p) => ({ ...p, source: v as VegSource }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["field", "satellite", "lidar", "drone", "customer", "other"] as VegSource[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input
                type="date"
                value={form.due_date ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Referência do ativo</Label>
              <Input value={form.asset_ref ?? ""} onChange={(e) => setForm((p) => ({ ...p, asset_ref: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <Input
                value={form.tagsText}
                onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))}
                placeholder="ex.: arvore, acesso, urgente"
              />
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
              <EvidencePanel linked={{ anomalyId: form.id }} defaultLocation={form.location} />
            </div>
          ) : (
            <div className="mt-4 text-sm text-muted-foreground">
              Salve a anomalia para anexar evidências.
            </div>
          )}

          <DialogFooter className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {form.id ? (
                <Button type="button" variant="destructive" onClick={remove} disabled={deleteMutation.isPending}>
                  Remover
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={save} disabled={createOrUpdate.isPending}>
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </VegetacaoModuleShell>
  );
}
