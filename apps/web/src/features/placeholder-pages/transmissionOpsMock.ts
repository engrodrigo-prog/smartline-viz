import type { FiltersState } from "@/context/FiltersContext";

export const DEMO_REFERENCE_DATE = "2026-03-13T12:00:00-03:00";

export const transmissionLineCatalog = {
  "LT-001": {
    label: "LT 138 kV Campinas Norte - Valinhos",
    regional: "Corredor Interior Campinas",
  },
  "LT-002": {
    label: "LT 138 kV Jundiaí - Louveira",
    regional: "Eixo Anhanguera",
  },
  "LT-003": {
    label: "LT 138 kV Cubatão - Ponta da Praia",
    regional: "Baixada Santista",
  },
} as const;

export type RiskLevel = "Baixa" | "Média" | "Alta";

type ContextSlice = {
  id: string;
  regiao: string;
  linha: string;
  ramal: string;
};

export type ClearanceAlert = ContextSlice & {
  subtrecho: string;
  municipio: string;
  elemento: "Vegetação" | "Edificação" | "Solo" | "Flecha térmica";
  origem: string;
  medidoM: number;
  exigidoM: number;
  criticidade: RiskLevel;
  status: "Janela programada" | "Validar em campo" | "Escalonado para faixa" | "Reengenharia";
  ultimaLeitura: string;
  responsavel: string;
  proximaAcao: string;
  score: number;
};

export type EnvironmentalComplianceItem = ContextSlice & {
  frente: string;
  municipio: string;
  eixo:
    | "Licenciamento"
    | "Supressão e recomposição"
    | "Fauna"
    | "APP e drenagem"
    | "Resíduos e terceiros";
  orgao: "CETESB" | "Prefeitura" | "DAEE" | "IPHAN";
  obrigacao: string;
  vencimento: string;
  status: "Liberado" | "Evidências em coleta" | "Aguardando protocolo" | "Pendência de campo";
  risco: RiskLevel;
  conclusaoPct: number;
  impacto: string;
  responsavel: string;
};

export type CrossingComplianceItem = ContextSlice & {
  travessia: string;
  municipio: string;
  tipo: "Rodovia" | "Ferrovia" | "Duto" | "Canal" | "Linha adjacente";
  orgao: "CCR AutoBAn" | "MRS Logística" | "Sabesp" | "Prefeitura" | "Concessionária local";
  norma: string;
  gabaritoMedidoM: number;
  gabaritoExigidoM: number;
  criticidade: RiskLevel;
  status: "Conforme com ressalva" | "Renovação documental" | "Adequação de gabarito" | "Nova vistoria";
  validade: string;
  proximaAcao: string;
  responsavel: string;
};

export type StructuralIntegrityCase = ContextSlice & {
  estrutura: string;
  municipio: string;
  componente: "Base" | "Escada" | "Diagonal" | "Parafusos" | "Ferragem de topo";
  ambiente: "Salino" | "Industrial" | "Urbano" | "Rural";
  perdaMetalPct: number;
  itensFaltantes: number;
  umidadePct: number;
  criticidade: RiskLevel;
  status: "Monitoramento" | "Tratamento programado" | "Ronda patrimonial" | "Reforço emergencial";
  ultimaInspecao: string;
  responsavel: string;
  acao: string;
  score: number;
};

