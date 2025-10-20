import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFilters } from "@/context/FiltersContext";
import { EMPRESAS, REGIOES_POR_EMPRESA, LINHAS_POR_REGIAO } from "@/lib/empresasRegioes";
import { Input } from "@/components/ui/input";
import { Pin, PinOff, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingFiltersBarProps {
  onApplyFilters?: (filters: any) => void;
  alwaysVisible?: boolean;
}

const FloatingFiltersBar = ({ onApplyFilters, alwaysVisible = false }: FloatingFiltersBarProps) => {
  const { filters, setFilters, resetFilters } = useFilters();
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('filters_pinned');
    return saved === 'true';
  });
  const [isHovered, setIsHovered] = useState(false);
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [availableLines, setAvailableLines] = useState<string[]>([]);

  const isVisible = alwaysVisible || isPinned || isHovered;

  useEffect(() => {
    if (filters.empresa) {
      setAvailableRegions(REGIOES_POR_EMPRESA[filters.empresa] || []);
      setAvailableLines([]);
    } else {
      setAvailableRegions([]);
      setAvailableLines([]);
    }
  }, [filters.empresa]);

  useEffect(() => {
    if (filters.regiao) {
      setAvailableLines(LINHAS_POR_REGIAO[filters.regiao] || []);
    } else {
      setAvailableLines([]);
    }
  }, [filters.regiao]);

  const handlePinToggle = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    localStorage.setItem('filters_pinned', String(newPinned));
  };

  const handleApply = () => {
    onApplyFilters?.(filters);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => !alwaysVisible && setIsHovered(true)}
      onMouseLeave={() => !alwaysVisible && setIsHovered(false)}
    >
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="tech-card p-4 shadow-lg backdrop-blur-sm bg-card/95"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Filtros</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="h-8"
                >
                  Limpar tudo
                </Button>
                {!alwaysVisible && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePinToggle}
                    className="h-8 w-8"
                  >
                    {isPinned ? (
                      <Pin className="h-4 w-4 text-primary" />
                    ) : (
                      <PinOff className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Empresa</label>
                <select
                  value={filters.empresa || ''}
                  onChange={e => setFilters({ empresa: e.target.value as any || undefined })}
                  className="w-full h-9 px-3 rounded-md bg-background border border-input text-sm"
                >
                  <option value="">Todas</option>
                  {EMPRESAS.map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Região</label>
                <select
                  value={filters.regiao || ''}
                  onChange={e => setFilters({ regiao: e.target.value || undefined })}
                  disabled={!filters.empresa}
                  className="w-full h-9 px-3 rounded-md bg-background border border-input text-sm disabled:opacity-50"
                >
                  <option value="">Todas</option>
                  {availableRegions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Linha</label>
                <select
                  value={filters.linha || ''}
                  onChange={e => setFilters({ linha: e.target.value || undefined })}
                  disabled={!filters.regiao}
                  className="w-full h-9 px-3 rounded-md bg-background border border-input text-sm disabled:opacity-50"
                >
                  <option value="">Todas</option>
                  {availableLines.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data Início</label>
                <Input
                  type="date"
                  value={filters.dataInicio || ''}
                  onChange={e => setFilters({ dataInicio: e.target.value || undefined })}
                  className="h-9"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data Fim</label>
                <Input
                  type="date"
                  value={filters.dataFim || ''}
                  onChange={e => setFilters({ dataFim: e.target.value || undefined })}
                  className="h-9"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar..."
                    value={filters.search || ''}
                    onChange={e => setFilters({ search: e.target.value || undefined })}
                    className="h-9 pl-9"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!alwaysVisible && !isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-2 bg-primary/20 rounded-b-full cursor-pointer"
          onMouseEnter={() => setIsHovered(true)}
        />
      )}
    </div>
  );
};

export default FloatingFiltersBar;
