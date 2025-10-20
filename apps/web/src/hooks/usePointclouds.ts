import { useMutation, useQuery } from "@tanstack/react-query";
import {
  uploadPointcloud,
  indexPointcloud,
  profilePointcloud,
  fetchPointcloudIndex,
  fetchPointcloudPlan,
  fetchPointcloudProfile
} from "@/services/pointclouds";

export const useUploadPointcloud = () =>
  useMutation({
    mutationFn: ({ file, lineId }: { file: File; lineId?: string }) => uploadPointcloud(file, lineId)
  });

export const useIndexPointcloud = () =>
  useMutation({
    mutationFn: (id: string) => indexPointcloud(id)
  });

export const useProfilePointcloud = () =>
  useMutation({
    mutationFn: (payload: {
      id: string;
      line: GeoJSON.Feature<GeoJSON.LineString>;
      buffer_m?: number;
      step_m?: number;
      classes?: number[];
    }) => profilePointcloud(payload)
  });

export const usePointcloudIndex = (id?: string) =>
  useQuery({
    queryKey: ["pointcloud", "index", id],
    queryFn: () => {
      if (!id) throw new Error("id requerido");
      return fetchPointcloudIndex(id);
    },
    enabled: Boolean(id),
    staleTime: 10_000
  });

export const usePointcloudPlan = (id?: string) =>
  useQuery({
    queryKey: ["pointcloud", "plan", id],
    queryFn: () => {
      if (!id) throw new Error("id requerido");
      return fetchPointcloudPlan(id);
    },
    enabled: Boolean(id),
    staleTime: 10_000
  });

export const usePointcloudProfile = (id?: string) =>
  useQuery({
    queryKey: ["pointcloud", "profile", id],
    queryFn: () => {
      if (!id) throw new Error("id requerido");
      return fetchPointcloudProfile(id);
    },
    enabled: Boolean(id),
    staleTime: 10_000
  });
