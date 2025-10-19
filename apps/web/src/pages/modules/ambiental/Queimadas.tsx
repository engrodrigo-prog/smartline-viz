import { useMemo, useState } from "react";
import { Flame, Globe2, MapPin, RefreshCw, Satellite } from "lucide-react";

import ModuleLayout from "@/components/ModuleLayout";
import CardKPI from "@/components/CardKPI";
import { MapLibreUnified } from "@/components/MapLibreUnified";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFirmsData, type FirmsPreset } from "@/hooks/useFirmsData";

const PRESET_OPTIONS: { label: string; value: FirmsPreset }[] = [
  { label: "Últimas 12 horas", value: "12h" },
  { label: "Últimas 24 horas", value: "24h" },
  { label: "Últimas 48 horas", value: "48h" },
  { label: "Últimos 7 dias", value: "7d" }
];

const emptyGeoJson = {
  type: "FeatureCollection" as const,
  features: []
};

const Queimadas = () => {
  const [preset, setPreset] = useState<FirmsPreset>("24h");
  const { data, isLoading, refetch } = useFirmsData(preset);

  const collection = data ?? emptyGeoJson;
  const focusCoord = useMemo(() => {
    const point = collection.features.find((feature) => feature.geometry?.type === "Point");
    if (!point) return undefined;
    const [lng, lat] = point.geometry.coordinates as [number, number];
    return [lng, lat] as [number, number];
  }, [collection]);

  const highestConfidence = useMemo(() => {
    return collection.features.reduce((acc, feature) => {
      const confidence = Number((feature.properties as any)?.confidence ?? 0);
      return confidence > acc ? confidence : acc;
    }, 0);
  }, [collection]);

  const avgBrightness = useMemo(() => {
    if (!collection.features.length) return 0;
    const sum = collection.features.reduce((acc, feature) => {
      const brightness = Number((feature.properties as any)?.brightness ?? 0);
      return acc + (Number.isFinite(brightness) ? brightness : 0);
    }, 0);
    return sum / collection.features.length;
  }, [collection]);

  const rows = useMemo(() => {
    return collection.features.map((feature) => {
      const props = feature.properties as Record<string, any>;
      const [lng, lat] = feature.geometry?.type === "Point"
        ? (feature.geometry.coordinates as [number, number])
        : [undefined, undefined];

      return {
        id: props.id ?? Math.random().toString(36).slice(2),
        detectedAt: props.detected_at ? new Date(props.detected_at) : null,
        confidence: props.confidence ?? null,
        brightness: props.brightness ?? null,
        satellite: props.satellite ?? "N/D",
        source: props.source ?? "FIRMS",
        lat,
        lng
      };
    });
  }, [collection]);

  return (
    <ModuleLayout title="Queimadas" icon={Flame}>
      <div className="p-6 space-y-6">
        <div className="tech-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Globe2 className="w-5 h-5 text-primary" />
            <span>
              Integração FIRMS/NASA com presets temporais. Dados são armazenados em cache por alguns minutos para evitar
              limites de taxa.
            </span>
            {data?.metadata && (
              <Badge variant={data.metadata.live ? "default" : "outline"}>
                {data.metadata.live ? "Dados ao vivo" : "Dados em modo demonstrativo"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={preset}
              onChange={(event) => setPreset(event.target.value as FirmsPreset)}
              className="flex h-9 w-48 rounded-md border border-border bg-background px-2 text-sm"
            >
              {PRESET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button size="sm" variant="secondary" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Atualizar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardKPI title="Focos detectados" value={collection.features.length} icon={Flame} />
          <CardKPI
            title="Maior confiança"
            value={`${highestConfidence ? Math.round(highestConfidence) : 0}%`}
            icon={Satellite}
          />
          <CardKPI
            title="Brilho médio"
            value={avgBrightness ? avgBrightness.toFixed(1) : "0.0"}
            icon={MapPin}
            description="Kelvin"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="tech-card p-3 h-[540px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Mapa de focos ativos</h3>
                <Badge variant="secondary">Preset: {preset}</Badge>
              </div>
              <div className="relative h-[480px] rounded-lg overflow-hidden">
                <MapLibreUnified
                  showQueimadas
                  queimadasData={collection}
                  focusCoord={focusCoord}
                  confiancaMin={0}
                  showInfrastructure={false}
                />
              </div>
            </div>
          </div>

          <div className="tech-card p-4">
            <h3 className="text-sm font-semibold mb-3">Detecções recentes</h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {rows.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum foco encontrado para o preset selecionado.</p>
              )}
              {rows.map((row) => (
                <div key={row.id} className="border border-border/60 rounded-lg p-3 bg-background/80">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{row.satellite}</span>
                    <span>{row.detectedAt ? row.detectedAt.toLocaleString("pt-BR") : "N/D"}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Confiança</p>
                      <p className="font-semibold">{row.confidence ? `${Math.round(row.confidence)}%` : "N/D"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Brilho</p>
                      <p className="font-semibold">{row.brightness ? Number(row.brightness).toFixed(1) : "N/D"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Coordenadas</p>
                      <p className="font-mono text-sm">
                        {row.lat && row.lng ? `${row.lat.toFixed(4)}°, ${row.lng.toFixed(4)}°` : "N/D"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {data?.metadata && (
          <div className="text-xs text-muted-foreground">
            <p>
              Fonte: <span className="text-foreground">{data.metadata.source}</span> · Cache: {data.metadata.cached ? "hit" : "miss"}
            </p>
          </div>
        )}
      </div>
    </ModuleLayout>
  );
};

export default Queimadas;
