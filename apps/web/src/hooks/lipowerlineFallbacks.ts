import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import type { Evento } from "@/lib/mockData";

const toLonLat = (coords?: [number, number]): [number, number] | null => {
  if (!coords || coords.length < 2) return null;
  const [lat, lon] = coords;
  return [lon, lat];
};

export const emptyLineCollection: FeatureCollection<LineString> = {
  type: "FeatureCollection",
  features: [],
};

export const emptyPointCollection: FeatureCollection<Point> = {
  type: "FeatureCollection",
  features: [],
};

export function fallbackLineFeaturesFromEventos(
  eventos: Evento[] | undefined,
  linhaId?: string,
  options?: { tipo?: string; color?: string },
): FeatureCollection<LineString> {
  if (!eventos || !linhaId) return emptyLineCollection;
  const features: Feature<LineString>[] = [];
  for (const evento of eventos) {
    if (evento.linha !== linhaId) continue;
    if (options?.tipo && evento.tipo !== options.tipo) continue;
    const base = toLonLat(evento.coords as [number, number]);
    if (!base) continue;
    const end: [number, number] = [base[0] + 0.01, base[1] + 0.005];
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: [base, end] },
      properties: {
        color: options?.color ?? "#16a34a",
        criticidade: evento.criticidade,
        layerType: options?.tipo ?? "demo",
        nome: evento.nome,
      },
    });
    if (features.length >= 25) break;
  }
  return { type: "FeatureCollection", features };
}

export function fallbackPointFeaturesFromEventos(
  eventos: Evento[] | undefined,
  linhaId?: string,
  options?: { tipo?: string; color?: string },
): FeatureCollection<Point> {
  if (!eventos || !linhaId) return emptyPointCollection;
  const features: Feature<Point>[] = [];
  for (const evento of eventos) {
    if (evento.linha !== linhaId) continue;
    if (options?.tipo && evento.tipo !== options.tipo) continue;
    const point = toLonLat(evento.coords as [number, number]);
    if (!point) continue;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: point },
      properties: {
        color: options?.color ?? "#f97316",
        layerType: options?.tipo ?? "demo",
        criticidade: evento.criticidade,
        nome: evento.nome,
      },
    });
    if (features.length >= 40) break;
  }
  return { type: "FeatureCollection", features };
}
