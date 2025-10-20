import { useEffect, useMemo, useState } from "react";
import { Flame, Loader2 } from "lucide-react";
import type { Feature } from "geojson";

import ModuleLayout from "@/components/ModuleLayout";
import { MapLibreQueimadas } from "@/components/MapLibreQueimadas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFirmsRisk } from "@/hooks/useFirmsRisk";

const HORIZONS = [0, 3, 6, 24];

const getRiskColor = (value: number) => {
  if (value >= 90) return "bg-red-600 text-white";
  if (value >= 75) return "bg-orange-500 text-white";
  if (value >= 50) return "bg-yellow-400 text-slate-900";
  if (value >= 25) return "bg-lime-500 text-slate-900";
  return "bg-emerald-500 text-white";
};

const formatEta = (eta?: number | null) => {
  if (eta === null || eta === undefined || Number.isNaN(eta)) return "—";
  if (eta === Infinity) return "> 999h";
  return `${eta.toFixed(2)} h`;
};

const getFeatureId = (feature: Feature, index: number) => {
  const props = feature.properties as Record<string, any> | undefined;
  return (props?.id as string) ?? (props?.hotspot_id as string) ?? `firms-${index}`;
};

type FocusFilter = {
  id: string;
  label: string;
  predicate: (item: ReturnType<typeof createEnrichedList>[number]) => boolean;
};

type EnrichedHotspot = ReturnType<typeof createEnrichedList>[number];

const createEnrichedList = (collection: GeoJSON.FeatureCollection) =>
  collection.features
    .filter((feature) => feature.geometry?.type === "Point")
    .map((feature, index) => {
      const props = feature.properties as Record<string, any> | undefined;
      const riskMax = Number(props?.risk_max ?? 0);
      const frp = Number(props?.frp ?? props?.FRP ?? 0);
      const eta = typeof props?.eta_h === "number" ? props?.eta_h : null;
      const id = getFeatureId(feature, index);
      return {
        feature,
        id,
        riskMax,
        frp,
        eta,
        windSpeed: Number(props?.wind_speed_ms ?? 0),
        windDir: Number(props?.wind_dir_from_deg ?? 0),
        distance: Number(props?.distance_to_line_m ?? 0),
        intersectsCorridor: Boolean(props?.intersects_corridor)
      };
    })
    .sort((a, b) => b.riskMax - a.riskMax);

