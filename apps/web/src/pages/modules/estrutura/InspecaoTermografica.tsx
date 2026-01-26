import { useEffect, useMemo, useState } from "react";
import { Camera, Download, MapPin, AlertTriangle } from "lucide-react";
import type { FeatureCollection, Point } from "geojson";
import ModuleLayout from "@/components/ModuleLayout";
import { useSelectionContext } from "@/context/SelectionContext";
import {
  useMediaJobs,
  useMediaJob,
  useMediaItems,
  useMediaAnomalias,
  useCreateAnomalia,
  useUpdateAnomalia,
} from "@/hooks/useMedia";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapLibreUnified } from "@/components/MapLibreUnified";
import { toast } from "sonner";
import type { MediaItem } from "@/services/mediaJobsApi";
import { getLinhaExportUrl, getInspecaoExportUrl } from "@/services/mediaJobsApi";
import { getMediaFileUrl } from "@/services/media";

const statusColors: Record<string, string> = {
  queued: "bg-amber-500/20 text-amber-500",
  processing: "bg-sky-500/20 text-sky-500",
  done: "bg-emerald-500/20 text-emerald-500",
  error: "bg-rose-500/20 text-rose-500",
};

const tipoOptions = [
  { value: "isolador", label: "Isolador" },
  { value: "ferragem", label: "Ferragem" },
  { value: "cabo", label: "Condutor" },
  { value: "estrutura", label: "Estrutura" },
];

const criticidades = [
  { value: "Critico", label: "Crítico" },
  { value: "Moderado", label: "Moderado" },
  { value: "Baixo", label: "Baixo" },
];

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
};

const EMPTY_JOB_ITEMS: MediaItem[] = [];

