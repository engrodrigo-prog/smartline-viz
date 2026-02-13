import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import VegetacaoModuleShell from "@/modules/vegetacao/VegetacaoModuleShell";
import { VegetacaoPageHeader } from "@/modules/vegetacao/components/VegetacaoPageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTableAdvanced from "@/components/DataTableAdvanced";
import CardKPI from "@/components/CardKPI";
import { FileText, Upload, ExternalLink } from "lucide-react";
import type { VegDocType, VegDocument, VegLocationPayload } from "@/modules/vegetacao/api/vegetacaoApi";
import { useVegDeleteDocumento, useVegDocumentoMutation, useVegDocumentos } from "@/modules/vegetacao/hooks/useVegetacao";
import { getSupabase } from "@/integrations/supabase/client";
import LocationPicker from "@/modules/vegetacao/components/LocationPicker";
import { locationPayloadFromRow } from "@/modules/vegetacao/utils/location";
import { useI18n } from "@/context/I18nContext";
import { vegEnumLabel } from "@/modules/vegetacao/i18n";

type FormState = {
  id?: string;
  doc_type: VegDocType;
  title: string;
  description: string;
  file: File | null;
  existing_file_path: string | null;
  linked_anomaly_id?: string | null;
  linked_work_order_id?: string | null;
  linked_action_id?: string | null;
  tagsText: string;
  location: VegLocationPayload | null;
};

const emptyForm: FormState = {
  doc_type: "ASV",
  title: "",
  description: "",
  file: null,
  existing_file_path: null,
  linked_anomaly_id: null,
  linked_work_order_id: null,
  linked_action_id: null,
  tagsText: "",
  location: null,
};

const sanitizeFileName = (name: string) =>
  name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]+/g, "");

const sha256Hex = async (file: File): Promise<string> => {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
};

