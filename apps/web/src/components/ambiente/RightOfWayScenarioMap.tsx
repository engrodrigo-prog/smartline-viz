import { Building2, MapPinned, RadioTower, Route } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  baixadaSantistaCorridorCoordinates,
  baixadaSantistaRightOfWaySites,
  baixadaSantistaTowerPoints,
} from "@/lib/baixadaSantistaScenario";

interface RightOfWayScenarioMapProps {
  selectedId?: string | null;
  siteIds?: string[];
  onSelect?: (siteId: string) => void;
}

const WIDTH = 980;
const HEIGHT = 540;
const PADDING = 38;

const activeSites = baixadaSantistaRightOfWaySites;
const allCoordinates = [
  ...baixadaSantistaCorridorCoordinates,
  ...activeSites.flatMap((site) => site.polygon),
  ...baixadaSantistaTowerPoints.features.map((feature) => feature.geometry.coordinates as [number, number]),
];

const minLon = Math.min(...allCoordinates.map(([lon]) => lon));
const maxLon = Math.max(...allCoordinates.map(([lon]) => lon));
const minLat = Math.min(...allCoordinates.map(([, lat]) => lat));
const maxLat = Math.max(...allCoordinates.map(([, lat]) => lat));

const lonSpan = Math.max(maxLon - minLon, 0.01);
const latSpan = Math.max(maxLat - minLat, 0.01);

const project = ([lon, lat]: [number, number]) => {
  const x = PADDING + ((lon - minLon) / lonSpan) * (WIDTH - PADDING * 2);
  const y = HEIGHT - PADDING - ((lat - minLat) / latSpan) * (HEIGHT - PADDING * 2);
  return [x, y] as const;
};

const toPolygonPoints = (polygon: [number, number][]) =>
  polygon
    .map((coordinate) => {
      const [x, y] = project(coordinate);
      return `${x},${y}`;
    })
    .join(" ");

const toPolylinePoints = (line: [number, number][]) =>
  line
    .map((coordinate) => {
      const [x, y] = project(coordinate);
      return `${x},${y}`;
    })
    .join(" ");

const statusStyles = {
  Regular: {
    fill: "rgba(34, 197, 94, 0.24)",
    stroke: "#4ade80",
  },
  Irregular: {
    fill: "rgba(239, 68, 68, 0.28)",
    stroke: "#f87171",
  },
  "Em Regularização": {
    fill: "rgba(249, 115, 22, 0.24)",
    stroke: "#fb923c",
  },
} as const;

const riskLabelClass = {
  "Observação": "bg-emerald-500/10 text-emerald-300 border-emerald-400/20",
  Alerta: "bg-amber-500/10 text-amber-200 border-amber-400/20",
  "Crítico": "bg-rose-500/10 text-rose-200 border-rose-400/20",
} as const;

