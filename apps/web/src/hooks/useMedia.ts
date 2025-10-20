import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchMediaFrames, fetchMediaRecord, searchMedia, uploadMedia } from "@/services/media";

export const useMediaRecord = (id?: string) =>
  useQuery({
    queryKey: ["media", id],
    queryFn: () => {
      if (!id) throw new Error("id requerido");
      return fetchMediaRecord(id);
    },
    enabled: Boolean(id),
    staleTime: 10_000
  });

export const useMediaFrames = (id?: string) =>
  useQuery({
    queryKey: ["media_frames", id],
    queryFn: () => {
      if (!id) throw new Error("id requerido");
      return fetchMediaFrames(id);
    },
    enabled: Boolean(id),
    staleTime: 30_000,
    retry: 3
  });

export const useMediaSearch = (params: {
  tema?: string;
  periodoInicio?: string;
  periodoFim?: string;
  lineId?: string;
  missionId?: string;
}, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: ["media_search", params],
    queryFn: () => searchMedia(params),
    keepPreviousData: true,
    enabled: options.enabled ?? true,
  });

export const useMediaUpload = () =>
  useMutation({
    mutationFn: uploadMedia
  });
