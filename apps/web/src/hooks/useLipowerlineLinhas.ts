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

  const shouldQuery = !SHOULD_USE_DEMO_API;

  const query = useQuery<LipLine[]>({
    queryKey: ["lipowerline", "linhas"],
    queryFn: listLinhas,
    staleTime: 5 * 60 * 1000,
    enabled: shouldQuery,
    retry: false,
  });

  return useMemo(
    () => ({
      data: SHOULD_USE_DEMO_API ? fallback : query.error ? fallback : (query.data ?? []),
      isLoading: shouldQuery ? query.isLoading : false,
      error: shouldQuery ? query.error : undefined,
      refetch: query.refetch,
      isFallback: SHOULD_USE_DEMO_API || Boolean(query.error),
    }),
    [fallback, query.data, query.error, query.isLoading, query.refetch, shouldQuery],
  );
};
