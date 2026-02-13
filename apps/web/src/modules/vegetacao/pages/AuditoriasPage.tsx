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
import { ClipboardCheck, XCircle, CheckCircle2 } from "lucide-react";
import type { VegAudit, VegAuditResult } from "@/modules/vegetacao/api/vegetacaoApi";
import { useVegAuditoriaMutation, useVegAuditorias, useVegDeleteAuditoria } from "@/modules/vegetacao/hooks/useVegetacao";
import SpeciesSelect from "@/modules/vegetacao/components/SpeciesSelect";
import type { VegSpeciesItem } from "@/modules/vegetacao/constants/species";
import { findVegSpeciesByCommonName } from "@/modules/vegetacao/constants/species";

type FormState = {
  id?: string;
  work_order_id?: string | null;
  action_id?: string | null;
  result: VegAuditResult;
  species: VegSpeciesItem | null;
  checklistText: string;
  notes: string;
  corrective_required: boolean;
  corrective_notes: string;
};

const emptyForm: FormState = {
  work_order_id: null,
  action_id: null,
  result: "approved",
  species: null,
  checklistText: "{}",
  notes: "",
  corrective_required: false,
  corrective_notes: "",
};

export default function AuditoriasPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data, isLoading, isError, refetch } = useVegAuditorias({ limit: 200 });
  const saveMutation = useVegAuditoriaMutation();
  const deleteMutation = useVegDeleteAuditoria();
  const items = data?.items ?? [];

  const resumo = useMemo(() => {
    const aprovadas = items.filter((a) => a.result === "approved").length;
    const reprovadas = items.filter((a) => a.result === "rejected").length;
    return { total: items.length, aprovadas, reprovadas };
  }, [items]);

  const openCreate = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row: VegAudit) => {
    const speciesFromRow = (() => {
      const checklist = row.checklist;
      if (!checklist || typeof checklist !== "object") return null;
      const raw = (checklist as Record<string, unknown>).species;
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
      action_id: row.action_id,
      result: row.result,
      species: speciesFromRow,
      checklistText: JSON.stringify(row.checklist ?? {}, null, 2),
      notes: row.notes ?? "",
      corrective_required: row.corrective_required,
      corrective_notes: row.corrective_notes ?? "",
    });
    setModalOpen(true);
  };

  const save = async () => {
    let checklist: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(form.checklistText || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        toast.error("Checklist deve ser um JSON de objeto.");
        return;
      }
      checklist = parsed as Record<string, unknown>;
    } catch {
      toast.error("Checklist deve ser um JSON válido.");
      return;
    }

    if (form.species) {
      checklist.species = {
        commonName: form.species.commonName,
        scientificName: form.species.scientificName,
      };
    } else if ("species" in checklist) {
      delete checklist.species;
    }

    try {
      await saveMutation.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        work_order_id: form.work_order_id?.trim() ? form.work_order_id.trim() : null,
        action_id: form.action_id?.trim() ? form.action_id.trim() : null,
        result: form.result,
        checklist,
        notes: form.notes.trim() ? form.notes.trim() : undefined,
        corrective_required: form.corrective_required,
        corrective_notes: form.corrective_notes.trim() ? form.corrective_notes.trim() : null,
      });
      toast.success("Auditoria salva");
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
      toast.success("Auditoria removida");
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error("Falha ao remover", { description: err?.message ?? String(err) });
    }
  };

  const columns = [
    { key: "result", label: "Resultado", render: (_: any, row: VegAudit) => (row.result === "approved" ? "Aprovada" : "Reprovada") },
    { key: "corrective_required", label: "Corretiva?", render: (_: any, row: VegAudit) => (row.corrective_required ? "Sim" : "Não") },
    { key: "created_at", label: "Criada em", render: (_: any, row: VegAudit) => new Date(row.created_at).toLocaleString() },
  ];

  return (
    <VegetacaoModuleShell>
      <VegetacaoPageHeader
        title="Auditorias"
        description="Checklist de qualidade, aprovação/reprovação e ações corretivas."
        right={
          <Button size="sm" onClick={openCreate}>
            Nova auditoria
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <CardKPI title="Total" value={resumo.total} icon={ClipboardCheck} />
        <CardKPI title="Aprovadas" value={resumo.aprovadas} icon={CheckCircle2} />
        <CardKPI title="Reprovadas" value={resumo.reprovadas} icon={XCircle} />
      </div>

      <div className="tech-card p-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : isError ? (
          <div className="text-sm text-muted-foreground">
            Falha ao carregar. <Button variant="link" onClick={() => refetch()}>Tentar novamente</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhuma auditoria encontrada.</div>
        ) : (
          <DataTableAdvanced data={items} columns={columns} onRowClick={(row) => openEdit(row as VegAudit)} exportable />
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar auditoria" : "Nova auditoria"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Resultado</Label>
              <Select value={form.result} onValueChange={(v) => setForm((p) => ({ ...p, result: v as VegAuditResult }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Aprovada</SelectItem>
                  <SelectItem value="rejected">Reprovada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>OS (opcional)</Label>
              <Input value={form.work_order_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, work_order_id: e.target.value || null }))} />
            </div>
            <div className="space-y-2">
              <Label>Execução (opcional)</Label>
              <Input value={form.action_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, action_id: e.target.value || null }))} />
            </div>
            <div className="space-y-2">
              <Label>Corretiva requerida?</Label>
              <Select
                value={form.corrective_required ? "yes" : "no"}
                onValueChange={(v) => setForm((p) => ({ ...p, corrective_required: v === "yes" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">Não</SelectItem>
                  <SelectItem value="yes">Sim</SelectItem>
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

            <div className="md:col-span-2 space-y-2">
              <Label>Checklist (JSON)</Label>
              <Textarea value={form.checklistText} onChange={(e) => setForm((p) => ({ ...p, checklistText: e.target.value }))} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Notas corretivas</Label>
              <Textarea
                value={form.corrective_notes}
                onChange={(e) => setForm((p) => ({ ...p, corrective_notes: e.target.value }))}
              />
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
