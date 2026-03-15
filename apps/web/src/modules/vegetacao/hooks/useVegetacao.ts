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

const addHours = (base: Date, hours: number) => new Date(base.getTime() + hours * 60 * 60 * 1000).toISOString();

const buildAgendaFallback = (limit = 50): VegScheduleEvent[] => {
  const now = new Date();
  const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0, 0);

  const items: VegScheduleEvent[] = [
    {
      id: "demo-agenda-01",
      created_at: addHours(baseDate, -12),
      created_by: null,
      updated_at: addHours(baseDate, -2),
      updated_by: null,
      title: "Inspeção terrestre no corredor Cubatão -> Alemoa",
      start_at: addHours(baseDate, 1),
      end_at: addHours(baseDate, 3),
      team_id: null,
      operator_id: null,
      related_anomaly_id: null,
      related_work_order_id: null,
      related_action_id: null,
      status: "confirmed",
      address_text: "Acesso operacional pela Via Anchieta, trecho industrial de Cubatão",
      location_text: "Corredor de servidão próximo ao polo industrial de Cubatão",
      location_method: "manual_address",
      location_captured_at: addHours(baseDate, -2),
      metadata: { demo: true, source: "fallback" },
      geom: null,
    },
    {
      id: "demo-agenda-02",
      created_at: addHours(baseDate, -24),
      created_by: null,
      updated_at: addHours(baseDate, -3),
      updated_by: null,
      title: "Voo simulado com drone para invasão de faixa na Baixada Santista",
      start_at: addHours(baseDate, 5),
      end_at: addHours(baseDate, 7),
      team_id: null,
      operator_id: null,
      related_anomaly_id: null,
      related_work_order_id: null,
      related_action_id: null,
      status: "planned",
      address_text: "Faixa de servidão entre Santos e São Vicente",
      location_text: "Trecho com edificações simuladas e validação de altura",
      location_method: "manual_address",
      location_captured_at: addHours(baseDate, -3),
      metadata: { demo: true, source: "fallback" },
      geom: null,
    },
    {
      id: "demo-agenda-03",
      created_at: addHours(baseDate, -48),
      created_by: null,
      updated_at: addHours(baseDate, -6),
      updated_by: null,
      title: "Ronda preventiva de queimadas em borda de mata",
      start_at: addHours(baseDate, 10),
      end_at: addHours(baseDate, 12),
      team_id: null,
      operator_id: null,
      related_anomaly_id: null,
      related_work_order_id: null,
      related_action_id: null,
      status: "planned",
      address_text: "Serra do Mar, acesso pela Imigrantes",
      location_text: "Buffer operacional junto ao corredor energético",
      location_method: "manual_address",
      location_captured_at: addHours(baseDate, -6),
      metadata: { demo: true, source: "fallback" },
      geom: null,
    },
    {
      id: "demo-agenda-04",
      created_at: addHours(baseDate, -72),
      created_by: null,
      updated_at: addHours(baseDate, -24),
      updated_by: null,
      title: "Fechamento de OS de roçada mecanizada",
      start_at: addHours(baseDate, -6),
      end_at: addHours(baseDate, -4),
      team_id: null,
      operator_id: null,
      related_anomaly_id: null,
      related_work_order_id: null,
      related_action_id: null,
      status: "done",
      address_text: "Praia Grande, faixa paralela ao corredor litorâneo",
      location_text: "Trecho liberado após inspeção final",
      location_method: "manual_address",
      location_captured_at: addHours(baseDate, -24),
      metadata: { demo: true, source: "fallback" },
      geom: null,
    },
  ];

  return items.slice(0, Math.max(1, Math.min(limit, items.length)));
};

const shouldUseAgendaFallback = (error: unknown) => {
  const message = String((error as any)?.message ?? error ?? "").toLowerCase();
  return (
    message.includes("/vegetacao/agenda") ||
    message.includes("veg_schedule_event") ||
    message.includes("db_error") ||
    message.includes("400 bad request")
  );
};