export const clearanceAlerts: ClearanceAlert[] = [
  {
    id: "DST-041",
    regiao: "A",
    linha: "LT-001",
    ramal: "R2",
    subtrecho: "Vãos 041-047",
    municipio: "Valinhos",
    elemento: "Vegetação",
    origem: "LiDAR + ortomosaico RGB",
    medidoM: 6.1,
    exigidoM: 7.4,
    criticidade: "Alta",
    status: "Janela programada",
    ultimaLeitura: "2026-03-11",
    responsavel: "Planejamento Vegetação",
    proximaAcao: "Poda lateral com liberação em 17/03",
    score: 93,
  },
  {
    id: "DST-052",
    regiao: "A",
    linha: "LT-001",
    ramal: "R3",
    subtrecho: "Acesso Campo Grande",
    municipio: "Campinas",
    elemento: "Solo",
    origem: "Perfil LiDAR terrestre",
    medidoM: 8.3,
    exigidoM: 8.5,
    criticidade: "Média",
    status: "Validar em campo",
    ultimaLeitura: "2026-03-08",
    responsavel: "Topografia de faixa",
    proximaAcao: "Repetir perfil após patrolamento do acesso",
    score: 71,
  },
  {
    id: "DST-067",
    regiao: "B",
    linha: "LT-002",
    ramal: "R1",
    subtrecho: "Travessia Anhanguera",
    municipio: "Louveira",
    elemento: "Flecha térmica",
    origem: "Modelo térmico + meteorologia",
    medidoM: 8.9,
    exigidoM: 9.7,
    criticidade: "Alta",
    status: "Reengenharia",
    ultimaLeitura: "2026-03-09",
    responsavel: "Engenharia de linhas",
    proximaAcao: "Avaliar retensionamento no período seco",
    score: 90,
  },
  {
    id: "DST-073",
    regiao: "B",
    linha: "LT-002",
    ramal: "R2",
    subtrecho: "Faixa industrial km 22",
    municipio: "Jundiaí",
    elemento: "Edificação",
    origem: "Ortomosaico + vistoria jurídica",
    medidoM: 7.2,
    exigidoM: 7.0,
    criticidade: "Média",
    status: "Escalonado para faixa",
    ultimaLeitura: "2026-03-07",
    responsavel: "Gestão fundiária",
    proximaAcao: "Notificação preventiva do ocupante",
    score: 68,
  },
  {
    id: "DST-118",
    regiao: "C",
    linha: "LT-003",
    ramal: "R1",
    subtrecho: "Cubatão pátio sul",
    municipio: "Cubatão",
    elemento: "Vegetação",
    origem: "LiDAR + NDVI de apoio",
    medidoM: 5.8,
    exigidoM: 7.2,
    criticidade: "Alta",
    status: "Janela programada",
    ultimaLeitura: "2026-03-12",
    responsavel: "Operação Baixada",
    proximaAcao: "Roçada pesada com equipe terceirizada",
    score: 95,
  },
  {
    id: "DST-126",
    regiao: "C",
    linha: "LT-003",
    ramal: "R2",
    subtrecho: "Marapé - cota intermediária",
    municipio: "Santos",
    elemento: "Edificação",
    origem: "Drone RGB + inspeção fundiária",
    medidoM: 6.6,
    exigidoM: 7.1,
    criticidade: "Alta",
    status: "Escalonado para faixa",
    ultimaLeitura: "2026-03-10",
    responsavel: "Jurídico faixa",
    proximaAcao: "Abrir caso com laudo fotográfico consolidado",
    score: 88,
  },
  {
    id: "DST-131",
    regiao: "C",
    linha: "LT-003",
    ramal: "R3",
    subtrecho: "Ponta da Praia - canal",
    municipio: "Santos",
    elemento: "Flecha térmica",
    origem: "Modelo sazonal de carregamento",
    medidoM: 9.8,
    exigidoM: 9.5,
    criticidade: "Baixa",
    status: "Validar em campo",
    ultimaLeitura: "2026-03-05",
    responsavel: "Centro de operação",
    proximaAcao: "Confirmar medição em horário de pico",
    score: 44,
  },
  {
    id: "DST-142",
    regiao: "A",
    linha: "LT-001",
    ramal: "R1",
    subtrecho: "Valinhos - encosta oeste",
    municipio: "Vinhedo",
    elemento: "Vegetação",
    origem: "LiDAR + inspeção móvel",
    medidoM: 7.5,
    exigidoM: 7.4,
    criticidade: "Baixa",
    status: "Validar em campo",
    ultimaLeitura: "2026-03-04",
    responsavel: "Operação de linha",
    proximaAcao: "Manter monitoramento quinzenal",
    score: 39,
  },
];

