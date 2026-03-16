import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, Loader2, Satellite } from "lucide-react";
import type { Feature, FeatureCollection, LineString, MultiLineString, Point } from "geojson";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from "recharts";

import FloatingFiltersBar from "@/components/FloatingFiltersBar";
import ModuleLayout from "@/components/ModuleLayout";
import ModuleDemoBanner from "@/components/ModuleDemoBanner";
import { MapLibreQueimadas } from "@/components/MapLibreQueimadas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilters } from "@/context/FiltersContext";
import { useLipowerlineLinhas } from "@/hooks/useLipowerlineLinhas";
import { useFirmsRisk, type FirmsRiskFeatureCollection } from "@/hooks/useFirmsRisk";
import {
  baixadaSantistaDoubleCircuitCorridor,
  baixadaSantistaWildfireSimulatedSeeds,
  buildBaixadaWildfireCollection,
} from "@/lib/baixadaSantistaScenario";

const HORIZONS = [0, 3, 6, 24];
const WINDOW_OPTIONS = [
  { value: "1", label: "24h" },
  { value: "3", label: "72h" },
  { value: "7", label: "7 dias" },
  { value: "10", label: "10 dias" },
];
const WIND_HEIGHTS = [10, 50, 100, 200] as const;
const HEIGHT_COLORS: Record<number, string> = {
  10: "#38bdf8",
  50: "#22c55e",
  100: "#f97316",
  200: "#ef4444",
};

type EnrichedHotspot = {
  feature: Feature;
  id: string;
  label: string;
  company: string | null;
  region: string | null;
  lineCode: string | null;
  lineName: string | null;
  nearestAssetName: string | null;
  nearestAssetType: string | null;
  seCodes: string[];
  contexto: string | null;
  riskMax: number;
  frp: number;
  eta: number | null;
  windSpeed: number;
  windDir: number;
  distanceLine: number | null;
  distanceAsset: number | null;
  intersectsCorridor: boolean;
  acquiredAtTs: number;
  acquiredAtLabel: string;
  sourceSensor: string | null;
  confidence: number;
  dayNight: string | null;
};

type TemporalBucket = {
  id: string;
  label: string;
  startTs: number;
  endTs: number;
  items: EnrichedHotspot[];
};

type FocusFilter = {
  id: string;
  label: string;
  predicate: (item: EnrichedHotspot) => boolean;
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

const formatDistance = (value?: number | null) => {
  if (value == null || Number.isNaN(value)) return "—";
  if (value >= 1000) return `${(value / 1000).toFixed(2)} km`;
  return `${value.toFixed(0)} m`;
};

const normalizeSeCode = (value: string | null | undefined) => {
  if (!value) return null;
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);
  return normalized.length === 3 ? normalized : null;
};

const getFeatureId = (feature: Feature, index: number) => {
  const props = feature.properties as Record<string, unknown> | undefined;
  return (props?.id as string) ?? (props?.hotspot_id as string) ?? `firms-${index}`;
};

const flattenCorridor = (value: unknown): FeatureCollection<LineString> | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as FeatureCollection<LineString | MultiLineString>;
  if (!Array.isArray(raw.features)) return null;

  const features = raw.features.flatMap((feature, index) => {
    if (feature.geometry?.type === "LineString") {
      return [
        {
          ...feature,
          id: feature.id ?? `corridor-${index}`,
        } as Feature<LineString>,
      ];
    }
    if (feature.geometry?.type === "MultiLineString") {
      return feature.geometry.coordinates.map((coordinates, segmentIndex) => ({
        type: "Feature",
        id: `${feature.id ?? `corridor-${index}`}-${segmentIndex}`,
        properties: {
          ...(feature.properties ?? {}),
          segment_index: segmentIndex,
        },
        geometry: {
          type: "LineString",
          coordinates,
        },
      }) as Feature<LineString>);
    }
    return [];
  });

  return features.length ? { type: "FeatureCollection", features } : null;
};

