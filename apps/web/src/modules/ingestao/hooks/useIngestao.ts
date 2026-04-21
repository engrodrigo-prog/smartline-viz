import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ingestaoApi, type Survey, type UploadParams } from '../api/ingestaoApi';

export const useIngestaoSurveys = (params?: {
  limit?: number;
  offset?: number;
  line_name?: string;
  report_type?: string;
}) =>
  useQuery({
    queryKey: ['ingestao', 'surveys', params],
    queryFn: () => ingestaoApi.listSurveys(params),
    staleTime: 15_000,
    refetchInterval: (query) => {
      const items = (query.state.data as { items: Survey[] } | undefined)?.items ?? [];
      return items.some((s) => s.status === 'processing') ? 5_000 : false;
    },
  });

export const useIngestaoSurvey = (id: string | null) =>
  useQuery({
    queryKey: ['ingestao', 'survey', id],
    queryFn: () => ingestaoApi.getSurvey(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });

export const useIngestaoThresholds = () =>
  useQuery({
    queryKey: ['ingestao', 'thresholds'],
    queryFn: () => ingestaoApi.listThresholds(),
    staleTime: 60_000,
  });

export const useIngestaoUpload = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: UploadParams) => ingestaoApi.upload(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ingestao', 'surveys'] });
    },
  });
};
