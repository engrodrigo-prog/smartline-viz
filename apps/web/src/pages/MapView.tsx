import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Ruler, ZoomIn, ZoomOut } from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { BasemapSelector } from "@/components/BasemapSelector";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterDrawer, FilterField } from "@/components/filters/FilterDrawer";
import { FiltersProviderV2, useFiltersV2 } from "@/context/FiltersCtx";
import { useDatasetData } from "@/context/DatasetContext";
import { addOrUpdateGeoJsonSource, basemapIds, buildStyleForBasemap, selectBasemap, resetTerrain } from "@/services/map";
import { DEFAULT_BASEMAP, type BasemapId } from "@/lib/mapConfig";
import type { FeatureCollection, Feature, Position } from "geojson";
import { format } from "date-fns";

import { andamentoBadge, eventAnalysis, statusBadge, type AnaliseEvento } from "@/lib/eventAnalysis";
const haversineDistance = (from: Position, to: Position) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad((to[1] as number) - (from[1] as number));
  const dLon = toRad((to[0] as number) - (from[0] as number));
  const lat1 = toRad(from[1] as number);
  const lat2 = toRad(to[1] as number);

  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const MEASUREMENT_SOURCE_ID = "smartline-measurement";
const EVENT_SOURCE_ID = "smartline-map-events";
const EVENT_HEAT_LAYER_ID = "smartline-map-events-heat";
const EVENT_POINT_LAYER_ID = "smartline-map-events-points";

const emptyMeasurement: FeatureCollection = {
  type: "FeatureCollection",
  features: []
};

type EventTimeWindow = "24h" | "7d" | "30d" | "todos";

const EVENT_SEVERITY: Array<"Baixa" | "Média" | "Alta"> = ["Baixa", "Média", "Alta"];
const EVENT_STATUSES: Array<"Resolvido" | "Em andamento"> = ["Resolvido", "Em andamento"];

const severityWeight: Record<string, number> = {
  Baixa: 0.25,
  Média: 0.6,
  Alta: 1,
};

const timeWindowHours: Record<EventTimeWindow, number | null> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
  todos: null,
};

const escapeHtml = (value: string | undefined | null) =>
  value ? value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "―";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "―";
  return format(date, "dd/MM HH:mm");
};

interface EventFiltersState {
  tipo: "all" | "Pisca" | "Interrupção";
  severidades: Array<"Baixa" | "Média" | "Alta">;
  status: Array<"Resolvido" | "Em andamento">;
  janela: EventTimeWindow;
}

const createDefaultEventFilters = (): EventFiltersState => ({
  tipo: "all",
  severidades: [...EVENT_SEVERITY],
  status: [...EVENT_STATUSES],
  janela: "24h",
});

type EventoSeveridade = (typeof EVENT_SEVERITY)[number];
type EventoStatus = (typeof EVENT_STATUSES)[number];

const severityBadgeClasses: Record<EventoSeveridade, string> = {
  Baixa: "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30",
  Média: "bg-amber-500/15 text-amber-600 border border-amber-500/30",
  Alta: "bg-rose-500/15 text-rose-600 border border-rose-500/30",
};

const statusBadgeClasses: Record<EventoStatus, string> = {
  Resolvido: "bg-muted text-muted-foreground border border-border",
  "Em andamento": "bg-sky-500/10 text-sky-600 border border-sky-500/30",
};

