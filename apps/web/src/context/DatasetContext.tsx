import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { defaultDataset, type Dataset, type DatasetPartial } from "@/data/defaultDataset";

const STORAGE_KEY = "smartline_dataset_v1";
const STORAGE_META_KEY = "smartline_dataset_meta_v1";

type LoadOptions = {
  replace?: boolean;
};

export interface DatasetContextValue {
  dataset: Dataset;
  loadDataset: (data: DatasetPartial, options?: LoadOptions) => void;
  importDatasetFile: (file: File, options?: LoadOptions) => Promise<void>;
  exportDataset: () => void;
  resetDataset: () => void;
  lastUpdated?: string;
}

const DatasetContext = createContext<DatasetContextValue | undefined>(undefined);

const hasStructuredClone = typeof globalThis !== "undefined" && typeof (globalThis as any).structuredClone === "function";

const cloneDataset = (data: Dataset): Dataset => {
  if (hasStructuredClone) {
    return (globalThis as any).structuredClone(data) as Dataset;
  }
  return JSON.parse(JSON.stringify(data));
};

const mergeDataset = (base: Dataset, patch: DatasetPartial): Dataset => {
  const next: Dataset = { ...base };
  (Object.keys(patch) as Array<keyof Dataset>).forEach((key) => {
    const value = patch[key];
    if (value !== undefined) {
      (next as any)[key] = value;
    }
  });
  return next;
};

const safeParse = (value: string | null) => {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn("[dataset] Falha ao interpretar dataset salvo.", error);
    return undefined;
  }
};

export const DatasetProvider = ({ children }: { children: ReactNode }) => {
  const [dataset, setDataset] = useState<Dataset>(() => {
    if (typeof window === "undefined") {
      return cloneDataset(defaultDataset);
    }
    const stored = safeParse(window.localStorage?.getItem(STORAGE_KEY) ?? null);
    if (stored && typeof stored === "object") {
      return mergeDataset(cloneDataset(defaultDataset), stored as DatasetPartial);
    }
    return cloneDataset(defaultDataset);
  });

  const [lastUpdated, setLastUpdated] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    return window.localStorage?.getItem(STORAGE_META_KEY) ?? undefined;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset));
    } catch (error) {
      console.warn("[dataset] Não foi possível persistir o dataset.", error);
    }
  }, [dataset]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (lastUpdated) {
      window.localStorage.setItem(STORAGE_META_KEY, lastUpdated);
    } else {
      window.localStorage.removeItem(STORAGE_META_KEY);
    }
  }, [lastUpdated]);

  const loadDataset = (data: DatasetPartial, options?: LoadOptions) => {
    setDataset((prev) => {
      const base = options?.replace ? cloneDataset(defaultDataset) : prev;
      return mergeDataset(base, data);
    });
    setLastUpdated(new Date().toISOString());
  };

  const importDatasetFile = async (file: File, options?: LoadOptions) => {
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new Error("Arquivo inválido. Forneça um JSON com o dataset.");
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("Dataset deve ser um objeto JSON válido.");
    }

    loadDataset(parsed as DatasetPartial, options);
  };

  const exportDataset = () => {
    const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `smartline-dataset-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetDataset = () => {
    setDataset(cloneDataset(defaultDataset));
    setLastUpdated(undefined);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(STORAGE_META_KEY);
    }
  };

  const value: DatasetContextValue = {
    dataset,
    loadDataset,
    importDatasetFile,
    exportDataset,
    resetDataset,
    lastUpdated,
  };

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
};

export const useDatasetContext = () => {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error("useDatasetContext deve ser usado dentro de DatasetProvider");
  }
  return context;
};

export const useDataset = () => useDatasetContext().dataset;

export const useDatasetData = <T,>(selector: (dataset: Dataset) => T): T => {
  const { dataset } = useDatasetContext();
  return selector(dataset);
};
