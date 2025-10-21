import { useEffect, useMemo, useState } from "react";
import { Flame, Loader2 } from "lucide-react";
import type { Feature } from "geojson";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine
} from "recharts";

import ModuleLayout from "@/components/ModuleLayout";
import ModuleDemoBanner from "@/components/ModuleDemoBanner";
import ModuleDemoBanner from "@/components/ModuleDemoBanner";
import { MapLibreQueimadas } from "@/components/MapLibreQueimadas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFirmsRisk, type FirmsRiskFeatureCollection } from "@/hooks/useFirmsRisk";

const HORIZONS = [0, 3, 6, 24];
const WIND_HEIGHTS = [10, 50, 100, 200] as const;
const HEIGHT_COLORS: Record<number, string> = {
  10: "#38bdf8",
  50: "#22c55e",
  100: "#f97316",
  200: "#ef4444"
};

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

  const collection = (data as FirmsRiskFeatureCollection) ?? { type: "FeatureCollection", features: [] };
  const meta = collection.meta ?? null;
  const windMeta = meta?.wind;

  const [visibleHeights, setVisibleHeights] = useState<number[]>([10, 100, 200]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusFilter, setFocusFilter] = useState<FocusFilter | null>(null);

  const enriched = useMemo(() => createEnrichedList(collection), [collection]);
  const visibleHeightSet = useMemo(() => new Set(visibleHeights), [visibleHeights]);
  const windTimelineData = useMemo(() => {
    if (!windMeta?.timeline?.length) return [];
    return windMeta.timeline
      .map((entry) => {
        const ts = entry.dt * 1000;
        const row: Record<string, any> = {
          ts,
          dt: entry.dt,
          isPast: Boolean(entry.isPast),
          label: new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
        };
        for (const height of WIND_HEIGHTS) {
          const sample = entry.heights?.[height];
          row[`h${height}`] = sample ? Number(sample.speed.toFixed(2)) : null;
        }
        return row;
      })
      .sort((a, b) => a.ts - b.ts);
  }, [windMeta?.timeline]);

  const profileRows = useMemo(() => {
    if (!windMeta?.profile_by_horizon) return [];
    return Object.entries(windMeta.profile_by_horizon)
      .map(([horizonKey, samples]) => ({
        horizon: Number(horizonKey),
        samples: (samples ?? []).slice().sort((a, b) => a.height - b.height)
      }))
      .sort((a, b) => a.horizon - b.horizon);
  }, [windMeta?.profile_by_horizon]);

  const availableHeightsLabel = useMemo(() => {
    if (!windMeta?.available_heights?.length) return "estimadas (power law)";
    return `${windMeta.available_heights.join(", ")} m`;
  }, [windMeta?.available_heights]);

  const toggleHeight = (height: number) => {
    setVisibleHeights((prev) => {
      if (prev.includes(height)) {
        if (prev.length === 1) return prev;
        return prev.filter((value) => value !== height);
      }
      return [...prev, height].sort((a, b) => a - b);
    });
  };
  const nowTs = useMemo(() => Date.now(), [windMeta?.timeline]);

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
        value: meta?.stats?.hotspots_total ?? collection.features.length,
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
  const selectedWindProfile = useMemo(() => {
    if (!selectedFeature) return null;
    const raw = (selectedFeature.feature.properties as any)?.wind_profile as
      | Record<string, { speed_ms?: number; deg_from?: number }>
      | undefined;
    return raw ?? null;
  }, [selectedFeature]);

  const activeSummary = useMemo(() => {
    const list = activeList.length ? activeList : enriched;
    if (!list.length) {
      return {
        count: 0,
        maxRisk: 0,
        avgRisk: 0,
        corridor: 0,
        frpTotal: 0,
      };
    }
    const maxRisk = Math.max(...list.map((item) => item.riskMax));
    const avgRisk = list.reduce((acc, item) => acc + item.riskMax, 0) / list.length;
    const corridor = list.filter((item) => item.intersectsCorridor).length;
    const frpTotal = list.reduce((acc, item) => acc + item.frp, 0);
    return {
      count: list.length,
      maxRisk,
      avgRisk,
      corridor,
      frpTotal,
    };
  }, [activeList, enriched]);

  const rsDemoLine = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [-57.08, -29.75],
            [-55.60, -29.50],
            [-54.10, -29.65],
            [-53.10, -30.00],
            [-52.00, -30.10],
            [-51.23, -30.03],
            [-51.18, -29.16]
          ]
        },
        properties: { color: "#0284c7", width: 3, opacity: 0.9 }
      }
    ]
  }), []);

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
        <ModuleDemoBanner />
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
            R máx {activeSummary.maxRisk.toFixed(1)} · R médio {activeSummary.avgRisk.toFixed(1)} · No corredor {activeSummary.corridor} ·
            FRP Σ {activeSummary.frpTotal.toFixed(1)} MW
          </div>
          {focusFilter ? (
            <button className="underline-offset-2 hover:underline" onClick={resetFocus}>
              Limpar seleção
            </button>
          ) : null}
        </div>

        {windMeta ? (
          <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
            <div className="tech-card p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Ventos 10–200m (histórico e previsão)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {windMeta.location?.lat?.toFixed(2)}°, {windMeta.location?.lon?.toFixed(2)}° · altura de risco {windMeta.height_used_for_risk} m
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {WIND_HEIGHTS.map((height) => (
                    <button
                      key={height}
                      onClick={() => toggleHeight(height)}
                      className={`px-2 py-1 rounded text-xs font-semibold border transition ${
                        visibleHeightSet.has(height)
                          ? "border-transparent text-white"
                          : "border-border/60 text-muted-foreground"
                      }`}
                      style={{ backgroundColor: visibleHeightSet.has(height) ? HEIGHT_COLORS[height] : "transparent" }}
                    >
                      {height} m
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[260px]">
                {windTimelineData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={windTimelineData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#33415522" />
                      <XAxis
                        dataKey="ts"
                        type="number"
                        domain={["dataMin", "dataMax"]}
                        tickFormatter={(value) => new Date(value).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => `${value} m/s`}
                        width={60}
                        domain={["auto", "auto"]}
                        label={{ value: "m/s", angle: -90, position: "insideLeft", style: { fill: "#64748b", fontSize: 11 } }}
                      />
                      <RechartsTooltip
                        formatter={(value: number | null, name) =>
                          value != null ? [`${value.toFixed(1)} m/s`, `${name}`.replace("h", " ")] : value
                        }
                        labelFormatter={(value) =>
                          new Date(value as number).toLocaleString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit"
                          })
                        }
                      />
                      <ReferenceLine
                        x={nowTs}
                        stroke="#facc15"
                        strokeDasharray="3 3"
                        label={{ value: "Agora", position: "insideTop", fill: "#facc15", fontSize: 11 }}
                      />
                      {WIND_HEIGHTS.map((height) =>
                        visibleHeightSet.has(height) ? (
                          <Line
                            key={height}
                            type="monotone"
                            dataKey={`h${height}`}
                            name={`${height} m`}
                            stroke={HEIGHT_COLORS[height]}
                            dot={false}
                            strokeWidth={2}
                            isAnimationActive={false}
                          />
                        ) : null
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    Sem série temporal de vento disponível.
                  </div>
                )}
              </div>
            </div>

            <div className="tech-card p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Perfis verticais por horizonte
                </h3>
                <p className="text-xs text-muted-foreground">Fontes disponíveis: {availableHeightsLabel}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground/80">
                      <th className="text-left py-2 pr-4">Horizonte</th>
                      {WIND_HEIGHTS.map((height) => (
                        <th key={height} className="text-left py-2 pr-4 whitespace-nowrap">{height} m</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {profileRows.map((row) => (
                      <tr key={row.horizon} className="border-t border-border/60">
                        <td className="py-2 pr-4 font-medium text-muted-foreground whitespace-nowrap">H+{row.horizon}h</td>
                        {WIND_HEIGHTS.map((height) => {
                          const sample = row.samples.find((item) => Math.abs(item.height - height) < 0.5);
                          return (
                            <td key={height} className="py-2 pr-4 whitespace-nowrap">
                              {sample ? (
                                <span>{sample.speed.toFixed(1)} m/s · {Math.round(sample.deg)}°</span>
                              ) : (
                                <span className="text-muted-foreground/60">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {profileRows.length === 0 ? (
                      <tr>
                        <td colSpan={1 + WIND_HEIGHTS.length} className="py-4 text-center text-muted-foreground">
                          Sem dados de perfil disponíveis.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

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
                {selectedWindProfile ? (
                  <div className="flex flex-wrap gap-2 pt-1 text-xs text-muted-foreground">
                    {WIND_HEIGHTS.map((height) => {
                      const entry = selectedWindProfile[String(height)];
                      if (!entry) return null;
                      const speed = Number(entry.speed_ms ?? 0);
                      const deg = Number(entry.deg_from ?? selectedFeature.windDir);
                      return (
                        <Badge key={height} variant="secondary" className="font-normal">
                          {height}m: {speed.toFixed(1)} m/s · {Math.round(deg)}°
                        </Badge>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
};

export default Queimadas;
