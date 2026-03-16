import { Loader2 } from "lucide-react";

type MapLoadingIndicatorProps = {
  label?: string;
  className?: string;
};

export const MapLoadingIndicator = ({
  label = "Carregando mapa...",
  className = "",
}: MapLoadingIndicatorProps) => (
  <div
    className={`pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/88 px-3 py-2 text-xs text-foreground shadow-sm backdrop-blur ${className}`.trim()}
  >
    <Loader2 className="h-4 w-4 animate-spin text-primary" />
    <span>{label}</span>
  </div>
);

export default MapLoadingIndicator;
