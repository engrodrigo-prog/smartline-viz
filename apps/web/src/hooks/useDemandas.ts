import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DemandasFilters, DemandasResponse, Demanda, DemandasAnalytics } from "@/services/demandas";
import {
  fetchDemandas,
  createDemanda,
  updateDemanda,
  deleteDemanda,
  fetchDemandasAnalytics
} from "@/services/demandas";

export const useDemandas = (filters: DemandasFilters) =>
  useQuery<DemandasResponse>({
    queryKey: ["demandas", filters],
    queryFn: () => fetchDemandas(filters),
    keepPreviousData: true,
    staleTime: 30_000
  });

export const useDemandaMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<Demanda> & { id?: string }) => {
      if (payload.id) {
        return updateDemanda(payload.id, payload);
      }
      return createDemanda(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demandas"] });
      queryClient.invalidateQueries({ queryKey: ["demandas_analytics"] });
    }
  });
};

export const useDeleteDemanda = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDemanda(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demandas"] });
      queryClient.invalidateQueries({ queryKey: ["demandas_analytics"] });
    }
  });
};

export const useDemandasAnalytics = (options: { enabled?: boolean } = {}) =>
  useQuery<DemandasAnalytics>({
    queryKey: ["demandas_analytics"],
    queryFn: fetchDemandasAnalytics,
    staleTime: 60_000,
    enabled: options.enabled ?? true,
  });
