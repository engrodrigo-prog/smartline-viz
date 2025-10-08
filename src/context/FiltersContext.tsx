import React, { createContext, useContext, useState, ReactNode } from 'react';

type Regiao = 'A' | 'B' | 'C';
type Tipo = 'Vegetação' | 'Travessias' | 'Estruturas' | 'Emendas' | 'Compliance' | 'Sensores' | 'Drones' | 'Eventos';
type Order = 'Nome' | 'Data' | 'Criticidade' | 'Status';

export type FiltersState = {
  regiao?: Regiao;
  linha?: string;
  ramal?: string;
  dataInicio?: string;
  dataFim?: string;
  tipo?: Tipo;
  orderBy?: Order;
  search?: string;
};

type FiltersContextType = {
  filters: FiltersState;
  setFilters: (f: Partial<FiltersState>) => void;
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

  return (
    <FiltersContext.Provider value={{ filters, setFilters }}>
      {children}
    </FiltersContext.Provider>
  );
};

export const useFilters = () => useContext(FiltersContext);
