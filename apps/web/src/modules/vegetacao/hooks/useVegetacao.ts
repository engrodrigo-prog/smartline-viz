import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { vegApi } from "@/modules/vegetacao/api/vegetacaoApi";
import type {
  VegAnomaly,
  VegAnomalyStatus,
  VegDashboardResponse,
  VegSeverity,
  VegInspection,
  VegWorkOrder,
  VegAction,
  VegAudit,
  VegScheduleEvent,
  VegRisk,
  VegDocument,
  VegEvidence,
} from "@/modules/vegetacao/api/vegetacaoApi";
import {
  isOnline,
  listOfflineAnomalias,
  listOfflineEvidencias,
  listOfflineExecucoes,
  listOfflineInspecoes,
  queueCreateAnomalia,
  queueCreateExecucao,
  queueCreateInspecao,
  updateOfflineAnomalia,
  updateOfflineExecucao,
  updateOfflineInspecao,
} from "@/modules/vegetacao/offline/vegOffline";

export const useVegDashboard = () =>
  useQuery<VegDashboardResponse>({
    queryKey: ["veg", "dashboard"],
    queryFn: vegApi.dashboard,
    staleTime: 30_000,
  });

export const useVegAnomalias = (filters: { limit?: number; status?: VegAnomalyStatus; severity?: VegSeverity; q?: string } = {}) =>
  useQuery<{ items: VegAnomaly[] }>({
    queryKey: ["veg", "anomalias", filters],
    queryFn: async () => {
      const offlineItems = await listOfflineAnomalias().catch(() => []);
      const applyFilters = (items: VegAnomaly[]) => {
        let out = items;
        if (filters.status) out = out.filter((i) => i.status === filters.status);
        if (filters.severity) out = out.filter((i) => i.severity === filters.severity);
        if (filters.q) {
          const q = filters.q.toLowerCase();
          out = out.filter((i) => i.title.toLowerCase().includes(q) || (i.description ?? "").toLowerCase().includes(q));
        }
        const limit = filters.limit ?? 50;
        return out.slice(0, limit);
      };

      if (!isOnline()) return { items: applyFilters(offlineItems) };

      const remote = await vegApi.listAnomalias(filters);
      const byId = new Map<string, VegAnomaly>();
      for (const i of remote.items ?? []) byId.set(i.id, i);
      for (const i of offlineItems) byId.set(i.id, i);
      return { items: applyFilters(Array.from(byId.values())) };
    },
    keepPreviousData: true,
    staleTime: 10_000,
  });

export const useVegAnomaliaMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id?: string } & Parameters<typeof vegApi.createAnomalia>[0]) => {
      if (!isOnline()) {
        if (payload.id) {
          const { id, ...rest } = payload;
          return updateOfflineAnomalia(id, rest as any);
        }
        return queueCreateAnomalia(payload);
      }
      if (payload.id) {
        const { id, ...rest } = payload;
        return vegApi.updateAnomalia(id, rest);
      }
      return vegApi.createAnomalia(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veg", "anomalias"] });
      qc.invalidateQueries({ queryKey: ["veg", "dashboard"] });
    },
  });
};

export const useVegDeleteAnomalia = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vegApi.deleteAnomalia(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veg", "anomalias"] });
      qc.invalidateQueries({ queryKey: ["veg", "dashboard"] });
    },
  });
};

export const useVegInspecoes = (params: { limit?: number } = {}) =>
  useQuery<{ items: VegInspection[] }>({
    queryKey: ["veg", "inspecoes", params],
    queryFn: async () => {
      const offlineItems = await listOfflineInspecoes().catch(() => []);
      const limit = params.limit ?? 50;
      if (!isOnline()) return { items: offlineItems.slice(0, limit) };
      const remote = await vegApi.listInspecoes(params);
      const byId = new Map<string, VegInspection>();
      for (const i of remote.items ?? []) byId.set(i.id, i);
      for (const i of offlineItems) byId.set(i.id, i);
      return { items: Array.from(byId.values()).slice(0, limit) };
    },
    keepPreviousData: true,
    staleTime: 10_000,
  });

