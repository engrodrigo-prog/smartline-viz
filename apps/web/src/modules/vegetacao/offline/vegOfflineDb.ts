import Dexie, { type Table } from "dexie";

export type VegOfflineQueueType =
  | "veg_anomaly_create"
  | "veg_anomaly_update"
  | "veg_inspection_create"
  | "veg_inspection_update"
  | "veg_action_create"
  | "veg_action_update"
  | "veg_evidence_upload"
  | "veg_evidence_note_create";

export type VegOfflineQueueItem = {
  id: string;
  type: VegOfflineQueueType;
  payload: Record<string, unknown>;
  createdAt: string;
  retries: number;
  lastError?: string;
  nextAttemptAt?: string | null;
};

export type VegOfflineMediaItem = {
  id: string;
  blob: Blob;
  mime: string;
  fileName: string;
  linked_temp_id?: string | null;
  createdAt: string;
};

class VegOfflineDexie extends Dexie {
  offline_queue!: Table<VegOfflineQueueItem, string>;
  offline_media!: Table<VegOfflineMediaItem, string>;

  constructor() {
    super("smartline_veg_offline");
    this.version(1).stores({
      offline_queue: "id,type,createdAt,nextAttemptAt",
      offline_media: "id,createdAt,linked_temp_id",
    });
  }
}

export const vegOfflineDb = new VegOfflineDexie();

