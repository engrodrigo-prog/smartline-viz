import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLipowerlineLinhas } from "@/hooks/useLipowerlineLinhas";
import { useLipowerlineCenarios } from "@/hooks/useLipowerlineCenarios";
import { type LipLine, type LipScenario } from "@/services/lipowerlineApi";

interface SelectionContextValue {
  linhas: LipLine[];
  linhaSelecionadaId?: string;
  linhaSelecionada?: LipLine;
  setLinhaSelecionadaId: (linhaId: string) => void;
  cenarios: LipScenario[];
  cenarioSelecionadoId?: string;
  cenarioSelecionado?: LipScenario;
  setCenarioSelecionadoId: (cenarioId: string) => void;
  isLoading: boolean;
  isFallback: boolean;
}

const SelectionContext = createContext<SelectionContextValue | undefined>(undefined);

export const SelectionProvider = ({ children }: { children: ReactNode }) => {
  const linhasQuery = useLipowerlineLinhas();
  const [linhaSelecionadaId, setLinhaSelecionadaId] = useState<string | undefined>();

  useEffect(() => {
    if (!linhasQuery.data.length) return;
    if (!linhaSelecionadaId || !linhasQuery.data.some((linha) => linha.linhaId === linhaSelecionadaId)) {
      setLinhaSelecionadaId(linhasQuery.data[0].linhaId);
    }
  }, [linhaSelecionadaId, linhasQuery.data]);

  const cenariosQuery = useLipowerlineCenarios(linhaSelecionadaId, { enabled: Boolean(linhaSelecionadaId) });
  const [cenarioSelecionadoId, setCenarioSelecionadoId] = useState<string | undefined>();

  useEffect(() => {
    // Reset scenario when line changes
    setCenarioSelecionadoId(undefined);
  }, [linhaSelecionadaId]);

  useEffect(() => {
    if (!cenariosQuery.data.length) return;
    if (!cenarioSelecionadoId || !cenariosQuery.data.some((cenario) => cenario.cenarioId === cenarioSelecionadoId)) {
      const candidato = cenariosQuery.data.find((cenario) => cenario.status === "ativo") ?? cenariosQuery.data[0];
      setCenarioSelecionadoId(candidato.cenarioId);
    }
  }, [cenarioSelecionadoId, cenariosQuery.data]);

  const linhaSelecionada = useMemo(
    () => linhasQuery.data.find((linha) => linha.linhaId === linhaSelecionadaId),
    [linhaSelecionadaId, linhasQuery.data],
  );

  const cenarioSelecionado = useMemo(
    () => cenariosQuery.data.find((cenario) => cenario.cenarioId === cenarioSelecionadoId),
    [cenarioSelecionadoId, cenariosQuery.data],
  );

  const value: SelectionContextValue = {
    linhas: linhasQuery.data,
    linhaSelecionadaId,
    linhaSelecionada,
    setLinhaSelecionadaId,
    cenarios: cenariosQuery.data,
    cenarioSelecionadoId,
    cenarioSelecionado,
    setCenarioSelecionadoId,
    isLoading: linhasQuery.isLoading || cenariosQuery.isLoading,
    isFallback: linhasQuery.isFallback || cenariosQuery.isFallback,
  };

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
};

export const useSelectionContext = () => {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelectionContext deve ser usado dentro de SelectionProvider");
  return ctx;
};
