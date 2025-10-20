import { Hono } from "hono";
import type { Feature, FeatureCollection } from "geojson";
import { buffer, featureCollection, flattenEach, booleanPointInPolygon } from "@turf/turf";

type AlagadosBody = {
  areas_alagadas: FeatureCollection;
  estruturas: FeatureCollection;
  raios: number[];
  atributo_protecao?: string;
};

const isFeatureCollection = (value: any): value is FeatureCollection =>
  value && typeof value === "object" && value.type === "FeatureCollection" && Array.isArray(value.features);

const sanitizeRaios = (raios: unknown): number[] => {
  if (!Array.isArray(raios)) return [];
  return raios
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
};

const hasProtection = (feature: Feature, atributo: string) => {
  const value = feature.properties?.[atributo];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalised = value.trim().toLowerCase();
    return ["sim", "yes", "true", "1"].includes(normalised);
  }
  return false;
};

export const alagadosRoutes = new Hono();

alagadosRoutes.post("/raios", async (c) => {
  const payload = (await c.req.json().catch(() => null)) as AlagadosBody | null;
  if (!payload || !isFeatureCollection(payload.areas_alagadas) || !isFeatureCollection(payload.estruturas)) {
    return c.json({ error: "Payload inválido. Informe FeatureCollections de áreas alagadas e estruturas." }, 400);
  }

  const raiosValidos = sanitizeRaios(payload.raios);
  if (!raiosValidos.length) {
    return c.json({ error: "Informe ao menos um raio (número positivo)." }, 400);
  }

  const atributoProtecao = payload.atributo_protecao?.trim() || "anti_pouso";
  const series: { raio: number; total: number; com_protecao: number; sem_protecao: number }[] = [];
  const buffersPorRaio: Record<string, FeatureCollection> = {};

  for (const raio of raiosValidos) {
    const buffers: Feature[] = [];
    flattenEach(payload.areas_alagadas, (feature) => {
      if (!feature.geometry) return;
      const buff = buffer(feature, raio, { units: "meters" });
      if (buff) buffers.push(buff);
    });

    const buffersCollection = featureCollection(buffers);
    buffersPorRaio[String(raio)] = buffersCollection;

    let total = 0;
    let comProtecao = 0;

    flattenEach(payload.estruturas, (estrutura) => {
      if (estrutura.geometry?.type !== "Point") return;
      const inside = buffers.some((polygon) => booleanPointInPolygon(estrutura, polygon));
      if (!inside) return;
      total += 1;
      if (hasProtection(estrutura, atributoProtecao)) {
        comProtecao += 1;
      }
    });

    series.push({
      raio,
      total,
      com_protecao: comProtecao,
      sem_protecao: Math.max(0, total - comProtecao)
    });
  }

  return c.json({
    series,
    geo: {
      buffers_por_raio: buffersPorRaio
    }
  });
});
