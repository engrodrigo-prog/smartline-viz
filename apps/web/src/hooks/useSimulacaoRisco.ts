import { useMutation } from "@tanstack/react-query";
import { simulateRisco, type SimulacaoRiscoPayload, type SimulacaoRiscoResponse } from "@/services/lipowerlineApi";
import { SHOULD_USE_DEMO_API } from "@/lib/demoApi";
import { useDatasetData } from "@/context/DatasetContext";

export const useSimulacaoRisco = () => {
  const dataset = useDatasetData((data) => ({ eventos: data.eventos }));

  return useMutation<SimulacaoRiscoResponse, Error, SimulacaoRiscoPayload>({
    mutationFn: async (payload) => {
      if (SHOULD_USE_DEMO_API) {
        const relacionados = dataset.eventos.filter((evento) => evento.linha === payload.linhaId && evento.tipo === "Vegetação");
        const riscoAtual = relacionados.length * 3;
        const top = payload.topN ?? 10;
        const selecionados = relacionados.slice(0, top);
        const reducao = selecionados.length * 2;
        return {
          linhaId: payload.linhaId,
          cenarioId: payload.cenarioId,
          totalVaos: relacionados.length,
          totalVaosSelecionados: selecionados.length,
          riscoAtual,
          riscoPosTratamento: Math.max(riscoAtual - reducao, 0),
          reducaoAbsoluta: Math.min(reducao, riscoAtual),
          reducaoPercentual: riscoAtual > 0 ? (Math.min(reducao, riscoAtual) / riscoAtual) * 100 : 0,
          selecionados: selecionados.map((item) => ({ vaoId: item.id, codigoVao: item.ramal, riscoEstimado: 2 })),
        } satisfies SimulacaoRiscoResponse;
      }
      return simulateRisco(payload);
    },
  });
};
