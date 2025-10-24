import { useMemo, useState } from "react";
import { Camera, Home } from "lucide-react";
import { toast } from "sonner";

import ModuleLayout from "@/components/ModuleLayout";
import ModuleDemoBanner from "@/components/ModuleDemoBanner";
import FiltersBar from "@/components/FiltersBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataTableAdvanced from "@/components/DataTableAdvanced";
import DetailDrawer from "@/components/DetailDrawer";
import CardKPI from "@/components/CardKPI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import MapViewGeneric from "@/components/MapViewGeneric";
import { useFilters } from "@/context/FiltersContext";
import { useFeatureStatuses, useSaveFeatureStatus } from "@/hooks/useFeatureStatus";
import { useDatasetData } from "@/context/DatasetContext";
import type { OcupacaoFaixa as OcupacaoFaixaItem } from "@/lib/mockData";

type OcupacaoItem = OcupacaoFaixaItem;

const STATUS_OPTIONS = ["Identificada", "Notificada", "Judicializada", "Regularizada"] as const;
const STATUS_FILTERS = [...STATUS_OPTIONS, "Sem status"] as const;

const statusVariant = (status?: string) => {
  switch (status) {
    case "Regularizada":
      return "secondary";
    case "Judicializada":
      return "destructive";
    case "Notificada":
      return "default";
    case "Identificada":
    default:
      return "outline";
  }
};

const stableId = (item: OcupacaoItem) => {
  if (item.id) return `ocup-${item.id}`;
  const slug = `${item.nome}-${item.linha}-${item.ramal}`.toLowerCase().replace(/\s+/g, "-");
  return `ocup-${slug}`;
};

