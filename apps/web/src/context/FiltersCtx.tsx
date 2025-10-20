import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

type FiltersApi = {
  state: Record<string, any>;
  get: (k: string) => any;
  set: (k: string, v: any) => void;
  resetField: (k: string) => void;
  resetAll: () => void;
} | null;

const Ctx = createContext<FiltersApi>(null);

export const FiltersProviderV2 = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const storageKey = `__filters:${location.pathname}`;
  const [state, setState] = useState<Record<string, any>>(() => {
    try { return JSON.parse(sessionStorage.getItem(storageKey) || "{}"); }
    catch { return {}; }
  });

  useEffect(() => { sessionStorage.setItem(storageKey, JSON.stringify(state)); }, [storageKey, state]);
  useEffect(() => { queryClient.invalidateQueries(); }, [state, queryClient]);

  const api = useMemo(() => ({
    state,
    get: (k: string) => state[k],
    set: (k: string, v: any) => setState((s) => ({ ...s, [k]: v })),
    resetField: (k: string) => setState((s) => { const n = { ...s }; delete n[k]; return n; }),
    resetAll: () => setState({}),
  }), [state]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};

export const useFiltersV2 = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFiltersV2 deve estar dentro de FiltersProviderV2");
  return ctx;
};

