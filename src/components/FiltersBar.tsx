import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFilters } from "@/context/FiltersContext";
import { linhas } from "@/lib/mockData";
import { useEffect, useState } from "react";

interface FiltersBarProps {
  onApplyFilters?: (filters: any) => void;
}

const FiltersBar = ({ onApplyFilters }: FiltersBarProps) => {
  const { filters, setFilters } = useFilters();
  const [ramais, setRamais] = useState<string[]>([]);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Região */}
          <div>
            <label className="text-sm font-medium mb-2 block">Região</label>
            <select 
              value={filters.regiao || ''} 
              onChange={(e) => setFilters({ regiao: e.target.value as any })}
              className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Todas</option>
              <option value="A">Região A</option>
              <option value="B">Região B</option>
              <option value="C">Região C</option>
            </select>
          </div>

          {/* Linha */}
          <div>
            <label className="text-sm font-medium mb-2 block">Linha</label>
            <select 
              value={filters.linha || ''} 
              onChange={(e) => setFilters({ linha: e.target.value, ramal: undefined })}
              className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Todas</option>
              {linhas.map(linha => (
                <option key={linha.id} value={linha.id}>{linha.nome}</option>
              ))}
            </select>
          </div>

          {/* Ramal */}
          <div>
            <label className="text-sm font-medium mb-2 block">Ramal</label>
            <select 
              value={filters.ramal || ''} 
              onChange={(e) => setFilters({ ramal: e.target.value })}
              disabled={!filters.linha}
              className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <option value="">Todos</option>
              {ramais.map(ramal => (
                <option key={ramal} value={ramal}>{ramal}</option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div>
            <label className="text-sm font-medium mb-2 block">Tipo</label>
            <select 
              value={filters.tipo || ''} 
              onChange={(e) => setFilters({ tipo: e.target.value as any })}
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
      </div>
    </div>
  );
};

export default FiltersBar;