import { useEffect, useMemo, useState } from "react";
import { Droplets, Waves, MapPinned, Route, Info } from "lucide-react";
import ModuleLayout from "@/components/ModuleLayout";
import ModuleDemoBanner from "@/components/ModuleDemoBanner";
import FiltersBar from "@/components/FiltersBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapLibreUnified } from "@/components/MapLibreUnified";
import DataTableAdvanced from "@/components/DataTableAdvanced";
import DetailDrawer from "@/components/DetailDrawer";
import CardKPI from "@/components/CardKPI";
import StatusBadge from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useDatasetData } from "@/context/DatasetContext";
import { useFilters } from "@/context/FiltersContext";
import {
  buildAreasAlagadasMapData,
  getAreasAlagadasHydroLabels,
  normalizeFloodAreas,
  type FloodAreaRecord,
  type WaterBodyKind,
} from "@/features/ambiental/alagadasHydrology";

const statusVariant = (status: FloodAreaRecord["status"]) => {
  if (status === "Crítico") return "destructive";
  if (status === "Alerta") return "secondary";
  return "outline";
};

const HYDRO_CONTEXT_OPTIONS: Array<{ value: WaterBodyKind; label: string }> = [
  { value: "Rio", label: "Rio" },
  { value: "Canal", label: "Rio/Canal" },
  { value: "Lagoa", label: "Lagoa" },
  { value: "Reservatório", label: "Reservatório" },
];

