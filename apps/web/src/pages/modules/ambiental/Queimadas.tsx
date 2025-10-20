import { useMemo, useState } from "react";
import { AlertTriangle, Clock, Flame, Loader2, Wind } from "lucide-react";
import type { Feature } from "geojson";

import ModuleLayout from "@/components/ModuleLayout";
import { MapLibreQueimadas } from "@/components/MapLibreQueimadas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CardKPI from "@/components/CardKPI";
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

const Queimadas = () => {
  const { data, isLoading, isFetching, error, refetch } = useFirmsRisk({
    lineId: "ramal_marape",
    horizons: HORIZONS,
    count: 2000
  });

  const collection = (data as GeoJSON.FeatureCollection) ?? { type: "FeatureCollection", features: [] };
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const enriched = useMemo(() => {
    return collection.features
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
          distance: Number(props?.distance_to_line_m ?? 0)
        };
      })
      .sort((a, b) => b.riskMax - a.riskMax);
  }, [collection]);

  const topTwenty = enriched.slice(0, 20);
  const selectedFeature = enriched.find((item) => item.id === selectedId) ?? topTwenty[0] ?? enriched[0] ?? null;

  const maxRisk = enriched.length ? Math.max(...enriched.map((item) => item.riskMax)) : 0;
  const avgRisk = enriched.length
    ? enriched.reduce((acc, item) => acc + item.riskMax, 0) / enriched.length
    : 0;
  const threatsInCone = enriched.filter((item) => item.feature.properties?.intersects_corridor).length;

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
          <CardKPI
            title="Hotspots avaliados"
            value={collection.features.length}
            icon={Flame}
          />
          <CardKPI
            title="Risco máximo"
            value={`${maxRisk.toFixed(1)} / 100`}
            icon={AlertTriangle}
          />
          <CardKPI
            title="Risco médio"
            value={`${avgRisk.toFixed(1)} / 100`}
            icon={Wind}
          />
          <CardKPI
            title="No corredor"
            value={threatsInCone}
            icon={Clock}
          />
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
              geojson={collection}
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