export const environmentalComplianceItems: EnvironmentalComplianceItem[] = [
  {
    id: "AMB-014",
    regiao: "C",
    linha: "LT-003",
    ramal: "R2",
    frente: "Faixa Cubatão - Alemoa",
    municipio: "Cubatão",
    eixo: "Supressão e recomposição",
    orgao: "CETESB",
    obrigacao: "Protocolar relatório fotográfico de recomposição e compensação vegetal do lote 3.",
    vencimento: "2026-03-24",
    status: "Evidências em coleta",
    risco: "Alta",
    conclusaoPct: 68,
    impacto: "Liberação da roçada mecanizada do trecho industrial.",
    responsavel: "Coordenação ambiental litoral",
  },
  {
    id: "AMB-021",
    regiao: "A",
    linha: "LT-001",
    ramal: "R2",
    frente: "Acesso rural Valinhos",
    municipio: "Valinhos",
    eixo: "APP e drenagem",
    orgao: "DAEE",
    obrigacao: "Atualizar memorial de drenagem temporária e contenção de sedimentos.",
    vencimento: "2026-03-19",
    status: "Pendência de campo",
    risco: "Alta",
    conclusaoPct: 44,
    impacto: "Sem aprovação a frente de estabilização não inicia.",
    responsavel: "Engenharia civil + meio ambiente",
  },
  {
    id: "AMB-026",
    regiao: "B",
    linha: "LT-002",
    ramal: "R1",
    frente: "Trecho Anhanguera",
    municipio: "Louveira",
    eixo: "Licenciamento",
    orgao: "Prefeitura",
    obrigacao: "Renovar anuência municipal para intervenção no acostamento de acesso.",
    vencimento: "2026-04-02",
    status: "Aguardando protocolo",
    risco: "Média",
    conclusaoPct: 79,
    impacto: "Afeta cronograma de mobilização do topógrafo.",
    responsavel: "Fundiário e licenças",
  },
  {
    id: "AMB-031",
    regiao: "C",
    linha: "LT-003",
    ramal: "R1",
    frente: "Corredor portuário",
    municipio: "Santos",
    eixo: "Resíduos e terceiros",
    orgao: "Prefeitura",
    obrigacao: "Formalizar plano de descarte temporário de resíduos verdes e metálicos.",
    vencimento: "2026-03-28",
    status: "Evidências em coleta",
    risco: "Média",
    conclusaoPct: 61,
    impacto: "Sem plano aprovado, a contratada não fecha a medição.",
    responsavel: "Fiscal de contrato ambiental",
  },
  {
    id: "AMB-039",
    regiao: "B",
    linha: "LT-002",
    ramal: "R2",
    frente: "Louveira - pátio logístico",
    municipio: "Jundiaí",
    eixo: "Fauna",
    orgao: "CETESB",
    obrigacao: "Concluir treinamento de resgate de fauna para equipe de supressão.",
    vencimento: "2026-03-18",
    status: "Pendência de campo",
    risco: "Alta",
    conclusaoPct: 36,
    impacto: "Janela de supressão só pode abrir com equipe habilitada.",
    responsavel: "SSMA contratada",
  },
  {
    id: "AMB-044",
    regiao: "A",
    linha: "LT-001",
    ramal: "R3",
    frente: "Campinas Norte",
    municipio: "Campinas",
    eixo: "Licenciamento",
    orgao: "CETESB",
    obrigacao: "Enviar relatório semestral consolidado das frentes de manutenção da faixa.",
    vencimento: "2026-04-10",
    status: "Liberado",
    risco: "Baixa",
    conclusaoPct: 100,
    impacto: "Sem impacto operacional no ciclo atual.",
    responsavel: "Governança corporativa",
  },
  {
    id: "AMB-051",
    regiao: "C",
    linha: "LT-003",
    ramal: "R3",
    frente: "Marapé - morro intermediário",
    municipio: "Santos",
    eixo: "APP e drenagem",
    orgao: "DAEE",
    obrigacao: "Registrar inspeção pós-chuva com fotos georreferenciadas nos drenos laterais.",
    vencimento: "2026-03-21",
    status: "Evidências em coleta",
    risco: "Média",
    conclusaoPct: 58,
    impacto: "Pode reter liberação de contenção leve.",
    responsavel: "Engenharia ambiental de campo",
  },
  {
    id: "AMB-057",
    regiao: "A",
    linha: "LT-001",
    ramal: "R1",
    frente: "Vinhedo - borda urbana",
    municipio: "Vinhedo",
    eixo: "Supressão e recomposição",
    orgao: "IPHAN",
    obrigacao: "Registrar negativa de interferência patrimonial para novo acesso lateral.",
    vencimento: "2026-03-30",
    status: "Aguardando protocolo",
    risco: "Baixa",
    conclusaoPct: 82,
    impacto: "Impacto baixo, mas necessário para fechamento do dossiê.",
    responsavel: "Licenciamento corporativo",
  },
];

