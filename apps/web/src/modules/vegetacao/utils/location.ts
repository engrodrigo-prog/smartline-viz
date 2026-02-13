import type { VegLocationPayload } from "@/modules/vegetacao/api/vegetacaoApi";

export type VegCoords = { lat: number; lng: number };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export function extractCoordsFromGeom(geom: unknown, metadata?: Record<string, unknown> | null): VegCoords | undefined {
  const metaCoords = isRecord(metadata) ? (metadata.location_coords as unknown) : undefined;
  if (isRecord(metaCoords)) {
    const lat = metaCoords.lat;
    const lng = metaCoords.lng;
    if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  }

  if (isRecord(geom) && geom.type === "Point" && Array.isArray((geom as any).coordinates)) {
    const coords = (geom as any).coordinates as unknown[];
    const lng = coords[0];
    const lat = coords[1];
    if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  }

  if (typeof geom === "string") {
    const match = geom.match(/POINT\s*\(\s*([-0-9.]+)\s+([-0-9.]+)\s*\)/i);
    if (match) {
      const lng = Number(match[1]);
      const lat = Number(match[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }

  return undefined;
}

export function locationPayloadFromRow(row: {
  location_method?: string | null;
  address_text?: string | null;
  location_captured_at?: string | null;
  geom?: unknown;
  metadata?: Record<string, unknown> | null;
}): VegLocationPayload | null {
  const methodRaw = row.location_method;
  if (methodRaw !== "gps" && methodRaw !== "map_pin" && methodRaw !== "manual_address") return null;

  const coords = extractCoordsFromGeom(row.geom, row.metadata);
  const accuracy =
    isRecord(row.metadata) && typeof row.metadata.location_accuracy_m === "number"
      ? (row.metadata.location_accuracy_m as number)
      : undefined;

  return {
    method: methodRaw,
    coords,
    captured_at: row.location_captured_at ?? undefined,
    accuracy_m: accuracy,
    address_text: row.address_text ?? undefined,
  };
}
