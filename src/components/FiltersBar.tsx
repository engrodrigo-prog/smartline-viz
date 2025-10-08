import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FiltersBarProps {
  onApplyFilters?: (filters: any) => void;
}

const FiltersBar = ({ onApplyFilters }: FiltersBarProps) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const filters = Object.fromEntries(formData.entries());
    onApplyFilters?.(filters);
  };

  return (
    <div className="tech-card p-6 mb-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Região */}
          <div>
            <label className="text-sm font-medium mb-2 block">Região</label>
            <select name="regiao" className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">Todas</option>
              <option value="A">Região A</option>
              <option value="B">Região B</option>
              <option value="C">Região C</option>
            </select>
          </div>

          {/* Linha */}
          <div>
            <label className="text-sm font-medium mb-2 block">Linha</label>
            <select name="linha" className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">Todas</option>
              <option value="LT-001">LT-001 - Linha 1 SP Norte</option>
              <option value="LT-002">LT-002 - Linha 2 SP Sul</option>
              <option value="LT-003">LT-003 - Linha 3 RJ</option>
            </select>
          </div>

          {/* Tipo */}
          <div>
            <label className="text-sm font-medium mb-2 block">Tipo</label>
            <select name="tipo" className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">Todos</option>
              <option value="vegetacao">Vegetação</option>
              <option value="travessias">Travessias</option>
              <option value="estruturas">Estruturas</option>
              <option value="emendas">Emendas</option>
              <option value="compliance">Compliance</option>
              <option value="sensores">Sensores</option>
              <option value="drones">Drones</option>
              <option value="eventos">Eventos</option>
            </select>
          </div>

          {/* Ordenar */}
          <div>
            <label className="text-sm font-medium mb-2 block">Ordenar por</label>
            <select name="ordenar" className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="nome">Nome</option>
              <option value="data">Data</option>
              <option value="criticidade">Criticidade</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>

        {/* Data Range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Data Início</label>
            <Input type="date" name="dataInicio" className="bg-input border-border" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Data Fim</label>
            <Input type="date" name="dataFim" className="bg-input border-border" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Busca</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                type="text" 
                name="busca" 
                placeholder="Buscar..." 
                className="bg-input border-border pl-10" 
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" className="btn-primary">
            Aplicar Filtros
          </Button>
        </div>
      </form>
    </div>
  );
};

export default FiltersBar;