export default function InspecaoTermografica() {
  const { linhaSelecionada, linhaSelecionadaId, cenarioSelecionado, cenarioSelecionadoId } = useSelectionContext();
  const jobsQuery = useMediaJobs({ linhaId: linhaSelecionadaId }, { enabled: Boolean(linhaSelecionadaId) });
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>();

  useEffect(() => {
    if (!jobsQuery.data?.length) return;
    if (!selectedJobId || !jobsQuery.data.some((job) => job.jobId === selectedJobId)) {
      setSelectedJobId(jobsQuery.data[0].jobId);
    }
  }, [jobsQuery.data, selectedJobId]);

  const mediaItemsParams = useMemo(
    () => ({ jobId: selectedJobId, limit: 200, hasGeom: true }),
    [selectedJobId]
  );
  const anomaliasParams = useMemo(
    () => ({ linhaId: linhaSelecionadaId, jobId: selectedJobId }),
    [linhaSelecionadaId, selectedJobId]
  );

  const jobDetail = useMediaJob(selectedJobId, { enabled: Boolean(selectedJobId) });
  const itemsQuery = useMediaItems(mediaItemsParams, { enabled: Boolean(selectedJobId) });
  const anomaliasQuery = useMediaAnomalias(anomaliasParams, { enabled: Boolean(linhaSelecionadaId) });
  const createAnomalia = useCreateAnomalia();
  const updateAnomalia = useUpdateAnomalia();

  const [anomaliaModalOpen, setAnomaliaModalOpen] = useState(false);
  const [anomaliaMediaId, setAnomaliaMediaId] = useState<string | undefined>();
  const [anomaliaTipo, setAnomaliaTipo] = useState("isolador");
  const [anomaliaCriticidade, setAnomaliaCriticidade] = useState("Critico");
  const [anomaliaDescricao, setAnomaliaDescricao] = useState("");

  const jobItems = itemsQuery.data?.items ?? EMPTY_JOB_ITEMS;
  const jobAnomalias = useMemo(() => {
    const items = anomaliasQuery.data ?? [];
    if (!selectedJobId) return items;
    return items.filter((anomalia) => anomalia.jobId === selectedJobId);
  }, [anomaliasQuery.data, selectedJobId]);

  const jobMap: FeatureCollection<Point> | null = useMemo(() => {
    if (!jobItems.length) return null;
    const features = jobItems
      .filter((item) => item.geometry)
      .map((item) => ({
        type: "Feature" as const,
        geometry: item.geometry!,
        properties: {
          color: item.tipoMidia === "frame" ? "#f97316" : "#0ea5e9",
          size: item.tipoMidia === "frame" ? 6 : 8,
          mediaId: item.mediaId,
          tipo: item.tipoMidia,
        },
      }));
    return features.length ? { type: "FeatureCollection", features } : null;
  }, [jobItems]);

  const mapBounds = useMemo(() => {
    if (!jobMap?.features.length) return undefined;
    const lngs = jobMap.features.map((feature) => feature.geometry.coordinates[0]);
    const lats = jobMap.features.map((feature) => feature.geometry.coordinates[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    return (
      minLng === maxLng || minLat === maxLat
        ? undefined
        : ([
            [minLng, minLat],
            [maxLng, maxLat],
          ] as [[number, number], [number, number]])
    );
  }, [jobMap]);

  const linhaExportUrl = linhaSelecionadaId ? getLinhaExportUrl(linhaSelecionadaId, cenarioSelecionadoId) : undefined;
  const jobExportUrl = selectedJobId ? getInspecaoExportUrl(selectedJobId) : undefined;
  const currentJob = jobDetail.data;

  const selectedMedia = jobItems.find((item) => item.mediaId === anomaliaMediaId);

  const handleCreateAnomalia = async () => {
    if (!linhaSelecionadaId || !anomaliaMediaId) {
      toast.error("Selecione uma mídia para vincular a anomalia");
      return;
    }
    try {
      await createAnomalia.mutateAsync({
        linhaId: linhaSelecionadaId,
        tipoAnomalia: anomaliaTipo,
        mediaId: anomaliaMediaId,
        cenarioId: cenarioSelecionadoId,
        criticidade: anomaliaCriticidade,
        descricao: anomaliaDescricao,
      });
      toast.success("Anomalia registrada");
      setAnomaliaDescricao("");
      setAnomaliaModalOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Falha ao registrar anomalia");
    }
  };

  const handleConcluirAnomalia = async (anomaliaId: string) => {
    try {
      await updateAnomalia.mutateAsync({ anomaliaId, patch: { status: "concluida" } });
      toast.success("Anomalia atualizada");
    } catch (error: any) {
      toast.error(error?.message || "Falha ao atualizar anomalia");
    }
  };

  return (
    <ModuleLayout title="Inspeções e Mídia" icon={Camera}>
      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Linha selecionada</p>
              <div className="flex items-center gap-2 text-lg font-semibold">
                <MapPin className="h-4 w-4 text-primary" />
                {linhaSelecionada?.nomeLinha ?? linhaSelecionada?.codigoLinha ?? "—"}
              </div>
              {cenarioSelecionado && (
                <div className="text-sm text-muted-foreground">
                  Cenário ativo: <strong>{cenarioSelecionado.descricao}</strong>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {linhaExportUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={linhaExportUrl} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4 mr-2" /> Pacote da linha
                  </a>
                </Button>
              )}
              {jobExportUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={jobExportUrl} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4 mr-2" /> Pacote da inspeção
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.5fr,2fr]">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Jobs recentes
                {jobsQuery.isFetching && <span className="text-xs text-muted-foreground">Atualizando…</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!jobsQuery.data?.length && !jobsQuery.isLoading && (
                <p className="text-sm text-muted-foreground">Nenhum job de mídia encontrado para esta linha.</p>
              )}
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {jobsQuery.data?.map((job) => (
                  <button
                    key={job.jobId}
                    className={`w-full text-left border rounded-lg p-3 transition hover:border-primary ${
                      selectedJobId === job.jobId ? "border-primary bg-primary/5" : "border-border"
                    }`}
                    onClick={() => setSelectedJobId(job.jobId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{job.tipoInspecao}</div>
                      <Badge variant="secondary" className={statusColors[job.status] ?? ""}>
                        {job.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Criado em {formatDate(job.createdAt)} · Itens: {job.totalItens}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader>
              <CardTitle>Detalhes da inspeção</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!currentJob && <p className="text-sm text-muted-foreground">Selecione um job para ver detalhes.</p>}
              {currentJob && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="font-semibold">{currentJob.status}</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Itens</p>
                      <p className="font-semibold">{currentJob.totalItens}</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Com coordenadas</p>
                      <p className="font-semibold">{currentJob.itensComGeom}</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Concluído em</p>
                      <p className="font-semibold text-sm">{formatDate(currentJob.finishedAt)}</p>
                    </div>
                  </div>
                  <div className="border rounded-lg">
                    <div className="h-[320px]">
                      <MapLibreUnified
                        showInfrastructure={false}
                        showQueimadas={false}
                        customPoints={jobMap ?? undefined}
                        initialZoom={12}
                        fitBounds={mapBounds}
                        height="320px"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Frames / mídias</h3>
                      <span className="text-xs text-muted-foreground">{jobItems.length} itens</span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Capturado</TableHead>
                          <TableHead>Arquivo</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobItems.slice(0, 6).map((item) => (
                          <TableRow key={item.mediaId}>
                            <TableCell className="font-medium capitalize">{item.tipoMidia}</TableCell>
                            <TableCell>{formatDate(item.capturadoEm)}</TableCell>
                            <TableCell>
                              {item.filePath ? (
                                <a
                                  className="text-primary text-sm"
                                  href={getMediaFileUrl(item.filePath)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {item.filePath.split("/").pop()}
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setAnomaliaMediaId(item.mediaId);
                                  setAnomaliaModalOpen(true);
                                }}
                              >
                                Registrar anomalia
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <h3 className="font-semibold">Anomalias vinculadas</h3>
                      <span className="text-xs text-muted-foreground">{jobAnomalias.length}</span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Criticidade</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobAnomalias.map((anomalia) => (
                          <TableRow key={anomalia.anomaliaId}>
                            <TableCell className="font-medium capitalize">{anomalia.tipoAnomalia}</TableCell>
                            <TableCell>{anomalia.criticidade ?? "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{anomalia.status}</Badge>
                            </TableCell>
                            <TableCell className="max-w-xs text-sm">
                              {anomalia.descricao ?? <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              {anomalia.status !== "concluida" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleConcluirAnomalia(anomalia.anomaliaId)}
                                >
                                  Concluir
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {!jobAnomalias.length && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                              Nenhuma anomalia registrada para este job.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={anomaliaModalOpen} onOpenChange={setAnomaliaModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar anomalia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Mídia selecionada: <strong>{selectedMedia?.filePath ?? anomaliaMediaId ?? "—"}</strong>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={anomaliaTipo} onValueChange={setAnomaliaTipo}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tipoOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Criticidade</Label>
                <Select value={anomaliaCriticidade} onValueChange={setAnomaliaCriticidade}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {criticidades.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                className="mt-1"
                rows={4}
                value={anomaliaDescricao}
                onChange={(e) => setAnomaliaDescricao(e.target.value)}
                placeholder="Detalhe o problema identificado"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAnomaliaModalOpen(false)}
              disabled={createAnomalia.isPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateAnomalia} disabled={createAnomalia.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
