import { Hono } from "hono";
import type { FeatureCollection } from "geojson";

import { intersect, withinDistance } from "../lib/spatial.js";

type AnalyseBody = {
  travessias: FeatureCollection;
  linhas_transmissao: FeatureCollection;
  circuitos_mt: FeatureCollection;
  buffer_m?: number;
};

const asCollection = (value: any): value is FeatureCollection =>
  value && typeof value === "object" && value.type === "FeatureCollection" && Array.isArray(value.features);

export const travessiasRoutes = new Hono();

travessiasRoutes.post("/analisar", async (c) => {
  const payload = (await c.req.json().catch(() => null)) as AnalyseBody | null;
  if (!payload || !asCollection(payload.travessias) || !asCollection(payload.linhas_transmissao) || !asCollection(payload.circuitos_mt)) {
    return c.json({ error: "Payload inválido. Envie FeatureCollections válidas." }, 400);
  }

  const bufferMeters = Number.isFinite(payload.buffer_m) ? Math.max(1, Number(payload.buffer_m)) : 50;
  const cruzamentosTransmissao = intersect(payload.travessias, payload.linhas_transmissao);
  const cruzamentosMt = intersect(payload.travessias, payload.circuitos_mt);
  const proximasTransmissao = withinDistance(payload.travessias, payload.linhas_transmissao, bufferMeters);
  const proximasMt = withinDistance(payload.travessias, payload.circuitos_mt, bufferMeters);

  const estatisticas = {
    total_travessias: payload.travessias.features.length,
    cruzamentos_transmissao: cruzamentosTransmissao.features.length,
    cruzamentos_mt: cruzamentosMt.features.length,
    proximas_transmissao: proximasTransmissao.features.length,
    proximas_mt: proximasMt.features.length,
    buffer_m: bufferMeters
  };

  return c.json({
    cruzamentos_transmissao: cruzamentosTransmissao,
    cruzamentos_mt: cruzamentosMt,
    estatisticas
  });
});
