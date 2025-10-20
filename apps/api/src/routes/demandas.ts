import { Hono } from "hono";
import { nanoid } from "nanoid";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync
} from "node:fs";
import { join } from "node:path";

const BASE_DIR = join(process.cwd(), "apps/api/.data/demandas");

const THEMES = [
  "Ocorrências",
  "Fiscalização de Atividades",
  "Inspeção de Segurança",
  "Inspeção de Ativos",
  "Treinamentos",
  "Situações Irregulares"
] as const;

const DEMAND_STATUS = ["Aberta", "Em Execução", "Em Validação", "Concluída"] as const;
const EXECUTOR_TIPOS = ["Própria", "Terceiros"] as const;

type Tema = (typeof THEMES)[number];
type DemandStatus = (typeof DEMAND_STATUS)[number];
type ExecutorTipo = (typeof EXECUTOR_TIPOS)[number];

type EvidenciaArquivo = {
  id: string;
  filename: string;
  mediaId?: string;
  temaPrincipal?: Tema;
  temas?: Tema[];
};

type DemandEvidence = {
  id: string;
  titulo?: string;
  descricao?: string;
  temaPrincipal: Tema;
  temas: Tema[];
  mediaIds?: string[];
  arquivos?: EvidenciaArquivo[];
  criadoEm: string;
};

type DemandRecord = {
  id: string;
  criadoEm: string;
  atualizadoEm: string;
  tipo: string;
  linhaId?: string;
  linhaNome?: string;
  trecho?: string;
  regiao?: string;
  responsavel?: string;
  executora?: string;
  executorTipo: ExecutorTipo;
  custoEstimado?: number | null;
  custoReal?: number | null;
  extensaoKm?: number | null;
  prazoInicio?: string | null;
  prazoFim?: string | null;
  slaDias?: number | null;
  status: DemandStatus;
  temas: Tema[];
  temaPrincipal?: Tema;
  missoesRelacionadas?: string[];
  evidencias: DemandEvidence[];
  notas?: string;
  slaSituacao?: "Dentro" | "Fora" | "Sem SLA";
};

type DemandPayload = Partial<Omit<DemandRecord, "id" | "criadoEm" | "atualizadoEm" | "evidencias" | "temas">> & {
  tipo?: string;
  status?: DemandStatus;
  executorTipo?: ExecutorTipo | string;
  temas?: (Tema | string)[];
  evidencias?: Partial<DemandEvidence>[];
};

type AnalyticsResumo = {
  executor: ExecutorTipo;
  custoMedioKm?: number | null;
  tempoMedioDias?: number | null;
  retrabalhoPercentual?: number | null;
  nps?: number | null;
  violacaoSlaPercentual?: number | null;
  estimado: boolean;
  totalOrdens: number;
};

type AnalyticsMapa = {
  regiao: string;
  total: number;
  atrasos: number;
  reincidencias: number;
  executor: ExecutorTipo;
};

type AnalyticsResponse = {
  atualizadoEm: string;
  periodo?: { inicio?: string; fim?: string };
  resumos: AnalyticsResumo[];
  mapaHeat: AnalyticsMapa[];
};

const ensureBaseDir = () => {
  mkdirSync(BASE_DIR, { recursive: true });
};

