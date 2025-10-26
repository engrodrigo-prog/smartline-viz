import type {
  Demanda,
  DemandasAnalytics,
  DemandasFilters,
  DemandasResponse,
} from "@/services/demandas";
import type {
  MissaoLista,
  MissaoRecord,
  MissaoTipo,
  MissaoTipoId,
} from "@/services/missoes";
import type { FirmsResponse } from "@/hooks/useFirmsData";
import { nowIso } from "@/lib/demoApi";

const randomId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

// ---------- Demandas ----------

const demoDemandasBase: Demanda[] = [
  {
    id: "DEM-001",
    criadoEm: nowIso(),
    atualizadoEm: nowIso(),
    tipo: "Inspeção Termográfica",
    linhaId: "LT-001",
    linhaNome: "LT-001",
    trecho: "R1",
    regiao: "A",
    responsavel: "João Silva",
    executora: "Time Vegetação",
    executorTipo: "Própria",
    custoEstimado: 12000,
    custoReal: 9800,
    extensaoKm: 12,
    prazoInicio: nowIso(),
    prazoFim: nowIso(),
    slaDias: 15,
    status: "Em Execução",
    temas: ["Inspeção de Ativos"],
    temaPrincipal: "Inspeção de Ativos",
    missoesRelacionadas: ["MIS-001"],
    evidencias: [],
    slaSituacao: "Dentro",
    framesResumo: {
      quantidade: 32,
      distancia_m: 5400,
    },
  },
  {
    id: "DEM-002",
    criadoEm: nowIso(),
    atualizadoEm: nowIso(),
    tipo: "Fiscalização de Obras",
    linhaId: "LT-002",
    linhaNome: "LT-002",
    trecho: "R2",
    regiao: "B",
    responsavel: "Maria Santos",
    executora: "Time Travessias",
    executorTipo: "Terceiros",
    custoEstimado: 15000,
    custoReal: null,
    extensaoKm: 9,
    prazoInicio: nowIso(),
    prazoFim: nowIso(),
    slaDias: 20,
    status: "Aberta",
    temas: ["Fiscalização de Atividades"],
    temaPrincipal: "Fiscalização de Atividades",
    missoesRelacionadas: [],
    evidencias: [],
    slaSituacao: "Sem SLA",
  },
  {
    id: "DEM-003",
    criadoEm: nowIso(),
    atualizadoEm: nowIso(),
    tipo: "Ocorrência emergencial",
    linhaId: "LT-003",
    linhaNome: "LT-003",
    trecho: "R1",
    regiao: "C",
    responsavel: "Carlos Oliveira",
    executora: "Time Estruturas",
    executorTipo: "Própria",
    custoEstimado: 8000,
    custoReal: 8200,
    extensaoKm: 4,
    prazoInicio: nowIso(),
    prazoFim: nowIso(),
    slaDias: 7,
    status: "Concluída",
    temas: ["Ocorrências"],
    temaPrincipal: "Ocorrências",
    missoesRelacionadas: ["MIS-002"],
    evidencias: [],
    slaSituacao: "Fora",
  },
];

const demoDemandasDisponiveis = {
  status: ["Aberta", "Em Execução", "Em Validação", "Concluída"],
  executorTipos: ["Própria", "Terceiros"],
  temas: [
    "Ocorrências",
    "Fiscalização de Atividades",
    "Inspeção de Segurança",
    "Inspeção de Ativos",
    "Treinamentos",
    "Situações Irregulares",
  ],
} as DemandasResponse["disponiveis"];

export const getDemoDemandasResponse = (filters: DemandasFilters = {}): DemandasResponse => {
  let filtered = [...demoDemandasBase];
  if (filters.status) filtered = filtered.filter((d) => d.status === filters.status);
  if (filters.executor) filtered = filtered.filter((d) => d.executorTipo === filters.executor);
  if (filters.tipo) filtered = filtered.filter((d) => d.tipo === filters.tipo);
  if (filters.tema) filtered = filtered.filter((d) => d.temas.includes(filters.tema as any));
  return {
    items: filtered,
    total: filtered.length,
    disponiveis: demoDemandasDisponiveis,
  };
};

export const demoDemandasAnalytics: DemandasAnalytics = {
  atualizadoEm: nowIso(),
  periodo: { inicio: nowIso(), fim: nowIso() },
  resumos: [
    {
      executor: "Própria",
      custoMedioKm: 950,
      tempoMedioDias: 8,
      retrabalhoPercentual: 4,
      nps: 76,
      violacaoSlaPercentual: 10,
      estimado: false,
      totalOrdens: 18,
    },
    {
      executor: "Terceiros",
      custoMedioKm: 1350,
      tempoMedioDias: 12,
      retrabalhoPercentual: 7,
      nps: 68,
      violacaoSlaPercentual: 18,
      estimado: true,
      totalOrdens: 11,
    },
  ],
  mapaHeat: [
    { regiao: "A", total: 12, atrasos: 2, reincidencias: 1, executor: "Própria" },
    { regiao: "B", total: 7, atrasos: 1, reincidencias: 0, executor: "Terceiros" },
    { regiao: "C", total: 6, atrasos: 0, reincidencias: 0, executor: "Própria" },
  ],
};

// ---------- Missões ----------

