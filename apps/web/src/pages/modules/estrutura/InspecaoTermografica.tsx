import { useMemo, useState } from "react";
import { Flame, Thermometer } from "lucide-react";

import ModuleLayout from "@/components/ModuleLayout";
import ModuleDemoBanner from "@/components/ModuleDemoBanner";
import FiltersBar from "@/components/FiltersBar";
import { useFilters } from "@/context/FiltersContext";
import { emendas } from "@/lib/mockData";
import { MapLibreUnified } from "@/components/MapLibreUnified";
import DataTableAdvanced from "@/components/DataTableAdvanced";
import DetailDrawer from "@/components/DetailDrawer";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/StatusBadge";
import type { FeatureCollection } from "geojson";

type TermografiaFocus = {
  id: string;
  label: string;
  predicate: (item: (typeof emendas)[number]) => boolean;
};

const statusColors: Record<string, string> = {
  Crítico: "#ef4444",
  Atenção: "#f97316",
  Normal: "#22c55e",
};

export default function InspecaoTermografica() {
  const { filters } = useFilters();
  const [focusFilter, setFocusFilter] = useState<TermografiaFocus | null>(null);
  const [selected, setSelected] = useState<(typeof emendas)[number] | null>(null);

  const filteredData = useMemo(() => {
    return emendas.filter((item) => {
      if (filters.linha && item.linha !== filters.linha) return false;
      if (filters.ramal && item.ramal !== filters.ramal) return false;
      if (filters.search) {
        const query = filters.search.toLowerCase();
        if (!item.nome.toLowerCase().includes(query) && !item.torre.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [filters]);

  const focusCards = useMemo(() => {
    const total = filteredData.length;
    const criticos = filteredData.filter((item) => item.statusTermico === "Crítico").length;
    const atencao = filteredData.filter((item) => item.statusTermico === "Atenção").length;
    const normal = filteredData.filter((item) => item.statusTermico === "Normal").length;
    const acima60 = filteredData.filter((item) => item.temperatura >= 60).length;
    return [
      {
        id: "total",
        label: "Total inspeções",
        value: total,
        predicate: () => true,
      },
      {
        id: "criticos",
        label: "Críticos",
        value: criticos,
        predicate: (item: (typeof emendas)[number]) => item.statusTermico === "Crítico",
      },
      {
        id: "atencao",
        label: "Atenção",
        value: atencao,
        predicate: (item: (typeof emendas)[number]) => item.statusTermico === "Atenção",
      },
      {
        id: "acima60",
        label: "≥ 60°C",
        value: acima60,
        predicate: (item: (typeof emendas)[number]) => item.temperatura >= 60,
      },
      {
        id: "normais",
        label: "Normais",
        value: normal,
        predicate: (item: (typeof emendas)[number]) => item.statusTermico === "Normal",
      },
    ];
  }, [filteredData]);

  const focusedData = useMemo(() => {
    if (!focusFilter) return filteredData;
    return filteredData.filter(focusFilter.predicate);
  }, [filteredData, focusFilter]);

  const points: FeatureCollection = useMemo(
    () => ({
      type: "FeatureCollection",
      features: filteredData.map((item) => {
        const [lat, lon] = item.coords;
        return {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [lon, lat] },
          properties: {
            id: item.id,
            nome: item.nome,
            temperatura: item.temperatura,
            status: item.statusTermico,
            color: statusColors[item.statusTermico] ?? "#0ea5e9",
            isFocus: focusFilter ? focusFilter.predicate(item) : false,
            size: item.statusTermico === "Crítico" ? 12 : item.statusTermico === "Atenção" ? 10 : 8,
          },
        };
      }),
    }),
    [filteredData, focusFilter],
  );

  const bounds = useMemo(() => {
    const source = focusedData.length ? focusedData : filteredData;
    if (!source.length) return null;
    const lngs = source.map((item) => item.coords[1]);
    const lats = source.map((item) => item.coords[0]);
    return [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ] as [[number, number], [number, number]];
  }, [focusedData, filteredData]);

  const temperatureAvg = useMemo(() => {
    if (!focusedData.length) return 0;
    return focusedData.reduce((acc, item) => acc + item.temperatura, 0) / focusedData.length;
  }, [focusedData]);

  const columns = [
    { key: "nome", label: "Componente" },
    {
      key: "temperatura",
      label: "Temp. (°C)",
      render: (value: number) => (
        <Badge className="bg-slate-900 text-white" variant="outline">
          <Thermometer className="w-3 h-3 mr-1" /> {value.toFixed(1)}°C
        </Badge>
      ),
    },
    {
      key: "statusTermico",
      label: "Status térmico",
      render: (value: string) => <StatusBadge level={value as any} />,
    },
    {
      key: "ultimaInspecao",
      label: "Última inspeção",
      render: (value: string) => new Date(value).toLocaleDateString("pt-BR"),
    },
  ];

  const summary = {
    total: focusedData.length,
    media: temperatureAvg,
    criticos: focusedData.filter((item) => item.statusTermico === "Crítico").length,
  };

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

  return (
    <ModuleLayout title="Inspeção Termográfica" icon={Flame}>
      <div className="p-6 space-y-6">
        <ModuleDemoBanner />
        <FiltersBar floating={false} />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {focusCards.map((card) => (
            <button
              key={card.id}
              className={`tech-card p-6 text-left transition ${focusFilter?.id === card.id ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/40"}`}
              onClick={() => setFocusFilter((prev) => (prev?.id === card.id ? null : card))}
            >
              <div className="text-sm text-muted-foreground">{card.label}</div>
              <div className="text-3xl font-bold text-primary">{card.value}</div>
            </button>
          ))}
        </div>

        {focusFilter ? (
          <div className="flex items-center justify-between px-4 py-2 border border-primary/20 bg-primary/5 rounded-lg text-xs">
            <span className="text-primary font-semibold">Filtro ativo: {focusFilter.label}</span>
            <button className="underline-offset-2 hover:underline" onClick={() => setFocusFilter(null)}>
              Limpar seleção
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
          <div className="tech-card p-0 overflow-hidden">
            <MapLibreUnified
              filterRegiao={filters.regiao}
              filterLinha={filters.linha}
              showInfrastructure
              customPoints={points}
              customLines={rsDemoLine as any}
              fitBounds={bounds}
              initialCenter={[-46.63, -23.55]}
              initialZoom={filters.linha ? 12 : 8}
            />
          </div>

          <div className="tech-card p-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Resumo do subconjunto</span>
              <Badge variant="outline">{summary.total} registros</Badge>
            </div>
            <p className="text-muted-foreground">
              Temperatura média: <strong>{summary.media.toFixed(1)}°C</strong> · Críticos: <strong>{summary.criticos}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Clique em uma linha abaixo para ver os detalhes e localizar o ponto no mapa.
            </p>
          </div>
        </div>

        <DataTableAdvanced
          data={focusedData}
          columns={columns}
          onRowClick={(row) => setSelected(row)}
          exportable
        />

        <DetailDrawer
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          title={selected?.nome ?? ""}
        >
          {selected ? (
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-muted-foreground">Torre</span>
                <p className="font-semibold">{selected.torre}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Temperatura</span>
                  <p className="font-semibold flex items-center gap-2">
                    <Thermometer className="w-4 h-4" /> {selected.temperatura.toFixed(1)}°C
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status térmico</span>
                  <div className="mt-1">
                    <StatusBadge level={selected.statusTermico as any} />
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Última inspeção</span>
                  <p className="font-semibold">{new Date(selected.ultimaInspecao).toLocaleDateString("pt-BR")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Linha / Ramal</span>
                  <p className="font-semibold">{selected.linha} · {selected.ramal}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Integrar essa inspeção ao painel operacional garante que os pontos quentes sejam priorizados antes de causarem falhas.
              </p>
            </div>
          ) : null}
        </DetailDrawer>
      </div>
    </ModuleLayout>
  );
}