const temaFromValue = (value: unknown): Tema | undefined => {
  if (!value || typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return THEMES.find((tema) => tema.toLowerCase() === trimmed.toLowerCase() || tema === trimmed);
};

const sanitizeTemas = (value: unknown, fallback: Tema[] = []): Tema[] => {
  if (!value) return fallback;
  if (Array.isArray(value)) {
    const temas = value
      .map((item) => temaFromValue(item))
      .filter((tema): tema is Tema => Boolean(tema));
    return temas.length ? temas : fallback;
  }
  if (typeof value === "string") {
    const temas = value
      .split(",")
      .map((item) => temaFromValue(item))
      .filter((tema): tema is Tema => Boolean(tema));
    return temas.length ? temas : fallback;
  }
  return fallback;
};

const parseNumberField = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parseIsoDate = (value: unknown): string | null => {
  if (!value || typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const ensureStatus = (value: unknown): DemandStatus => {
  if (!value || typeof value !== "string") return "Aberta";
  const candidate = DEMAND_STATUS.find((status) => status.toLowerCase() === value.toLowerCase());
  return candidate ?? "Aberta";
};

const ensureExecutorTipo = (value: unknown): ExecutorTipo => {
  if (!value || typeof value !== "string") return "Própria";
  const normalized = value.toLowerCase();
  if (normalized.includes("terce")) return "Terceiros";
  if (normalized.includes("própr") || normalized.includes("propr")) return "Própria";
  return EXECUTOR_TIPOS.find((tipo) => tipo.toLowerCase() === normalized) ?? "Própria";
};

const sanitizeEvidenceList = (lista: unknown, fallbackTema: Tema | undefined, fallbackTemas: Tema[]) => {
  if (!Array.isArray(lista)) return [] as DemandEvidence[];

  return lista
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const temaPrincipal = temaFromValue((entry as any).temaPrincipal) ?? fallbackTema ?? fallbackTemas[0];
      if (!temaPrincipal) return null;
      const temas = sanitizeTemas((entry as any).temas, fallbackTemas.length ? fallbackTemas : [temaPrincipal]);

      const arquivosList = Array.isArray((entry as any).arquivos)
        ? ((entry as any).arquivos as any[])
            .map((arquivo) => {
              if (!arquivo || typeof arquivo !== "object") return null;
              const filename = typeof arquivo.filename === "string" ? arquivo.filename.trim() : null;
              if (!filename) return null;
              return {
                id: typeof arquivo.id === "string" ? arquivo.id : nanoid(8),
                filename,
                mediaId: typeof arquivo.mediaId === "string" ? arquivo.mediaId : undefined,
                temaPrincipal: temaFromValue(arquivo.temaPrincipal) ?? temaPrincipal,
                temas: sanitizeTemas(arquivo.temas, temas)
              } as EvidenciaArquivo;
            })
            .filter((item): item is EvidenciaArquivo => Boolean(item))
        : undefined;

      const mediaIds = Array.isArray((entry as any).mediaIds)
        ? ((entry as any).mediaIds as any[]).filter((id): id is string => typeof id === "string" && !!id.trim())
        : undefined;

      return {
        id: typeof (entry as any).id === "string" ? (entry as any).id : nanoid(10),
        titulo: typeof (entry as any).titulo === "string" ? (entry as any).titulo.trim().slice(0, 140) : undefined,
        descricao:
          typeof (entry as any).descricao === "string" ? (entry as any).descricao.trim().slice(0, 2000) : undefined,
        temaPrincipal,
        temas,
        mediaIds,
        arquivos: arquivosList,
        criadoEm:
          typeof (entry as any).criadoEm === "string" && !Number.isNaN(new Date((entry as any).criadoEm).getTime())
            ? new Date((entry as any).criadoEm).toISOString()
            : new Date().toISOString()
      } as DemandEvidence;
    })
    .filter((item): item is DemandEvidence => Boolean(item));
};

const loadDemand = (id: string): DemandRecord | null => {
  const file = join(BASE_DIR, `${id}.json`);
  if (!existsSync(file)) return null;
  try {
    const raw = readFileSync(file, "utf8");
    return JSON.parse(raw) as DemandRecord;
  } catch (error) {
    console.warn(`[demandas] falha ao ler ${file}`, error);
    return null;
  }
};

const saveDemand = (record: DemandRecord) => {
  ensureBaseDir();
  const file = join(BASE_DIR, `${record.id}.json`);
  writeFileSync(file, JSON.stringify(record, null, 2), "utf8");
};

const deleteDemand = (id: string) => {
  const file = join(BASE_DIR, `${id}.json`);
  if (existsSync(file)) {
    rmSync(file);
  }
};

const listDemands = (): DemandRecord[] => {
  ensureBaseDir();
  return readdirSync(BASE_DIR)
    .filter((filename) => filename.endsWith(".json"))
    .map((filename) => loadDemand(filename.replace(/\.json$/, "")))
    .filter((record): record is DemandRecord => Boolean(record))
    .sort((a, b) => {
      const dateA = new Date(a.criadoEm).getTime();
      const dateB = new Date(b.criadoEm).getTime();
      return dateB - dateA;
    });
};

const sanitizePayload = (payload: DemandPayload, existing?: DemandRecord): DemandRecord => {
  const agora = new Date().toISOString();
  const temaPrincipal = temaFromValue(payload.temaPrincipal) ?? existing?.temaPrincipal;
  const temas = sanitizeTemas(payload.temas, temaPrincipal ? [temaPrincipal] : existing?.temas ?? []);

  const record: DemandRecord = {
    id: existing?.id ?? `dmd_${nanoid(10)}`,
    criadoEm: existing?.criadoEm ?? agora,
    atualizadoEm: agora,
    tipo: (payload.tipo ?? existing?.tipo ?? "Roçada/Poda").trim(),
    linhaId: payload.linhaId ?? existing?.linhaId,
    linhaNome: payload.linhaNome ?? existing?.linhaNome,
    trecho: payload.trecho ?? existing?.trecho,
    regiao: payload.regiao ?? existing?.regiao,
    responsavel: payload.responsavel ?? existing?.responsavel,
    executora: payload.executora ?? existing?.executora,
    executorTipo: ensureExecutorTipo(payload.executorTipo ?? existing?.executorTipo),
    custoEstimado: parseNumberField(payload.custoEstimado ?? existing?.custoEstimado ?? null),
    custoReal: parseNumberField(payload.custoReal ?? existing?.custoReal ?? null),
    extensaoKm: parseNumberField(payload.extensaoKm ?? existing?.extensaoKm ?? null),
    prazoInicio: parseIsoDate(payload.prazoInicio ?? existing?.prazoInicio ?? null),
    prazoFim: parseIsoDate(payload.prazoFim ?? existing?.prazoFim ?? null),
    slaDias: parseNumberField(payload.slaDias ?? existing?.slaDias ?? null),
    status: ensureStatus(payload.status ?? existing?.status),
    temas,
    temaPrincipal: temaPrincipal ?? temas[0],
    missoesRelacionadas: Array.isArray(payload.missoesRelacionadas)
      ? (payload.missoesRelacionadas as any[])
          .map((item) => (typeof item === "string" ? item.trim() : null))
          .filter((item): item is string => Boolean(item))
      : existing?.missoesRelacionadas ?? [],
    evidencias: sanitizeEvidenceList(payload.evidencias, temaPrincipal ?? temas[0], temas),
    notas: typeof payload.notas === "string" ? payload.notas.trim().slice(0, 5000) : existing?.notas,
    slaSituacao: existing?.slaSituacao
  };

  if (record.slaDias && record.prazoInicio && record.prazoFim) {
    const inicio = new Date(record.prazoInicio).getTime();
    const fim = new Date(record.prazoFim).getTime();
    if (!Number.isNaN(inicio) && !Number.isNaN(fim)) {
      const diffDias = Math.round((fim - inicio) / (1000 * 60 * 60 * 24));
      if (diffDias > record.slaDias) {
        record.slaSituacao = "Fora";
      } else {
        record.slaSituacao = "Dentro";
      }
    }
  } else if (record.slaDias) {
    record.slaSituacao = "Sem SLA";
  }

  return record;
};

const daysBetween = (inicio?: string | null, fim?: string | null) => {
  if (!inicio || !fim) return null;
  const start = new Date(inicio);
  const end = new Date(fim);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

const computeAnalytics = (demandas: DemandRecord[]): AnalyticsResponse => {
  const agora = new Date().toISOString();
  if (!demandas.length) {
    return {
      atualizadoEm: agora,
      resumos: EXECUTOR_TIPOS.map((executor) => ({
        executor,
        custoMedioKm: null,
        tempoMedioDias: null,
        retrabalhoPercentual: null,
        nps: null,
        violacaoSlaPercentual: null,
        estimado: true,
        totalOrdens: 0
      })),
      mapaHeat: []
    };
  }

  const porExecutor = new Map<ExecutorTipo, DemandRecord[]>();
  EXECUTOR_TIPOS.forEach((tipo) => porExecutor.set(tipo, []));
  demandas.forEach((demand) => {
    const grupo = porExecutor.get(demand.executorTipo) ?? porExecutor.get("Própria")!;
    grupo.push(demand);
  });

  const resumos: AnalyticsResumo[] = [];
  const mapaHeat: AnalyticsMapa[] = [];

  porExecutor.forEach((lista, executor) => {
    let custoTotal = 0;
    let kmTotal = 0;
    let custoContagem = 0;
    let tempoTotal = 0;
    let tempoContagem = 0;
    let violaSla = 0;
    let possuiSla = 0;
    let somaNps = 0;
    let npsCount = 0;
    let retrabalhoSomatorio = 0;
    let retrabalhoCount = 0;
    let estimado = false;

    lista.forEach((item) => {
      if (item.custoReal && item.extensaoKm && item.extensaoKm > 0) {
        custoTotal += item.custoReal;
        kmTotal += item.extensaoKm;
        custoContagem += 1;
      } else if (item.custoEstimado && item.extensaoKm && item.extensaoKm > 0) {
        custoTotal += item.custoEstimado;
        kmTotal += item.extensaoKm;
        custoContagem += 1;
        estimado = true;
      }

      const diffDias = daysBetween(item.prazoInicio, item.prazoFim);
      if (diffDias !== null) {
        tempoTotal += diffDias;
        tempoContagem += 1;
      } else if (item.slaDias) {
        tempoTotal += item.slaDias;
        tempoContagem += 1;
        estimado = true;
      }

      if (item.slaDias && diffDias !== null) {
        possuiSla += 1;
        if (diffDias > item.slaDias) {
          violaSla += 1;
        }
      }

      const notas = item.notas ?? "";
      const matchNps = notas.match(/nps[:=]\s*(\d+)/i);
      if (matchNps) {
        const valor = Number(matchNps[1]);
        if (Number.isFinite(valor)) {
          somaNps += valor;
          npsCount += 1;
        }
      }

      if (notas.includes("reincid")) {
        retrabalhoSomatorio += 1;
        retrabalhoCount += 1;
      } else if (item.status !== "Concluída") {
        retrabalhoCount += 1;
      }

      const regiao = item.regiao ?? item.linhaNome ?? "Não informado";
      const existente = mapaHeat.find(
        (heat) => heat.regiao === regiao && heat.executor === executor
      );
      if (existente) {
        existente.total += 1;
        if (item.slaSituacao === "Fora") existente.atrasos += 1;
        if (notas.includes("reincid")) existente.reincidencias += 1;
      } else {
        mapaHeat.push({
          regiao,
          total: 1,
          atrasos: item.slaSituacao === "Fora" ? 1 : 0,
          reincidencias: notas.includes("reincid") ? 1 : 0,
          executor
        });
      }
    });

    const custoMedioKm =
      custoContagem > 0 && kmTotal > 0 ? Number((custoTotal / kmTotal).toFixed(2)) : null;
    const tempoMedioDias = tempoContagem > 0 ? Number((tempoTotal / tempoContagem).toFixed(1)) : null;
    const violacaoSlaPercentual =
      possuiSla > 0 ? Number(((violaSla / possuiSla) * 100).toFixed(1)) : null;
    const retrabalhoPercentual =
      retrabalhoCount > 0 ? Number(((retrabalhoSomatorio / retrabalhoCount) * 100).toFixed(1)) : null;
    const nps = npsCount > 0 ? Number((somaNps / npsCount).toFixed(1)) : null;

    resumos.push({
      executor,
      custoMedioKm,
      tempoMedioDias,
      retrabalhoPercentual,
      nps,
      violacaoSlaPercentual,
      estimado,
      totalOrdens: lista.length
    });
  });

  const datas = demandas
    .map((d) => d.criadoEm)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return {
    atualizadoEm: agora,
    periodo: { inicio: datas[0], fim: datas[datas.length - 1] },
    resumos,
    mapaHeat
  };
};

export const demandasRoutes = new Hono();

demandasRoutes.get("/", (c) => {
  const todas = listDemands();
  const { status, executor, tipo, inicio, fim, tema } = c.req.query();

  const filtradas = todas.filter((demand) => {
    if (status && demand.status !== ensureStatus(status)) return false;
    if (executor && demand.executorTipo !== ensureExecutorTipo(executor)) return false;
    if (tipo && demand.tipo.toLowerCase() !== tipo.toLowerCase()) return false;
    if (tema) {
      const temaMatch = temaFromValue(tema);
      if (temaMatch && !demand.temas.includes(temaMatch)) return false;
    }
    if (inicio) {
      const dataInicio = new Date(inicio);
      if (!Number.isNaN(dataInicio.getTime())) {
        if (new Date(demand.criadoEm) < dataInicio) return false;
      }
    }
    if (fim) {
      const dataFim = new Date(fim);
      if (!Number.isNaN(dataFim.getTime())) {
        if (new Date(demand.criadoEm) > dataFim) return false;
      }
    }
    return true;
  });

  return c.json({
    items: filtradas,
    total: filtradas.length,
    disponiveis: {
      status: DEMAND_STATUS,
      executorTipos: EXECUTOR_TIPOS,
      temas: THEMES
    }
  });
});

demandasRoutes.get("/analytics/comparativo", (c) => {
  const analytics = computeAnalytics(listDemands());
  return c.json(analytics);
});

demandasRoutes.get("/:id", (c) => {
  const id = c.req.param("id");
  const record = loadDemand(id);
  if (!record) {
    return c.json({ error: "Ordem de serviço não encontrada." }, 404);
  }
  return c.json(record);
});

demandasRoutes.post("/", async (c) => {
  const payload = (await c.req.json().catch(() => null)) as DemandPayload | null;
  if (!payload) {
    return c.json({ error: "Payload inválido." }, 400);
  }
  if (!payload.tipo && !payload.status && !payload.executorTipo && !payload.temas) {
    return c.json({ error: "Campos básicos são obrigatórios." }, 400);
  }

  const record = sanitizePayload(payload);
  saveDemand(record);
  return c.json(record, 201);
});

demandasRoutes.put("/:id", async (c) => {
  const id = c.req.param("id");
  const payload = (await c.req.json().catch(() => null)) as DemandPayload | null;
  if (!payload) {
    return c.json({ error: "Payload inválido." }, 400);
  }
  const existente = loadDemand(id);
  if (!existente) {
    return c.json({ error: "Ordem de serviço não encontrada." }, 404);
  }
  const atualizado = sanitizePayload(payload, existente);
  saveDemand(atualizado);
  return c.json(atualizado);
});

demandasRoutes.delete("/:id", (c) => {
  const id = c.req.param("id");
  const existente = loadDemand(id);
  if (!existente) {
    return c.json({ error: "Ordem de serviço não encontrada." }, 404);
  }
  deleteDemand(id);
  return c.json({ ok: true });
});