export const crossingComplianceItems: CrossingComplianceItem[] = [
  {
    id: "TRV-008",
    regiao: "B",
    linha: "LT-002",
    ramal: "R1",
    travessia: "Rodovia Anhanguera km 63",
    municipio: "Louveira",
    tipo: "Rodovia",
    orgao: "CCR AutoBAn",
    norma: "NBR 5422 + manual da concessionária",
    gabaritoMedidoM: 8.8,
    gabaritoExigidoM: 9.5,
    criticidade: "Alta",
    status: "Adequação de gabarito",
    validade: "2026-04-05",
    proximaAcao: "Levantamento topográfico noturno e revisão de flecha.",
    responsavel: "Engenharia de travessias",
  },
  {
    id: "TRV-011",
    regiao: "B",
    linha: "LT-002",
    ramal: "R2",
    travessia: "Linha férrea Louveira",
    municipio: "Jundiaí",
    tipo: "Ferrovia",
    orgao: "MRS Logística",
    norma: "NBR 5422 + termo de travessia MRS",
    gabaritoMedidoM: 10.4,
    gabaritoExigidoM: 10.0,
    criticidade: "Baixa",
    status: "Conforme com ressalva",
    validade: "2026-06-30",
    proximaAcao: "Atualizar dossiê fotográfico no próximo ciclo.",
    responsavel: "Cadastro técnico",
  },
  {
    id: "TRV-019",
    regiao: "C",
    linha: "LT-003",
    ramal: "R2",
    travessia: "Canal 4 - acesso portuário",
    municipio: "Santos",
    tipo: "Canal",
    orgao: "Prefeitura",
    norma: "NBR 5422 + autorização municipal",
    gabaritoMedidoM: 12.6,
    gabaritoExigidoM: 12.0,
    criticidade: "Baixa",
    status: "Renovação documental",
    validade: "2026-03-27",
    proximaAcao: "Anexar ART e croqui georreferenciado.",
    responsavel: "Regulatório litoral",
  },
  {
    id: "TRV-022",
    regiao: "C",
    linha: "LT-003",
    ramal: "R1",
    travessia: "Adutora industrial Cubatão",
    municipio: "Cubatão",
    tipo: "Duto",
    orgao: "Sabesp",
    norma: "Termo operacional da concessionária",
    gabaritoMedidoM: 7.9,
    gabaritoExigidoM: 8.4,
    criticidade: "Alta",
    status: "Nova vistoria",
    validade: "2026-03-20",
    proximaAcao: "Confirmar referência altimétrica da faixa.",
    responsavel: "Topografia e projetos",
  },
  {
    id: "TRV-028",
    regiao: "A",
    linha: "LT-001",
    ramal: "R3",
    travessia: "Acesso municipal Campo Grande",
    municipio: "Campinas",
    tipo: "Rodovia",
    orgao: "Prefeitura",
    norma: "NBR 5422 + decreto municipal",
    gabaritoMedidoM: 8.1,
    gabaritoExigidoM: 8.3,
    criticidade: "Média",
    status: "Renovação documental",
    validade: "2026-03-25",
    proximaAcao: "Renovar ofício e atualizar as-built da travessia.",
    responsavel: "Governança de ativos",
  },
  {
    id: "TRV-034",
    regiao: "A",
    linha: "LT-001",
    ramal: "R2",
    travessia: "LT paralela de distribuição",
    municipio: "Valinhos",
    tipo: "Linha adjacente",
    orgao: "Concessionária local",
    norma: "NBR 5422 + instrução interna",
    gabaritoMedidoM: 4.1,
    gabaritoExigidoM: 4.5,
    criticidade: "Alta",
    status: "Adequação de gabarito",
    validade: "2026-03-29",
    proximaAcao: "Ajustar afastamento com revisão de ferragem.",
    responsavel: "Engenharia de linha",
  },
  {
    id: "TRV-041",
    regiao: "C",
    linha: "LT-003",
    ramal: "R3",
    travessia: "Avenida da praia - retorno leste",
    municipio: "Santos",
    tipo: "Rodovia",
    orgao: "Prefeitura",
    norma: "NBR 5422 + processo municipal vigente",
    gabaritoMedidoM: 9.2,
    gabaritoExigidoM: 9.0,
    criticidade: "Baixa",
    status: "Conforme com ressalva",
    validade: "2026-05-15",
    proximaAcao: "Registrar nova inspeção visual no inverno.",
    responsavel: "Equipe litorânea",
  },
  {
    id: "TRV-048",
    regiao: "B",
    linha: "LT-002",
    ramal: "R1",
    travessia: "Gasoduto logístico",
    municipio: "Jundiaí",
    tipo: "Duto",
    orgao: "Concessionária local",
    norma: "Acordo operacional + NBR 5422",
    gabaritoMedidoM: 6.7,
    gabaritoExigidoM: 7.1,
    criticidade: "Média",
    status: "Nova vistoria",
    validade: "2026-04-08",
    proximaAcao: "Checar ocupação do apoio lateral e emitir croqui.",
    responsavel: "Cadastro e projetos",
  },
];

