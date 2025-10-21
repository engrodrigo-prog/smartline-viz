import React, { useState } from "react";
import { Lightbulb, Map } from "lucide-react";
import RSStatusMap from "./RSStatusMap";
import { Link } from "react-router-dom";

export default function ModuleDemoBanner({ className }: { className?: string }) {
  const [showMap, setShowMap] = useState(false);

  return (
    <div className={`tech-card p-4 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          <div>
            <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Modo demonstração
            </div>
            <div className="text-xs text-muted-foreground">
              Protótipo com dados de exemplo. Conexões reais em desenvolvimento.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/ambiental/firms-viewer" className="text-sm underline underline-offset-2 hover:no-underline">
            Abrir Viewer FIRMS
          </Link>
          <button
            type="button"
            onClick={() => setShowMap((v) => !v)}
            className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded border border-border hover:bg-accent/40"
            title="Mostrar mapa demo RS"
          >
            <Map className="w-3.5 h-3.5" /> RS (demo)
          </button>
        </div>
      </div>
      {showMap && (
        <div className="mt-3">
          <RSStatusMap />
        </div>
      )}
    </div>
  );
}