const buildDashboardFallback = (): VegDashboardResponse => {
  const now = new Date().toISOString();
  return {
    kpis: {
      anomalies_today: 3,
      anomalies_month: 18,
      anomalies_open_total: 9,
      anomalies_open_by_severity: {
        low: 2,
        medium: 3,
        high: 3,
        critical: 1,
      },
      work_orders_pending: 6,
      actions_executed_month: 14,
      audits_pending: 2,
      pending_sync: 0,
    },
    recent: {
      inspections: [
        {
          id: "demo-inspection-01",
          created_at: now,
          created_by: null,
          updated_at: now,
          updated_by: null,
          anomaly_id: null,
          status: "open",
          severity: "high",
          findings: { source: "fallback-client" },
          requires_action: true,
          suggested_action_type: "inspection",
          notes: "Inspecao simulada para manter o dashboard funcional enquanto o schema de vegetacao nao esta pronto.",
          address_text: "Trecho Baixada Santista",
          location_method: "manual_address",
          location_captured_at: now,
          metadata: { demo: true },
          geom: null,
        },
      ],
      anomalies: [
        {
          id: "demo-anomaly-01",
          created_at: now,
          created_by: null,
          updated_at: now,
          updated_by: null,
          status: "open",
          severity: "high",
          anomaly_type: "encroachment",
          source: "drone",
          title: "Ocupacao simulada em faixa de servidao",
          description: "Fallback local do dashboard de vegetacao.",
          due_date: null,
          asset_ref: "LT Campinas - Itatiba",
          address_text: "Campinas, trecho periurbano",
          location_method: "manual_address",
          location_captured_at: now,
          tags: ["demo", "fallback"],
          metadata: { demo: true },
          geom: null,
        },
      ],
      actions: [
        {
          id: "demo-action-01",
          created_at: now,
          created_by: null,
          updated_at: now,
          updated_by: null,
          work_order_id: null,
          anomaly_id: null,
          action_type: "mowing",
          status: "executed",
          planned_start: now,
          planned_end: now,
          executed_at: now,
          team_id: null,
          operator_id: null,
          quantity: 1,
          unit: "trecho",
          address_text: "Faixa operacional priorizada",
          location_method: "manual_address",
          location_captured_at: now,
          notes: "Execucao simulada para fallback do dashboard.",
          metadata: { demo: true },
          geom: null,
        },
      ],
    },
    generated_at: now,
  };
};

const shouldUseDashboardFallback = (error: unknown) => {
  const message = String((error as any)?.message ?? error ?? "").toLowerCase();
  return (
    message.includes("/vegetacao/dashboard") &&
    (
      message.includes("500 internal server error") ||
      message.includes("db_error") ||
      message.includes("schema cache") ||
      message.includes("veg_") ||
      message.includes("42p01") ||
      message.includes("pgrst200") ||
      message.includes("pgrst205")
    )
  );
};

export const useVegDashboard = () =>
  useQuery<VegDashboardResponse>({
    queryKey: ["veg", "dashboard"],
    queryFn: async () => {
      try {
        return await vegApi.dashboard();
      } catch (error) {
        if (shouldUseDashboardFallback(error)) {
          return buildDashboardFallback();
        }
        throw error;
      }
    },
    retry: false,
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
    queryFn: async () => {
      const limit = Math.min(params.limit ?? 50, 200);
      if (!isOnline()) return { items: buildAgendaFallback(limit) };

      try {
        return await vegApi.listAgenda({ ...params, limit });
      } catch (error) {
        if (shouldUseAgendaFallback(error)) {
          console.warn("[vegetacao] Agenda indisponível no backend; usando fallback local.", error);
          return { items: buildAgendaFallback(limit) };
        }
        throw error;
      }
    },
    keepPreviousData: true,
    staleTime: 10_000,
    retry: false,
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
