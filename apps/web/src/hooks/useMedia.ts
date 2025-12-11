import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMediaFrames, fetchMediaRecord, searchMedia, uploadMedia } from "@/services/media";
import {
  listMediaJobs,
  getMediaJob,
  listMediaItems,
  listAnomalias,
  createAnomalia,
  updateAnomalia,
  type JobListParams,
  type ItemsListParams,
  type AnomaliaListParams,
} from "@/services/mediaJobsApi";

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

export const useMediaJobs = (params: JobListParams = {}, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: ["media_jobs", params],
    queryFn: () => listMediaJobs(params),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });

export const useMediaJob = (jobId?: string, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: ["media_job", jobId],
    queryFn: () => {
      if (!jobId) throw new Error("jobId requerido");
      return getMediaJob(jobId);
    },
    enabled: Boolean(jobId) && (options.enabled ?? true),
    staleTime: 15_000,
  });

export const useMediaItems = (params: ItemsListParams, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: ["media_items", params],
    queryFn: () => listMediaItems(params),
    enabled: (options.enabled ?? true) && Boolean(params?.jobId || params?.linhaId),
    keepPreviousData: true,
  });

export const useMediaAnomalias = (params: AnomaliaListParams, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: ["anomalias", params],
    queryFn: () => listAnomalias(params),
    enabled: options.enabled ?? true,
    staleTime: 10_000,
  });

export const useCreateAnomalia = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAnomalia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anomalias"] });
      queryClient.invalidateQueries({ queryKey: ["media_items"] });
    },
  });
};

export const useUpdateAnomalia = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ anomaliaId, patch }: { anomaliaId: string; patch: Partial<{ status: string; criticidade: string; descricao: string; origem: string }> }) =>
      updateAnomalia(anomaliaId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anomalias"] });
    },
  });
};