const createEnrichedList = (collection: FeatureCollection): EnrichedHotspot[] =>
  collection.features
    .filter((feature) => feature.geometry?.type === "Point")
    .map((feature, index) => {
      const props = (feature.properties ?? {}) as Record<string, unknown>;
      const riskMax = Number(props.risk_max ?? 0);
      const frp = Number(props.frp ?? props.FRP ?? 0);
      const eta = typeof props.eta_h === "number" ? props.eta_h : props.eta_h != null ? Number(props.eta_h) : null;
      const acquiredAtTs = Number(props.acq_date_ts ?? Date.now() - index * 30 * 60 * 1000);
      const seCodes = Array.isArray(props.se_codes)
        ? props.se_codes
            .map((item) => normalizeSeCode(typeof item === "string" ? item : null))
            .filter((item): item is string => Boolean(item))
        : [];

      return {
        feature,
        id: getFeatureId(feature, index),
        label: String(props.label ?? props.nearest_asset_name ?? props.line_name ?? `Hotspot ${index + 1}`),
        company: typeof props.company_name === "string" ? props.company_name : typeof props.empresa === "string" ? props.empresa : null,
        region: typeof props.region_code === "string" ? props.region_code : typeof props.regiao === "string" ? props.regiao : null,
        lineCode: typeof props.line_code === "string" ? props.line_code : null,
        lineName: typeof props.line_name === "string" ? props.line_name : null,
        nearestAssetName: typeof props.nearest_asset_name === "string" ? props.nearest_asset_name : null,
        nearestAssetType: typeof props.nearest_asset_type === "string" ? props.nearest_asset_type : null,
        seCodes,
        contexto: typeof props.contexto === "string" ? props.contexto : null,
        riskMax,
        frp,
        eta,
        windSpeed: Number(props.wind_speed_ms ?? 0),
        windDir: Number(props.wind_dir_from_deg ?? 0),
        distanceLine:
          props.distance_to_line_m != null && Number.isFinite(Number(props.distance_to_line_m))
            ? Number(props.distance_to_line_m)
            : null,
        distanceAsset:
          props.distance_to_asset_m != null && Number.isFinite(Number(props.distance_to_asset_m))
            ? Number(props.distance_to_asset_m)
            : null,
        intersectsCorridor: Boolean(props.intersects_corridor),
        acquiredAtTs,
        acquiredAtLabel: new Date(acquiredAtTs).toLocaleString("pt-BR"),
        sourceSensor: typeof props.source_sensor === "string" ? props.source_sensor : typeof props.satelite === "string" ? props.satelite : null,
        confidence: Number(props.confidence ?? 0),
        dayNight: typeof props.daynight === "string" ? props.daynight : null,
      };
    })
    .sort((a, b) => b.riskMax - a.riskMax);

const buildTemporalBuckets = (items: EnrichedHotspot[], bucketHours: number): TemporalBucket[] => {
  if (!items.length) return [];
  const bucketMs = bucketHours * 60 * 60 * 1000;
  const buckets = new Map<number, EnrichedHotspot[]>();

  items.forEach((item) => {
    const startTs = Math.floor(item.acquiredAtTs / bucketMs) * bucketMs;
    const current = buckets.get(startTs) ?? [];
    current.push(item);
    buckets.set(startTs, current);
  });

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([startTs, bucketItems]) => {
      const endTs = startTs + bucketMs;
      return {
        id: String(startTs),
        label: new Date(startTs).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: bucketHours < 24 ? "2-digit" : undefined,
          minute: bucketHours < 24 ? "2-digit" : undefined,
        }),
        startTs,
        endTs,
        items: bucketItems.sort((a, b) => b.riskMax - a.riskMax),
      };
    });
};

const boundsFromItems = (items: EnrichedHotspot[]) => {
  if (!items.length) return null;
  const lngs: number[] = [];
  const lats: number[] = [];
  items.forEach((item) => {
    const geometry = item.feature.geometry as Point | undefined;
    if (!geometry?.coordinates) return;
    lngs.push(geometry.coordinates[0]);
    lats.push(geometry.coordinates[1]);
  });
  if (!lngs.length || !lats.length) return null;
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ] as [[number, number], [number, number]];
};

