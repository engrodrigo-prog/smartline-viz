import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Empresa = 'CPFL Piratininga' | 'CPFL Santa Cruz' | 'ENEL' | 
                     'CPFL Transmissão' | 'ARGO' | 'CPFL RGE' | 
                     'CEMIG' | 'EQUATORIAL';
type Tipo = 'Vegetação' | 'Travessias' | 'Estruturas' | 'Emendas' | 'Compliance' | 'Sensores' | 'Drones' | 'Eventos';
type Order = 'Nome' | 'Data' | 'Criticidade' | 'Status';

export type FiltersState = {
  empresa?: Empresa;
  regiao?: string;
  linha?: string;
  ramal?: string;
  tensaoKv?: string;
  tipoMaterial?: string;
  dataInicio?: string;
  dataFim?: string;
  tipo?: Tipo;
  orderBy?: Order;
  search?: string;
};

type FiltersContextType = {
  filters: FiltersState;
  setFilters: (f: Partial<FiltersState>) => void;
  resetFilters: () => void;
  clearField: (k: keyof FiltersState) => void;
};

const FiltersContext = createContext<FiltersContextType>(null!);

export const FiltersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, _setFilters] = useState<FiltersState>(() => {
    const saved = localStorage.getItem('smartline_filters');
    return saved ? JSON.parse(saved) : {};
  });

  const setFilters = (f: Partial<FiltersState>) => {
    const next = { ...filters, ...f };
    _setFilters(next);
    localStorage.setItem('smartline_filters', JSON.stringify(next));
  };

  const resetFilters = () => {
    _setFilters({});
    localStorage.setItem('smartline_filters', JSON.stringify({}));
  };

  const clearField = (k: keyof FiltersState) => {
    const next = { ...filters } as any;
    delete next[k];
    _setFilters(next);
    localStorage.setItem('smartline_filters', JSON.stringify(next));
  };

  return (
    <FiltersContext.Provider value={{ filters, setFilters, resetFilters, clearField }}>
      {children}
    </FiltersContext.Provider>
  );
};

export const useFilters = () => useContext(FiltersContext);