const OcupacaoFaixa = () => {
  const { filters } = useFilters();
  const [selectedOcupacao, setSelectedOcupacao] = useState<OcupacaoItem | null>(null);
  const [tipoFilter, setTipoFilter] = useState<string>("");
  const [situacaoFilter, setSituacaoFilter] = useState<string>("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formStatus, setFormStatus] = useState<string>(STATUS_OPTIONS[0]);
  const [formNotes, setFormNotes] = useState<string>("");
  const [formCameraUrl, setFormCameraUrl] = useState<string>("");
  const ocupacoesDataset = useDatasetData((data) => data.ocupacoesFaixa);

  const allIds = useMemo(() => ocupacoesDataset.map((item) => stableId(item)), [ocupacoesDataset]);
  const { data: statusList = [] } = useFeatureStatuses("ocupacoes", allIds);
  const saveStatusMutation = useSaveFeatureStatus("ocupacoes");

  const statusMap = useMemo(() => {
    const map = new Map<string, (typeof statusList)[number]>();
    statusList.forEach((status) => map.set(status.id, status));
    return map;
  }, [statusList]);

  const filteredData = useMemo(() => {
    let data = [...ocupacoesDataset];

    if (filters.regiao) data = data.filter((item) => item.regiao === filters.regiao);
    if (filters.linha) data = data.filter((item) => item.linha === filters.linha);
    if (filters.ramal) data = data.filter((item) => item.ramal === filters.ramal);
    if (filters.search) {
      const query = filters.search.toLowerCase();
      data = data.filter((item) => item.nome.toLowerCase().includes(query));
    }
    if (tipoFilter) data = data.filter((item) => item.tipo === tipoFilter);
    if (situacaoFilter) data = data.filter((item) => item.situacao === situacaoFilter);
    if (statusFilters.length > 0) {
      data = data.filter((item) => {
        const currentStatus = statusMap.get(stableId(item))?.status ?? "Sem status";
        return statusFilters.includes(currentStatus);
      });
    }

    return data;
  }, [filters, tipoFilter, situacaoFilter, statusFilters, statusMap, ocupacoesDataset]);

  const tableData = useMemo(
    () =>
      filteredData.map((item) => ({
        ...item,
        statusAtual: statusMap.get(stableId(item))?.status ?? "Sem status"
      })),
    [filteredData, statusMap]
  );

  const kpis = useMemo(() => ({
    total: filteredData.length,
    irregulares: filteredData.filter((item) => item.situacao === "Irregular").length,
    emRegularizacao: filteredData.filter((item) => item.situacao === "Em Regularização").length,
    distanciaMedia: (
      filteredData.reduce((acc, item) => acc + item.distanciaFaixa, 0) / (filteredData.length || 1)
    ).toFixed(0)
  }), [filteredData]);

  const columns = [
    { key: "nome", label: "Nome", sortable: true },
    { key: "tipo", label: "Tipo", sortable: true },
    {
      key: "situacao",
      label: "Situação",
      sortable: true,
      render: (value: string) => (
        <Badge variant={value === "Irregular" ? "destructive" : value === "Em Regularização" ? "secondary" : "outline"}>
          {value}
        </Badge>
      )
    },
    {
      key: "statusAtual",
      label: "Status atualizado",
      sortable: false,
      render: (value: string, row: OcupacaoItem & { statusAtual: string }) => (
        <Badge variant={statusVariant(value)}>{value}</Badge>
      )
    },
    {
      key: "distanciaFaixa",
      label: "Distância (m)",
      render: (value: number) => `${value}m`
    },
    {
      key: "prazoRegularizacao",
      label: "Prazo",
      render: (value: string | undefined) => (value ? new Date(value).toLocaleDateString("pt-BR") : "-")
    },
    { key: "responsavel", label: "Responsável", render: (value: string | undefined) => value || "-" }
  ];

  const openStatusDialog = (item: OcupacaoItem) => {
    const current = statusMap.get(stableId(item));
    setSelectedOcupacao(item);
    setFormStatus(current?.status ?? STATUS_OPTIONS[0]);
    setFormNotes(current?.notes ?? "");
    setFormCameraUrl(current?.cameraUrl ?? "");
    setDialogOpen(true);
  };

  const handleToggleStatusFilter = (status: string) => {
    setStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((value) => value !== status) : [...prev, status]
    );
  };

  const handleSaveStatus = () => {
    if (!selectedOcupacao) return;
    const payload = {
      id: stableId(selectedOcupacao),
      status: formStatus,
      notes: formNotes?.trim() ? formNotes.trim() : undefined,
      cameraUrl: formCameraUrl?.trim() ? formCameraUrl.trim() : undefined
    };
    saveStatusMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Status atualizado");
        setDialogOpen(false);
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Não foi possível atualizar o status. Tente novamente."
        );
      }
    });
  };

  return (
    <ModuleLayout title="Ocupação de Faixa" icon={Home}>
      <div className="p-6 space-y-6">
        <ModuleDemoBanner />
        <FiltersBar>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Ocupação</label>
              <select
                value={tipoFilter}
                onChange={(event) => setTipoFilter(event.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="Residencial">Residencial</option>
                <option value="Comercial">Comercial</option>
                <option value="Agrícola">Agrícola</option>
                <option value="Industrial">Industrial</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Situação Legal</label>
              <select
                value={situacaoFilter}
                onChange={(event) => setSituacaoFilter(event.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="Regular">Regular</option>
                <option value="Irregular">Irregular</option>
                <option value="Em Regularização">Em Regularização</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status cadastrado</label>
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((status) => {
                  const active = statusFilters.includes(status);
                  return (
                    <Button
                      key={status}
                      size="sm"
                      variant={active ? "default" : "outline"}
                      onClick={() => handleToggleStatusFilter(status)}
                    >
                      {status}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </FiltersBar>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardKPI title="Total de Ocupações" value={kpis.total} icon={Home} />
          <CardKPI title="Irregulares" value={kpis.irregulares} icon={Home} />
          <CardKPI title="Em Regularização" value={kpis.emRegularizacao} icon={Home} />
          <CardKPI title="Distância média" value={`${kpis.distanciaMedia}m`} icon={Home} />
        </div>

        <Tabs defaultValue="lista">
          <TabsList>
            <TabsTrigger value="lista">Lista</TabsTrigger>
            <TabsTrigger value="mapa">Mapa</TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="mt-4">
            <DataTableAdvanced
              data={tableData}
              columns={columns}
              onRowClick={(ocupacao) => setSelectedOcupacao(ocupacao)}
              exportable
            />
          </TabsContent>

          <TabsContent value="mapa" className="mt-4">
            <MapViewGeneric
              items={filteredData}
              markerIcon={Home}
              colorBy="situacao"
              onMarkerClick={(ocupacao) => setSelectedOcupacao(ocupacao)}
            />
          </TabsContent>
        </Tabs>

        <DetailDrawer
          isOpen={!!selectedOcupacao}
          onClose={() => setSelectedOcupacao(null)}
          title={selectedOcupacao?.nome ?? ""}
        >
          {selectedOcupacao && (
            <div className="space-y-6 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Tipo</span>
                  <p className="font-bold text-lg">{selectedOcupacao.tipo}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Situação</span>
                  <div className="mt-1">
                    <Badge
                      variant={
                        selectedOcupacao.situacao === "Irregular"
                          ? "destructive"
                          : selectedOcupacao.situacao === "Em Regularização"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {selectedOcupacao.situacao}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Distância da Faixa</span>
                  <p className="font-bold text-lg">{selectedOcupacao.distanciaFaixa}m</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Região</span>
                  <p className="font-medium">Região {selectedOcupacao.regiao}</p>
                </div>
              </div>

              {selectedOcupacao.responsavel && (
                <div>
                  <span className="text-sm text-muted-foreground">Responsável</span>
                  <p className="font-medium">{selectedOcupacao.responsavel}</p>
                </div>
              )}

              {selectedOcupacao.prazoRegularizacao && (
                <div>
                  <span className="text-sm text-muted-foreground">Prazo de Regularização</span>
                  <p className="font-medium text-lg">
                    {new Date(selectedOcupacao.prazoRegularizacao).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}

              <div>
                <span className="text-sm text-muted-foreground">Localização</span>
                <p className="font-medium">
                  {selectedOcupacao.linha} - {selectedOcupacao.ramal}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Status cadastrado</span>
                <div className="flex items-center gap-3">
                  <Badge variant={statusVariant(statusMap.get(stableId(selectedOcupacao))?.status)}>
                    {statusMap.get(stableId(selectedOcupacao))?.status ?? "Sem status"}
                  </Badge>
                  {statusMap.get(stableId(selectedOcupacao))?.cameraUrl ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        window.open(statusMap.get(stableId(selectedOcupacao))?.cameraUrl!, "_blank", "noopener")
                      }
                    >
                      <Camera className="w-4 h-4 mr-1" />
                      Ver câmera
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => openStatusDialog(selectedOcupacao)}>
                      Associar câmera
                    </Button>
                  )}
                  <Button size="sm" onClick={() => openStatusDialog(selectedOcupacao)}>
                    Atualizar status
                  </Button>
                </div>
                {statusMap.get(stableId(selectedOcupacao))?.notes && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {statusMap.get(stableId(selectedOcupacao))?.notes}
                  </p>
                )}
              </div>
            </div>
          )}
        </DetailDrawer>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar status de ocupação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <select
                value={formStatus}
                onChange={(event) => setFormStatus(event.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formNotes}
                onChange={(event) => setFormNotes(event.target.value)}
                placeholder="Detalhes adicionais, acordos, prazos..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="cameraUrl">URL da câmera associada</Label>
              <Input
                id="cameraUrl"
                type="url"
                value={formCameraUrl}
                onChange={(event) => setFormCameraUrl(event.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveStatus} disabled={saveStatusMutation.isPending}>
              {saveStatusMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
};

export default OcupacaoFaixa;
