import { Search, Pin, PinOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFilters } from "@/context/FiltersContext";
import { useEffect, useState } from "react";
import { EMPRESAS, REGIOES_POR_EMPRESA, LINHAS_POR_REGIAO, TIPOS_MATERIAL, NIVEIS_TENSAO } from "@/lib/empresasRegioes";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useDatasetData } from "@/context/DatasetContext";

interface FiltersBarProps {
  onApplyFilters?: (filters: any) => void;
  children?: React.ReactNode;
  floating?: boolean;
}

const FiltersBar = ({ onApplyFilters, children, floating = true }: FiltersBarProps) => {
  const { filters, setFilters, resetFilters, clearField } = useFilters();
  const linhasDataset = useDatasetData((data) => data.linhas);
  const [ramais, setRamais] = useState<string[]>([]);
  const [availableRegioes, setAvailableRegioes] = useState<string[]>([]);
  const [availableLinhas, setAvailableLinhas] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("filters_bar_pinned") === "true";
  });
  const [isHovered, setIsHovered] = useState(false);

  const { empresa, regiao, linha } = filters;

  // Update regiões when empresa changes
  useEffect(() => {
    if (empresa) {
      setAvailableRegioes(REGIOES_POR_EMPRESA[empresa] || []);
      if (!REGIOES_POR_EMPRESA[empresa]?.includes(regiao || "")) {
        setFilters((prev) => ({ ...prev, regiao: undefined, linha: undefined }));
      }
    } else {
      setAvailableRegioes([]);
    }
  }, [empresa, regiao, setFilters]);

  // Update linhas when região changes
  useEffect(() => {
    if (regiao) {
      setAvailableLinhas(LINHAS_POR_REGIAO[regiao] || []);
      if (!LINHAS_POR_REGIAO[regiao]?.includes(linha || "")) {
        setFilters((prev) => ({ ...prev, linha: undefined }));
      }
    } else {
      setAvailableLinhas([]);
    }
  }, [linha, regiao, setFilters]);

  // Update ramais when linha changes
  useEffect(() => {
    if (filters.linha) {
      const linha = linhasDataset.find((l) => l.id === filters.linha);
      setRamais(linha?.ramais || []);
    } else {
      setRamais([]);
    }
  }, [filters.linha, linhasDataset]);

  const handleApply = () => {
    onApplyFilters?.(filters);
  };

  const visible = !floating || isPinned || isHovered;

  const content = (
    <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Empresa */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Empresa</label>
              {filters.empresa && (
                <button className="text-[11px] underline-offset-2 hover:underline" onClick={() => clearField('empresa')}>limpar</button>
              )}
            </div>
            <select 
              value={filters.empresa || ''} 
              onChange={(e) => setFilters({ ...filters, empresa: e.target.value as any, regiao: undefined, linha: undefined })}
              className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Todas</option>
              {EMPRESAS.map(emp => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
          </div>

          {/* Região */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Região</label>
              {filters.regiao && (
                <button className="text-[11px] underline-offset-2 hover:underline" onClick={() => clearField('regiao')}>limpar</button>
              )}
            </div>
            <select 
              value={filters.regiao || ''} 
              onChange={(e) => setFilters({ ...filters, regiao: e.target.value, linha: undefined })}
              disabled={!filters.empresa}
              className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <option value="">Todas</option>
              {availableRegioes.map(reg => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>
          </div>

          {/* Linha */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Linha</label>
              {filters.linha && (
                <button className="text-[11px] underline-offset-2 hover:underline" onClick={() => clearField('linha')}>limpar</button>
              )}
            </div>
            <select 
              value={filters.linha || ''} 
              onChange={(e) => setFilters({ ...filters, linha: e.target.value })}
              disabled={!filters.regiao}
              className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <option value="">Todas</option>
              {availableLinhas.map(linha => (
                <option key={linha} value={linha}>{linha}</option>
              ))}
            </select>
          </div>

          {/* Material */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Material</label>
              {filters.tipoMaterial && (
                <button className="text-[11px] underline-offset-2 hover:underline" onClick={() => clearField('tipoMaterial')}>limpar</button>
              )}
            </div>
            <select 
              value={filters.tipoMaterial || ''} 
              onChange={(e) => setFilters({ ...filters, tipoMaterial: e.target.value })}
              className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Todos</option>
              {TIPOS_MATERIAL.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>

          {/* Tensão */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Tensão</label>
              {filters.tensaoKv && (
                <button className="text-[11px] underline-offset-2 hover:underline" onClick={() => clearField('tensaoKv')}>limpar</button>
              )}
            </div>
            <select 
              value={filters.tensaoKv || ''} 
              onChange={(e) => setFilters({ ...filters, tensaoKv: e.target.value })}
              className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Todas</option>
              {NIVEIS_TENSAO.map(tensao => (
                <option key={tensao} value={tensao}>{tensao}</option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Tipo</label>
              {filters.tipo && (
                <button className="text-[11px] underline-offset-2 hover:underline" onClick={() => clearField('tipo')}>limpar</button>
              )}
            </div>
            <select 
              value={filters.tipo || ''} 
              onChange={(e) => setFilters({ ...filters, tipo: e.target.value as any })}
              className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Todos</option>
              <option value="Vegetação">Vegetação</option>
              <option value="Travessias">Travessias</option>
              <option value="Estruturas">Estruturas</option>
              <option value="Emendas">Emendas</option>
              <option value="Compliance">Compliance</option>
              <option value="Sensores">Sensores</option>
              <option value="Drones">Drones</option>
              <option value="Eventos">Eventos</option>
            </select>
          </div>
        </div>

        {/* Data Range and Search */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Data Início</label>
              {filters.dataInicio && (
                <button className="text-[11px] underline-offset-2 hover:underline" onClick={() => clearField('dataInicio')}>limpar</button>
              )}
            </div>
            <Input 
              type="date" 
              value={filters.dataInicio || ''}
              onChange={(e) => setFilters({ dataInicio: e.target.value })}
              className="bg-input border-border" 
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Data Fim</label>
              {filters.dataFim && (
                <button className="text-[11px] underline-offset-2 hover:underline" onClick={() => clearField('dataFim')}>limpar</button>
              )}
            </div>
            <Input 
              type="date" 
              value={filters.dataFim || ''}
              onChange={(e) => setFilters({ dataFim: e.target.value })}
              className="bg-input border-border" 
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Ordenar por</label>
              {filters.orderBy && (
                <button className="text-[11px] underline-offset-2 hover:underline" onClick={() => clearField('orderBy')}>limpar</button>
              )}
            </div>
            <select 
              value={filters.orderBy || ''} 
              onChange={(e) => setFilters({ orderBy: e.target.value as any })}
              className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="Nome">Nome</option>
              <option value="Data">Data</option>
              <option value="Criticidade">Criticidade</option>
              <option value="Status">Status</option>
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Busca</label>
              {filters.search && (
                <button className="text-[11px] underline-offset-2 hover:underline" onClick={() => clearField('search')}>limpar</button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                type="text" 
                value={filters.search || ''}
                onChange={(e) => setFilters({ search: e.target.value })}
                placeholder="Buscar..." 
                className="bg-input border-border pl-10" 
              />
            </div>
          </div>
        </div>
        
        {children}
      </div>
  );

  if (!floating) {
    return <div className="tech-card p-6 mb-6">{content}</div>;
  }

  return (
    <div
      className="relative mb-6"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            className="tech-card p-6 shadow-xl backdrop-blur-sm bg-card/95 border border-border/70"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Filtros</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8" onClick={resetFilters}>
                  Limpar tudo
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const state = !isPinned;
                    setIsPinned(state);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("filters_bar_pinned", String(state));
                    }
                  }}
                >
                  {isPinned ? <Pin className="h-4 w-4 text-primary" /> : <PinOff className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {content}
          </motion.div>
        )}
      </AnimatePresence>

      {!visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-0 left-1/2 -translate-x-1/2 h-2 w-32 rounded-b-full bg-primary/30"
        />
      )}
    </div>
  );
};

export default FiltersBar;
