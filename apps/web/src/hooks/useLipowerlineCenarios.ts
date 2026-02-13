import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCenarios, type LipScenario } from "@/services/lipowerlineApi";
import { SHOULD_USE_DEMO_API } from "@/lib/demoApi";

interface Options {
  enabled?: boolean;
}

const buildFallbackCenarios = (linhaId?: string): LipScenario[] => {
  if (!linhaId) return [];
  const now = new Date();
  const fmt = (offset: number) => new Date(now.getTime() - offset).toISOString().slice(0, 10);
  return [
    {
      cenarioId: `${linhaId}-pre-demo`,
      linhaId,
      descricao: "Pré-manejo Demo",
      dataReferencia: fmt(30 * 24 * 60 * 60 * 1000),
      tipo: "pre_manejo",
      status: "ativo",
    },
    {
      cenarioId: `${linhaId}-pos-demo`,
      linhaId,
      descricao: "Pós-manejo Demo",
      dataReferencia: fmt(5 * 24 * 60 * 60 * 1000),
      tipo: "pos_manejo",
      status: "ativo",
    },
  ];
};

export const useLipowerlineCenarios = (linhaId?: string, options?: Options) => {
  const shouldQuery = Boolean(linhaId) && !SHOULD_USE_DEMO_API && (options?.enabled ?? true);

  const query = useQuery<LipScenario[]>({
    queryKey: ["lipowerline", "cenarios", linhaId],
    queryFn: () => listCenarios(linhaId!),
    enabled: shouldQuery,
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  const fallback = useMemo(() => buildFallbackCenarios(linhaId), [linhaId]);
  const shouldFallback = SHOULD_USE_DEMO_API || Boolean(query.error);

  return useMemo(
    () => ({
      data: shouldFallback ? fallback : (query.data ?? []),
      isLoading: shouldQuery ? query.isLoading : false,
      error: shouldQuery ? query.error : undefined,
      refetch: query.refetch,
      isFallback: shouldFallback,
    }),
    [fallback, query.data, query.error, query.isLoading, query.refetch, shouldFallback, shouldQuery],
  );
};