export const useVegInspecaoMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id?: string } & Parameters<typeof vegApi.createInspecao>[0]) => {
      if (!isOnline()) {
        if (payload.id) {
          const { id, ...rest } = payload;
          return updateOfflineInspecao(id, rest as any);
        }
        return queueCreateInspecao(payload);
      }
      if (payload.id) {
        const { id, ...rest } = payload;
        return vegApi.updateInspecao(id, rest);
      }
      return vegApi.createInspecao(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veg", "inspecoes"] });
      qc.invalidateQueries({ queryKey: ["veg", "dashboard"] });
    },
  });
};

export const useVegDeleteInspecao = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vegApi.deleteInspecao(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veg", "inspecoes"] });
      qc.invalidateQueries({ queryKey: ["veg", "dashboard"] });
    },
  });
};

export const useVegOs = (params: { limit?: number } = {}) =>
  useQuery<{ items: VegWorkOrder[] }>({
    queryKey: ["veg", "os", params],
    queryFn: () => vegApi.listOs(params),
    keepPreviousData: true,
    staleTime: 10_000,
  });

export const useVegOsMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id?: string } & Parameters<typeof vegApi.createOs>[0]) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        return vegApi.updateOs(id, rest);
      }
      return vegApi.createOs(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veg", "os"] });
      qc.invalidateQueries({ queryKey: ["veg", "dashboard"] });
    },
  });
};

export const useVegDeleteOs = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vegApi.deleteOs(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veg", "os"] });
      qc.invalidateQueries({ queryKey: ["veg", "dashboard"] });
    },
  });
};

export const useVegExecucoes = (params: { limit?: number } = {}) =>
  useQuery<{ items: VegAction[] }>({
    queryKey: ["veg", "execucoes", params],
    queryFn: async () => {
      const offlineItems = await listOfflineExecucoes().catch(() => []);
      const limit = params.limit ?? 50;
      if (!isOnline()) return { items: offlineItems.slice(0, limit) };
      const remote = await vegApi.listExecucoes(params);
      const byId = new Map<string, VegAction>();
      for (const i of remote.items ?? []) byId.set(i.id, i);
      for (const i of offlineItems) byId.set(i.id, i);
      return { items: Array.from(byId.values()).slice(0, limit) };
    },
    keepPreviousData: true,
    staleTime: 10_000,
  });

export const useVegExecucaoMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id?: string } & Parameters<typeof vegApi.createExecucao>[0]) => {
      if (!isOnline()) {
        if (payload.id) {
          const { id, ...rest } = payload;
          return updateOfflineExecucao(id, rest as any);
        }
        return queueCreateExecucao(payload);
      }
      if (payload.id) {
        const { id, ...rest } = payload;
        return vegApi.updateExecucao(id, rest);
      }
      return vegApi.createExecucao(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veg", "execucoes"] });
      qc.invalidateQueries({ queryKey: ["veg", "dashboard"] });
    },
  });
};

export const useVegDeleteExecucao = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vegApi.deleteExecucao(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veg", "execucoes"] });
      qc.invalidateQueries({ queryKey: ["veg", "dashboard"] });
    },
  });
};

export const useVegAuditorias = (params: { limit?: number } = {}) =>
  useQuery<{ items: VegAudit[] }>({
    queryKey: ["veg", "auditorias", params],
    queryFn: () => vegApi.listAuditorias(params),
    keepPreviousData: true,
    staleTime: 10_000,
  });

export const useVegAuditoriaMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id?: string } & Parameters<typeof vegApi.createAuditoria>[0]) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        return vegApi.updateAuditoria(id, rest);
      }
      return vegApi.createAuditoria(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veg", "auditorias"] });
      qc.invalidateQueries({ queryKey: ["veg", "dashboard"] });
    },
  });
};

export const useVegDeleteAuditoria = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vegApi.deleteAuditoria(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veg", "auditorias"] });
      qc.invalidateQueries({ queryKey: ["veg", "dashboard"] });
    },
  });
};

