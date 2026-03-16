import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { FolderTree, Loader2, PackageOpen, PaintBucket, Radar, Database, Globe, Image, Shapes } from "lucide-react";
import { parseQgisProject, type QgisLayerIngestionTarget, type QgisProjectSummary } from "@/lib/qgisProject";

const sourceTone: Record<QgisLayerIngestionTarget, string> = {
  postgres_live: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  vector_import: "bg-sky-500/10 text-sky-300 border-sky-500/30",
  raster_import: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  external_service: "bg-violet-500/10 text-violet-300 border-violet-500/30",
  manual_review: "bg-muted text-muted-foreground border-border",
};

const ingestionIcon = (target: QgisLayerIngestionTarget) => {
  if (target === "postgres_live") return <Database className="h-4 w-4" />;
  if (target === "vector_import") return <Shapes className="h-4 w-4" />;
  if (target === "raster_import") return <Image className="h-4 w-4" />;
  if (target === "external_service") return <Globe className="h-4 w-4" />;
  return <Radar className="h-4 w-4" />;
};

const normalizeStem = (fileName: string) =>
  fileName
    .toLowerCase()
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/\.(gpkg|geojson|json|zip|shp|dbf|shx|prj|kml|kmz|tif|tiff|vrt)$/i, "") ?? fileName.toLowerCase();

export default function QgisProjectIntake() {
  const [projectSummary, setProjectSummary] = useState<QgisProjectSummary | null>(null);
  const [projectFileName, setProjectFileName] = useState<string | null>(null);
  const [supportFiles, setSupportFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const referencedFilesWithStatus = useMemo(() => {
    if (!projectSummary) return [];

    const available = new Set(supportFiles.map((file) => normalizeStem(file.name)));
    return projectSummary.referencedFiles.map((item) => {
      const stem = normalizeStem(item.name);
      return {
        ...item,
        matched: available.has(stem),
      };
    });
  }, [projectSummary, supportFiles]);

  const handleProjectFile = async (file: File | null) => {
    if (!file) return;

    setLoading(true);
    try {
      const summary = await parseQgisProject(file);
      setProjectSummary(summary);
      setProjectFileName(file.name);
      toast.success("Projeto QGIS lido com sucesso.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao interpretar projeto QGIS.";
      toast.error(message);
      setProjectSummary(null);
      setProjectFileName(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderTree className="h-5 w-5" />
          Intake de Projeto QGIS
        </CardTitle>
        <CardDescription>
          Envie um projeto <span className="font-medium text-foreground">.qgs</span> ou <span className="font-medium text-foreground">.qgz</span> para revisar ordem das camadas, simbologia básica e o alvo de ingestão esperado para cada fonte.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
            <div>
              <div className="text-sm font-medium">Projeto QGIS</div>
              <div className="mt-1 text-xs text-muted-foreground">
                O parser lê a árvore de camadas do projeto e monta um plano de ingestão coerente com o Smartline.
              </div>
            </div>
            <Input
              type="file"
              accept=".qgs,.qgz,application/xml,application/octet-stream"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                void handleProjectFile(file);
                event.target.value = "";
              }}
              disabled={loading}
            />
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Interpretando projeto...
              </div>
            )}
            {projectSummary && (
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <div className="text-sm font-semibold">{projectSummary.projectName}</div>
                <div className="mt-1 text-xs text-muted-foreground">{projectFileName}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary">{projectSummary.layerCount} camadas</Badge>
                  <Badge variant="outline">{projectSummary.referencedFiles.length} fontes referenciadas</Badge>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
            <div>
              <div className="text-sm font-medium">Arquivos de apoio</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Opcionalmente envie GPKG, SHP ZIP, GeoJSON e GeoTIFF para comparar o que o projeto referencia com o que já está separado para ingestão.
              </div>
            </div>
            <Input
              type="file"
              multiple
              accept=".gpkg,.zip,.shp,.dbf,.shx,.prj,.geojson,.json,.kml,.kmz,.tif,.tiff,.vrt"
              onChange={(event) => {
                setSupportFiles(Array.from(event.target.files ?? []));
              }}
            />
            <div className="space-y-2">
              {supportFiles.length === 0 ? (
                <div className="text-xs text-muted-foreground">Nenhum arquivo de apoio anexado.</div>
              ) : (
                supportFiles.map((file) => (
                  <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm">
                    <span className="truncate">{file.name}</span>
                    <Badge variant="outline">{(file.size / 1024 / 1024).toFixed(1)} MB</Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {projectSummary && (
          <>
            <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
              <div className="rounded-xl border border-border/70 bg-background/70">
                <div className="border-b border-border/70 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <PackageOpen className="h-4 w-4" />
                    Ordem das Camadas e Simbologia
                  </div>
                </div>
                <ScrollArea className="h-[420px]">
                  <div className="divide-y divide-border/60">
                    {projectSummary.layers.map((layer) => (
                      <div key={layer.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[56px_1fr_220px]">
                        <div className="text-xs font-semibold text-muted-foreground">
                          #{layer.order}
                          <div className="mt-1 text-[11px]">{layer.visible ? "visível" : "oculta"}</div>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{layer.name}</span>
                            <Badge variant="outline">{layer.geometryType}</Badge>
                            <Badge variant="outline">{layer.provider || "unknown"}</Badge>
                          </div>
                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            {layer.groupPath.length ? `${layer.groupPath.join(" / ")} -> ` : ""}
                            {layer.source || "fonte não identificada"}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-0.5">
                              <PaintBucket className="h-3 w-3" />
                              {layer.rendererType}
                            </span>
                            {(layer.fillColor || layer.strokeColor) && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-0.5">
                                <span
                                  className="h-3 w-3 rounded-full border border-white/60"
                                  style={{ background: layer.fillColor ?? layer.strokeColor ?? "#94a3b8" }}
                                />
                                {layer.strokeColor ? (
                                  <span
                                    className="h-[2px] w-4 rounded-full"
                                    style={{ background: layer.strokeColor }}
                                  />
                                ) : null}
                                simbologia
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start justify-start lg:justify-end">
                          <Badge variant="outline" className={sourceTone[layer.ingestionTarget]}>
                            <span className="mr-1">{ingestionIcon(layer.ingestionTarget)}</span>
                            {layer.ingestionLabel}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="rounded-xl border border-border/70 bg-background/70">
                <div className="border-b border-border/70 px-4 py-3">
                  <div className="text-sm font-medium">Conferência de Fontes</div>
                </div>
                <div className="space-y-2 p-4">
                  {referencedFilesWithStatus.map((item) => (
                    <div key={item.name} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.kind} • {item.ingestionTarget}
                      </div>
                      <div className="mt-2">
                        <Badge variant="outline" className={item.matched ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/30 text-amber-300"}>
                          {item.matched ? "arquivo de apoio encontrado" : "arquivo ainda não anexado"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
              Próxima etapa: ligar este manifesto a um empacotador de ingestão para enviar vetores ao fluxo
              <code className="mx-1">geodata-uploads</code> / PostGIS e rasters ao fluxo
              <code className="mx-1">process-raster</code>, preservando a ordem operacional do projeto.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