export const structuralIntegrityCases: StructuralIntegrityCase[] = [
  {
    id: "EST-102",
    regiao: "C",
    linha: "LT-003",
    ramal: "R2",
    estrutura: "Torre T-154",
    municipio: "Santos",
    componente: "Base",
    ambiente: "Salino",
    perdaMetalPct: 31,
    itensFaltantes: 0,
    umidadePct: 88,
    criticidade: "Alta",
    status: "Reforço emergencial",
    ultimaInspecao: "2026-03-09",
    responsavel: "Engenharia estrutural litoral",
    acao: "Reforço de base e novo tratamento anticorrosivo.",
    score: 96,
  },
  {
    id: "EST-118",
    regiao: "C",
    linha: "LT-003",
    ramal: "R1",
    estrutura: "Torre T-118",
    municipio: "Cubatão",
    componente: "Parafusos",
    ambiente: "Industrial",
    perdaMetalPct: 18,
    itensFaltantes: 3,
    umidadePct: 81,
    criticidade: "Alta",
    status: "Ronda patrimonial",
    ultimaInspecao: "2026-03-06",
    responsavel: "Patrimonial + manutenção",
    acao: "Reposição de fixadores e câmera móvel por 30 dias.",
    score: 91,
  },
  {
    id: "EST-084",
    regiao: "A",
    linha: "LT-001",
    ramal: "R3",
    estrutura: "Torre T-084",
    municipio: "Campinas",
    componente: "Escada",
    ambiente: "Urbano",
    perdaMetalPct: 9,
    itensFaltantes: 4,
    umidadePct: 62,
    criticidade: "Média",
    status: "Ronda patrimonial",
    ultimaInspecao: "2026-03-10",
    responsavel: "Segurança patrimonial",
    acao: "Reposição de degraus e inspeção noturna no entorno.",
    score: 79,
  },
  {
    id: "EST-067",
    regiao: "A",
    linha: "LT-001",
    ramal: "R2",
    estrutura: "Torre T-067",
    municipio: "Valinhos",
    componente: "Diagonal",
    ambiente: "Rural",
    perdaMetalPct: 14,
    itensFaltantes: 1,
    umidadePct: 55,
    criticidade: "Média",
    status: "Tratamento programado",
    ultimaInspecao: "2026-03-04",
    responsavel: "Contratada civil",
    acao: "Limpeza, primer epóxi e reposição de uma diagonal.",
    score: 72,
  },
  {
    id: "EST-141",
    regiao: "B",
    linha: "LT-002",
    ramal: "R1",
    estrutura: "Torre T-141",
    municipio: "Louveira",
    componente: "Ferragem de topo",
    ambiente: "Industrial",
    perdaMetalPct: 23,
    itensFaltantes: 0,
    umidadePct: 69,
    criticidade: "Alta",
    status: "Tratamento programado",
    ultimaInspecao: "2026-03-08",
    responsavel: "Engenharia de ativos",
    acao: "Substituir ferragem superior na próxima janela.",
    score: 86,
  },
  {
    id: "EST-155",
    regiao: "B",
    linha: "LT-002",
    ramal: "R2",
    estrutura: "Torre T-155",
    municipio: "Jundiaí",
    componente: "Parafusos",
    ambiente: "Urbano",
    perdaMetalPct: 11,
    itensFaltantes: 2,
    umidadePct: 58,
    criticidade: "Média",
    status: "Ronda patrimonial",
    ultimaInspecao: "2026-03-05",
    responsavel: "Centro de controle patrimonial",
    acao: "Cruzar ronda, câmeras e histórico de reincidência.",
    score: 76,
  },
  {
    id: "EST-173",
    regiao: "C",
    linha: "LT-003",
    ramal: "R3",
    estrutura: "Torre T-173",
    municipio: "Santos",
    componente: "Base",
    ambiente: "Salino",
    perdaMetalPct: 27,
    itensFaltantes: 0,
    umidadePct: 91,
    criticidade: "Alta",
    status: "Reforço emergencial",
    ultimaInspecao: "2026-03-12",
    responsavel: "Engenharia estrutural litoral",
    acao: "Escorar base leste e repetir ensaio de espessura.",
    score: 94,
  },
  {
    id: "EST-188",
    regiao: "A",
    linha: "LT-001",
    ramal: "R1",
    estrutura: "Torre T-188",
    municipio: "Vinhedo",
    componente: "Escada",
    ambiente: "Rural",
    perdaMetalPct: 6,
    itensFaltantes: 0,
    umidadePct: 51,
    criticidade: "Baixa",
    status: "Monitoramento",
    ultimaInspecao: "2026-02-28",
    responsavel: "Inspeção terrestre",
    acao: "Manter no roteiro trimestral padrão.",
    score: 38,
  },
];