export const useVegAgenda = (params: { limit?: number } = {}) =>
  useQuery<{ items: VegScheduleEvent[] }>({
    queryKey: ["veg", "agenda", params],
    queryFn: () => vegApi.listAgenda(params),
    keepPreviousData: true,
    staleTime: 10_000,
  });

export const useVegAgendaMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id?: string } & Parameters<typeof vegApi.createAgenda>[0]) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        return vegApi.updateAgenda(id, rest);
      }
      return vegApi.createAgenda(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veg", "agenda"] });
      qc.invalidateQueries({ queryKey: ["veg", "dashboard"] });
    },
  });
};

export const useVegDeleteAgenda = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vegApi.deleteAgenda(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veg", "agenda"] });
      qc.invalidateQueries({ queryKey: ["veg", "dashboard"] });
    },
  });
};

export const useVegRiscos = (params: { limit?: number } = {}) =>
  useQuery<{ items: VegRisk[] }>({
    queryKey: ["veg", "riscos", params],
    queryFn: () => vegApi.listRiscos(params),
    keepPreviousData: true,
    staleTime: 10_000,
  });

export const useVegRiscoMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id?: string } & Parameters<typeof vegApi.createRisco>[0]) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        return vegApi.updateRisco(id, rest);
      }
      return vegApi.createRisco(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veg", "riscos"] });
      qc.invalidateQueries({ queryKey: ["veg", "dashboard"] });
    },
  });
};

export const useVegDeleteRisco = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vegApi.deleteRisco(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veg", "riscos"] });
      qc.invalidateQueries({ queryKey: ["veg", "dashboard"] });
    },
  });
};

export const useVegDocumentos = (params: { limit?: number } = {}) =>
  useQuery<{ items: VegDocument[] }>({
    queryKey: ["veg", "documentos", params],
    queryFn: () => vegApi.listDocumentos(params),
    keepPreviousData: true,
    staleTime: 10_000,
  });

export const useVegDocumentoMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id?: string } & Parameters<typeof vegApi.createDocumento>[0]) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        return vegApi.updateDocumento(id, rest);
      }
      return vegApi.createDocumento(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veg", "documentos"] });
      qc.invalidateQueries({ queryKey: ["veg", "dashboard"] });
    },
  });
};

export const useVegDeleteDocumento = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vegApi.deleteDocumento(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veg", "documentos"] });
      qc.invalidateQueries({ queryKey: ["veg", "dashboard"] });
    },
  });
};

export const useVegEvidencias = (params: {
  limit?: number;
  linked_anomaly_id?: string;
  linked_inspection_id?: string;
  linked_work_order_id?: string;
  linked_action_id?: string;
} = {}) =>
  useQuery<{ items: VegEvidence[] }>({
    queryKey: ["veg", "evidencias", params],
    queryFn: async () => {
      const limit = params.limit ?? 50;
      const offlineItems = await listOfflineEvidencias({
        ...(params.linked_anomaly_id ? { linked_anomaly_id: params.linked_anomaly_id } : {}),
        ...(params.linked_inspection_id ? { linked_inspection_id: params.linked_inspection_id } : {}),
        ...(params.linked_work_order_id ? { linked_work_order_id: params.linked_work_order_id } : {}),
        ...(params.linked_action_id ? { linked_action_id: params.linked_action_id } : {}),
      }).catch(() => []);

      if (!isOnline()) return { items: offlineItems.slice(0, limit) };

      const remote = await vegApi.listEvidencias(params);
      const byId = new Map<string, VegEvidence>();
      for (const i of remote.items ?? []) byId.set(i.id, i);
      for (const i of offlineItems) byId.set(i.id, i);
      return { items: Array.from(byId.values()).slice(0, limit) };
    },
    keepPreviousData: true,
    staleTime: 10_000,
  });

export const useVegEvidenciaMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof vegApi.createEvidencia>[0]) => vegApi.createEvidencia(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veg", "evidencias"] });
    },
  });
};

export const useVegDeleteEvidencia = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vegApi.deleteEvidencia(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veg", "evidencias"] });
    },
  });
};

export default function useVegetacao() {
  // Placeholder export to allow future composition.
  return { vegApi };
}
