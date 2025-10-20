import { useState } from "react";
import { SlidersHorizontal, X, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

export const FilterDrawer = ({ title, onClearAll, children }: { title: string; onClearAll?: () => void; children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn("h-10 w-10 rounded-full shadow bg-primary text-primary-foreground flex items-center justify-center")}
        aria-label={open ? "Fechar filtros" : "Abrir filtros"}
      >
        <SlidersHorizontal className="h-5 w-5" />
      </button>

      {open && (
        <div className="mt-3 w-[min(92vw,420px)] max-h-[70vh] overflow-auto rounded-xl border bg-card p-4 shadow-xl" role="dialog" aria-modal="true" aria-label="Filtro flutuante">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">{title}</h3>
            <div className="flex gap-1.5">
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
              <button className="h-8 w-8 border rounded flex items-center justify-center" onClick={() => setOpen(false)} aria-label="Fechar" title="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="space-y-3">{children}</div>
        </div>
      )}
    </div>
  );
};

export const FilterField = ({ label, onClear, children }: { label: string; onClear?: () => void; children: React.ReactNode }) => (
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