export function RightOfWayScenarioMap({
  selectedId,
  siteIds = baixadaSantistaRightOfWaySites.map((site) => site.id),
  onSelect,
}: RightOfWayScenarioMapProps) {
  const visibleIds = new Set(siteIds);
  const visibleSites = baixadaSantistaRightOfWaySites.filter((site) => visibleIds.has(site.id));
  const selectedSite =
    baixadaSantistaRightOfWaySites.find((site) => site.id === selectedId) ?? visibleSites[0] ?? activeSites[0] ?? null;
  const criticalCount = visibleSites.filter((site) => site.classeRisco === "Crítico").length;

  return (
    <div className="tech-card p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Cenário demo da Baixada Santista
          </h3>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Traçado simulado do corredor Cubatão &gt; São Vicente &gt; Marapé &gt; Ponta da Praia, com edificações
            renderizadas para demonstrar conflito com a faixa de servidão.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-emerald-200">
            {visibleSites.length} ocupações visíveis
          </span>
          <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-rose-200">
            {criticalCount} críticas
          </span>
          <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-sky-200">
            6 torres monitoradas
          </span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_320px]">
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-slate-950">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-[460px] w-full">
            <defs>
              <linearGradient id="row-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#08111f" />
                <stop offset="45%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#172554" />
              </linearGradient>
              <pattern id="row-grid" width="44" height="44" patternUnits="userSpaceOnUse">
                <path d="M 44 0 L 0 0 0 44" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
              </pattern>
              <filter id="selected-glow">
                <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#f8fafc" floodOpacity="0.45" />
              </filter>
            </defs>

            <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="url(#row-bg)" />
            <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="url(#row-grid)" opacity="0.45" />

            <text x="72" y="82" fill="#cbd5e1" fontSize="18" fontWeight="600">
              Cubatão
            </text>
            <text x="366" y="182" fill="#cbd5e1" fontSize="18" fontWeight="600">
              São Vicente
            </text>
            <text x="608" y="248" fill="#cbd5e1" fontSize="18" fontWeight="600">
              Santos / Marapé
            </text>
            <text x="760" y="366" fill="#cbd5e1" fontSize="18" fontWeight="600">
              Ponta da Praia
            </text>

            <polyline
              points={toPolylinePoints(baixadaSantistaCorridorCoordinates)}
              fill="none"
              stroke="rgba(34, 211, 238, 0.16)"
              strokeWidth="42"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={toPolylinePoints(baixadaSantistaCorridorCoordinates)}
              fill="none"
              stroke="rgba(14, 165, 233, 0.34)"
              strokeWidth="18"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={toPolylinePoints(baixadaSantistaCorridorCoordinates)}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {baixadaSantistaTowerPoints.features.map((feature) => {
              const [x, y] = project(feature.geometry.coordinates as [number, number]);
              return (
                <g key={String(feature.properties?.id)}>
                  <circle cx={x} cy={y} r="8" fill="#f8fafc" fillOpacity="0.14" stroke="#f8fafc" strokeOpacity="0.55" />
                  <circle cx={x} cy={y} r="3.5" fill="#f8fafc" />
                  <text x={x + 10} y={y - 12} fill="#e2e8f0" fontSize="11" fontWeight="600">
                    {String(feature.properties?.id)}
                  </text>
                </g>
              );
            })}

            {baixadaSantistaRightOfWaySites.map((site) => {
              const isVisible = visibleIds.has(site.id);
              const isSelected = site.id === selectedSite?.id;
              const [centerX, centerY] = project(site.center);
              const style = statusStyles[site.situacao];

              return (
                <g key={site.id} onClick={() => onSelect?.(site.id)} className="cursor-pointer">
                  <polygon
                    points={toPolygonPoints(site.polygon)}
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth={isSelected ? 3 : 1.4}
                    opacity={isVisible ? 1 : 0.22}
                    filter={isSelected ? "url(#selected-glow)" : undefined}
                  />
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r={isSelected ? 8 : 5}
                    fill={isSelected ? "#f8fafc" : style.stroke}
                    opacity={isVisible ? 1 : 0.3}
                  />
                  {(isVisible || isSelected) && (
                    <text x={centerX + 10} y={centerY + 4} fill="#f8fafc" fontSize="12" fontWeight="600">
                      {site.nome}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Route className="h-4 w-4 text-sky-300" />
              Faixa simulada
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Buffer visual de servidão com dois circuitos e torres de referência para facilitar a narrativa comercial
              do MVP.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="h-4 w-4 text-rose-300" />
              Edificações
            </div>
            <div className="mt-3 space-y-2">
              {visibleSites.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => onSelect?.(site.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left transition",
                    selectedSite?.id === site.id
                      ? "border-primary bg-primary/8"
                      : "border-border/60 hover:border-primary/50 hover:bg-primary/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{site.nome}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {site.municipio} · {site.bairro} · {site.trechoKm}
                      </div>
                    </div>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", riskLabelClass[site.classeRisco])}>
                      {site.classeRisco}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {site.edificacao} · {site.distanciaFaixa} m da faixa
                  </div>
                </button>
              ))}

              {!visibleSites.length && (
                <div className="rounded-xl border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
                  Nenhuma ocupação corresponde ao filtro atual.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MapPinned className="h-4 w-4 text-amber-300" />
              Leitura recomendada
            </div>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <div>Vermelho: ocupações com conflito direto e risco jurídico/operacional.</div>
              <div>Laranja: casos com TAC, recuo ou adequação pendente.</div>
              <div>Verde: referência de afastamento regular para comparação em apresentações.</div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <RadioTower className="h-4 w-4 text-slate-200" />
              Seleção atual
            </div>
            {selectedSite ? (
              <div className="mt-3 space-y-2 text-sm">
                <div className="font-medium">{selectedSite.nome}</div>
                <div className="text-muted-foreground">{selectedSite.resumo}</div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-muted-foreground">Selecione uma ocupação para ver o resumo.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RightOfWayScenarioMap;