const Queimadas = () => {
  const { filters } = useFilters();
  const linhasQuery = useLipowerlineLinhas();
  const [visibleHeights, setVisibleHeights] = useState<number[]>([10, 100, 200]);
  const [modoSimulado, setModoSimulado] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusFilter, setFocusFilter] = useState<FocusFilter | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string>("");
  const [seCode, setSeCode] = useState("");
  const [windowDays, setWindowDays] = useState("3");
  const [maxDistanceKm, setMaxDistanceKm] = useState(5);
  const [selectedTemporalIndex, setSelectedTemporalIndex] = useState<number | null>(null);

  useEffect(() => {
    if (filters.linha && !selectedLineId) {
      setSelectedLineId(filters.linha);
    }
  }, [filters.linha, selectedLineId]);

  useEffect(() => {
    if (!selectedLineId && linhasQuery.data.length === 1) {
      setSelectedLineId(linhasQuery.data[0].codigo);
    }
  }, [linhasQuery.data, selectedLineId]);

  const resolvedLine = useMemo(
    () =>
      linhasQuery.data.find(
        (line) => line.codigo === selectedLineId || line.linhaId === selectedLineId || line.nome === selectedLineId,
      ) ?? null,
    [linhasQuery.data, selectedLineId],
  );

  const firmsParams = useMemo(
    () => ({
      lineId: resolvedLine?.codigo ?? (selectedLineId || filters.linha),
      lineName: resolvedLine?.nome ?? filters.linhaNome ?? undefined,
      empresa: filters.empresa,
      regiao: filters.regiao,
      seCode: seCode.trim() || undefined,
      dateFrom: filters.dataInicio,
      dateTo: filters.dataFim,
      daysBack: filters.dataInicio || filters.dataFim ? undefined : Number(windowDays),
      horizons: HORIZONS,
      count: 2500,
      maxDistanceKm,
    }),
    [
      filters.dataFim,
      filters.dataInicio,
      filters.empresa,
      filters.linha,
      filters.linhaNome,
      filters.regiao,
      maxDistanceKm,
      resolvedLine?.codigo,
      resolvedLine?.nome,
      seCode,
      selectedLineId,
      windowDays,
    ],
  );

  const { data, isLoading, isFetching, error, refetch } = useFirmsRisk(firmsParams);

  const collection = useMemo<FirmsRiskFeatureCollection>(
    () =>
      (data as FirmsRiskFeatureCollection) ?? {
        type: "FeatureCollection",
        features: [],
      },
    [data],
  );
  const meta = collection.meta ?? null;
  const windMeta = !modoSimulado ? meta?.wind : undefined;
  const realCorridor = useMemo(() => flattenCorridor(meta?.corridor), [meta?.corridor]);
  const assetScope = meta?.asset_scope;

  const simulatedCorridor = useMemo<FeatureCollection<LineString>>(() => baixadaSantistaDoubleCircuitCorridor, []);
  const simulatedHotspots = useMemo<FeatureCollection<Point>>(
    () => buildBaixadaWildfireCollection(Date.now(), baixadaSantistaWildfireSimulatedSeeds),
    [],
  );

  const enrichedBase = useMemo(() => createEnrichedList(collection), [collection]);
  const enrichedSim = useMemo(() => createEnrichedList(simulatedHotspots), [simulatedHotspots]);
  const usingSimulated = modoSimulado;
  const enriched = usingSimulated ? enrichedSim : enrichedBase;
  const visibleHeightSet = useMemo(() => new Set(visibleHeights), [visibleHeights]);
  const windTimeline = windMeta?.timeline;
  const bucketHours = filters.dataInicio || filters.dataFim ? 24 : Number(windowDays) <= 1 ? 1 : Number(windowDays) <= 3 ? 3 : 24;

  const windTimelineData = useMemo(() => {
    if (!windTimeline?.length) return [];
    return windTimeline
      .map((entry) => {
        const ts = entry.dt * 1000;
        const row: Record<string, number | string | boolean | null> = {
          ts,
          dt: entry.dt,
          isPast: Boolean(entry.isPast),
          label: new Date(ts).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        for (const height of WIND_HEIGHTS) {
          const sample = entry.heights?.[height];
          row[`h${height}`] = sample ? Number(sample.speed.toFixed(2)) : null;
        }
        return row;
      })
      .sort((a, b) => Number(a.ts) - Number(b.ts));
  }, [windTimeline]);

  const profileRows = useMemo(() => {
    if (!windMeta?.profile_by_horizon) return [];
    return Object.entries(windMeta.profile_by_horizon)
      .map(([horizonKey, samples]) => ({
        horizon: Number(horizonKey),
        samples: (samples ?? []).slice().sort((a, b) => a.height - b.height),
      }))
      .sort((a, b) => a.horizon - b.horizon);
  }, [windMeta?.profile_by_horizon]);

  const availableHeightsLabel = useMemo(() => {
    if (!windMeta?.available_heights?.length) return "estimadas (power law)";
    return `${windMeta.available_heights.join(", ")} m`;
  }, [windMeta?.available_heights]);

  const temporalBuckets = useMemo(() => buildTemporalBuckets(enriched, bucketHours), [bucketHours, enriched]);

  useEffect(() => {
    if (!temporalBuckets.length) {
      setSelectedTemporalIndex(null);
      return;
    }
    setSelectedTemporalIndex((current) => {
      if (current == null) return temporalBuckets.length - 1;
      return Math.min(current, temporalBuckets.length - 1);
    });
  }, [temporalBuckets]);

  const activeTemporalBucket =
    selectedTemporalIndex == null ? null : temporalBuckets[Math.min(selectedTemporalIndex, temporalBuckets.length - 1)] ?? null;

  const temporalList = useMemo(() => {
    if (!activeTemporalBucket) return enriched;
    return activeTemporalBucket.items;
  }, [activeTemporalBucket, enriched]);

  const alarmTimelineData = useMemo(
    () =>
      temporalBuckets.map((bucket) => ({
        ts: bucket.startTs,
        count: bucket.items.length,
        critical: bucket.items.filter((item) => item.riskMax >= 90).length,
        avgRisk: bucket.items.length
          ? Number((bucket.items.reduce((sum, item) => sum + item.riskMax, 0) / bucket.items.length).toFixed(1))
          : 0,
      })),
    [temporalBuckets],
  );

  const baseAvgRisk = useMemo(() => {
    if (!temporalList.length) return 0;
    return temporalList.reduce((acc, item) => acc + item.riskMax, 0) / temporalList.length;
  }, [temporalList]);

  const focusCards: Array<FocusFilter & { value: string | number }> = useMemo(() => {
    const aboveAvgPredicate = (item: EnrichedHotspot) => item.riskMax >= baseAvgRisk && item.riskMax > 0;
    const impactedAssets = new Set(temporalList.map((item) => item.nearestAssetName).filter(Boolean));
    return [
      {
        id: "total",
        label: activeTemporalBucket ? "Hotspots no recorte" : "Hotspots avaliados",
        predicate: () => true,
        value: temporalList.length,
      },
      {
        id: "criticos",
        label: "Risco ≥ 90",
        predicate: (item) => item.riskMax >= 90,
        value: temporalList.filter((item) => item.riskMax >= 90).length,
      },
      {
        id: "proximos",
        label: `<= ${maxDistanceKm.toFixed(0)} km`,
        predicate: (item) => (item.distanceAsset ?? Number.POSITIVE_INFINITY) <= maxDistanceKm * 1000,
        value: temporalList.filter((item) => (item.distanceAsset ?? Number.POSITIVE_INFINITY) <= maxDistanceKm * 1000).length,
      },
      {
        id: "ativos",
        label: "Ativos impactados",
        predicate: (item) => Boolean(item.nearestAssetName),
        value: impactedAssets.size,
      },
      {
        id: "acima-media",
        label: "Acima da media",
        predicate: aboveAvgPredicate,
        value: temporalList.filter(aboveAvgPredicate).length,
      },
    ];
  }, [activeTemporalBucket, baseAvgRisk, maxDistanceKm, temporalList]);

  const activeList = useMemo(() => {
    if (!focusFilter) return temporalList;
    return temporalList.filter(focusFilter.predicate);
  }, [focusFilter, temporalList]);

  const activeIds = useMemo(() => new Set(activeList.map((item) => item.id)), [activeList]);

  const displayCollection = useMemo<FeatureCollection>(() => {
    const sourceFeatures = usingSimulated ? simulatedHotspots.features : collection.features;
    const features = sourceFeatures
      .filter((feature, index) => {
        const id = getFeatureId(feature, index);
        return activeIds.has(id);
      })
      .map((feature, index) => ({
        ...feature,
        properties: {
          ...(feature.properties ?? {}),
          isFocus: true,
          mapRank: index,
        },
      }));
    return { type: "FeatureCollection", features };
  }, [activeIds, collection.features, simulatedHotspots.features, usingSimulated]);

  const fitBounds = useMemo(() => {
    const hotspotBounds = boundsFromItems(activeList.length ? activeList : temporalList);
    if (hotspotBounds) return hotspotBounds;
    if (!usingSimulated && assetScope?.bbox) {
      return [
        [assetScope.bbox[0], assetScope.bbox[1]],
        [assetScope.bbox[2], assetScope.bbox[3]],
      ] as [[number, number], [number, number]];
    }
    return null;
  }, [activeList, assetScope?.bbox, temporalList, usingSimulated]);

  const topTwenty = activeList.slice(0, 20);
  const selectedFeature = activeList.find((item) => item.id === selectedId) ?? topTwenty[0] ?? activeList[0] ?? null;
  const selectedWindProfile = useMemo(() => {
    if (!selectedFeature) return null;
    const raw = (selectedFeature.feature.properties as Record<string, unknown> | undefined)?.wind_profile as
      | Record<string, { speed_ms?: number; deg_from?: number }>
      | undefined;
    return raw ?? null;
  }, [selectedFeature]);

  useEffect(() => {
    if (!activeList.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !activeList.some((item) => item.id === selectedId)) {
      setSelectedId(activeList[0]?.id ?? null);
    }
  }, [activeList, selectedId]);

  const activeSummary = useMemo(() => {
    const list = activeList.length ? activeList : temporalList;
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
  }, [activeList, temporalList]);

  const toggleHeight = (height: number) => {
    setVisibleHeights((prev) => {
      if (prev.includes(height)) {
        if (prev.length === 1) return prev;
        return prev.filter((value) => value !== height);
      }
      return [...prev, height].sort((a, b) => a - b);
    });
  };

  const cardIsActive = (id: string) => focusFilter?.id === id;
  const selectedBucketLabel = activeTemporalBucket?.label ?? "Recorte completo";
  const sourceLabel = usingSimulated
    ? "Simulado"
    : meta?.source === "nasa-firms-live"
      ? "NASA FIRMS"
      : meta?.source === "supabase-queimadas-cache"
        ? "Cache operacional"
        : "Escopo operacional";

  const liveEmpty = !usingSimulated && !isLoading && !error && enrichedBase.length === 0;

  return (
    <ModuleLayout title="Queimadas" icon={Flame}>
      <div className="p-6 space-y-6">
        <ModuleDemoBanner />
        <FloatingFiltersBar />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground max-w-4xl">
              Hotspots reais da NASA FIRMS correlacionados aos ativos e geodados cadastrados no SmartLine. O recorte
              prioriza empresa, regiao, linha, SE e distancia operacional ao ativo mais proximo.
            </p>
            <div className="flex flex-wrap gap-2">
              {filters.empresa ? <Badge variant="outline">Empresa: {filters.empresa}</Badge> : null}
              {filters.regiao ? <Badge variant="outline">Regiao: {filters.regiao}</Badge> : null}
              {resolvedLine?.nome ? <Badge variant="outline">Linha: {resolvedLine.nome}</Badge> : null}
              {seCode.trim() ? <Badge variant="outline">SE: {seCode.trim().toUpperCase()}</Badge> : null}
              <Badge variant="secondary">Fonte: {sourceLabel}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isFetching ? <Badge variant="secondary">Atualizando…</Badge> : null}
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isLoading}>
              Atualizar FIRMS
            </Button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <div className="tech-card p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Escopo operacional</p>
                <h2 className="text-lg font-semibold">Ativos usados na correlacao</h2>
              </div>
              <Badge variant="outline">{assetScope?.count ?? 0} ativos</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">Linhas</p>
                <p className="mt-1 text-2xl font-semibold text-primary">{assetScope?.line_count ?? 0}</p>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">Estruturas</p>
                <p className="mt-1 text-2xl font-semibold text-primary">{assetScope?.structure_count ?? 0}</p>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">Empresas</p>
                <p className="mt-1 text-2xl font-semibold text-primary">{assetScope?.companies.length ?? 0}</p>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">SEs detectadas</p>
                <p className="mt-1 text-2xl font-semibold text-primary">{assetScope?.se_codes.length ?? 0}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {(assetScope?.line_codes ?? []).slice(0, 8).map((lineCode) => (
                <Badge key={lineCode} variant="secondary" className="font-normal">
                  {lineCode}
                </Badge>
              ))}
              {(assetScope?.se_codes ?? []).slice(0, 8).map((code) => (
                <Badge key={code} variant="outline" className="font-normal">
                  SE {code}
                </Badge>
              ))}
            </div>
          </div>

          <div className="tech-card p-4 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Parametros FIRMS</p>
              <h2 className="text-lg font-semibold">Recorte de alarmes</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Linha monitorada</label>
                <Select value={selectedLineId || "__all"} onValueChange={(value) => setSelectedLineId(value === "__all" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as linhas do escopo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">Todas as linhas do escopo</SelectItem>
                    {linhasQuery.data.map((line) => (
                      <SelectItem key={line.codigo} value={line.codigo}>
                        {line.nome ?? line.codigo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Filtro por SE</label>
                <Input
                  value={seCode}
                  onChange={(event) => setSeCode(event.target.value.toUpperCase())}
                  placeholder="NAP, MBI, TAN..."
                  maxLength={8}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Janela FIRMS</label>
                <Select value={windowDays} onValueChange={setWindowDays} disabled={Boolean(filters.dataInicio || filters.dataFim)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WINDOW_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Raio maximo do ativo</label>
                <div className="rounded-lg border border-border/60 px-3 py-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{maxDistanceKm.toFixed(0)} km</span>
                    <span className="text-muted-foreground">Filtro de proximidade</span>
                  </div>
                  <Slider
                    value={[maxDistanceKm]}
                    min={1}
                    max={30}
                    step={1}
                    onValueChange={([value]) => setMaxDistanceKm(value)}
                    className="mt-3"
                  />
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {filters.dataInicio || filters.dataFim
                ? "O intervalo global de datas esta ativo; a janela FIRMS local foi desabilitada."
                : "Sem filtro de datas global, o SmartLine consulta a janela FIRMS selecionada e agrupa alarmes por recortes temporais."}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {focusCards.map((card) => (
            <button
              key={card.id}
              className={`tech-card p-6 text-left transition flex flex-col gap-2 ${cardIsActive(card.id) ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/40"}`}
              onClick={() => setFocusFilter((prev) => (prev?.id === card.id ? null : card))}
            >
              <div className="text-sm text-muted-foreground">{card.label}</div>
              <div className="text-3xl font-bold text-primary">{card.value}</div>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            <span className="font-semibold text-primary">Recorte ativo:</span> {selectedBucketLabel} · {activeSummary.count} alarmes ·
            R max {activeSummary.maxRisk.toFixed(1)} · R medio {activeSummary.avgRisk.toFixed(1)} · LT prox {activeSummary.corridor} ·
            FRP somado {activeSummary.frpTotal.toFixed(1)} MW
          </div>
          {focusFilter ? (
            <button className="underline-offset-2 hover:underline" onClick={() => setFocusFilter(null)}>
              Limpar filtro de risco
            </button>
          ) : null}
        </div>

        <div className="tech-card p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Timeline operacional</p>
              <h3 className="text-lg font-semibold">Navegacao temporal dos alarmes</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedTemporalIndex((current) => (current == null ? null : Math.max(0, current - 1)))}
                disabled={selectedTemporalIndex == null || selectedTemporalIndex <= 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Badge variant="outline">{selectedBucketLabel}</Badge>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setSelectedTemporalIndex((current) =>
                    current == null ? null : Math.min(temporalBuckets.length - 1, current + 1),
                  )
                }
                disabled={selectedTemporalIndex == null || selectedTemporalIndex >= temporalBuckets.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="h-[220px]">
            {alarmTimelineData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={alarmTimelineData} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#33415522" />
                  <XAxis
                    dataKey="ts"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: bucketHours < 24 ? "2-digit" : undefined,
                      })
                    }
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} width={40} />
                  <RechartsTooltip
                    formatter={(value: number, name) => [value, name === "critical" ? "Criticos" : name === "avgRisk" ? "Risco medio" : "Alarmes"]}
                    labelFormatter={(value) => new Date(value as number).toLocaleString("pt-BR")}
                  />
                  {activeTemporalBucket ? (
                    <ReferenceLine
                      x={activeTemporalBucket.startTs}
                      stroke="#f97316"
                      strokeDasharray="4 4"
                      label={{ value: "Janela ativa", position: "insideTopRight", fill: "#f97316", fontSize: 11 }}
                    />
                  ) : null}
                  <Line type="monotone" dataKey="count" name="count" stroke="#f97316" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="critical" name="critical" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="avgRisk" name="avgRisk" stroke="#22c55e" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Sem alarmes temporais no recorte atual.
              </div>
            )}
          </div>

          {temporalBuckets.length > 1 ? (
            <div className="space-y-2">
              <Slider
                value={[selectedTemporalIndex ?? temporalBuckets.length - 1]}
                min={0}
                max={temporalBuckets.length - 1}
                step={1}
                onValueChange={([value]) => setSelectedTemporalIndex(value)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{temporalBuckets[0]?.label}</span>
                <span>{temporalBuckets[temporalBuckets.length - 1]?.label}</span>
              </div>
            </div>
          ) : null}
        </div>

        {windMeta ? (
          <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
            <div className="tech-card p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Ventos 10–200m (historico e previsao)
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
                            month: "2-digit",
                          })
                        }
                      />
                      <ReferenceLine
                        x={Date.now()}
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
                        ) : null,
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    Sem serie temporal de vento disponivel.
                  </div>
                )}
              </div>
            </div>

            <div className="tech-card p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Perfis verticais por horizonte
                </h3>
                <p className="text-xs text-muted-foreground">Fontes disponiveis: {availableHeightsLabel}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground/80">
                      <th className="text-left py-2 pr-4">Horizonte</th>
                      {WIND_HEIGHTS.map((height) => (
                        <th key={height} className="text-left py-2 pr-4 whitespace-nowrap">
                          {height} m
                        </th>
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
                                <span>
                                  {sample.speed.toFixed(1)} m/s · {Math.round(sample.deg)}°
                                </span>
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
                          Sem dados de perfil disponiveis.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {meta?.notes?.length ? (
          <div className="tech-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Satellite className="h-4 w-4 text-primary" />
              Notas da ingestao operacional
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              {meta.notes.map((note, index) => (
                <p key={`${note}-${index}`}>{note}</p>
              ))}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="tech-card p-4 text-destructive text-sm">
            Nao foi possivel obter os alarmes FIRMS correlacionados aos ativos. Verifique a API e a leitura dos
            geodados cadastrados.
          </div>
        ) : null}

        {liveEmpty ? (
          <div className="tech-card p-4 text-sm text-muted-foreground">
            Nenhum hotspot FIRMS foi encontrado dentro do raio operacional dos ativos filtrados neste periodo.
            Ajuste a janela temporal, o raio de proximidade ou os filtros de empresa/regiao/linha.
          </div>
        ) : null}

        {isLoading && !usingSimulated ? (
          <div className="tech-card p-6 flex items-center gap-3 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Correlacionando hotspots FIRMS com os ativos cadastrados...
          </div>
        ) : null}

        <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {usingSimulated ? "Modo simulado ativo" : `${sourceLabel} · ${assetScope?.count ?? 0} ativos no escopo`}
              </div>
              <div className="flex items-center gap-2">
                <Button variant={usingSimulated ? "default" : "outline"} size="sm" onClick={() => setModoSimulado((prev) => !prev)}>
                  {usingSimulated ? "Usar dados operacionais" : "Usar modo simulado"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Atualizar FIRMS
                </Button>
              </div>
            </div>

            <MapLibreQueimadas
              geojson={displayCollection}
              fitBounds={fitBounds}
              corridor={(usingSimulated ? simulatedCorridor : realCorridor) as FeatureCollection<LineString> | null}
              showWindOverlay={usingSimulated || Boolean(windMeta)}
              onFeatureClick={(feature) => {
                const id = getFeatureId(feature, 0);
                setSelectedId(id);
              }}
            />
          </div>

          <div className="tech-card p-4 space-y-4 max-h-[680px] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Top alarmes do recorte</h3>
              <Badge variant="outline">{selectedBucketLabel}</Badge>
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
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getRiskColor(item.riskMax)}`}>
                            Risco {item.riskMax.toFixed(1)}
                          </span>
                          {item.lineCode ? <Badge variant="secondary">{item.lineCode}</Badge> : null}
                          {item.seCodes.slice(0, 2).map((code) => (
                            <Badge key={code} variant="outline" className="font-normal">
                              SE {code}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Ativo: {item.nearestAssetName ?? "Nao correlacionado"} · Dist. ativo: {formatDistance(item.distanceAsset)} ·
                          Dist. LT: {formatDistance(item.distanceLine)} · ETA: {formatEta(item.eta)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.company ?? "Sem empresa"}{item.region ? ` · Regiao ${item.region}` : ""}{item.lineName ? ` · ${item.lineName}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.sourceSensor ?? "FIRMS"} · confianca {item.confidence.toFixed(0)}%{item.dayNight ? ` · ${item.dayNight}` : ""} · FRP {item.frp.toFixed(1)} MW
                        </p>
                        {item.contexto ? <p className="text-xs text-muted-foreground">{item.contexto}</p> : null}
                      </div>
                      <div className="text-xs text-muted-foreground text-right whitespace-nowrap">{item.acquiredAtLabel}</div>
                    </div>
                  </button>
                );
              })}

              {topTwenty.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">Nenhum alarme para o recorte operacional selecionado.</p>
              ) : null}
            </div>

            {selectedFeature ? (
              <div className="border-t border-border/60 pt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{selectedFeature.label}</span>
                  <Badge variant="outline">{selectedFeature.riskMax.toFixed(1)}</Badge>
                </div>
                <p className="text-muted-foreground">
                  {selectedFeature.company ?? "Sem empresa"}{selectedFeature.region ? ` · Regiao ${selectedFeature.region}` : ""}
                  {selectedFeature.lineName ? ` · ${selectedFeature.lineName}` : ""}
                </p>
                <p className="text-muted-foreground">
                  Ativo mais proximo: {selectedFeature.nearestAssetName ?? "Nao correlacionado"} · tipo {selectedFeature.nearestAssetType ?? "operacional"}
                </p>
                <p className="text-muted-foreground">
                  Distancia ao ativo: {formatDistance(selectedFeature.distanceAsset)} · Distancia a LT: {formatDistance(selectedFeature.distanceLine)} · ETA: {formatEta(selectedFeature.eta)}
                </p>
                <p className="text-muted-foreground">
                  FIRMS: {selectedFeature.sourceSensor ?? "NASA FIRMS"} · confianca {selectedFeature.confidence.toFixed(0)}% ·
                  FRP {selectedFeature.frp.toFixed(1)} MW · {selectedFeature.acquiredAtLabel}
                </p>
                {selectedFeature.seCodes.length ? (
                  <div className="flex flex-wrap gap-2 pt-1 text-xs text-muted-foreground">
                    {selectedFeature.seCodes.map((code) => (
                      <Badge key={code} variant="secondary" className="font-normal">
                        SE {code}
                      </Badge>
                    ))}
                  </div>
                ) : null}
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