const missaoTiposBase: MissaoTipo[] = [
  {
    id: "LiDAR_Corredor",
    titulo: "LiDAR - Corredor",
    descricao: "Captura de corredor com LiDAR embarcado para geração de nuvem de pontos.",
    campos: [
      { chave: "altura", titulo: "Altitude", tipo: "number", unidade: "m", minimo: 40, maximo: 120, sugestao: 80 },
      { chave: "velocidade", titulo: "Velocidade", tipo: "number", unidade: "m/s", sugestao: 8 },
      { chave: "cobertura", titulo: "Cobertura lateral", tipo: "number", unidade: "%", sugestao: 65 },
    ],
    recomenda: ["DJI M300 + Zenmuse", "2 pilotos", "Ambiente sem chuva"],
  },
  {
    id: "Circular_Torre",
    titulo: "Circular - Torre",
    descricao: "Missão circular para inspeção visual detalhada da torre.",
    campos: [
      { chave: "raio", titulo: "Raio", tipo: "number", unidade: "m", sugestao: 6 },
      { chave: "loops", titulo: "Rotas", tipo: "number", sugestao: 3 },
      { chave: "angulo", titulo: "Inclinação da câmera", tipo: "number", unidade: "°", sugestao: -20 },
    ],
    recomenda: ["Câmera 4K", "Pitch 30°", "Velocidade baixa"],
  },
  {
    id: "Eletromec_Fina",
    titulo: "Eletromecânica Fina",
    descricao: "Detalhamento eletromecânico para cabos e ferragens.",
    campos: [
      { chave: "gimbal", titulo: "Gimbal", tipo: "select", opcoes: [{ valor: "ajustavel", label: "Ajustável" }], sugestao: "ajustavel" },
      { chave: "fps", titulo: "FPS", tipo: "number", sugestao: 30 },
    ],
    recomenda: ["Câmera estabilizada", "Checagem térmica opcional"],
  },
  {
    id: "Express_Faixa",
    titulo: "Express Faixa",
    descricao: "Vistoria rápida de faixa para ocupação irregular.",
    campos: [
      { chave: "comprimento", titulo: "Extensão", tipo: "number", unidade: "km", sugestao: 2 },
      { chave: "resolucao", titulo: "Resolução", tipo: "string", sugestao: "4K" },
    ],
    recomenda: ["D-RTK habilitado", "Piloto remoto"],
  },
];

const storageKey = "smartline-demo-missions";

const baseMissoes: MissaoRecord[] = [
  {
    id: "MIS-001",
    tipo: "LiDAR_Corredor",
    nome: "Corredor Sul 500kV",
    parametros: { altura: 80, velocidade: 8 },
    mediaPattern: "DJI-LIDAR",
    criadoEm: nowIso(),
    atualizadoEm: nowIso(),
    exports: [],
  },
  {
    id: "MIS-002",
    tipo: "Circular_Torre",
    nome: "Torre 138kV - KM12",
    parametros: { raio: 6, loops: 3 },
    mediaPattern: "DJI-4K",
    criadoEm: nowIso(),
    atualizadoEm: nowIso(),
    exports: [],
  },
];

const readMissoesFromStorage = (): MissaoRecord[] => {
  if (typeof window === "undefined") return baseMissoes;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return baseMissoes;
    const parsed = JSON.parse(stored) as MissaoRecord[];
    return parsed.length ? parsed : baseMissoes;
  } catch {
    return baseMissoes;
  }
};

const writeMissoesToStorage = (items: MissaoRecord[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  } catch {
    /* ignore */
  }
};

export const demoMissoesStore = {
  getTipos: (): MissaoTipo[] => missaoTiposBase,
  getMissoes: (): MissaoLista => ({ items: readMissoesFromStorage() }),
  createMissao: (payload: { tipo: MissaoTipoId; nome: string; parametros?: Record<string, unknown> }): MissaoRecord => {
    const current = readMissoesFromStorage();
    const record: MissaoRecord = {
      id: randomId("MIS"),
      tipo: payload.tipo,
      nome: payload.nome,
      parametros: payload.parametros ?? {},
      mediaPattern: payload.tipo === "LiDAR_Corredor" ? "DJI-LIDAR" : "DJI-4K",
      criadoEm: nowIso(),
      atualizadoEm: nowIso(),
      exports: [],
    };
    const next = [record, ...current];
    writeMissoesToStorage(next);
    return record;
  },
  exportMissao: (id: string, formato: string, email?: string) => {
    const current = readMissoesFromStorage();
    const next = current.map((missao) => {
      if (missao.id !== id) return missao;
      return {
        ...missao,
        exports: [
          {
            formato,
            arquivo: `demo-${id}-${formato}.zip`,
            geradoEm: nowIso(),
            email,
          },
          ...missao.exports,
        ],
      };
    });
    writeMissoesToStorage(next);
    return { ok: true, downloadUrl: "#", emailEnviado: Boolean(email) };
  },
};

// ---------- FIRMS (Queimadas) ----------

export const demoFirmsResponse: FirmsResponse = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-53.1, -29.9],
      },
      properties: {
        hotspot_id: "HS-0001",
        brightness: 312,
        confidence: 80,
        satellite: "NOAA-20",
        acq_date: nowIso(),
        risk_max: 92,
        frp: 23.4,
        eta_h: 3.2,
        wind_speed_ms: 8.1,
        wind_dir_from_deg: 140,
        distance_to_line_m: 380,
        intersects_corridor: true,
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-54.2, -30.2],
      },
      properties: {
        hotspot_id: "HS-0002",
        brightness: 302,
        confidence: 70,
        satellite: "MODIS",
        acq_date: nowIso(),
        risk_max: 67,
        frp: 12.1,
        eta_h: 6.5,
        wind_speed_ms: 5.2,
        wind_dir_from_deg: 190,
        distance_to_line_m: 1200,
        intersects_corridor: false,
      },
    },
  ],
  meta: {
    typenames: ["ms:fires_noaa20_24hrs"],
    bbox: "-60,-35,-45,-20",
    count: 2,
    source: "demo",
    cached: true,
    lastFetchedAt: nowIso(),
    formatAttempt: ["geojson"],
  },
};
