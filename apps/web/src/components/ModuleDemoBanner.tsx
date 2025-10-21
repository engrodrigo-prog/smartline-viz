import React from "react";
import { Lightbulb } from "lucide-react";

export default function ModuleDemoBanner({ className }: { className?: string }) {
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
      </div>
    </div>
  );
}
