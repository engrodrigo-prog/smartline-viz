import type { ReactNode } from "react";
import { Eraser } from "lucide-react";

export const FilterDrawer = ({ title, onClearAll, children }: { title: string; onClearAll?: () => void; children: ReactNode }) => (
  <section
    className="fixed bottom-4 right-4 z-50 w-[min(92vw,420px)] max-h-[70vh] overflow-auto rounded-xl border bg-card p-4 shadow-xl"
    aria-label="Filtros"
    role="region"
  >
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {onClearAll && (
        <button
          className="text-xs px-2 py-1 border rounded hover:bg-accent flex items-center gap-1"
          onClick={onClearAll}
          aria-label="Limpar todos os filtros"
          title="Limpar tudo"
        >
          <Eraser className="h-3.5 w-3.5" /> Limpar tudo
        </button>
      )}
    </div>
    <div className="space-y-3">{children}</div>
  </section>
);

export const FilterField = ({ label, onClear, children }: { label: string; onClear?: () => void; children: ReactNode }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <label className="text-xs text-muted-foreground">{label}</label>
      {onClear && (
        <button onClick={onClear} className="text-[11px] underline-offset-2 hover:underline" aria-label={`Limpar ${label}`} title="Limpar este filtro">
          limpar
        </button>
      )}
    </div>
    {children}
  </div>
);
