import { useMemo } from "react";
import type { Feature, FeatureCollection, Point } from "geojson";
import { Download, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  getMediaFileUrl,
  getMediaFramesArchiveUrl,
  getMediaFramesGeoJsonUrl
} from "@/services/media";

type FrameFeature = Feature<
  Point,
  {
    mediaId?: string;
    assetId?: string;
    frameSeq?: number;
    filename?: string;
    originalName?: string;
    captured_at?: string;
    timestamp_ms?: number;
    path?: string;
    intensity?: number;
    temas?: string[];
    temaPrincipal?: string;
  }
>;

type FramesPreviewProps = {
  frames?: FeatureCollection<Point, FrameFeature["properties"]>;
  mediaId?: string;
  loading?: boolean;
  className?: string;
  title?: string;
  description?: string;
};

type FrameItem = {
  id: string;
  url: string;
  fileName: string;
  sequence: number;
  capturedLabel?: string;
  lat?: number;
  lon?: number;
  temas?: string[];
};

const formatCapturedLabel = (capturedAt?: string, timestampMs?: number) => {
  try {
    if (capturedAt) {
      const date = new Date(capturedAt);
      if (!Number.isNaN(date.getTime())) {
        return new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "medium"
        }).format(date);
      }
    }
    if (typeof timestampMs === "number") {
      const seconds = Math.round(timestampMs / 1000);
      const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
      const ss = String(seconds % 60).padStart(2, "0");
      return `Frame @ ${mm}:${ss}`;
    }
  } catch {
    /* ignore formatting errors */
  }
  return undefined;
};

const buildItems = (frames?: FeatureCollection<Point, FrameFeature["properties"]>): FrameItem[] => {
  if (!frames) return [];
  return frames.features
    .map((feature, index) => {
      const props = (feature as FrameFeature).properties ?? {};
      const relPath = props.path;
      if (!relPath) return null;
      const url = getMediaFileUrl(relPath);
      const sequence = props.frameSeq ?? index + 1;
      const position = feature.geometry?.coordinates ?? [];
      return {
        id: `${props.mediaId ?? "frame"}-${sequence}`,
        url,
        fileName: props.filename ?? `frame_${String(sequence).padStart(4, "0")}.jpg`,
        sequence,
        capturedLabel: formatCapturedLabel(props.captured_at, props.timestamp_ms),
        lat: typeof position[1] === "number" ? position[1] : undefined,
        lon: typeof position[0] === "number" ? position[0] : undefined,
        temas: Array.isArray(props.temas) ? props.temas : undefined
      } as FrameItem;
    })
    .filter((item): item is FrameItem => Boolean(item));
};

export const FramesPreview = ({
  frames,
  mediaId,
  loading,
  className,
  title = "Pré-visualização de frames",
  description = "Após o processamento, visualize e baixe cada frame extraído."
}: FramesPreviewProps) => {
  const items = useMemo(() => buildItems(frames), [frames]);

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="border border-border/60 rounded-lg overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {mediaId && items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={getMediaFramesGeoJsonUrl(mediaId)} download>
              <Download className="w-4 h-4 mr-2" /> Baixar GeoJSON
            </a>
          </Button>
          <Button asChild size="sm">
            <a href={getMediaFramesArchiveUrl(mediaId)} download>
              <Download className="w-4 h-4 mr-2" /> Baixar ZIP dos frames
            </a>
          </Button>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="border border-dashed border-border/60 rounded-lg p-6 text-sm text-muted-foreground">
          Frames ainda não disponíveis. Assim que o worker concluir o processamento, eles aparecerão aqui.
        </div>
      ) : (
        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {items.map((item) => (
              <div key={item.id} className="border border-border/60 rounded-lg overflow-hidden bg-background shadow-sm">
                <div className="aspect-video bg-muted/50">
                  <img
                    src={item.url}
                    alt={item.fileName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-3 space-y-2 text-xs">
                  <div className="text-sm font-semibold">Frame {item.sequence}</div>
                  {item.capturedLabel && <div className="text-muted-foreground">{item.capturedLabel}</div>}
                  {typeof item.lat === "number" && typeof item.lon === "number" ? (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>
                        {item.lat.toFixed(5)}, {item.lon.toFixed(5)}
                      </span>
                    </div>
                  ) : null}
                  {item.temas && item.temas.length ? (
                    <div className="text-muted-foreground">{item.temas.join(", ")}</div>
                  ) : null}
                  <div className="pt-2">
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <a href={item.url} download={item.fileName} target="_blank" rel="noreferrer">
                        <Download className="w-4 h-4 mr-2" /> Baixar frame
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default FramesPreview;
