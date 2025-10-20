import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { FeatureStatus } from "@/services/status";
import { fetchStatusBulk, saveStatus } from "@/services/status";

export const useFeatureStatuses = (layer: string, ids: string[]) => {
  const sortedIds = useMemo(() => [...ids].sort(), [ids]);

  return useQuery<FeatureStatus[]>({
    queryKey: ["status", layer, sortedIds],
    queryFn: () => fetchStatusBulk(layer, sortedIds),
    enabled: sortedIds.length > 0,
    staleTime: 30_000
  });
};

export const useSaveFeatureStatus = (layer: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { id: string; status: string; notes?: string; cameraUrl?: string }) =>
      saveStatus(layer, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["status", layer], exact: false });
      queryClient.invalidateQueries({ queryKey: ["status", layer, [data.id]], exact: false });
    }
  });
};
