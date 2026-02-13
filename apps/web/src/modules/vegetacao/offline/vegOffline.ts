import { getSupabase } from "@/integrations/supabase/client";
import type {
  VegAction,
  VegAnomaly,
  VegEvidence,
  VegEvidenceType,
  VegInspection,
  VegLocationPayload,
} from "@/modules/vegetacao/api/vegetacaoApi";
import { vegApi } from "@/modules/vegetacao/api/vegetacaoApi";
import { vegOfflineDb, type VegOfflineMediaItem, type VegOfflineQueueItem, type VegOfflineQueueType } from "@/modules/vegetacao/offline/vegOfflineDb";

const nowIso = () => new Date().toISOString();

export const isOnline = () => {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
};

const newId = () => {
  if (typeof crypto !== "undefined") {
    if ("randomUUID" in crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    if ("getRandomValues" in crypto && typeof crypto.getRandomValues === "function") {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      // RFC 4122 v4
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0"));
      return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex
        .slice(8, 10)
        .join("")}-${hex.slice(10, 16).join("")}`;
    }
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const sanitizeFileName = (name: string) =>
  name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]+/g, "");

const withOfflineMeta = (metadata: Record<string, unknown> | undefined, patch: Record<string, unknown>) => ({
  ...(metadata ?? {}),
  ...patch,
});

const applyLocalLocation = <T extends { metadata: Record<string, unknown>; geom: unknown; location_method: any; location_captured_at: any; address_text: any }>(
  base: T,
  loc?: VegLocationPayload | null,
): T => {
  if (!loc) return base;
  const next = { ...base } as T;
  (next as any).location_method = loc.method;
  (next as any).location_captured_at = loc.captured_at ?? nowIso();
  (next as any).address_text = loc.address_text ?? null;
  if (loc.coords) {
    (next as any).geom = { type: "Point", coordinates: [loc.coords.lng, loc.coords.lat] };
  }
  if (loc.accuracy_m !== undefined) {
    (next as any).metadata = withOfflineMeta(next.metadata ?? {}, { location_accuracy_m: loc.accuracy_m });
  }
  return next;
};

async function getQueuedCreate<TApi extends Record<string, unknown>, TLocal extends { id: string }>(
  id: string,
  type: VegOfflineQueueType,
): Promise<{ queue: VegOfflineQueueItem; api: TApi; local: TLocal } | null> {
  const queue = await vegOfflineDb.offline_queue.get(id);
  if (!queue || queue.type !== type) return null;
  const payload = queue.payload as any;
  if (!payload || typeof payload !== "object") return null;
  if (!payload.api || !payload.local) return null;
  return { queue, api: payload.api as TApi, local: payload.local as TLocal };
}

export async function enqueue(type: VegOfflineQueueType, payload: Record<string, unknown>, opts?: { id?: string }) {
  const id = opts?.id ?? newId();
  const item: VegOfflineQueueItem = {
    id,
    type,
    payload,
    createdAt: nowIso(),
    retries: 0,
    nextAttemptAt: null,
  };
  await vegOfflineDb.offline_queue.put(item);
  return item;
}

export async function getPendingCount() {
  return vegOfflineDb.offline_queue.count();
}

export async function listQueued(type: VegOfflineQueueType) {
  return vegOfflineDb.offline_queue.where("type").equals(type).sortBy("createdAt");
}

export async function removeQueueItem(id: string) {
  await vegOfflineDb.offline_queue.delete(id);
}

export async function putMedia(media: Omit<VegOfflineMediaItem, "id" | "createdAt"> & { id?: string }) {
  const id = media.id ?? newId();
  const row: VegOfflineMediaItem = {
    id,
    blob: media.blob,
    mime: media.mime,
    fileName: media.fileName,
    linked_temp_id: media.linked_temp_id ?? null,
    createdAt: nowIso(),
  };
  await vegOfflineDb.offline_media.put(row);
  return row;
}

export async function getMedia(id: string) {
  return vegOfflineDb.offline_media.get(id);
}

export async function removeMedia(id: string) {
  await vegOfflineDb.offline_media.delete(id);
}

export async function queueCreateAnomalia(payload: {
  status?: VegAnomaly["status"];
  severity?: VegAnomaly["severity"];
  anomaly_type?: VegAnomaly["anomaly_type"];
  source?: VegAnomaly["source"];
  title: string;
  description?: string;
  asset_ref?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  location?: VegLocationPayload;
}) {
  const id = newId();
  const createdAt = nowIso();

  const local: VegAnomaly = {
    id,
    created_at: createdAt,
    created_by: null,
    updated_at: createdAt,
    updated_by: null,
    status: payload.status ?? "open",
    severity: payload.severity ?? "low",
    anomaly_type: payload.anomaly_type ?? "other",
    source: payload.source ?? "field",
    title: payload.title,
    description: payload.description ?? null,
    due_date: payload.due_date ?? null,
    asset_ref: payload.asset_ref ?? null,
    address_text: payload.location?.address_text ?? null,
    location_method: payload.location?.method ?? "map_pin",
    location_captured_at: payload.location?.captured_at ?? null,
    tags: payload.tags ?? [],
    metadata: withOfflineMeta(payload.metadata, { offline_pending: true }),
    geom: payload.location?.coords
      ? { type: "Point", coordinates: [payload.location.coords.lng, payload.location.coords.lat] }
      : null,
  };

  await enqueue(
    "veg_anomaly_create",
    {
      api: { ...payload, id },
      local,
    },
    { id },
  );
  return { item: local };
}

export async function updateOfflineAnomalia(
  id: string,
  patch: Partial<{
    status: VegAnomaly["status"];
    severity: VegAnomaly["severity"];
    anomaly_type: VegAnomaly["anomaly_type"];
    source: VegAnomaly["source"];
    title: string;
    description: string;
    asset_ref: string;
    due_date: string;
    tags: string[];
    metadata: Record<string, unknown>;
    location: VegLocationPayload;
  }>,
) {
  const existing = await getQueuedCreate<Record<string, unknown>, VegAnomaly>(id, "veg_anomaly_create");
  if (!existing) throw new Error("Registro offline não encontrado para atualização.");

  const nextApi = { ...(existing.api ?? {}), ...(patch ?? {}) };
  const updatedAt = nowIso();
  let nextLocal: VegAnomaly = {
    ...existing.local,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.severity !== undefined ? { severity: patch.severity } : {}),
    ...(patch.anomaly_type !== undefined ? { anomaly_type: patch.anomaly_type } : {}),
    ...(patch.source !== undefined ? { source: patch.source } : {}),
    ...(patch.asset_ref !== undefined ? { asset_ref: patch.asset_ref } : {}),
    ...(patch.due_date !== undefined ? { due_date: patch.due_date } : {}),
    ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
    ...(patch.metadata !== undefined ? { metadata: withOfflineMeta(patch.metadata, { offline_pending: true }) } : {}),
    updated_at: updatedAt,
  };

  if (patch.location) {
    nextLocal = applyLocalLocation(nextLocal as any, patch.location);
  }

  await vegOfflineDb.offline_queue.put({
    ...existing.queue,
    payload: { api: nextApi, local: nextLocal },
  });
  return { item: nextLocal };
}

export async function queueCreateInspecao(payload: {
  anomaly_id?: string;
  status?: VegInspection["status"];
  severity?: VegInspection["severity"];
  requires_action?: boolean;
  suggested_action_type?: VegInspection["suggested_action_type"];
  findings?: Record<string, unknown>;
  notes?: string;
  metadata?: Record<string, unknown>;
  location?: VegLocationPayload;
}) {
  const id = newId();
  const createdAt = nowIso();

  const local: VegInspection = {
    id,
    created_at: createdAt,
    created_by: null,
    updated_at: createdAt,
    updated_by: null,
    anomaly_id: payload.anomaly_id ?? null,
    status: payload.status ?? "open",
    severity: payload.severity ?? null,
    findings: payload.findings ?? {},
    requires_action: payload.requires_action ?? false,
    suggested_action_type: payload.suggested_action_type ?? null,
    notes: payload.notes ?? null,
    address_text: payload.location?.address_text ?? null,
    location_method: payload.location?.method ?? "gps",
    location_captured_at: payload.location?.captured_at ?? null,
    metadata: withOfflineMeta(payload.metadata, { offline_pending: true }),
    geom: payload.location?.coords
      ? { type: "Point", coordinates: [payload.location.coords.lng, payload.location.coords.lat] }
      : null,
  };

  await enqueue(
    "veg_inspection_create",
    {
      api: { ...payload, id },
      local,
    },
    { id },
  );
  return { item: local };
}

export async function updateOfflineInspecao(
  id: string,
  patch: Partial<{
    anomaly_id: string | null;
    status: VegInspection["status"];
    severity: VegInspection["severity"];
    requires_action: boolean;
    suggested_action_type: VegInspection["suggested_action_type"];
    findings: Record<string, unknown>;
    notes: string;
    metadata: Record<string, unknown>;
    location: VegLocationPayload;
  }>,
) {
  const existing = await getQueuedCreate<Record<string, unknown>, VegInspection>(id, "veg_inspection_create");
  if (!existing) throw new Error("Registro offline não encontrado para atualização.");

  const nextApi = { ...(existing.api ?? {}), ...(patch ?? {}) };
  const updatedAt = nowIso();
  let nextLocal: VegInspection = {
    ...existing.local,
    ...(patch.anomaly_id !== undefined ? { anomaly_id: patch.anomaly_id } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.severity !== undefined ? { severity: patch.severity } : {}),
    ...(patch.requires_action !== undefined ? { requires_action: patch.requires_action } : {}),
    ...(patch.suggested_action_type !== undefined ? { suggested_action_type: patch.suggested_action_type } : {}),
    ...(patch.findings !== undefined ? { findings: patch.findings } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    ...(patch.metadata !== undefined ? { metadata: withOfflineMeta(patch.metadata, { offline_pending: true }) } : {}),
    updated_at: updatedAt,
  };

  if (patch.location) {
    nextLocal = applyLocalLocation(nextLocal as any, patch.location);
  }

  await vegOfflineDb.offline_queue.put({
    ...existing.queue,
    payload: { api: nextApi, local: nextLocal },
  });
  return { item: nextLocal };
}

export async function queueCreateExecucao(payload: {
  work_order_id?: string | null;
  anomaly_id?: string | null;
  action_type: VegAction["action_type"];
  status?: VegAction["status"];
  planned_start?: string | null;
  planned_end?: string | null;
  executed_at?: string | null;
  team_id?: string | null;
  operator_id?: string | null;
  quantity?: number | null;
  unit?: string | null;
  notes?: string;
  metadata?: Record<string, unknown>;
  location?: VegLocationPayload;
}) {
  const id = newId();
  const createdAt = nowIso();

  const local: VegAction = {
    id,
    created_at: createdAt,
    created_by: null,
    updated_at: createdAt,
    updated_by: null,
    work_order_id: payload.work_order_id ?? null,
    anomaly_id: payload.anomaly_id ?? null,
    action_type: payload.action_type,
    status: payload.status ?? "planned",
    planned_start: payload.planned_start ?? null,
    planned_end: payload.planned_end ?? null,
    executed_at: payload.executed_at ?? null,
    team_id: payload.team_id ?? null,
    operator_id: payload.operator_id ?? null,
    quantity: payload.quantity ?? null,
    unit: payload.unit ?? null,
    address_text: payload.location?.address_text ?? null,
    location_method: payload.location?.method ?? "gps",
    location_captured_at: payload.location?.captured_at ?? null,
    notes: payload.notes ?? null,
    metadata: withOfflineMeta(payload.metadata, { offline_pending: true }),
    geom: payload.location?.coords
      ? { type: "Point", coordinates: [payload.location.coords.lng, payload.location.coords.lat] }
      : null,
  };

  await enqueue(
    "veg_action_create",
    {
      api: { ...payload, id },
      local,
    },
    { id },
  );
  return { item: local };
}

export async function updateOfflineExecucao(
  id: string,
  patch: Partial<{
    work_order_id: string | null;
    anomaly_id: string | null;
    action_type: VegAction["action_type"];
    status: VegAction["status"];
    planned_start: string | null;
    planned_end: string | null;
    executed_at: string | null;
    team_id: string | null;
    operator_id: string | null;
    quantity: number | null;
    unit: string | null;
    notes: string;
    metadata: Record<string, unknown>;
    location: VegLocationPayload;
  }>,
) {
  const existing = await getQueuedCreate<Record<string, unknown>, VegAction>(id, "veg_action_create");
  if (!existing) throw new Error("Registro offline não encontrado para atualização.");

  const nextApi = { ...(existing.api ?? {}), ...(patch ?? {}) };
  const updatedAt = nowIso();
  let nextLocal: VegAction = {
    ...existing.local,
    ...(patch.work_order_id !== undefined ? { work_order_id: patch.work_order_id } : {}),
    ...(patch.anomaly_id !== undefined ? { anomaly_id: patch.anomaly_id } : {}),
    ...(patch.action_type !== undefined ? { action_type: patch.action_type } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.planned_start !== undefined ? { planned_start: patch.planned_start } : {}),
    ...(patch.planned_end !== undefined ? { planned_end: patch.planned_end } : {}),
    ...(patch.executed_at !== undefined ? { executed_at: patch.executed_at } : {}),
    ...(patch.team_id !== undefined ? { team_id: patch.team_id } : {}),
    ...(patch.operator_id !== undefined ? { operator_id: patch.operator_id } : {}),
    ...(patch.quantity !== undefined ? { quantity: patch.quantity } : {}),
    ...(patch.unit !== undefined ? { unit: patch.unit } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    ...(patch.metadata !== undefined ? { metadata: withOfflineMeta(patch.metadata, { offline_pending: true }) } : {}),
    updated_at: updatedAt,
  };

  if (patch.location) {
    nextLocal = applyLocalLocation(nextLocal as any, patch.location);
  }

  await vegOfflineDb.offline_queue.put({
    ...existing.queue,
    payload: { api: nextApi, local: nextLocal },
  });
  return { item: nextLocal };
}

export async function queueEvidenceNote(payload: {
  linked_anomaly_id?: string | null;
  linked_inspection_id?: string | null;
  linked_work_order_id?: string | null;
  linked_action_id?: string | null;
  text_note: string;
  location?: VegLocationPayload;
}) {
  const id = newId();
  const createdAt = nowIso();
  const local: VegEvidence = {
    id,
    created_at: createdAt,
    created_by: null,
    evidence_type: "note",
    file_path: null,
    text_note: payload.text_note,
    address_text: payload.location?.address_text ?? null,
    linked_anomaly_id: payload.linked_anomaly_id ?? null,
    linked_inspection_id: payload.linked_inspection_id ?? null,
    linked_work_order_id: payload.linked_work_order_id ?? null,
    linked_action_id: payload.linked_action_id ?? null,
    captured_at: createdAt,
    location_method: payload.location?.method ?? "gps",
    location_captured_at: payload.location?.captured_at ?? createdAt,
    metadata: { offline_pending: true, offline_queue_id: id },
    geom: payload.location?.coords
      ? { type: "Point", coordinates: [payload.location.coords.lng, payload.location.coords.lat] }
      : null,
  };

  await enqueue(
    "veg_evidence_note_create",
    {
      api: { ...payload, id, evidence_type: "note", captured_at: createdAt, metadata: {} },
      local,
    },
    { id },
  );
  return { item: local };
}

export async function queueEvidenceUpload(payload: {
  file: File;
  evidence_type?: VegEvidenceType;
  linked_anomaly_id?: string | null;
  linked_inspection_id?: string | null;
  linked_work_order_id?: string | null;
  linked_action_id?: string | null;
  captured_at?: string | null;
  location?: VegLocationPayload;
  metadata?: Record<string, unknown>;
}) {
  const evidenceId = newId();
  const createdAt = nowIso();

  const media = await putMedia({
    blob: payload.file,
    mime: payload.file.type,
    fileName: payload.file.name || "evidence",
    linked_temp_id: evidenceId,
  });

  const evidenceType = payload.evidence_type ?? (payload.file.type.startsWith("image/") ? "photo" : "other");

  const local: VegEvidence = {
    id: evidenceId,
    created_at: createdAt,
    created_by: null,
    evidence_type: evidenceType,
    file_path: null,
    text_note: null,
    address_text: payload.location?.address_text ?? null,
    linked_anomaly_id: payload.linked_anomaly_id ?? null,
    linked_inspection_id: payload.linked_inspection_id ?? null,
    linked_work_order_id: payload.linked_work_order_id ?? null,
    linked_action_id: payload.linked_action_id ?? null,
    captured_at: payload.captured_at ?? createdAt,
    location_method: payload.location?.method ?? "gps",
    location_captured_at: payload.location?.captured_at ?? createdAt,
    metadata: {
      offline_pending: true,
      offline_media_id: media.id,
      offline_queue_id: evidenceId,
      original_name: media.fileName,
      mime_type: media.mime,
      size_bytes: payload.file.size,
    },
    geom: payload.location?.coords
      ? { type: "Point", coordinates: [payload.location.coords.lng, payload.location.coords.lat] }
      : null,
  };

  await enqueue(
    "veg_evidence_upload",
    {
      api: {
        id: evidenceId,
        evidence_type: evidenceType,
        linked_anomaly_id: payload.linked_anomaly_id ?? null,
        linked_inspection_id: payload.linked_inspection_id ?? null,
        linked_work_order_id: payload.linked_work_order_id ?? null,
        linked_action_id: payload.linked_action_id ?? null,
        captured_at: payload.captured_at ?? createdAt,
        location: payload.location ?? null,
        metadata: withOfflineMeta(payload.metadata, {
          original_name: media.fileName,
          mime_type: media.mime,
          size_bytes: payload.file.size,
        }),
      },
      local,
      media_id: media.id,
    },
    { id: evidenceId },
  );

  return { item: local };
}

export async function listOfflineAnomalias() {
  const queued = await listQueued("veg_anomaly_create");
  return queued
    .map((q) => (q.payload as any)?.local)
    .filter((p) => typeof p === "object" && p !== null)
    .map((p) => p as VegAnomaly);
}

export async function listOfflineInspecoes() {
  const queued = await listQueued("veg_inspection_create");
  return queued
    .map((q) => (q.payload as any)?.local)
    .filter((p) => typeof p === "object" && p !== null)
    .map((p) => p as VegInspection);
}

export async function listOfflineExecucoes() {
  const queued = await listQueued("veg_action_create");
  return queued
    .map((q) => (q.payload as any)?.local)
    .filter((p) => typeof p === "object" && p !== null)
    .map((p) => p as VegAction);
}

export async function listOfflineEvidencias(filters: {
  linked_anomaly_id?: string;
  linked_inspection_id?: string;
  linked_work_order_id?: string;
  linked_action_id?: string;
}) {
  const queuedUploads = await listQueued("veg_evidence_upload");
  const queuedNotes = await listQueued("veg_evidence_note_create");
  const all = [...queuedUploads, ...queuedNotes];

  const matches = (local: VegEvidence) => {
    if (filters.linked_anomaly_id && local.linked_anomaly_id !== filters.linked_anomaly_id) return false;
    if (filters.linked_inspection_id && local.linked_inspection_id !== filters.linked_inspection_id) return false;
    if (filters.linked_work_order_id && local.linked_work_order_id !== filters.linked_work_order_id) return false;
    if (filters.linked_action_id && local.linked_action_id !== filters.linked_action_id) return false;
    return true;
  };

  return all
    .map((q) => (q.payload as any)?.local)
    .filter((p) => typeof p === "object" && p !== null)
    .map((p) => p as VegEvidence)
    .filter((p) => matches(p));
}

const backoffMs = (retries: number) => Math.min(5 * 60_000, 2_000 * Math.pow(2, Math.max(0, retries)));

async function resolveTenantContext() {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("Usuário não autenticado");

  const { data: appUser, error } = await supabase.from("app_user").select("tenant_id").eq("id", user.id).maybeSingle();
  if (error) throw error;
  const tenantId = appUser?.tenant_id;
  if (!tenantId) throw new Error("tenant_id ausente para o usuário");

  return { supabase, tenantId, userId: user.id };
}

export async function syncPendingQueue(opts?: { maxItems?: number }) {
  if (!isOnline()) throw new Error("Sem conexão para sincronizar.");

  const now = Date.now();
  const items = await vegOfflineDb.offline_queue.orderBy("createdAt").toArray();
  const max = opts?.maxItems ?? 50;
  let processed = 0;

  for (const q of items) {
    if (processed >= max) break;
    if (q.nextAttemptAt) {
      const next = new Date(q.nextAttemptAt).getTime();
      if (Number.isFinite(next) && next > now) continue;
    }

    try {
      if (q.type === "veg_anomaly_create") {
        const apiPayload = (q.payload as any)?.api;
        await vegApi.createAnomalia(apiPayload);
        await removeQueueItem(q.id);
        processed += 1;
        continue;
      }
      if (q.type === "veg_inspection_create") {
        const apiPayload = (q.payload as any)?.api;
        await vegApi.createInspecao(apiPayload);
        await removeQueueItem(q.id);
        processed += 1;
        continue;
      }
      if (q.type === "veg_action_create") {
        const apiPayload = (q.payload as any)?.api;
        await vegApi.createExecucao(apiPayload);
        await removeQueueItem(q.id);
        processed += 1;
        continue;
      }
      if (q.type === "veg_evidence_note_create") {
        const apiPayload = (q.payload as any)?.api;
        await vegApi.createEvidencia(apiPayload);
        await removeQueueItem(q.id);
        processed += 1;
        continue;
      }
      if (q.type === "veg_evidence_upload") {
        const payload = q.payload as any;
        const apiPayload = payload?.api as Record<string, unknown> | undefined;
        const offlineMediaId = payload?.media_id as string | undefined;
        if (!apiPayload) throw new Error("payload.api ausente");
        if (!offlineMediaId) throw new Error("payload.media_id ausente");
        const media = await getMedia(offlineMediaId);
        if (!media) throw new Error("Mídia offline não encontrada");

        const { supabase, tenantId, userId } = await resolveTenantContext();
        const safeName = sanitizeFileName(media.fileName || "evidence");
        const rand = Math.random().toString(36).slice(2, 8);
        const objectPath = `${tenantId}/${userId}/${Date.now()}_${rand}_${safeName}`;

        const { error: uploadErr } = await supabase.storage.from("veg-evidence").upload(objectPath, media.blob, {
          contentType: media.mime,
          upsert: false,
        });
        if (uploadErr) throw uploadErr;

        await vegApi.createEvidencia({
          ...(apiPayload as any),
          file_path: objectPath,
        });

        await removeMedia(offlineMediaId);
        await removeQueueItem(q.id);
        processed += 1;
        continue;
      }

      // Unknown item: discard to avoid deadlocks
      await removeQueueItem(q.id);
      processed += 1;
    } catch (err: any) {
      const retries = (q.retries ?? 0) + 1;
      const nextAttemptAt = new Date(Date.now() + backoffMs(retries)).toISOString();
      await vegOfflineDb.offline_queue.update(q.id, {
        retries,
        lastError: err?.message ?? String(err),
        nextAttemptAt,
      });
      // stop on error to keep ordering
      break;
    }
  }

  return { processed };
}
