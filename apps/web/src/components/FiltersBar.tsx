import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFilters } from "@/context/FiltersContext";
import { linhas } from "@/lib/mockData";
import { useEffect, useState } from "react";
import { EMPRESAS, REGIOES_POR_EMPRESA, LINHAS_POR_REGIAO, TIPOS_MATERIAL, NIVEIS_TENSAO } from "@/lib/empresasRegioes";

interface FiltersBarProps {
  onApplyFilters?: (filters: any) => void;
  children?: React.ReactNode;
}

const FiltersBar = ({ onApplyFilters, children }: FiltersBarProps) => {
  const { filters, setFilters } = useFilters();
  const [ramais, setRamais] = useState<string[]>([]);
  const [availableRegioes, setAvailableRegioes] = useState<string[]>([]);
  const [availableLinhas, setAvailableLinhas] = useState<string[]>([]);

  // Update regiões when empresa changes
  useEffect(() => {
    if (filters.empresa) {
      setAvailableRegioes(REGIOES_POR_EMPRESA[filters.empresa] || []);
      if (!REGIOES_POR_EMPRESA[filters.empresa]?.includes(filters.regiao || '')) {
        setFilters({ ...filters, regiao: undefined, linha: undefined });
      }
    } else {
      setAvailableRegioes([]);
    }
  }, [filters.empresa]);

  // Update linhas when região changes
  useEffect(() => {
    if (filters.regiao) {
      setAvailableLinhas(LINHAS_POR_REGIAO[filters.regiao] || []);
      if (!LINHAS_POR_REGIAO[filters.regiao]?.includes(filters.linha || '')) {
        setFilters({ ...filters, linha: undefined });
      }
    } else {
      setAvailableLinhas([]);
    }
  }, [filters.regiao]);

  // Update ramais when linha changes
  useEffect(() => {
    if (filters.linha) {
      const linha = linhas.find(l => l.id === filters.linha);
      setRamais(linha?.ramais || []);
    } else {
      setRamais([]);
    }
  }, [filters.linha]);

  const handleApply = () => {
    onApplyFilters?.(filters);
  };

  return (
    <div className="tech-card p-6 mb-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Empresa */}
          <div>
            <label className="text-sm font-medium mb-2 block">Empresa</label>
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
            <label className="text-sm font-medium mb-2 block">Região</label>
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
            <label className="text-sm font-medium mb-2 block">Linha</label>
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
            <label className="text-sm font-medium mb-2 block">Material</label>
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
            <label className="text-sm font-medium mb-2 block">Tensão</label>
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
            <label className="text-sm font-medium mb-2 block">Tipo</label>
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
            <label className="text-sm font-medium mb-2 block">Data Início</label>
            <Input 
              type="date" 
              value={filters.dataInicio || ''}
              onChange={(e) => setFilters({ dataInicio: e.target.value })}
              className="bg-input border-border" 
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Data Fim</label>
            <Input 
              type="date" 
              value={filters.dataFim || ''}
              onChange={(e) => setFilters({ dataFim: e.target.value })}
              className="bg-input border-border" 
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Ordenar por</label>
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
            <label className="text-sm font-medium mb-2 block">Busca</label>
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
    </div>
  );
};

export default FiltersBar;