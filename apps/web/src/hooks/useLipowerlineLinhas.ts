import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listLinhas, type LipLine } from "@/services/lipowerlineApi";
import { SHOULD_USE_DEMO_API } from "@/lib/demoApi";
import { useDatasetData } from "@/context/DatasetContext";

export const useLipowerlineLinhas = () => {
  const fallback = useDatasetData((data) =>
    data.linhas.map<LipLine>((linha) => ({
      linhaId: linha.id,
      codigo: linha.id,
      nome: linha.nome,
      tensaoKV: null,
      concessionaria: null,
      regiao: null,
    })),
  );

  const query = useQuery<LipLine[]>({
    queryKey: ["lipowerline", "linhas"],
    queryFn: listLinhas,
    staleTime: 5 * 60 * 1000,
    enabled: !SHOULD_USE_DEMO_API,
  });

  const data = query.data ?? fallback;
  const isFallback = SHOULD_USE_DEMO_API || !query.data;

  return useMemo(
    () => ({
      data,
      isLoading: SHOULD_USE_DEMO_API ? false : query.isLoading,
      error: SHOULD_USE_DEMO_API ? undefined : query.error,
      refetch: query.refetch,
      isFallback,
    }),
    [data, isFallback, query.error, query.isLoading, query.refetch],
  );
};
