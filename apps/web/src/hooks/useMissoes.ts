import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MissaoLista, MissaoRecord, MissaoTipo } from "@/services/missoes";
import { fetchMissoes, fetchMissaoTipos, createMissao, exportMissao } from "@/services/missoes";

export const useMissoesTipos = () =>
  useQuery<{ tipos: MissaoTipo[] }>({
    queryKey: ["missoes", "tipos"],
    queryFn: fetchMissaoTipos,
    staleTime: 60_000
  });

export const useMissoes = (options: { enabled?: boolean } = {}) =>
  useQuery<MissaoLista>({
    queryKey: ["missoes", "lista"],
    queryFn: fetchMissoes,
    staleTime: 30_000,
    enabled: options.enabled ?? true,
  });

export const useCriarMissao = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMissao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missoes"] });
    }
  });
};

export const useExportarMissao = () =>
  useMutation({
    mutationFn: ({ id, formato, email }: { id: string; formato: string; email?: string }) =>
      exportMissao(id, formato, email)
  });