export default function DocumentosPage() {
  const { t, formatDateTime } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const { data, isLoading, isError, refetch } = useVegDocumentos({ limit: 200 });
  const saveMutation = useVegDocumentoMutation();
  const deleteMutation = useVegDeleteDocumento();
  const items = data?.items ?? [];

  const resumo = useMemo(() => {
    const asv = items.filter((d) => d.doc_type === "ASV").length;
    return { total: items.length, asv };
  }, [items]);

  const normalizeLocation = (loc: VegLocationPayload | null) => {
    if (!loc) return undefined;
    if ((loc.method === "gps" || loc.method === "map_pin") && !loc.coords) return undefined;
    if (loc.method === "manual_address" && !loc.address_text && !loc.coords) return undefined;
    return loc;
  };

  const openCreate = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row: VegDocument) => {
    setForm({
      id: row.id,
      doc_type: row.doc_type,
      title: row.title,
      description: row.description ?? "",
      file: null,
      existing_file_path: row.file_path,
      linked_anomaly_id: row.linked_anomaly_id,
      linked_work_order_id: row.linked_work_order_id,
      linked_action_id: row.linked_action_id,
      tagsText: (row.tags ?? []).join(", "),
      location: locationPayloadFromRow(row),
    });
    setModalOpen(true);
  };

  const uploadDoc = async (file: File) => {
    const supabase = getSupabase();
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) throw new Error(t("vegetacao.pages.documentos.errors.notAuthenticated"));

    const { data: appUser, error: appUserErr } = await supabase
      .from("app_user")
      .select("tenant_id")
      .eq("id", user.id)
      .maybeSingle();
    if (appUserErr) throw appUserErr;
    const tenantId = appUser?.tenant_id;
    if (!tenantId) throw new Error(t("vegetacao.pages.documentos.errors.missingTenantId"));

    const safeName = sanitizeFileName(file.name || "doc");
    const rand = Math.random().toString(36).slice(2, 8);
    const objectPath = `${tenantId}/${user.id}/${Date.now()}_${rand}_${safeName}`;

    const { error: uploadErr } = await supabase.storage.from("veg-docs").upload(objectPath, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadErr) throw uploadErr;
    return objectPath;
  };

  const openDocument = async (filePath: string) => {
    try {
      const supabase = getSupabase();
      const { data: signed, error } = await supabase.storage.from("veg-docs").createSignedUrl(filePath, 60 * 30);
      if (error) throw error;
      if (!signed?.signedUrl) throw new Error(t("vegetacao.pages.documentos.errors.missingSignedUrl"));
      window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(t("vegetacao.pages.documentos.toasts.openFailed.title"), { description: err?.message ?? String(err) });
    }
  };

  const save = async () => {
    const title = form.title.trim();
    if (!title) {
      toast.error(t("vegetacao.pages.documentos.toasts.missingTitle"));
      return;
    }

    const tags = form.tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      let file_path: string | null = form.existing_file_path;
      let sha: string | undefined;
      let size_bytes: number | undefined;
      let mime_type: string | undefined;

      if (form.file) {
        file_path = await uploadDoc(form.file);
        sha = await sha256Hex(form.file);
        size_bytes = form.file.size;
        mime_type = form.file.type;
      }

      if (!file_path) {
        toast.error(t("vegetacao.pages.documentos.toasts.missingFile"));
        return;
      }

      await saveMutation.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        doc_type: form.doc_type,
        title,
        description: form.description.trim() ? form.description.trim() : null,
        file_path,
        ...(mime_type ? { mime_type } : {}),
        ...(size_bytes !== undefined ? { size_bytes } : {}),
        ...(sha ? { sha256: sha } : {}),
        linked_anomaly_id: form.linked_anomaly_id?.trim() ? form.linked_anomaly_id.trim() : null,
        linked_work_order_id: form.linked_work_order_id?.trim() ? form.linked_work_order_id.trim() : null,
        linked_action_id: form.linked_action_id?.trim() ? form.linked_action_id.trim() : null,
        tags,
        metadata: {},
        location: normalizeLocation(form.location),
      });

      toast.success(t("vegetacao.pages.documentos.toasts.saved"));
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(t("vegetacao.pages.documentos.toasts.saveFailed.title"), { description: err?.message ?? String(err) });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (doc: { id: string; file_path: string }) => {
    try {
      const supabase = getSupabase();
      await supabase.storage.from("veg-docs").remove([doc.file_path]).catch(() => null);
      await deleteMutation.mutateAsync(doc.id);
      toast.success(t("vegetacao.pages.documentos.toasts.removed"));
      refetch();
    } catch (err: any) {
      toast.error(t("vegetacao.pages.documentos.toasts.removeFailed.title"), { description: err?.message ?? String(err) });
    }
  };

  const columns = [
    { key: "title", label: t("vegetacao.pages.documentos.table.title"), render: (_: any, row: VegDocument) => <span className="font-medium">{row.title}</span> },
    { key: "doc_type", label: t("vegetacao.pages.documentos.table.type"), render: (_: any, row: VegDocument) => vegEnumLabel.docType(t, row.doc_type) },
    { key: "created_at", label: t("vegetacao.pages.documentos.table.createdAt"), render: (_: any, row: VegDocument) => formatDateTime(row.created_at) },
    {
      key: "file_path",
      label: t("vegetacao.pages.documentos.table.file"),
      sortable: false,
      render: (_: any, row: VegDocument) => (
        <Button variant="outline" size="sm" onClick={() => openDocument(row.file_path)}>
          <ExternalLink className="w-4 h-4 mr-2" />
          {t("vegetacao.pages.documentos.actions.open")}
        </Button>
      ),
    },
    {
      key: "actions",
      label: "",
      sortable: false,
      render: (_: any, row: VegDocument) => (
        <Button
          variant="destructive"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            remove({ id: row.id, file_path: row.file_path });
          }}
          disabled={deleteMutation.isPending}
        >
          {t("common.remove")}
        </Button>
      ),
    },
  ];

  return (
    <VegetacaoModuleShell>
      <VegetacaoPageHeader
        title={t("sidebar.items.vegDocumentos")}
        description={t("vegetacao.pages.documentos.description")}
        right={
          <Button size="sm" onClick={openCreate}>
            <Upload className="w-4 h-4 mr-2" />
            {t("vegetacao.pages.documentos.actions.create")}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <CardKPI title={t("vegetacao.pages.documentos.kpis.total")} value={resumo.total} icon={FileText} />
        <CardKPI title={t("vegetacao.pages.documentos.kpis.asv")} value={resumo.asv} icon={FileText} />
      </div>

      <div className="tech-card p-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : isError ? (
          <div className="text-sm text-muted-foreground">
            {t("vegetacao.pages.documentos.states.loadFailed")}{" "}
            <Button variant="link" onClick={() => refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("vegetacao.pages.documentos.states.empty")}</div>
        ) : (
          <DataTableAdvanced data={items} columns={columns} onRowClick={(row) => openEdit(row as VegDocument)} exportable />
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {form.id ? t("vegetacao.pages.documentos.dialog.editTitle") : t("vegetacao.pages.documentos.dialog.createTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.documentos.form.type")}</Label>
              <Select value={form.doc_type} onValueChange={(v) => setForm((p) => ({ ...p, doc_type: v as VegDocType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["ASV", "license", "environmental_report", "photo_report", "kml", "geojson", "pdf", "other"] as VegDocType[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {vegEnumLabel.docType(t, value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.documentos.form.title")}</Label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>{t("vegetacao.pages.documentos.form.description")}</Label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>{t("vegetacao.pages.documentos.form.file")}</Label>
              <Input
                ref={fileRef}
                type="file"
                accept=".pdf,.kml,.geojson,application/pdf,application/vnd.google-earth.kml+xml,application/geo+json,application/json,image/*"
                onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] ?? null }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("vegetacao.pages.documentos.form.linkAnomalyOptional")}</Label>
              <Input value={form.linked_anomaly_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, linked_anomaly_id: e.target.value || null }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.documentos.form.linkWorkOrderOptional")}</Label>
              <Input value={form.linked_work_order_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, linked_work_order_id: e.target.value || null }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("vegetacao.pages.documentos.form.linkActionOptional")}</Label>
              <Input value={form.linked_action_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, linked_action_id: e.target.value || null }))} />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>{t("vegetacao.pages.documentos.form.tags")}</Label>
              <Input
                value={form.tagsText}
                onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))}
                placeholder={t("vegetacao.pages.documentos.form.tagsPlaceholder")}
              />
            </div>

            <div className="md:col-span-2">
              <Label>{t("vegetacao.pages.documentos.form.location")}</Label>
              <div className="mt-2">
                <LocationPicker value={form.location} onChange={(next) => setForm((p) => ({ ...p, location: next }))} />
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2">
            <div>
              {form.id && form.existing_file_path ? (
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await remove({ id: form.id!, file_path: form.existing_file_path! });
                    setModalOpen(false);
                  }}
                  disabled={deleteMutation.isPending}
                >
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
