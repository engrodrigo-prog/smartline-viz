import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getSupabase } from "@/integrations/supabase/client";
import type { VegEvidence, VegEvidenceType, VegLocationPayload } from "@/modules/vegetacao/api/vegetacaoApi";
import { useVegDeleteEvidencia, useVegEvidenciaMutation, useVegEvidencias } from "@/modules/vegetacao/hooks/useVegetacao";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SpeciesIdentificationPanel from "@/modules/vegetacao/components/SpeciesIdentificationPanel";
import { getMedia, isOnline, queueEvidenceNote, queueEvidenceUpload, removeMedia, removeQueueItem } from "@/modules/vegetacao/offline/vegOffline";

type EvidenceLink = {
  anomalyId?: string;
  inspectionId?: string;
  workOrderId?: string;
  actionId?: string;
};

const sanitizeFileName = (name: string) =>
  name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]+/g, "");

const inferEvidenceType = (file: File): VegEvidenceType => {
  const type = file.type.toLowerCase();
  if (type.startsWith("image/")) return "photo";
  if (type.startsWith("video/")) return "video";
  if (type === "application/pdf") return "pdf";
  return "other";
};

export function EvidencePanel({
  linked,
  defaultLocation,
  className,
}: {
  linked: EvidenceLink;
  defaultLocation?: VegLocationPayload | null;
  className?: string;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [note, setNote] = useState("");
  const [aiEvidenceId, setAiEvidenceId] = useState<string | null>(null);
  const [aiAutoIdentify, setAiAutoIdentify] = useState(false);

  const queryParams = useMemo(() => {
    const params: Record<string, string | undefined> = {};
    if (linked.anomalyId) params.linked_anomaly_id = linked.anomalyId;
    if (linked.inspectionId) params.linked_inspection_id = linked.inspectionId;
    if (linked.workOrderId) params.linked_work_order_id = linked.workOrderId;
    if (linked.actionId) params.linked_action_id = linked.actionId;
    return params;
  }, [linked.actionId, linked.anomalyId, linked.inspectionId, linked.workOrderId]);

  const { data, isLoading, refetch } = useVegEvidencias({ limit: 50, ...queryParams });
  const createMutation = useVegEvidenciaMutation();
  const deleteMutation = useVegDeleteEvidencia();

  const items = data?.items ?? [];

  const uploadFile = async (file: File) => {
    const supabase = getSupabase();
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) throw new Error("Usuário não autenticado");

    const { data: appUser, error: appUserErr } = await supabase
      .from("app_user")
      .select("tenant_id")
      .eq("id", user.id)
      .maybeSingle();
    if (appUserErr) throw appUserErr;
    const tenantId = appUser?.tenant_id;
    if (!tenantId) throw new Error("tenant_id ausente para o usuário");

    const safeName = sanitizeFileName(file.name || "evidence");
    const rand = Math.random().toString(36).slice(2, 8);
    const objectPath = `${tenantId}/${user.id}/${Date.now()}_${rand}_${safeName}`;

    const { error: uploadErr } = await supabase.storage.from("veg-evidence").upload(objectPath, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadErr) throw uploadErr;
    return { objectPath, userId: user.id };
  };

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    try {
      const evType = inferEvidenceType(file);
      if (!isOnline()) {
        await queueEvidenceUpload({
          file,
          evidence_type: evType,
          linked_anomaly_id: linked.anomalyId ?? null,
          linked_inspection_id: linked.inspectionId ?? null,
          linked_work_order_id: linked.workOrderId ?? null,
          linked_action_id: linked.actionId ?? null,
          captured_at: new Date().toISOString(),
          location: defaultLocation ?? undefined,
          metadata: {
            original_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
          },
        });
        toast.success("Arquivo salvo offline", { description: "Será enviado quando você sincronizar." });
        refetch();
        return;
      }
      const { objectPath } = await uploadFile(file);
      const created = await createMutation.mutateAsync({
        evidence_type: evType,
        file_path: objectPath,
        linked_anomaly_id: linked.anomalyId ?? null,
        linked_inspection_id: linked.inspectionId ?? null,
        linked_work_order_id: linked.workOrderId ?? null,
        linked_action_id: linked.actionId ?? null,
        captured_at: new Date().toISOString(),
        location: defaultLocation ?? undefined,
        metadata: {
          original_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
        },
      });
      toast.success("Evidência enviada");
      const evidenceId = created?.item?.id;
      if (evType === "photo" && evidenceId) {
        setAiEvidenceId(evidenceId);
        setAiAutoIdentify(true);
      }
      refetch();
    } catch (err: any) {
      toast.error("Falha ao enviar evidência", { description: err?.message ?? String(err) });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addNote = async () => {
    const text = note.trim();
    if (!text) {
      toast.error("Escreva uma nota antes de salvar.");
      return;
    }
    try {
      if (!isOnline()) {
        await queueEvidenceNote({
          text_note: text,
          linked_anomaly_id: linked.anomalyId ?? null,
          linked_inspection_id: linked.inspectionId ?? null,
          linked_work_order_id: linked.workOrderId ?? null,
          linked_action_id: linked.actionId ?? null,
          location: defaultLocation ?? undefined,
        });
        setNote("");
        toast.success("Nota salva offline", { description: "Será enviada quando você sincronizar." });
        refetch();
        return;
      }
      await createMutation.mutateAsync({
        evidence_type: "note",
        text_note: text,
        linked_anomaly_id: linked.anomalyId ?? null,
        linked_inspection_id: linked.inspectionId ?? null,
        linked_work_order_id: linked.workOrderId ?? null,
        linked_action_id: linked.actionId ?? null,
        captured_at: new Date().toISOString(),
        location: defaultLocation ?? undefined,
        metadata: {},
      });
      setNote("");
      toast.success("Nota salva");
      refetch();
    } catch (err: any) {
      toast.error("Falha ao salvar nota", { description: err?.message ?? String(err) });
    }
  };

  const openEvidence = async (filePath: string) => {
    try {
      const supabase = getSupabase();
      const { data: signed, error } = await supabase.storage.from("veg-evidence").createSignedUrl(filePath, 60 * 30);
      if (error) throw error;
      if (!signed?.signedUrl) throw new Error("signedUrl ausente");
      window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error("Não foi possível abrir", { description: err?.message ?? String(err) });
    }
  };

  const openOffline = async (offlineMediaId: string) => {
    try {
      const media = await getMedia(offlineMediaId);
      if (!media) throw new Error("Mídia offline não encontrada");
      const url = URL.createObjectURL(media.blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (err: any) {
      toast.error("Não foi possível abrir (offline)", { description: err?.message ?? String(err) });
    }
  };

  const removeEvidence = async (ev: VegEvidence) => {
    try {
      const meta = ev.metadata as Record<string, unknown>;
      const offlinePending = meta?.offline_pending === true;
      const offlineMediaId = typeof meta?.offline_media_id === "string" ? (meta.offline_media_id as string) : null;

      if (offlinePending) {
        if (offlineMediaId) await removeMedia(offlineMediaId).catch(() => null);
        await removeQueueItem(ev.id).catch(() => null);
        toast.success("Evidência removida (offline)");
        refetch();
        return;
      }
      if (ev.file_path) {
        const supabase = getSupabase();
        await supabase.storage.from("veg-evidence").remove([ev.file_path]).catch(() => null);
      }
      await deleteMutation.mutateAsync(ev.id);
      toast.success("Evidência removida");
      refetch();
    } catch (err: any) {
      toast.error("Falha ao remover evidência", { description: err?.message ?? String(err) });
    }
  };

  return (
    <Card className={cn("bg-card/50", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Evidências</CardTitle>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,video/*,application/pdf"
            capture="environment"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            Enviar arquivo
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Adicionar nota (evidência textual)…"
          />
          <Button type="button" size="sm" onClick={addNote} disabled={createMutation.isPending}>
            Salvar nota
          </Button>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhuma evidência ainda.</div>
        ) : (
          <div className="space-y-2">
            {items.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {ev.file_path ? (ev.metadata?.original_name as string | undefined) ?? ev.file_path : "Nota"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {ev.evidence_type} • {new Date(ev.created_at).toLocaleString()}
                  </div>
                  {ev.metadata?.offline_pending ? (
                    <div className="text-xs text-muted-foreground">Pendente de sync</div>
                  ) : null}
                  {ev.text_note ? <div className="text-xs text-muted-foreground mt-1">{ev.text_note}</div> : null}
                </div>
                <div className="flex items-center gap-2">
                  {ev.evidence_type === "photo" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAiAutoIdentify(false);
                        setAiEvidenceId(ev.id);
                      }}
                    >
                      IA
                    </Button>
                  ) : null}
                  {ev.file_path ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => openEvidence(ev.file_path!)}>
                      Abrir
                    </Button>
                  ) : typeof (ev.metadata as Record<string, unknown>)?.offline_media_id === "string" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        openOffline((ev.metadata as Record<string, unknown>).offline_media_id as string)
                      }
                    >
                      Abrir (local)
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeEvidence(ev)}
                    disabled={deleteMutation.isPending}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog
          open={Boolean(aiEvidenceId)}
          onOpenChange={(open) => {
            if (open) return;
            setAiEvidenceId(null);
            setAiAutoIdentify(false);
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Identificação de espécie</DialogTitle>
            </DialogHeader>
            {aiEvidenceId ? (
              <SpeciesIdentificationPanel evidenceId={aiEvidenceId} autoIdentifyOnMount={aiAutoIdentify} />
            ) : null}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default EvidencePanel;
