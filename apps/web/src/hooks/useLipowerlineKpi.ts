import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getKpiLinha, type LipKpiResumo } from "@/services/lipowerlineApi";
import { SHOULD_USE_DEMO_API } from "@/lib/demoApi";
import { useDatasetData } from "@/context/DatasetContext";

export const useLipowerlineKpi = (linhaId?: string, cenarioId?: string) => {
  const dataset = useDatasetData((data) => ({
    eventos: data.eventos,
    linhas: data.linhas,
    extensoes: data.extensoesLinhas,
  }));

  const fallback = useMemo<LipKpiResumo | null>(() => {
    if (!linhaId || !cenarioId) return null;
    const km = dataset.extensoes?.[linhaId] ?? 0;
    const eventosLinha = dataset.eventos?.filter((evt) => evt.linha === linhaId) ?? [];
    const vegetacaoCritica = eventosLinha.filter((evt) => evt.tipo === "Vegetação" && evt.criticidade === "Alta").length;
    const cruzamentosCriticos = eventosLinha.filter((evt) => evt.tipo === "Travessias" && evt.criticidade === "Alta").length;
    const nomeLinha = dataset.linhas.find((linha) => linha.id === linhaId)?.nome ?? linhaId;
    return {
      linhaId,
      codigoLinha: linhaId,
      nomeLinha,
      cenarioId,
      cenarioDescricao: "Cenário Demo",
      tipoCenario: "pre_manejo",
      kmLinha: km,
      totalVaos: Math.max(10, Math.round((km || 50) * 1.4)),
      arvoresCriticas: vegetacaoCritica,
      cruzamentosCriticos,
      totalRiscosVegetacao: eventosLinha.length || vegetacaoCritica + cruzamentosCriticos,
    };
  }, [cenarioId, dataset.eventos, dataset.extensoes, dataset.linhas, linhaId]);

  const shouldQuery = Boolean(linhaId && cenarioId) && !SHOULD_USE_DEMO_API;

  const query = useQuery<LipKpiResumo | null>({
    queryKey: ["lipowerline", "kpi", linhaId, cenarioId],
    queryFn: () => getKpiLinha(linhaId!, cenarioId!),
    enabled: shouldQuery,
    staleTime: 60 * 1000,
  });

  const data = query.data ?? fallback;
  const isFallback = SHOULD_USE_DEMO_API || !query.data;

  return useMemo(
    () => ({
      data: data ?? null,
      isLoading: shouldQuery ? query.isLoading : false,
      error: shouldQuery ? query.error : undefined,
      refetch: query.refetch,
      isFallback,
    }),
    [data, isFallback, query.error, query.isLoading, query.refetch, shouldQuery],
  );
};