const MapFilters = ({
  value,
  onChange,
  availableBasemaps,
  onClearAll,
  eventFilters,
  onEventFiltersChange,
}: {
  value: BasemapId;
  onChange: (v: BasemapId) => void;
  availableBasemaps: BasemapId[];
  onClearAll: () => void;
  eventFilters: EventFiltersState;
  onEventFiltersChange: (next: Partial<EventFiltersState>) => void;
}) => {
  const filters = useFiltersV2();
  const toggleSeverity = (severity: "Baixa" | "Média" | "Alta") => {
    const next = eventFilters.severidades.includes(severity)
      ? eventFilters.severidades.filter((s) => s !== severity)
      : [...eventFilters.severidades, severity];
    onEventFiltersChange({ severidades: next.length ? next : [severity] });
  };

  const toggleStatus = (status: "Resolvido" | "Em andamento") => {
    const next = eventFilters.status.includes(status)
      ? eventFilters.status.filter((s) => s !== status)
      : [...eventFilters.status, status];
    onEventFiltersChange({ status: next.length ? next : [status] });
  };

  return (
    <FilterDrawer title="Filtros do mapa" onClearAll={onClearAll}>
      <FilterField label="Base do mapa" onClear={() => onChange(DEFAULT_BASEMAP)}>
        <Select value={value} onValueChange={(v: any) => onChange(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableBasemaps.map((id) => (
              <SelectItem key={id} value={id}>{id}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Tipo de evento" onClear={() => onEventFiltersChange({ tipo: "all" })}>
        <Select value={eventFilters.tipo} onValueChange={(v: any) => onEventFiltersChange({ tipo: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Piscas + Interrupções</SelectItem>
            <SelectItem value="Pisca">Somente Piscas</SelectItem>
            <SelectItem value="Interrupção">Somente Interrupções</SelectItem>
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Severidade" onClear={() => onEventFiltersChange({ severidades: [...EVENT_SEVERITY] })}>
        <div className="flex flex-wrap gap-2">
          {EVENT_SEVERITY.map((severity) => {
            const active = eventFilters.severidades.includes(severity);
            return (
              <Button
                key={severity}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                className="text-xs"
                onClick={() => toggleSeverity(severity)}
              >
                {severity}
              </Button>
            );
          })}
        </div>
      </FilterField>

      <FilterField label="Status" onClear={() => onEventFiltersChange({ status: [...EVENT_STATUSES] })}>
        <div className="flex flex-wrap gap-2">
          {EVENT_STATUSES.map((status) => {
            const active = eventFilters.status.includes(status);
            return (
              <Button
                key={status}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                className="text-xs"
                onClick={() => toggleStatus(status)}
              >
                {status}
              </Button>
            );
          })}
        </div>
      </FilterField>

      <FilterField label="Período" onClear={() => onEventFiltersChange({ janela: "24h" })}>
        <Select value={eventFilters.janela} onValueChange={(v: any) => onEventFiltersChange({ janela: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Últimas 24h</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="todos">Histórico completo</SelectItem>
          </SelectContent>
        </Select>
      </FilterField>
    </FilterDrawer>
  );
};

const MapView = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const measurementPoints = useRef<Position[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const [currentBasemap, setCurrentBasemap] = useState<BasemapId>(() => selectBasemap(DEFAULT_BASEMAP, undefined));
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementKm, setMeasurementKm] = useState<number | null>(null);
  const [hoverCoords, setHoverCoords] = useState<maplibregl.LngLat | null>(null);
  const eventosEnergia = useDatasetData((data) => data.eventosEnergia ?? []);
  const [eventFilters, setEventFilters] = useState<EventFiltersState>(createDefaultEventFilters);
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);

  const availableBasemaps = useMemo(() => basemapIds(), []);

  const filteredEvents = useMemo(() => {
    const hoursLimit = timeWindowHours[eventFilters.janela];
    const now = Date.now();

    return eventosEnergia
      .filter((event) => {
        if (eventFilters.tipo !== "all" && event.tipo !== eventFilters.tipo) return false;
        if (!eventFilters.severidades.includes(event.severidade)) return false;
        if (!eventFilters.status.includes(event.status)) return false;

        if (hoursLimit != null) {
          const diffHours = (now - new Date(event.inicio).getTime()) / 3_600_000;
          if (diffHours > hoursLimit) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const weightDiff = (severityWeight[b.severidade] ?? 0) - (severityWeight[a.severidade] ?? 0);
        if (weightDiff !== 0) return weightDiff;
        return new Date(b.inicio).getTime() - new Date(a.inicio).getTime();
      });
  }, [eventosEnergia, eventFilters]);

  useEffect(() => {
    if (focusedEventId && !filteredEvents.some((item) => item.id === focusedEventId)) {
      setFocusedEventId(null);
      popupRef.current?.remove();
    }
  }, [filteredEvents, focusedEventId]);

  const eventFeatures = useMemo(() => {
    return filteredEvents.map((event) => {
      const inicioTs = new Date(event.inicio).getTime();
      const fimTs = event.fim ? new Date(event.fim).getTime() : undefined;
      const duracaoMin = event.duracaoMin ?? (fimTs ? Math.round((fimTs - inicioTs) / 60000) : null);

      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: event.coords,
        },
        properties: {
          id: event.id,
          tipo: event.tipo,
          severidade: event.severidade,
          status: event.status,
          inicio: event.inicio,
          fim: event.fim ?? null,
          duracaoMin,
          linha: event.linha,
          subestacao: event.subestacao ?? null,
          causa: event.causaProvavel,
          weight: severityWeight[event.severidade] ?? 0.4,
          isFocus: focusedEventId === event.id,
        },
      } satisfies Feature;
    });
  }, [filteredEvents, focusedEventId]);

  const eventGeojson = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: eventFeatures as FeatureCollection["features"],
    }),
    [eventFeatures],
  );

  const eventSummary = useMemo(() => {
    const total = filteredEvents.length;
    const pisca = filteredEvents.filter((e) => e.tipo === "Pisca").length;
    const interrupcao = filteredEvents.filter((e) => e.tipo === "Interrupção").length;

    const emAndamento = filteredEvents.filter((e) => e.status === "Em andamento").length;
    const totalDuracao = filteredEvents.reduce((acc, e) => acc + (e.duracaoMin ?? 0), 0);
    const avgDuracao = total ? totalDuracao / total : 0;
    const ultimoEvento = filteredEvents[0]?.inicio ? format(new Date(filteredEvents[0].inicio), "dd/MM HH:mm") : "―";

    return {
      total,
      pisca,
      interrupcao,
      emAndamento,
      avgDuracao: Number.isFinite(avgDuracao) ? avgDuracao : 0,
      ultimoEvento,
    };
  }, [filteredEvents]);

  const focusedEvent = useMemo(() => filteredEvents.find((e) => e.id === focusedEventId) ?? null, [filteredEvents, focusedEventId]);
  const focusedAnalysis: AnaliseEvento | null = useMemo(
    () => (focusedEventId ? eventAnalysis[focusedEventId] ?? null : null),
    [focusedEventId],
  );
  const updateMeasurement = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!map.isStyleLoaded()) {
      map.once("style.load", updateMeasurement);
      return;
    }

    const points = measurementPoints.current;
    if (!points.length) {
      addOrUpdateGeoJsonSource(map, MEASUREMENT_SOURCE_ID, emptyMeasurement);
      setMeasurementKm(null);
      return;
    }

    const features: FeatureCollection["features"] = [
      {
        type: "Feature",
        geometry: {
          type: "MultiPoint",
          coordinates: points,
        },
        properties: {},
      },
    ];

    if (points.length === 2) {
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: points,
        },
        properties: {},
      });
      setMeasurementKm(haversineDistance(points[0]!, points[1]!));
    } else {
      setMeasurementKm(null);
    }

    addOrUpdateGeoJsonSource(map, MEASUREMENT_SOURCE_ID, {
      type: "FeatureCollection",
      features,
    });

    if (!map.getLayer("measurement-line")) {
      map.addLayer({
        id: "measurement-line",
        type: "line",
        source: MEASUREMENT_SOURCE_ID,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": "#0ea5e9",
          "line-width": 3,
          "line-dasharray": [2, 2],
        },
      });
    }

    if (!map.getLayer("measurement-points")) {
      map.addLayer({
        id: "measurement-points",
        type: "circle",
        source: MEASUREMENT_SOURCE_ID,
        filter: ["==", ["geometry-type"], "MultiPoint"],
        paint: {
          "circle-radius": 6,
          "circle-color": "#0ea5e9",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    }
  }, []);

  const ensureEventLayers = useCallback((map: maplibregl.Map) => {
    if (!map.getSource(EVENT_SOURCE_ID)) {
      map.addSource(EVENT_SOURCE_ID, {
        type: "geojson",
        data: emptyMeasurement,
      });
    }

    if (!map.getLayer(EVENT_HEAT_LAYER_ID)) {
      map.addLayer({
        id: EVENT_HEAT_LAYER_ID,
        type: "heatmap",
        source: EVENT_SOURCE_ID,
        maxzoom: 13,
        paint: {
          "heatmap-weight": ["coalesce", ["get", "weight"], 0.3],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 8, 0.6, 13, 1.1],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 8, 12, 13, 32],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(29,78,216,0)",
            0.2,
            "rgba(59,130,246,0.35)",
            0.4,
            "rgba(56,189,248,0.6)",
            0.6,
            "rgba(234,179,8,0.65)",
            0.8,
            "rgba(249,115,22,0.8)",
            1,
            "rgba(220,38,38,0.9)",
          ],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 13, 0],
        },
      });
    }

    if (!map.getLayer(EVENT_POINT_LAYER_ID)) {
      map.addLayer({
        id: EVENT_POINT_LAYER_ID,
        type: "circle",
        source: EVENT_SOURCE_ID,
        minzoom: 8,
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            [
              "match",
              ["get", "severidade"],
              "Alta",
              11,
              "Média",
              9,
              7,
            ],
            14,
            [
              "match",
              ["get", "severidade"],
              "Alta",
              18,
              "Média",
              14,
              11,
            ],
          ],
          "circle-color": [
            "match",
            ["get", "tipo"],
            "Interrupção",
            "#ef4444",
            "Pisca",
            "#0ea5e9",
            "#3b82f6",
          ],
          "circle-opacity": [
            "case",
            ["boolean", ["get", "isFocus"], false],
            0.95,
            0.75,
          ],
          "circle-stroke-color": [
            "case",
            ["boolean", ["get", "isFocus"], false],
            "#f97316",
            "#0f172a",
          ],
          "circle-stroke-width": [
            "case",
            ["boolean", ["get", "isFocus"], false],
            2.6,
            1.2,
          ],
        },
      });
    }
  }, []);

  const syncEventsSource = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const run = () => {
      ensureEventLayers(map);
      addOrUpdateGeoJsonSource(map, EVENT_SOURCE_ID, eventGeojson);
    };

    if (map.isStyleLoaded()) {
      run();
    } else {
      map.once("styledata", run);
    }
  }, [ensureEventLayers, eventGeojson]);

  type PopupPayload = {
    id: string;
    tipo: string;
    severidade: string;
    status: string;
    inicio: string;
    fim?: string | null;
    duracaoMin?: number | null;
    linha: string;
    subestacao?: string | null;
    causa?: string | null;
    coords: [number, number];
  };

  const showPopup = useCallback((payload: PopupPayload) => {
    if (!mapRef.current) return;
    const html = `
      <div style="font-family:'Inter','Segoe UI',sans-serif;font-size:12px;min-width:220px;max-width:280px;">
        <div style="font-weight:600;font-size:13px;margin-bottom:4px;">${escapeHtml(payload.tipo)} · ${escapeHtml(payload.severidade)}</div>
        <div style="margin-bottom:4px;">Linha: <strong>${escapeHtml(payload.linha)}</strong></div>
        ${payload.subestacao ? `<div style="margin-bottom:4px;">Subestação: <strong>${escapeHtml(payload.subestacao)}</strong></div>` : ""}
        <div style="margin-bottom:4px;">Status: <strong>${escapeHtml(payload.status)}</strong></div>
        <div style="margin-bottom:4px;">Início: ${formatDateTime(payload.inicio)}</div>
        <div style="margin-bottom:4px;">Fim: ${formatDateTime(payload.fim ?? undefined)}</div>
        <div style="margin-bottom:6px;">Duração: ${payload.duracaoMin != null ? `${payload.duracaoMin} min` : "―"}</div>
        <div style="line-height:1.35;">${escapeHtml(payload.causa || "")}</div>
      </div>
    `;

    if (!popupRef.current) {
      popupRef.current = new maplibregl.Popup({ offset: 12, maxWidth: "320px" });
    }

    popupRef.current.setLngLat(payload.coords).setHTML(html).addTo(mapRef.current);
  }, []);

  const focusEventOnMap = useCallback(
    (eventData: typeof filteredEvents[number]) => {
      setFocusedEventId(eventData.id);
      if (mapRef.current) {
        mapRef.current.easeTo({
          center: eventData.coords,
          zoom: Math.max(mapRef.current.getZoom(), 11),
          duration: 900,
        });
      }
      showPopup({
        id: eventData.id,
        tipo: eventData.tipo,
        severidade: eventData.severidade,
        status: eventData.status,
        inicio: eventData.inicio,
        fim: eventData.fim,
        duracaoMin: eventData.duracaoMin,
        linha: eventData.linha,
        subestacao: eventData.subestacao,
        causa: eventData.causaProvavel,
        coords: eventData.coords,
      });
    },
    [showPopup],
  );

  const handleBasemapChange = useCallback(
    (next: BasemapId) => {
      const map = mapRef.current;
      const resolved = selectBasemap(next, undefined);
      const style = buildStyleForBasemap(resolved);

      if (!map) {
        setCurrentBasemap(resolved);
        return;
      }

      const runAfterStyleLoad = () => {
        resetTerrain(map);
        updateMeasurement();
        syncEventsSource();
        map.resize();
      };

      map.once("style.load", runAfterStyleLoad);
      map.setStyle(style as any, { diff: false } as any);

      setCurrentBasemap(resolved);
      measurementPoints.current = [];
      setMeasurementKm(null);
    },
    [updateMeasurement, syncEventsSource],
  );

  const toggleMeasurement = () => {
    if (!mapRef.current) return;

    if (isMeasuring) {
      measurementPoints.current = [];
      updateMeasurement();
      setMeasurementKm(null);
      setIsMeasuring(false);
    } else {
      measurementPoints.current = [];
      updateMeasurement();
      setIsMeasuring(true);
    }
  };

  const handleEventFiltersChange = useCallback((next: Partial<EventFiltersState>) => {
    setEventFilters((prev) => ({ ...prev, ...next }));
  }, []);

  const clearAll = useCallback(() => {
    setEventFilters(createDefaultEventFilters());
    handleBasemapChange(DEFAULT_BASEMAP);
    setFocusedEventId(null);
    popupRef.current?.remove();
  }, [handleBasemapChange]);


  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const basemap = selectBasemap(currentBasemap, undefined);
    const style = buildStyleForBasemap(basemap);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: [-46.333, -23.96],
      zoom: 11,
      pitch: 45,
      bearing: -17,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");

    map.on("mousemove", (event) => setHoverCoords(event.lngLat));

    const runInitialStyleWork = () => {
      resetTerrain(map);
      syncEventsSource();
      map.resize();
    };

    if (map.isStyleLoaded()) {
      runInitialStyleWork();
    } else {
      map.once("style.load", runInitialStyleWork);
    }

    const handleMapError = (_event: any) => { /* no-op for MapLibre/ESRI */ };

    map.on("error", handleMapError as any);

    return () => {
      map.off("error", handleMapError);
      map.remove();
      mapRef.current = null;
    };
  }, [currentBasemap, handleBasemapChange, syncEventsSource]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (event: any) => {
      if (!isMeasuring) return;

      measurementPoints.current.push([event.lngLat.lng, event.lngLat.lat]);
      if (measurementPoints.current.length > 2) {
        measurementPoints.current.shift();
      }

      updateMeasurement();
    };

    map.on("click", handleClick);

    return () => {
      map.off("click", handleClick);
    };
  }, [isMeasuring, updateMeasurement]);

  useEffect(() => {
    syncEventsSource();
  }, [syncEventsSource]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClickOnEventLayer = (event: any) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const id = feature.properties?.id as string | undefined;
      if (!id) return;

      const target = filteredEvents.find((item) => item.id === id);
      if (target) {
        focusEventOnMap(target);
      }
    };

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    const onStyleLoad = () => {
      ensureEventLayers(map);
      map.on("click", EVENT_POINT_LAYER_ID, handleClickOnEventLayer);
      map.on("mouseenter", EVENT_POINT_LAYER_ID, handleMouseEnter);
      map.on("mouseleave", EVENT_POINT_LAYER_ID, handleMouseLeave);
    };

    if (map.isStyleLoaded()) {
      onStyleLoad();
    } else {
      map.once("style.load", onStyleLoad);
    }

    return () => {
      map.off("click", EVENT_POINT_LAYER_ID, handleClickOnEventLayer);
      map.off("mouseenter", EVENT_POINT_LAYER_ID, handleMouseEnter);
      map.off("mouseleave", EVENT_POINT_LAYER_ID, handleMouseLeave);
      map.off("style.load", onStyleLoad);
      map.getCanvas().style.cursor = "";
    };
  }, [filteredEvents, focusEventOnMap, ensureEventLayers]);

  useEffect(() => () => {
    popupRef.current?.remove();
  }, []);

  return (
    <FiltersProviderV2>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            title="Mapa Interativo"
            subtitle="Base ESRI + MapLibre (sem token). Medição e eventos com heatmap."
          />
          <main className="flex-1 relative">
            <div ref={containerRef} className="absolute inset-0 map-smooth" />

            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
              <Button size="icon" variant="secondary" className="h-9 w-9" onClick={() => mapRef.current?.zoomIn()}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="secondary" className="h-9 w-9" onClick={() => mapRef.current?.zoomOut()}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={isMeasuring ? "default" : "secondary"}
                className="mt-2 h-9"
                onClick={toggleMeasurement}
              >
                <Ruler className="mr-2 h-4 w-4" />
                {isMeasuring ? "Medição ativa" : "Medir distância"}
              </Button>
            </div>

            <BasemapSelector value={currentBasemap} onChange={handleBasemapChange} mapboxAvailable={false} />

            <MapFilters
              value={currentBasemap}
              onChange={handleBasemapChange}
              availableBasemaps={availableBasemaps}
              onClearAll={clearAll}
              eventFilters={eventFilters}
              onEventFiltersChange={handleEventFiltersChange}
            />

            <div className="pointer-events-none absolute top-24 right-4 z-20 flex w-80 max-w-[85vw] flex-col gap-3">
              <div className="pointer-events-auto rounded-lg border border-border bg-background/95 p-4 shadow-sm backdrop-blur-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Situação dos eventos</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-2xl font-semibold text-foreground">{eventSummary.total}</div>
                    <p className="text-xs text-muted-foreground">Eventos filtrados</p>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-foreground">{eventSummary.emAndamento}</div>
                    <p className="text-xs text-muted-foreground">Em andamento</p>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{eventSummary.pisca}</div>
                    <p className="text-xs text-muted-foreground">Piscas</p>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{eventSummary.interrupcao}</div>
                    <p className="text-xs text-muted-foreground">Interrupções</p>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {eventSummary.avgDuracao ? `${Math.round(eventSummary.avgDuracao)} min` : "―"}
                    </div>
                    <p className="text-xs text-muted-foreground">Duração média</p>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{eventSummary.ultimoEvento}</div>
                    <p className="text-xs text-muted-foreground">Último registro</p>
                  </div>
                </div>
              </div>
              
              <div className="pointer-events-auto overflow-hidden rounded-lg border border-border bg-background/95 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Eventos recentes</h3>
                    <p className="text-xs text-muted-foreground">Selecione para centralizar no mapa</p>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">{filteredEvents.length}</span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {filteredEvents.length ? (
                    filteredEvents.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        className={`w-full border-b border-border/40 px-4 py-3 text-left transition-colors last:border-b-0 ${
                          focusedEventId === event.id ? "bg-primary/15" : "hover:bg-muted/60"
                        }`}
                        onClick={() => focusEventOnMap(event)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityBadgeClasses[event.severidade]}`}>
                            {event.severidade}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClasses[event.status]}`}>
                            {event.status}
                          </span>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-foreground">{event.linha}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(event.inicio)} · {event.tipo}
                          {event.duracaoMin ? ` · ${event.duracaoMin} min` : ""}
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{event.causaProvavel}</div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-sm text-muted-foreground">
                      Nenhum evento corresponde aos filtros aplicados.
                    </div>
                  )}
                </div>
              </div>

              {focusedEvent && (
                <div className="pointer-events-auto overflow-hidden rounded-lg border border-border bg-background/95 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Análise de causa raiz</h3>
                      <p className="text-xs text-muted-foreground">{focusedEvent.linha} · {formatDateTime(focusedEvent.inicio)}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityBadgeClasses[focusedEvent.severidade]}`}>{focusedEvent.severidade}</span>
                  </div>

                  <div className="max-h-80 overflow-y-auto px-4 py-3">
                    {focusedAnalysis ? (
                      focusedAnalysis.causas.map((causa, idx) => (
                        <div key={idx} className="mb-3 last:mb-0">
                          <div className="text-sm font-semibold text-foreground">{causa.nome}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {causa.modosFalha.map((mf) => (
                              <span key={mf} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{mf}</span>
                            ))}
                          </div>
                          <div className="mt-2 space-y-2">
                            {causa.planosAcao.map((plano) => {
                              let andamento: 'No prazo' | 'Atrasado' | undefined = plano.andamento as any;
                              if (!andamento && plano.status === 'Em andamento' && plano.prazo) {
                                andamento = new Date(plano.prazo).getTime() >= Date.now() ? 'No prazo' : 'Atrasado';
                              }
                              return (
                                <div key={plano.id} className="rounded-md border border-border/60 p-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-xs font-medium text-foreground">{plano.titulo}</div>
                                    <div className="flex items-center gap-1">
                                      {andamento && (
                                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${andamentoBadge[andamento]}`}>{andamento}</span>
                                      )}
                                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${statusBadge[plano.status as keyof typeof statusBadge]}`}>{plano.status}</span>
                                    </div>
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                                    {plano.responsavel && <span>Resp.: {plano.responsavel}</span>}
                                    {plano.prazo && <span>Prazo: {formatDateTime(plano.prazo)}</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-muted-foreground">Sem análise cadastrada para este evento.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="absolute bottom-4 left-4 z-20 rounded-lg border border-border bg-background/90 px-3 py-2 text-xs text-foreground shadow backdrop-blur-sm">
              {hoverCoords ? (
                <div>
                  <span className="font-medium">Coordenadas</span>
                  <div className="text-muted-foreground">
                    {hoverCoords.lat.toFixed(5)}°, {hoverCoords.lng.toFixed(5)}°
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground">Passe o cursor para ver as coordenadas</span>
              )}
              {measurementKm && (
                <div className="mt-2 text-foreground">
                  <span className="font-medium">Distância:</span> {measurementKm.toFixed(2)} km
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </FiltersProviderV2>
  );
};

export default MapView;