const AreasAlagadas = () => {
  const { filters, resetFilters } = useFilters();
  const [selectedArea, setSelectedArea] = useState<FloodAreaRecord | null>(null);
  const [nivelRiscoFilter, setNivelRiscoFilter] = useState<string>("");
  const [hydroContextFilter, setHydroContextFilter] = useState<string>("");
  const areasDataset = useDatasetData((data) => data.areasAlagadas as FloodAreaRecord[]);
  const normalizedAreasDataset = useMemo(() => normalizeFloodAreas(areasDataset), [areasDataset]);

  const filteredData = useMemo(() => {
    let data = normalizedAreasDataset;

    if (filters.empresa) data = data.filter((area) => area.empresa === filters.empresa);
    if (filters.regiao) data = data.filter((area) => area.regiao === filters.regiao);
    if (filters.linha) data = data.filter((area) => area.linha === filters.linha);
    if (filters.ramal) data = data.filter((area) => area.ramal === filters.ramal);
    if (filters.tensaoKv) data = data.filter((area) => area.tensaoKv === filters.tensaoKv);
    if (filters.linhaNome) {
      const searchLine = filters.linhaNome.toLowerCase();
      data = data.filter((area) =>
        `${area.nomeLinha} ${area.linha}`.toLowerCase().includes(searchLine),
      );
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      data = data.filter((area) =>
        [
          area.nome,
          area.microbacia,
          area.rioPrincipal,
          area.corpoHidrico,
          area.observacao,
          area.nomeLinha,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search),
      );
    }

    if (nivelRiscoFilter) {
      data = data.filter((area) => area.nivelRisco === nivelRiscoFilter);
    }

    if (hydroContextFilter) {
      data = data.filter((area) => area.tipoCorpoHidrico === hydroContextFilter);
    }

    return data;
  }, [filters, hydroContextFilter, nivelRiscoFilter, normalizedAreasDataset]);

  useEffect(() => {
    if (selectedArea && !filteredData.some((area) => area.id === selectedArea.id)) {
      setSelectedArea(null);
    }
  }, [filteredData, selectedArea]);

  const hasContextFilters =
    Boolean(filters.empresa) ||
    Boolean(filters.regiao) ||
    Boolean(filters.linha) ||
    Boolean(filters.linhaNome) ||
    Boolean(filters.ramal) ||
    Boolean(filters.tensaoKv) ||
    Boolean(filters.search) ||
    Boolean(nivelRiscoFilter) ||
    Boolean(hydroContextFilter);

  const shouldShowReferenceHydrology = filteredData.length === 0 && normalizedAreasDataset.length > 0;

  const mapData = useMemo(() => {
    if (shouldShowReferenceHydrology) {
      return buildAreasAlagadasMapData(normalizedAreasDataset, {});
    }
    return buildAreasAlagadasMapData(filteredData, filters);
  }, [filteredData, filters, normalizedAreasDataset, shouldShowReferenceHydrology]);

  const kpis = useMemo(() => {
    const microbacias = new Set(filteredData.map((area) => area.microbaciaId)).size;
    const rios = new Set(filteredData.map((area) => area.riverId)).size;
    const corposDagua = new Set(filteredData.map((area) => area.waterBodyId)).size;

    return {
      total: filteredData.length,
      criticas: filteredData.filter(
        (area) => area.nivelRisco === "Alto" || area.status === "Crítico",
      ).length,
      areaTotal: filteredData.reduce((sum, area) => sum + area.areaCritica, 0).toFixed(2),
      microbacias,
      rios,
      corposDagua,
      proximas: filteredData.filter((area) => area.distanciaCorpoHidricoM <= 120).length,
    };
  }, [filteredData]);

  const columns = [
    { key: "nome", label: "Trecho crítico" },
    { key: "microbacia", label: "Microbacia" },
    {
      key: "corpoHidrico",
      label: "Contexto hídrico",
      render: (_: unknown, row: FloodAreaRecord) => (
        <div className="space-y-1">
          <div className="font-medium">{row.rioPrincipal}</div>
          <div className="text-xs text-muted-foreground">
            {row.corpoHidrico} • {getAreasAlagadasHydroLabels(row.tipoCorpoHidrico)}
          </div>
        </div>
      ),
    },
    {
      key: "nivelRisco",
      label: "Risco",
      render: (value: FloodAreaRecord["nivelRisco"]) => <StatusBadge level={value as any} />,
    },
    {
      key: "distanciaCorpoHidricoM",
      label: "Dist. hídrica",
      render: (value: number) => `${value} m`,
    },
    {
      key: "status",
      label: "Status",
      render: (value: FloodAreaRecord["status"]) => (
        <Badge variant={statusVariant(value)}>{value}</Badge>
      ),
    },
    {
      key: "ultimaAtualizacao",
      label: "Atualização",
      render: (value: string) => new Date(value).toLocaleDateString("pt-BR"),
    },
  ];

  return (
    <ModuleLayout title="Áreas Alagadas" icon={Droplets}>
      <div className="p-6 space-y-6">
        <ModuleDemoBanner />

        <FiltersBar>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Nível de risco</label>
              <select
                value={nivelRiscoFilter}
                onChange={(event) => setNivelRiscoFilter(event.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="Baixo">Baixo</option>
                <option value="Médio">Médio</option>
                <option value="Alto">Alto</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Camada hídrica prioritária</label>
              <select
                value={hydroContextFilter}
                onChange={(event) => setHydroContextFilter(event.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todas</option>
                {HYDRO_CONTEXT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </FiltersBar>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <CardKPI title="Alertas hidrológicos" value={kpis.total} icon={Droplets} />
          <CardKPI
            title="Trechos críticos"
            value={kpis.criticas}
            icon={Waves}
            trend={{ value: 18, isPositive: false }}
          />
          <CardKPI title="Microbacias ativas" value={kpis.microbacias} icon={MapPinned} />
          <CardKPI title="Rios e canais" value={kpis.rios} icon={Route} />
          <CardKPI title="Área crítica (km²)" value={kpis.areaTotal} icon={Droplets} />
        </div>

        <div className="tech-card p-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>
            Base do mapa: <strong className="text-foreground">microbacias + rios/canais + lagoas/reservatórios</strong>
          </span>
          <span>Corpos d'água mapeados: <strong className="text-foreground">{kpis.corposDagua}</strong></span>
          <span>Trechos até 120 m da lâmina d'água: <strong className="text-foreground">{kpis.proximas}</strong></span>
          <span className="text-xs">
            Estrutura pronta para a próxima etapa de interseção com as faixas que forem ingeridas.
          </span>
        </div>

        <Tabs defaultValue="lista">
          <TabsList>
            <TabsTrigger value="lista">Lista</TabsTrigger>
            <TabsTrigger value="mapa">Mapa</TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="mt-4">
            <DataTableAdvanced
              data={filteredData}
              columns={columns}
              onRowClick={(area) => setSelectedArea(area as FloodAreaRecord)}
              exportable
            />
          </TabsContent>

          <TabsContent value="mapa" className="mt-4 space-y-4">
            {shouldShowReferenceHydrology && (
              <Alert className="border-amber-500/40 bg-amber-500/5 text-amber-950 dark:text-amber-100">
                <Info className="h-4 w-4" />
                <AlertTitle>Sem feições para os filtros atuais</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <span>
                    A base hídrica completa foi exibida como referência para não deixar o mapa vazio.
                    Limpe os filtros para voltar a ver apenas os alertas compatíveis.
                  </span>
                  {hasContextFilters && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        resetFilters();
                        setNivelRiscoFilter("");
                        setHydroContextFilter("");
                      }}
                    >
                      Limpar filtros
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className="border-teal-500/40 text-teal-700 dark:text-teal-300">
                Microbacias
              </Badge>
              <Badge variant="outline" className="border-blue-500/40 text-blue-700 dark:text-blue-300">
                Rios e canais
              </Badge>
              <Badge variant="outline" className="border-indigo-500/40 text-indigo-700 dark:text-indigo-300">
                Lagoas e reservatórios
              </Badge>
              <Badge variant="outline" className="border-rose-500/40 text-rose-700 dark:text-rose-300">
                Alertas de alagamento
              </Badge>
            </div>

            <div className="tech-card p-0 overflow-hidden">
              <MapLibreUnified
                filterRegiao={filters.regiao}
                filterEmpresa={filters.empresa}
                filterLinha={filters.linha}
                showAreasAlagadas
                showInfrastructure={false}
                initialCenter={[-46.62, -23.78]}
                initialZoom={8}
                fitBounds={mapData.fitBounds}
                focusCoord={selectedArea ? [selectedArea.coords[1], selectedArea.coords[0]] : undefined}
                customPolygons={mapData.polygons}
                customLines={mapData.lines}
                customPoints={mapData.points}
                height="640px"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="tech-card p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Microbacias exibidas</div>
                <div className="mt-2 text-2xl font-semibold">{mapData.hydroSummary.microbacias}</div>
              </div>
              <div className="tech-card p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Rios/canais exibidos</div>
                <div className="mt-2 text-2xl font-semibold">{mapData.hydroSummary.rios}</div>
              </div>
              <div className="tech-card p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Corpos d'água exibidos</div>
                <div className="mt-2 text-2xl font-semibold">{mapData.hydroSummary.corposDagua}</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DetailDrawer
          isOpen={Boolean(selectedArea)}
          onClose={() => setSelectedArea(null)}
          title={selectedArea?.nome ?? ""}
        >
          {selectedArea && (
            <div className="space-y-6 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Risco</span>
                  <div className="mt-1">
                    <StatusBadge level={selectedArea.nivelRisco as any} />
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Status</span>
                  <div className="mt-1">
                    <Badge variant={statusVariant(selectedArea.status)}>{selectedArea.status}</Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Área crítica</span>
                  <p className="font-bold text-lg">{selectedArea.areaCritica.toFixed(2)} km²</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Atualização</span>
                  <p className="font-medium">
                    {new Date(selectedArea.ultimaAtualizacao).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="tech-card p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Contexto elétrico</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div><strong>Empresa:</strong> {selectedArea.empresa}</div>
                    <div><strong>Linha:</strong> {selectedArea.nomeLinha}</div>
                    <div><strong>Ramal:</strong> {selectedArea.ramal}</div>
                    <div><strong>Tensão:</strong> {selectedArea.tensaoKv}</div>
                  </div>
                </div>

                <div className="tech-card p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Contexto hídrico</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div><strong>Microbacia:</strong> {selectedArea.microbacia}</div>
                    <div><strong>Rio principal:</strong> {selectedArea.rioPrincipal}</div>
                    <div><strong>Corpo d'água:</strong> {selectedArea.corpoHidrico}</div>
                    <div><strong>Tipo:</strong> {getAreasAlagadasHydroLabels(selectedArea.tipoCorpoHidrico)}</div>
                    <div><strong>Distância hídrica:</strong> {selectedArea.distanciaCorpoHidricoM} m</div>
                    <div><strong>Cota operacional:</strong> {selectedArea.cotaOperacionalM} m</div>
                  </div>
                </div>
              </div>

              <div className="tech-card p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Leitura operacional</div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{selectedArea.observacao}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-3">
                  Torres afetadas ({selectedArea.torres_afetadas.length})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedArea.torres_afetadas.map((torreId) => (
                    <div
                      key={torreId}
                      className="p-3 bg-muted/20 rounded-lg flex items-center justify-between"
                    >
                      <span className="font-medium">{torreId}</span>
                      <Badge variant="outline">{selectedArea.microbacia}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DetailDrawer>
      </div>
    </ModuleLayout>
  );
};

export default AreasAlagadas;
