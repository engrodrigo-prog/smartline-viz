import { useMemo, useRef, useState } from "react";
import {
  Aperture,
  Images,
  Layers,
  Map,
  Play,
  RefreshCw,
  Target,
  Upload,
  Video
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { FileTypeGrid } from "@/components/upload/FileTypeGrid";
import { AdditionalFieldsForm } from "@/components/upload/AdditionalFieldsForm";
import { UploadQueueManager, type UploadJob } from "@/components/upload/UploadQueueManager";
import { getFileTypesByCategory, type FileType } from "@/lib/uploadConfig";
import { supabase } from "@/integrations/supabase/client";
import { useMediaUpload, useMediaRecord, useMediaFrames } from "@/hooks/useMedia";
import {
  useUploadPointcloud,
  useIndexPointcloud,
  useProfilePointcloud,
  usePointcloudIndex
} from "@/hooks/usePointclouds";
import { MapLibreUnified } from "@/components/MapLibreUnified";
import { FramesPreview } from "@/components/upload/FramesPreview";
import type { MediaTema } from "@/services/media";
import { DEMANDA_TEMAS } from "@/services/demandas";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type SelectedFiles = {
  fotos: File[];
  videos: File[];
  srt: File[];
};

const emptyFiles: SelectedFiles = { fotos: [], videos: [], srt: [] };

const temas: MediaTema[] = DEMANDA_TEMAS as MediaTema[];

const UploadUnificado = () => {
  const [files, setFiles] = useState<SelectedFiles>(emptyFiles);
  const [missionId, setMissionId] = useState("");
  const [lineId, setLineId] = useState("");
  const [temaPrincipal, setTemaPrincipal] = useState<MediaTema>("Inspeção de Ativos");
  const [temasExtras, setTemasExtras] = useState<MediaTema[]>(["Inspeção de Ativos"]);
  const [frameInterval, setFrameInterval] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [lastMediaId, setLastMediaId] = useState<string | null>(null);

  const [pointcloudFile, setPointcloudFile] = useState<File | null>(null);
  const [pointcloudId, setPointcloudId] = useState<string | null>(null);
  const [pointcloudLine, setPointcloudLine] = useState("");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<FileType | null>(null);
  const [selectedTypologyFile, setSelectedTypologyFile] = useState<File | null>(null);
  const [additionalData, setAdditionalData] = useState<Record<string, any>>({});
  const [uploadQueue, setUploadQueue] = useState<UploadJob[]>([]);
  const [processingQueue, setProcessingQueue] = useState(false);

  const filePickerRef = useRef<HTMLInputElement | null>(null);

  // TODO API Hono: sincronizar status/progresso do endpoint /upload/media/processed para refletir ingestão final.
  const mediaMutation = useMediaUpload();
  const mediaRecordQuery = useMediaRecord(lastMediaId ?? undefined);
  const mediaFramesQuery = useMediaFrames(lastMediaId ?? undefined);

  const pointUploadMutation = useUploadPointcloud();
  const pointIndexMutation = useIndexPointcloud();
  const pointProfileMutation = useProfilePointcloud();
  const pointIndexQuery = usePointcloudIndex(pointcloudId ?? undefined);

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    if (!selected.length) return;
    const next: SelectedFiles = { fotos: [], videos: [], srt: [] };
    selected.forEach((file) => {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".srt")) next.srt.push(file);
      else if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".m4v")) next.videos.push(file);
      else next.fotos.push(file);
    });
    setFiles((prev) => ({
      fotos: [...prev.fotos, ...next.fotos],
      videos: [...prev.videos, ...next.videos],
      srt: [...prev.srt, ...next.srt]
    }));
    event.target.value = "";
  };

  const resetMediaForm = () => {
    setFiles(emptyFiles);
    setMissionId("");
    setLineId("");
    setTemasExtras([]);
    setUploading(false);
  };

  const enviarMidias = async () => {
    if (files.fotos.length + files.videos.length + files.srt.length === 0) {
      toast.error("Selecione arquivos de mídia.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      [...files.fotos, ...files.videos, ...files.srt].forEach((file) => {
        formData.append("files", file);
      });
      formData.append("temaPrincipal", temaPrincipal);
      temasExtras.forEach((tema) => formData.append("temas", tema));
      if (missionId) formData.append("missionId", missionId);
      if (lineId) formData.append("lineId", lineId);
      formData.append("frame_interval_s", String(frameInterval));

      const response = await mediaMutation.mutateAsync(formData);
      toast.success(`Lote ${response.id} registrado. Processamento iniciado.`);
      setLastMediaId(response.id);
      resetMediaForm();
    } catch (error: any) {
      toast.error(error?.message ?? "Falha no upload de mídias.");
    } finally {
      setUploading(false);
    }
  };

  const handlePointcloudUpload = async () => {
    if (!pointcloudFile) {
      toast.error("Selecione um arquivo LAS/LAZ.");
      return;
    }
    try {
      const result = await pointUploadMutation.mutateAsync({ file: pointcloudFile, lineId: pointcloudLine || undefined });
      toast.success("Nuvem enviada. Dispare a indexação quando desejar.");
      setPointcloudId(result.id);
      setPointcloudFile(null);
    } catch (error: any) {
      toast.error(error?.message ?? "Falha ao enviar nuvem.");
    }
  };

  const iniciarIndex = async () => {
    if (!pointcloudId) return;
    try {
      await pointIndexMutation.mutateAsync(pointcloudId);
      toast.success("Indexação disparada.");
    } catch (error: any) {
      toast.error(error?.message ?? "Falha ao indexar nuvem.");
    }
  };

  const iniciarPerfil = async () => {
    if (!pointcloudId) return;
    if (!pointIndexQuery.data) {
      toast.error("Aguarde a indexação antes de gerar perfil.");
      return;
    }
    const firstFeature = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [pointIndexQuery.data.bbox_wgs84?.min[1] ?? 0, pointIndexQuery.data.bbox_wgs84?.min[0] ?? 0],
          [pointIndexQuery.data.bbox_wgs84?.max[1] ?? 0, pointIndexQuery.data.bbox_wgs84?.max[0] ?? 0]
        ]
      },
      properties: {}
    } as GeoJSON.Feature<GeoJSON.LineString>;

    try {
      await pointProfileMutation.mutateAsync({
        id: pointcloudId,
        line: firstFeature,
        buffer_m: 25,
        step_m: 0.5
      });
      toast.success("Job de perfil disparado.");
    } catch (error: any) {
      toast.error(error?.message ?? "Falha ao gerar perfil.");
    }
  };

  const totalArquivos = files.fotos.length + files.videos.length + files.srt.length;

  const totals = useMemo(
    () => ({
      fotos: files.fotos.length,
      videos: files.videos.length,
      srt: files.srt.length
    }),
    [files]
  );

  const handleFileTypeSelect = (fileType: FileType) => {
    const defaults: Record<string, any> = { ...(fileType.metadata ?? {}) };
    if (fileType.requiredFields?.includes("integration_target")) {
      defaults.integration_target =
        fileType.defaultIntegrationTarget ??
        fileType.integrationTargets?.[0]?.value ??
        "smartline";
    }
    if (fileType.requiredFields?.includes("line_code")) {
      defaults.line_code = "";
    }
    setSelectedType(fileType);
    setSelectedTypologyFile(null);
    setAdditionalData(defaults);
    setSheetOpen(true);
  };

  const handleTypologyFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedType) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!selectedType.acceptedFormats.includes(ext)) {
      toast.error(`Formato inválido. Suportado: ${selectedType.acceptedFormats.join(", ")}`);
      return;
    }
    setSelectedTypologyFile(file);
  };

  const handleAdditionalDataChange = (field: string, value: any) => {
    setAdditionalData((prev) => ({ ...prev, [field]: value }));
  };

  const addTypologyToQueue = () => {
    if (!selectedType || !selectedTypologyFile) {
      toast.error("Selecione um arquivo para continuar.");
      return;
    }

    const required = selectedType.requiredFields ?? [];
    for (const field of required) {
      if (
        additionalData[field] === undefined ||
        additionalData[field] === "" ||
        additionalData[field] === null
      ) {
        toast.error(`Campo obrigatório: ${field}`);
        return;
      }
    }

    const job: UploadJob = {
      id: crypto.randomUUID(),
      file: selectedTypologyFile,
      fileType: selectedType,
      additionalData: { ...additionalData, ...(selectedType.metadata ?? {}) },
      status: "pending"
    };

    setUploadQueue((prev) => [...prev, job]);
    setSelectedTypologyFile(null);
    setSheetOpen(false);
    toast.success("Item adicionado à fila de upload.");
  };

  const removeJob = (id: string) => {
    setUploadQueue((prev) => prev.filter((job) => job.id !== id));
  };

  const updateJobStatus = (
    id: string,
    status: UploadJob["status"],
    extras?: Partial<UploadJob>
  ) => {
    setUploadQueue((prev) =>
      prev.map((job) => (job.id === id ? { ...job, status, ...extras } : job))
    );
  };

  const processQueue = async () => {
    if (!uploadQueue.length) {
      toast.error("Nenhum item na fila.");
      return;
    }

    if (!supabase) {
      toast.error("Configure o Supabase (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY) para processar tipologias.");
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      toast.error("Faça login para enviar arquivos.");
      return;
    }

    setProcessingQueue(true);

    for (const job of uploadQueue) {
      if (job.status !== "pending" && job.status !== "error") continue;

      try {
        updateJobStatus(job.id, "uploading");
        const storageKey = `${auth.user.id}/${Date.now()}_${job.id}_${job.file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("geodata-uploads")
          .upload(storageKey, job.file);
        if (uploadError) throw uploadError;

        updateJobStatus(job.id, "processing");

        const payload = {
          file_path: storageKey,
          ...job.additionalData
        };

        const { data, error: functionError } = await supabase.functions.invoke(
          job.fileType.edgeFunction,
          { body: payload }
        );
        if (functionError) throw functionError;

        updateJobStatus(job.id, "success", {
          result: data?.message ?? "Processado com sucesso"
        });
      } catch (error: any) {
        console.error("Upload typologia error:", error);
        updateJobStatus(job.id, "error", {
          error: error?.message ?? "Erro no processamento"
        });
        toast.error(`Erro ao processar ${job.file.name}: ${error?.message ?? "Falha"}`);
      }
    }

    setProcessingQueue(false);
  };

  return (
    <AppLayout
      title="Upload Unificado"
      subtitle="Ingestão centralizada de tipologias SmartLine, mídias de missão e nuvens de pontos."
    >
      <Tabs defaultValue="tipologias" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full lg:w-auto">
          <TabsTrigger value="tipologias" className="flex items-center gap-2">
            <Map className="w-4 h-4" /> Tipologias SmartLine
          </TabsTrigger>
          <TabsTrigger value="midias" className="flex items-center gap-2">
            <Images className="w-4 h-4" /> Mídias de Missão
          </TabsTrigger>
          <TabsTrigger value="pointcloud" className="flex items-center gap-2">
            <Layers className="w-4 h-4" /> Nuvem de Pontos (LAS/LAZ)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tipologias" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
            <div className="space-y-8">
              <Card className="border border-border/60 bg-muted/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Aperture className="w-5 h-5 text-primary" />
                    Catálogo SmartLine™
                  </CardTitle>
                  <CardDescription>
                    Selecione o tipo de dado geoespacial. Preencha os campos obrigatórios e adicione à fila para
                    processar via Supabase Functions.
                  </CardDescription>
                </CardHeader>
              </Card>

              {["linha", "estrutura", "analise", "perigo", "outros"].map((category) => (
                <FileTypeGrid
                  key={category}
                  category={category}
                  fileTypes={getFileTypesByCategory(category)}
                  onSelect={handleFileTypeSelect}
                />
              ))}
            </div>

            <div className="space-y-4">
              <Card className="border border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle>Fila de Upload</CardTitle>
                  <CardDescription>
                    Envie os arquivos selecionados após revisar campos obrigatórios. Utilize uma conta autenticada
                    (Supabase) para registrar os dados.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <UploadQueueManager queue={uploadQueue} onRemove={removeJob} />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setUploadQueue([])}
                      disabled={!uploadQueue.length || processingQueue}
                    >
                      Limpar fila
                    </Button>
                    <Button onClick={processQueue} disabled={!uploadQueue.length || processingQueue}>
                      <RefreshCw
                        className={cn("w-4 h-4 mr-2", processingQueue ? "animate-spin" : "")}
                      />
                      Processar fila
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>
                  {selectedType ? `Upload • ${selectedType.label}` : "Upload"}
                </SheetTitle>
                <SheetDescription>
                  Escolha o arquivo e preencha as informações solicitadas para iniciar o processamento.
                </SheetDescription>
              </SheetHeader>

              {selectedType && (
                <div className="mt-6 space-y-6">
                  <div className="p-3 border border-dashed border-primary/40 rounded-lg bg-primary/5">
                    <p className="text-sm font-medium">
                      Formatos aceitos: {selectedType.acceptedFormats.join(", ")}
                    </p>
                    {selectedType.subtitle && (
                      <p className="text-xs text-muted-foreground mt-1">{selectedType.subtitle}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Arquivo</Label>
                    <input
                      ref={filePickerRef}
                      type="file"
                      className="hidden"
                      onChange={handleTypologyFileChange}
                    />
                    <Button
                      variant="outline"
                      onClick={() => filePickerRef.current?.click()}
                      className="w-full justify-start"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {selectedTypologyFile ? selectedTypologyFile.name : "Selecionar arquivo"}
                    </Button>
                  </div>

                  <AdditionalFieldsForm
                    fileType={selectedType}
                    values={additionalData}
                    onChange={handleAdditionalDataChange}
                  />
                </div>
              )}

              <SheetFooter className="mt-6">
                <Button
                  onClick={addTypologyToQueue}
                  disabled={!selectedType || !selectedTypologyFile}
                >
                  Adicionar à fila
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </TabsContent>

        <TabsContent value="midias" className="space-y-6">
          <Card className="border border-border/70">
            <CardHeader>
              <CardTitle>Selecionar arquivos</CardTitle>
              <CardDescription>
                Arraste fotos (.jpg/.jpeg/.tif), vídeos (.mp4/.mov) e trilhas SRT. Os frames serão extraídos pelo worker em
                background e catalogados por tema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label
                htmlFor="upload-files"
                className="border border-dashed border-primary/60 rounded-lg py-10 flex flex-col items-center justify-center cursor-pointer text-primary hover:bg-primary/5 transition"
              >
                <Upload className="w-8 h-8 mb-2" />
                <span className="font-medium">Clique ou arraste arquivos</span>
                <span className="text-xs text-muted-foreground mt-1">
                  Aceito: .jpg, .jpeg, .tif, .mp4, .mov, .srt
                </span>
                <input
                  id="upload-files"
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.tif,.tiff,.png,.mp4,.mov,.m4v,.srt"
                  className="hidden"
                  onChange={handleFilesChange}
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ResumoCard icon={Images} label="Fotos" value={totals.fotos} />
                <ResumoCard icon={Video} label="Vídeos" value={totals.videos} />
                <ResumoCard icon={Target} label="SRT" value={totals.srt} />
              </div>

              {totalArquivos > 0 ? (
                <ScrollArea className="max-h-48 border border-border/60 rounded-md">
                  <div className="divide-y divide-border/60">
                    {[...files.fotos, ...files.videos, ...files.srt].map((file) => (
                      <div key={file.name + file.size} className="px-4 py-2 flex justify-between text-sm">
                        <span>{file.name}</span>
                        <span className="text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ID da Missão (opcional)</Label>
                  <Input value={missionId} onChange={(event) => setMissionId(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>ID da Linha/Ativo</Label>
                  <Input value={lineId} onChange={(event) => setLineId(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tema principal</Label>
                  <select
                    value={temaPrincipal}
                    onChange={(event) => setTemaPrincipal(event.target.value as MediaTema)}
                    className="border border-border/60 rounded-md px-3 py-2 text-sm bg-background"
                  >
                    {temas.map((tema) => (
                      <option key={tema} value={tema}>
                        {tema}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Outros temas</Label>
                  <Textarea
                    rows={2}
                    placeholder="Separe por vírgula (ex.: Ocorrências, Inspeção de Segurança)"
                    value={temasExtras.join(", ")}
                    onChange={(event) =>
                      setTemasExtras(
                        event.target.value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean) as MediaTema[]
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Intervalo de frames (segundos)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={frameInterval}
                    onChange={(event) => setFrameInterval(Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetMediaForm}>
                  Limpar seleção
                </Button>
                <Button onClick={enviarMidias} disabled={uploading || totalArquivos === 0}>
                  <Upload className={cn("w-4 h-4 mr-2", uploading && "animate-spin")} />
                  Enviar para processamento
                </Button>
              </div>
            </CardContent>
          </Card>

          {lastMediaId && mediaRecordQuery.data ? (
            <Card className="border border-border/70">
              <CardHeader>
                <CardTitle>Processamento recente</CardTitle>
                <CardDescription>
                  Lote <Badge variant="outline">{mediaRecordQuery.data.id}</Badge> · Status{" "}
                  <Badge variant="secondary">{mediaRecordQuery.data.status}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Tema principal</div>
                  <div className="font-semibold">{mediaRecordQuery.data.temaPrincipal}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Total de itens</div>
                  <div className="font-semibold">{mediaRecordQuery.data.assets.length}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Frames gerados</div>
                  <div className="font-semibold">
                    {mediaRecordQuery.data.framesResumo?.quantidade ?? "Processando"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {lastMediaId ? (
            <Card className="border border-border/70">
              <CardHeader>
                <CardTitle>Visualização no mapa</CardTitle>
                <CardDescription>
                  Os pontos são carregados automaticamente quando o worker concluir o processamento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[60vh] border border-border rounded overflow-hidden">
                  <MapLibreUnified
                    showInfrastructure
                    initialZoom={6}
                    customPoints={mediaFramesQuery.data ?? undefined}
                  />
                </div>
              </CardContent>
            </Card>
          ) : null}

          {lastMediaId ? (
            <Card className="border border-border/70">
              <CardHeader>
                <CardTitle>Pré-visualização & downloads</CardTitle>
                <CardDescription>
                  Visualize os frames extraídos e faça download individual ou em lote.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FramesPreview
                  frames={mediaFramesQuery.data ?? undefined}
                  mediaId={lastMediaId ?? undefined}
                  loading={mediaFramesQuery.isLoading}
                />
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="pointcloud" className="space-y-6">
          <Card className="border border-border/70">
            <CardHeader>
              <CardTitle>Nuvem de Pontos</CardTitle>
              <CardDescription>
                Faça upload de arquivos LAS/LAZ sem compressão. Após o envio, dispare a indexação e geração de planta/perfil.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Arquivo LAS/LAZ</Label>
                <Input
                  type="file"
                  accept=".las,.laz"
                  onChange={(event) => setPointcloudFile(event.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-2">
                <Label>ID da linha (opcional)</Label>
                <Input value={pointcloudLine} onChange={(event) => setPointcloudLine(event.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPointcloudFile(null)}>
                  Limpar
                </Button>
                <Button onClick={handlePointcloudUpload} disabled={pointUploadMutation.isPending}>
                  <Upload className={cn("w-4 h-4 mr-2", pointUploadMutation.isPending && "animate-spin")} />
                  Enviar nuvem
                </Button>
              </div>
            </CardContent>
          </Card>

          {pointcloudId ? (
            <Card className="border border-border/70">
              <CardHeader>
                <CardTitle>Processamento da nuvem {pointcloudId}</CardTitle>
                <CardDescription>
                  Utilize os botões abaixo para gerar produtos. O worker Python amostra a nuvem e salva resultados em
                  <code className="font-mono text-xs ml-1">/products</code>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={iniciarIndex} disabled={pointIndexMutation.isPending}>
                    <RefreshCw className={cn("w-4 h-4 mr-2", pointIndexMutation.isPending && "animate-spin")} />
                    Indexar nuvem
                  </Button>
                  <Button variant="outline" onClick={iniciarPerfil} disabled={pointProfileMutation.isPending}>
                    <Play className={cn("w-4 h-4 mr-2", pointProfileMutation.isPending && "animate-spin")} />
                    Gerar planta/perfil
                  </Button>
                </div>
                {pointIndexQuery.data ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase">Total de pontos</div>
                      <div className="font-semibold">{pointIndexQuery.data.pointsTotal.toLocaleString("pt-BR")}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase">Classes</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Object.entries(pointIndexQuery.data.classes).map(([classe, total]) => (
                          <Badge key={classe} variant="outline">
                            {classe}: {total}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase">Sistema de coordenadas</div>
                      <div className="font-mono text-xs break-words">
                        {pointIndexQuery.data.coordinate_system ?? "Não informado"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Aguarde a indexação para visualizar classes e limites geográficos.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

const ResumoCard = ({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) => (
  <div className="rounded-lg border border-border/60 px-4 py-5 flex items-center justify-between">
    <div>
      <div className="text-xs uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
    <Icon className="w-6 h-6 text-primary" />
  </div>
);

export default UploadUnificado;