const Queimadas = () => {
  const { data, isLoading, isFetching, error, refetch } = useFirmsRisk({
    lineId: "ramal_marape",
    horizons: HORIZONS,
    count: 2000
  });

  const collection = (data as GeoJSON.FeatureCollection) ?? { type: "FeatureCollection", features: [] };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusFilter, setFocusFilter] = useState<FocusFilter | null>(null);

  const enriched = useMemo(() => createEnrichedList(collection), [collection]);

  const baseAvgRisk = useMemo(() => {
    if (!enriched.length) return 0;
    return enriched.reduce((acc, item) => acc + item.riskMax, 0) / enriched.length;
  }, [enriched]);

  const focusCards: Array<FocusFilter & { value: string | number }> = useMemo(() => {
    const criticalThreshold = 90;
    const aboveAvgPredicate = (item: EnrichedHotspot) => item.riskMax >= baseAvgRisk && item.riskMax > 0;
    return [
      {
        id: "total",
        label: "Hotspots avaliados",
        predicate: () => true,
        value: collection.features.length,
      },
      {
        id: "criticos",
        label: `Risco ≥ ${criticalThreshold}`,
        predicate: (item) => item.riskMax >= criticalThreshold,
        value: enriched.filter((item) => item.riskMax >= criticalThreshold).length,
      },
      {
        id: "acima-media",
        label: "Acima da média",
        predicate: aboveAvgPredicate,
        value: enriched.filter(aboveAvgPredicate).length,
      },
      {
        id: "corredor",
        label: "No corredor",
        predicate: (item) => item.intersectsCorridor,
        value: enriched.filter((item) => item.intersectsCorridor).length,
      },
    ];
  }, [collection.features.length, enriched, baseAvgRisk]);

  const activeList = useMemo(() => {
    if (!focusFilter) return enriched;
    return enriched.filter(focusFilter.predicate);
  }, [enriched, focusFilter]);

  const activeIds = useMemo(() => new Set(activeList.map((item) => item.id)), [activeList]);

  const displayCollection = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: "FeatureCollection",
    features: collection.features.map((feature, index) => {
      const id = getFeatureId(feature, index);
      const properties = {
        ...(feature.properties ?? {}),
        isFocus: focusFilter ? activeIds.has(id) : false,
      };
      return { ...feature, properties };
    }),
  }), [collection, focusFilter, activeIds]);

  const fitBounds = useMemo(() => {
    const source = activeList.length ? activeList : enriched;
    if (!source.length) return null;
    const lngs: number[] = [];
    const lats: number[] = [];
    source.forEach((item) => {
      const geometry = item.feature.geometry as GeoJSON.Point | undefined;
      if (geometry?.coordinates) {
        const [lon, lat] = geometry.coordinates as [number, number];
        lngs.push(lon);
        lats.push(lat);
      }
    });
    if (!lngs.length || !lats.length) return null;
    return [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ] as [[number, number], [number, number]];
  }, [activeList, enriched]);

  const topTwenty = activeList.slice(0, 20);
  const selectedFeature = activeList.find((item) => item.id === selectedId) ?? topTwenty[0] ?? activeList[0] ?? null;

  const activeSummary = useMemo(() => {
    const list = activeList.length ? activeList : enriched;
    if (!list.length) {
      return {
        count: 0,
        maxRisk: 0,
        avgRisk: 0,
        corridor: 0,
      };
    }
    const maxRisk = Math.max(...list.map((item) => item.riskMax));
    const avgRisk = list.reduce((acc, item) => acc + item.riskMax, 0) / list.length;
    const corridor = list.filter((item) => item.intersectsCorridor).length;
    return {
      count: list.length,
      maxRisk,
      avgRisk,
      corridor,
    };
  }, [activeList, enriched]);

  const handleFocus = (focus: FocusFilter) => {
    setFocusFilter((prev) => (prev?.id === focus.id ? null : focus));
  };

  const resetFocus = () => setFocusFilter(null);

  useEffect(() => {
    if (!activeList.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !activeList.some((item) => item.id === selectedId)) {
      setSelectedId(activeList[0]?.id ?? null);
    }
  }, [activeList, selectedId]);

  const cardIsActive = (id: string) => focusFilter?.id === id;

  return (
    <ModuleLayout title="Queimadas" icon={Flame}>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Avaliação de hotspots FIRMS direcionados ao corredor Ramal Marapé, ponderando vento atual e previsão para 24h.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isFetching ? <Badge variant="secondary">Atualizando…</Badge> : null}
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isLoading}>
              Atualizar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {focusCards.map((card) => (
            <button
              key={card.id}
              className={`tech-card p-6 text-left transition flex flex-col gap-2 ${cardIsActive(card.id) ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/40"}`}
              onClick={() => handleFocus(card)}
            >
              <div className="text-sm text-muted-foreground">{card.label}</div>
              <div className="text-3xl font-bold text-primary">{card.value}</div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            <span className="font-semibold text-primary">Resumo do filtro atual:</span> {activeSummary.count} hotspots ·
            R máx {activeSummary.maxRisk.toFixed(1)} · R médio {activeSummary.avgRisk.toFixed(1)} · No corredor {activeSummary.corridor}
          </div>
          {focusFilter ? (
            <button className="underline-offset-2 hover:underline" onClick={resetFocus}>
              Limpar seleção
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="tech-card p-4 text-destructive text-sm">
            Não foi possível obter o risco das queimadas. Verifique a API FIRMS/ventos.
          </div>
        ) : null}

        {isLoading ? (
          <div className="tech-card p-6 flex items-center gap-3 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando hotspots...
          </div>
        ) : null}

        <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
          <div className="space-y-4">
            <MapLibreQueimadas
              geojson={displayCollection}
              fitBounds={fitBounds}
              onFeatureClick={(feature) => {
                const id = getFeatureId(feature, 0);
                setSelectedId(id);
              }}
            />
          </div>

          <div className="tech-card p-4 space-y-4 max-h-[600px] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Top 20 focos por risco
              </h3>
              <Badge variant="outline">H = {HORIZONS.join("/")} h</Badge>
            </div>

            <div className="space-y-3">
              {topTwenty.map((item) => {
                const isActive = item.id === selectedFeature?.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full text-left border rounded-lg p-3 transition ${
                      isActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getRiskColor(item.riskMax)}`}>
                            Risco {item.riskMax.toFixed(1)}
                          </span>
                          {item.feature.properties?.intersects_corridor ? (
                            <Badge variant="secondary">No corredor</Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          FRP: {item.frp.toFixed(1)} MW · Dist: {item.distance.toFixed(0)} m · ETA: {formatEta(item.eta)}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        {new Date(
                          ((item.feature.properties as any)?.acq_date_ts ?? Date.now())
                        ).toLocaleString("pt-BR")}
                      </div>
                    </div>
                  </button>
                );
              })}

              {topTwenty.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">Nenhum hotspot para o corredor selecionado.</p>
              )}
            </div>

            {selectedFeature ? (
              <div className="border-t border-border/60 pt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Detalhes selecionado</span>
                  <Badge variant="outline">{selectedFeature.riskMax.toFixed(1)}</Badge>
                </div>
                <p className="text-muted-foreground">
                  Velocidade do vento: {selectedFeature.windSpeed.toFixed(1)} m/s · Direção: {selectedFeature.windDir}°
                </p>
                <p className="text-muted-foreground">
                  Distância ao corredor: {selectedFeature.distance.toFixed(0)} m · ETA: {formatEta(selectedFeature.eta)}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
};

export default Queimadas;