export const clearanceProcessSteps = [
  {
    title: "Captura geoespacial",
    detail: "LiDAR, ortomosaico e inspeção móvel consolidam a nuvem do corredor.",
    metric: "3 fontes por leitura",
  },
  {
    title: "Classificação do conflito",
    detail: "IA separa vegetação, solo, edificação e comportamento térmico.",
    metric: "4 classes operacionais",
  },
  {
    title: "Validação operacional",
    detail: "A engenharia compara folga medida com gabarito de referência do trecho.",
    metric: "1 fila priorizada",
  },
  {
    title: "Execução em campo",
    detail: "A ação é enviada para poda, faixa, topografia ou reengenharia.",
    metric: "SLA até 7 dias",
  },
] as const;

export const environmentalProcessSteps = [
  {
    title: "Abertura da frente",
    detail: "Cada lote nasce com obrigações vinculadas ao trecho e ao órgão aplicável.",
    metric: "Roteiro por frente",
  },
  {
    title: "Coleta de evidências",
    detail: "Fotos, checklists e documentos sobem com contexto de linha, ramal e município.",
    metric: "Prova georreferenciada",
  },
  {
    title: "Validação técnica",
    detail: "Ambiental e fiscalização conferem se a obrigação está pronta para protocolo.",
    metric: "Dupla checagem",
  },
  {
    title: "Liberação operacional",
    detail: "Somente frentes conformes alimentam planejamento de poda, acesso e obras.",
    metric: "Bloqueio automático",
  },
] as const;

export const crossingProcessSteps = [
  {
    title: "Leitura normativa",
    detail: "Cada travessia cruza medição, norma e exigência da concessionária local.",
    metric: "1 dossiê por ativo",
  },
  {
    title: "Análise de gabarito",
    detail: "Afastamentos e flecha entram na mesma régua de priorização.",
    metric: "Medição + documento",
  },
  {
    title: "Regularização",
    detail: "O fluxo distingue ajuste físico, revalidação topográfica e renovação documental.",
    metric: "3 rotas possíveis",
  },
  {
    title: "Rastreabilidade",
    detail: "Toda ação volta para a governança de linha com validade e responsável.",
    metric: "Vencimento monitorado",
  },
] as const;

export const structuralProcessSteps = [
  {
    title: "Inspeção dirigida",
    detail: "A linha recebe score unificado de corrosão, umidade e perda patrimonial.",
    metric: "Score 0 a 100",
  },
  {
    title: "Triagem do componente",
    detail: "Base, diagonais, escada e ferragens seguem planos de resposta distintos.",
    metric: "5 famílias críticas",
  },
  {
    title: "Ação combinada",
    detail: "Patrimonial e manutenção atuam juntos quando há furto ou reincidência.",
    metric: "1 backlog integrado",
  },
  {
    title: "Fechamento",
    detail: "O ativo só sai do radar após nova leitura de campo e validação técnica.",
    metric: "Evidência obrigatória",
  },
] as const;

export function lineLabel(linha: string) {
  return transmissionLineCatalog[linha as keyof typeof transmissionLineCatalog]?.label ?? linha;
}

export function lineRegional(linha: string) {
  return transmissionLineCatalog[linha as keyof typeof transmissionLineCatalog]?.regional ?? "Corredor demo";
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );
}

export function daysUntil(value: string) {
  const now = new Date(DEMO_REFERENCE_DATE).getTime();
  const due = new Date(`${value}T12:00:00-03:00`).getTime();
  return Math.round((due - now) / (1000 * 60 * 60 * 24));
}

export function matchesOperationalFilters<T extends ContextSlice>(
  item: T,
  filters: FiltersState,
  extraSearchable: Array<string | number | undefined> = [],
) {
  if (filters.regiao && item.regiao !== filters.regiao) return false;
  if (filters.linha && item.linha !== filters.linha) return false;
  if (filters.ramal && item.ramal !== filters.ramal) return false;
  if (!filters.search) return true;

  const query = filters.search.toLowerCase();
  const haystack = [
    item.id,
    item.linha,
    item.ramal,
    ...extraSearchable.map((value) => String(value ?? "")),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}
