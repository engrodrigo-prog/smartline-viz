import { useMemo, useState } from "react";
import { Cable, Camera, MapPin } from "lucide-react";
import { toast } from "sonner";

import ModuleLayout from "@/components/ModuleLayout";
import FiltersBar from "@/components/FiltersBar";
import CardKPI from "@/components/CardKPI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapLibreUnified } from "@/components/MapLibreUnified";
import { useFilters } from "@/context/FiltersContext";
import { eventos } from "@/lib/mockData";
import { useFeatureStatuses, useSaveFeatureStatus } from "@/hooks/useFeatureStatus";

type TravessiaItem = (typeof eventos)[number];

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

const stableId = (item: TravessiaItem) => {
  if (item.id) return `trav-${item.id}`;
  const slug = `${item.nome ?? ""}-${item.linha ?? ""}-${item.ramal ?? ""}`.toLowerCase().replace(/\s+/g, "-");
  return `trav-${slug}`;
};

const Travessias = () => {
  const { filters } = useFilters();
  const [activeTab, setActiveTab] = useState("lista");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TravessiaItem | null>(null);
  const [formStatus, setFormStatus] = useState<string>(STATUS_OPTIONS[0]);
  const [formNotes, setFormNotes] = useState<string>("");
  const [formCameraUrl, setFormCameraUrl] = useState<string>("");

  const travessias = useMemo(() => eventos.filter((evento) => evento.tipo === "Travessias"), []);
  const allIds = useMemo(() => travessias.map((item) => stableId(item)), [travessias]);

  const { data: statusList = [] } = useFeatureStatuses("travessias", allIds);
  const saveStatusMutation = useSaveFeatureStatus("travessias");

  const statusMap = useMemo(() => {
    const map = new Map<string, (typeof statusList)[number]>();
    statusList.forEach((status) => map.set(status.id, status));
    return map;
  }, [statusList]);

  const filteredData = useMemo(() => {
    let data = [...travessias];

    if (filters.regiao) data = data.filter((item) => item.regiao === filters.regiao);
    if (filters.linha) data = data.filter((item) => item.linha === filters.linha);
    if (filters.ramal) data = data.filter((item) => item.ramal === filters.ramal);
    if (filters.search) {
      const query = filters.search.toLowerCase();
      data = data.filter((item) => item.nome.toLowerCase().includes(query));
    }

    if (statusFilters.length > 0) {
      data = data.filter((item) => {
        const id = stableId(item);
        const currentStatus = statusMap.get(id)?.status ?? "Sem status";
        return statusFilters.includes(currentStatus);
      });
    }

    return data;
  }, [filters, statusFilters, travessias, statusMap]);

  const statusCounts = useMemo(() => {
    const base = {
      total: travessias.length,
      comStatus: 0,
      regularizadas: 0,
      judicializadas: 0,
      notificadas: 0
    };
    statusList.forEach((status) => {
      base.comStatus += 1;
      if (status.status === "Regularizada") base.regularizadas += 1;
      if (status.status === "Judicializada") base.judicializadas += 1;
      if (status.status === "Notificada") base.notificadas += 1;
    });
    return base;
  }, [statusList, travessias.length]);

  const openStatusDialog = (item: TravessiaItem) => {
    const id = stableId(item);
    const current = statusMap.get(id);
    setSelectedItem(item);
    setFormStatus(current?.status ?? STATUS_OPTIONS[0]);
    setFormNotes(current?.notes ?? "");
    setFormCameraUrl(current?.cameraUrl ?? "");
    setDialogOpen(true);
  };

  const handleToggleStatusFilter = (value: string) => {
    setStatusFilters((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const handleSaveStatus = () => {
    if (!selectedItem) return;
    const payload = {
      id: stableId(selectedItem),
      status: formStatus,
      notes: formNotes?.trim() ? formNotes.trim() : undefined,
      cameraUrl: formCameraUrl?.trim() ? formCameraUrl.trim() : undefined
    };
    saveStatusMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Status atualizado com sucesso");
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
    <ModuleLayout title="Gestão de Travessias" icon={Cable}>
      <div className="p-6 space-y-6">
        <FiltersBar>
          <div className="flex flex-wrap gap-2 mt-4">
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
        </FiltersBar>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardKPI title="Travessias catalogadas" value={statusCounts.total} icon={Cable} />
          <CardKPI title="Com status registrado" value={statusCounts.comStatus} icon={Cable} />
          <CardKPI title="Regularizadas" value={statusCounts.regularizadas} icon={Cable} />
          <CardKPI title="Judicializadas" value={statusCounts.judicializadas} icon={Cable} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="tech-card p-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="lista">📋 Lista</TabsTrigger>
            <TabsTrigger value="mapa">🗺️ Mapa</TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="mt-4 space-y-4">
            {filteredData.map((item) => {
              const id = stableId(item);
              const status = statusMap.get(id);
              return (
                <div
                  key={id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 border border-border/60 rounded-lg bg-background/80"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Cable className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold">{item.nome}</h3>
                        <Badge variant={statusVariant(status?.status)}>
                          {status?.status ?? "Sem status"}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        {item.linha} · {item.ramal} · Região {item.regiao}
                      </div>
                      {status?.notes && (
                        <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                          {status.notes}
                        </p>
                      )}
                      {status?.updatedAt && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Atualizado em {new Date(status.updatedAt).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {status?.cameraUrl ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open(status.cameraUrl!, "_blank", "noopener")}
                      >
                        <Camera className="w-4 h-4 mr-1" />
                        Ver câmera
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => openStatusDialog(item)}>
                        Associar câmera
                      </Button>
                    )}
                    <Button size="sm" onClick={() => openStatusDialog(item)}>
                      Atualizar status
                    </Button>
                  </div>
                </div>
              );
            })}
            {filteredData.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma travessia encontrada com os filtros selecionados.
              </p>
            )}
          </TabsContent>

          <TabsContent value="mapa" className="mt-4">
            <div className="h-[600px] rounded-lg overflow-hidden border border-border/60">
              <MapLibreUnified
                filterRegiao={filters.regiao}
                filterEmpresa={filters.empresa}
                filterLinha={filters.linha}
                showTravessias
                initialZoom={filters.linha ? 13 : 7}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar status da travessia</DialogTitle>
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
                placeholder="Detalhes sobre o status, intervenções, pendências..."
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

export default Travessias;
