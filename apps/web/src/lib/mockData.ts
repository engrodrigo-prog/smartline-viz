export const regioes = ['A', 'B', 'C'] as const;

export const linhas = [
  { id: 'LT-001', nome: 'Linha 1 - SP Norte', ramais: ['R1', 'R2', 'R3'] },
  { id: 'LT-002', nome: 'Linha 2 - SP Sul', ramais: ['R1', 'R2'] },
  { id: 'LT-003', nome: 'Linha 3 - Litoral', ramais: ['R1', 'R2', 'R3', 'R4'] },
];

export type Criticidade = 'Baixa' | 'Média' | 'Alta';
export type TipoEvento = 'Vegetação' | 'Travessias' | 'Estruturas' | 'Emendas' | 'Compliance' | 'Sensores' | 'Drones' | 'Eventos';

export type Evento = {
  id: string;
  tipo: TipoEvento;
  regiao: 'A' | 'B' | 'C';
  linha: string;
  ramal?: string;
  data: string;
  criticidade: Criticidade;
  status: 'OK' | 'Alerta' | 'Crítico' | 'Pendente';
  nome: string;
  descricao?: string;
  coords?: [number, number];
  imagens?: string[];
};

// Generate 100+ varied events
const tiposEvento: TipoEvento[] = ['Vegetação', 'Travessias', 'Estruturas', 'Emendas', 'Compliance', 'Sensores', 'Drones', 'Eventos'];
const criticidades: Criticidade[] = ['Baixa', 'Média', 'Alta'];
const statuses = ['OK', 'Alerta', 'Crítico', 'Pendente'] as const;

export const eventos: Evento[] = Array.from({ length: 120 }, (_, i) => {
  const tipo = tiposEvento[Math.floor(Math.random() * tiposEvento.length)];
  const regiao = regioes[Math.floor(Math.random() * regioes.length)];
  const linha = linhas[Math.floor(Math.random() * linhas.length)];
  const ramal = linha.ramais[Math.floor(Math.random() * linha.ramais.length)];
  
  let lat = -23.55 + (Math.random() - 0.5) * 1.0;
  let lon = -46.63 + (Math.random() - 0.5) * 1.0;
  // Clamp para manter pontos em terra (evita oceano a leste)
  if (lon > -45.9) lon = -45.9 - Math.random() * 0.4;
  if (lat < -24.5) lat = -24.5 + Math.random() * 0.6;
  if (lat > -22.5) lat = -22.5 - Math.random() * 0.6;

  return {
    id: `EVT-${String(i + 1).padStart(4, '0')}`,
    tipo,
    regiao,
    linha: linha.id,
    ramal,
    data: new Date(2025 - Math.random() * 2, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
    criticidade: criticidades[Math.floor(Math.random() * criticidades.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    nome: `${tipo} - ${linha.nome} ${ramal}`,
    descricao: `Evento de ${tipo.toLowerCase()} identificado na ${linha.nome}, ${ramal}`,
    coords: [
      -23.55 + (Math.random() - 0.5) * 10,
      -46.63 + (Math.random() - 0.5) * 10
    ],
  };
});

export type UploadItem = {
  id: string;
  nome: string;
  mime: string;
  regiao: 'A' | 'B' | 'C';
  linha: string;
  ramal: string;
  categoria: string;
  descricao?: string;
  ts: string;
  url?: string;
};

export const uploads: UploadItem[] = [];

// Dados de Missões de Drones
export type MissaoDrone = {
  id: string;
  nome: string;
  linha: string;
  ramal: string;
  status: 'Planejada' | 'Em Progresso' | 'Concluída' | 'Cancelada';
  data: string;
  piloto: string;
  kmInspecionados: number;
  anomaliasDetectadas: number;
  coords?: [number, number];
};

export const missoesDrones: MissaoDrone[] = [
  {
    id: 'MIS-001',
    nome: 'Inspeção LT-001 R1',
    linha: 'LT-001',
    ramal: 'R1',
    status: 'Concluída',
    data: new Date(2025, 9, 5).toISOString(),
    piloto: 'João Silva',
    kmInspecionados: 12.5,
    anomaliasDetectadas: 3,
    coords: [-23.55, -46.63],
  },
  {
    id: 'MIS-002',
    nome: 'Inspeção LT-002 R2',
    linha: 'LT-002',
    ramal: 'R2',
    status: 'Em Progresso',
    data: new Date(2025, 9, 8).toISOString(),
    piloto: 'Maria Santos',
    kmInspecionados: 8.2,
    anomaliasDetectadas: 1,
    coords: [-23.58, -46.65],
  },
  {
    id: 'MIS-003',
    nome: 'Inspeção LT-003 R1',
    linha: 'LT-003',
    ramal: 'R1',
    status: 'Planejada',
    data: new Date(2025, 9, 15).toISOString(),
    piloto: 'Carlos Oliveira',
    kmInspecionados: 0,
    anomaliasDetectadas: 0,
    coords: [-23.52, -46.60],
  },
  {
    id: 'MIS-004',
    nome: 'Inspeção LT-001 R3',
    linha: 'LT-001',
    ramal: 'R3',
    status: 'Concluída',
    data: new Date(2025, 8, 28).toISOString(),
    piloto: 'Ana Costa',
    kmInspecionados: 15.3,
    anomaliasDetectadas: 5,
    coords: [-23.56, -46.62],
  },
];

// Extensões de linha em km
export const extensoesLinhas: Record<string, number> = {
  "LT-001": 245,
  "LT-002": 312,
  "LT-003": 198,
};

// Função para calcular taxa de falha por km
export const calcularTaxaFalha = (eventosParam: Evento[], linhasFiltradas?: string[]) => {
  const eventosFiltrados = linhasFiltradas 
    ? eventosParam.filter(e => linhasFiltradas.includes(e.linha))
    : eventosParam;
  
  const totalEventos = eventosFiltrados.length;
  const extensaoTotal = linhasFiltradas
    ? linhasFiltradas.reduce((acc, linha) => acc + (extensoesLinhas[linha] || 0), 0)
    : Object.values(extensoesLinhas).reduce((acc, ext) => acc + ext, 0);
  
  return extensaoTotal > 0 ? (totalEventos / extensaoTotal).toFixed(3) : "0.000";
};

export const kpiData = {
  totalEventos: eventos.length,
  criticos: eventos.filter(e => e.criticidade === 'Alta').length,
  pendentes: eventos.filter(e => e.status === 'Pendente').length,
  resolvidos: eventos.filter(e => e.status === 'OK').length,
  taxaFalhaPorKm: calcularTaxaFalha(eventos),
};

export interface SensorData {
  id: string;
  name: string;
  type: string;
  location: { lat: number; lng: number };
  temperature?: number;
  humidity?: number;
  wind?: number;
  corrosion?: number;
  vibration?: number;
  luminosity?: number;
  status: "normal" | "warning" | "critical";
  lastUpdate: string;
}

export const mockSensors: SensorData[] = [
  {
    id: "S001",
    name: "Torre Norte - Setor A",
    type: "Meteorológico",
    location: { lat: -23.5505, lng: -46.6333 },
    temperature: 28.5,
    humidity: 65,
    wind: 15.2,
    status: "normal",
    lastUpdate: new Date().toISOString(),
  },
  {
    id: "S002",
    name: "Subestação Central",
    type: "Estrutural",
    location: { lat: -23.5605, lng: -46.6433 },
    corrosion: 12.3,
    vibration: 3.2,
    status: "warning",
    lastUpdate: new Date().toISOString(),
  },
  {
    id: "S003",
    name: "Linha de Transmissão Sul",
    type: "Câmera + IoT",
    location: { lat: -23.5705, lng: -46.6533 },
    temperature: 32.1,
    luminosity: 85000,
    vibration: 1.8,
    status: "normal",
    lastUpdate: new Date().toISOString(),
  },
  {
    id: "S004",
    name: "Torre Leste - Zona Rural",
    type: "Meteorológico",
    location: { lat: -23.5405, lng: -46.6233 },
    temperature: 26.8,
    humidity: 72,
    wind: 22.5,
    status: "warning",
    lastUpdate: new Date().toISOString(),
  },
  {
    id: "S005",
    name: "Ponto Crítico - Área Urbana",
    type: "Estrutural",
    location: { lat: -23.5805, lng: -46.6633 },
    corrosion: 45.7,
    vibration: 8.9,
    status: "critical",
    lastUpdate: new Date().toISOString(),
  },
];

export interface AssetData {
  id: string;
  name: string;
  type: "torre" | "subestacao" | "linha" | "travessia";
  status: "operational" | "maintenance" | "critical";
  location: { lat: number; lng: number };
  healthScore: number;
  lastInspection: string;
}

export const mockAssets: AssetData[] = [
  {
    id: "A001",
    name: "Torre TRN-001",
    type: "torre",
    status: "operational",
    location: { lat: -23.5505, lng: -46.6333 },
    healthScore: 92,
    lastInspection: new Date("2025-09-15").toISOString(),
  },
  {
    id: "A002",
    name: "Subestação SE-Central",
    type: "subestacao",
    status: "operational",
    location: { lat: -23.5605, lng: -46.6433 },
    healthScore: 88,
    lastInspection: new Date("2025-09-20").toISOString(),
  },
  {
    id: "A003",
    name: "Linha LT-500kV-Sul",
    type: "linha",
    status: "maintenance",
    location: { lat: -23.5705, lng: -46.6533 },
    healthScore: 75,
    lastInspection: new Date("2025-08-30").toISOString(),
  },
  {
    id: "A004",
    name: "Travessia Rio Tietê",
    type: "travessia",
    status: "operational",
    location: { lat: -23.5405, lng: -46.6233 },
    healthScore: 95,
    lastInspection: new Date("2025-09-25").toISOString(),
  },
  {
    id: "A005",
    name: "Torre TRN-045",
    type: "torre",
    status: "critical",
    location: { lat: -23.5805, lng: -46.6633 },
    healthScore: 58,
    lastInspection: new Date("2025-07-15").toISOString(),
  },
];

export const mockChartData = {
  performance: [
    { region: "Norte", value: 92, target: 95 },
    { region: "Sul", value: 87, target: 95 },
    { region: "Leste", value: 94, target: 95 },
    { region: "Oeste", value: 89, target: 95 },
    { region: "Centro", value: 96, target: 95 },
  ],
  timeline: Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    operational: Math.floor(Math.random() * 20) + 80,
    maintenance: Math.floor(Math.random() * 10) + 5,
    critical: Math.floor(Math.random() * 5) + 1,
  })),
  alerts: [
    { type: "Estrutural", count: 23 },
    { type: "Ambiental", count: 15 },
    { type: "Operacional", count: 8 },
    { type: "Sensores", count: 12 },
  ],
  weather: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    temperature: 20 + Math.sin(i / 3.8) * 8,
    humidity: 50 + Math.cos(i / 4) * 20,
  })),
};

// ============= NOVOS TIPOS E DADOS EXPANDIDOS =============

// Áreas Alagadas
export type AreaAlagada = {
  id: string;
  nome: string;
  regiao: 'A' | 'B' | 'C';
  linha: string;
  ramal: string;
  coords: [number, number];
  areaCritica: number; // em km²
  nivelRisco: 'Baixo' | 'Médio' | 'Alto';
  ultimaAtualizacao: string;
  status: 'Monitorado' | 'Alerta' | 'Crítico';
  torres_afetadas: string[];
  protecao_instalada?: boolean;
};

export const areasAlagadas: AreaAlagada[] = Array.from({ length: 45 }, (_, i) => {
  const linha = linhas[Math.floor(Math.random() * linhas.length)];
  const ramal = linha.ramais[Math.floor(Math.random() * linha.ramais.length)];
  const numTorres = Math.floor(Math.random() * 8) + 2;
  // Coordenadas simuladas próximas à RMSP
  const lat = -23.55 + (Math.random() - 0.5) * 2;
  const lon = -46.63 + (Math.random() - 0.5) * 2;
  
  return {
    id: `ALG-${String(i + 1).padStart(3, '0')}`,
    nome: `Área Alagada ${i + 1}`,
    regiao: regioes[Math.floor(Math.random() * regioes.length)],
    linha: linha.id,
    ramal,
    // Mantém em faixa continental (não crítico para mock)
    coords: [lat, lon],
    areaCritica: parseFloat((Math.random() * 5 + 0.5).toFixed(2)),
    nivelRisco: ['Baixo', 'Médio', 'Alto'][Math.floor(Math.random() * 3)] as any,
    ultimaAtualizacao: new Date(2025, 9, Math.floor(Math.random() * 30) + 1).toISOString(),
    status: ['Monitorado', 'Alerta', 'Crítico'][Math.floor(Math.random() * 3)] as any,
    torres_afetadas: Array.from({ length: numTorres }, (_, j) => `TRN-${String(i * 10 + j).padStart(3, '0')}`),
    protecao_instalada: Math.random() > 0.6,
  };
});

// Ocupação de Faixa
export type OcupacaoFaixa = {
  id: string;
  nome: string;
  tipo: 'Residencial' | 'Comercial' | 'Agrícola' | 'Industrial';
  regiao: 'A' | 'B' | 'C';
  linha: string;
  ramal: string;
  coords: [number, number];
  situacao: 'Regular' | 'Irregular' | 'Em Regularização';
  distanciaFaixa: number; // em metros
  prazoRegularizacao?: string;
  responsavel?: string;
};

export const ocupacoesFaixa: OcupacaoFaixa[] = Array.from({ length: 35 }, (_, i) => {
  const linha = linhas[Math.floor(Math.random() * linhas.length)];
  const ramal = linha.ramais[Math.floor(Math.random() * linha.ramais.length)];
  const tipos: OcupacaoFaixa['tipo'][] = ['Residencial', 'Comercial', 'Agrícola', 'Industrial'];
  const situacoes: OcupacaoFaixa['situacao'][] = ['Regular', 'Irregular', 'Em Regularização'];
  const situacao = situacoes[Math.floor(Math.random() * situacoes.length)];
  
  return {
    id: `OCP-${String(i + 1).padStart(3, '0')}`,
    nome: `Ocupação ${i + 1}`,
    tipo: tipos[Math.floor(Math.random() * tipos.length)],
    regiao: regioes[Math.floor(Math.random() * regioes.length)],
    linha: linha.id,
    ramal,
    coords: [
      -23.55 + (Math.random() - 0.5) * 2,
      -46.63 + (Math.random() - 0.5) * 2
    ],
    situacao,
    distanciaFaixa: Math.floor(Math.random() * 150) + 10,
    prazoRegularizacao: situacao === 'Em Regularização' ? new Date(2025, 11, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0] : undefined,
    responsavel: situacao !== 'Regular' ? `Responsável ${i + 1}` : undefined,
  };
});

// Proteção de Pássaros
export type ProtecaoPássaros = {
  id: string;
  torre: string;
  linha: string;
  ramal: string;
  coords: [number, number];
  tipo: 'Flight Diverter' | 'Bird Guard' | 'Spiral Vibration';
  dataInstalacao: string;
  status: 'Instalado' | 'Manutenção' | 'Pendente';
  efetividade: number; // percentual
  especies_protegidas: string[];
};

const especiesProtegidas = ['Gavião', 'Coruja', 'Águia', 'Falcão', 'Urubu', 'Papagaio'];

export const protecoesPássaros: ProtecaoPássaros[] = Array.from({ length: 60 }, (_, i) => {
  const linha = linhas[Math.floor(Math.random() * linhas.length)];
  const ramal = linha.ramais[Math.floor(Math.random() * linha.ramais.length)];
  const tipos: ProtecaoPássaros['tipo'][] = ['Flight Diverter', 'Bird Guard', 'Spiral Vibration'];
  
  return {
    id: `PRT-${String(i + 1).padStart(3, '0')}`,
    torre: `TRN-${String(Math.floor(Math.random() * 450)).padStart(3, '0')}`,
    linha: linha.id,
    ramal,
    coords: [
      -23.55 + (Math.random() - 0.5) * 2,
      -46.63 + (Math.random() - 0.5) * 2
    ],
    tipo: tipos[Math.floor(Math.random() * tipos.length)],
    dataInstalacao: new Date(2024 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
    status: ['Instalado', 'Manutenção', 'Pendente'][Math.floor(Math.random() * 3)] as any,
    efetividade: Math.floor(Math.random() * 30) + 70,
    especies_protegidas: Array.from(
      { length: Math.floor(Math.random() * 3) + 1 },
      () => especiesProtegidas[Math.floor(Math.random() * especiesProtegidas.length)]
    ),
  };
});

// Emendas e Conexões
export type Emenda = {
  id: string;
  nome: string;
  torre: string;
  linha: string;
  ramal: string;
  coords: [number, number];
  tipo: 'Compressão' | 'Explosiva' | 'Mecânica';
  temperatura?: number;
  aquecimentoDetectado: boolean;
  ultimaInspecao: string;
  statusTermico: 'Normal' | 'Atenção' | 'Crítico';
  manutencaoRequerida: boolean;
};

export const emendas: Emenda[] = Array.from({ length: 80 }, (_, i) => {
  const linha = linhas[Math.floor(Math.random() * linhas.length)];
  const ramal = linha.ramais[Math.floor(Math.random() * linha.ramais.length)];
  const temperatura = Math.floor(Math.random() * 50) + 20;
  const statusTermico = temperatura > 60 ? 'Crítico' : temperatura > 45 ? 'Atenção' : 'Normal';
  
  const torreId = `TRN-${String(Math.floor(Math.random() * 450)).padStart(3, '0')}`;
  
  return {
    id: `EMD-${String(i + 1).padStart(3, '0')}`,
    nome: `Emenda ${i + 1} - ${torreId}`,
    torre: torreId,
    linha: linha.id,
    ramal,
    coords: [
      -23.55 + (Math.random() - 0.5) * 2,
      -46.63 + (Math.random() - 0.5) * 2
    ],
    tipo: ['Compressão', 'Explosiva', 'Mecânica'][Math.floor(Math.random() * 3)] as any,
    temperatura,
    aquecimentoDetectado: temperatura > 45,
    ultimaInspecao: new Date(2025, Math.floor(Math.random() * 10), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
    statusTermico: statusTermico as any,
    manutencaoRequerida: statusTermico !== 'Normal',
  };
});

// Erosão
export type Erosao = {
  id: string;
  nome: string;
  regiao: 'A' | 'B' | 'C';
  linha: string;
  ramal: string;
  coords: [number, number];
  tipoErosao: 'Superficial' | 'Laminar' | 'Voçoroca' | 'Ravina';
  gravidadeErosao: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  areaAfetada: number; // em m²
  proximidadeEstrutura: number; // em metros
  torres_proximas: string[];
  status: 'Monitorado' | 'Em Intervenção' | 'Estabilizado' | 'Crítico';
  ultimaInspecao: string;
  acoesPreventivasRealizadas?: string[];
  riscoDesmoronamento: boolean;
};

const tiposErosao: Erosao['tipoErosao'][] = ['Superficial', 'Laminar', 'Voçoroca', 'Ravina'];
const gravidadesErosao: Erosao['gravidadeErosao'][] = ['Baixa', 'Média', 'Alta', 'Crítica'];
const statusErosao: Erosao['status'][] = ['Monitorado', 'Em Intervenção', 'Estabilizado', 'Crítico'];

export const erosoes: Erosao[] = Array.from({ length: 40 }, (_, i) => {
  const linha = linhas[Math.floor(Math.random() * linhas.length)];
  const ramal = linha.ramais[Math.floor(Math.random() * linha.ramais.length)];
  const numTorres = Math.floor(Math.random() * 5) + 2;
  const gravidade = gravidadesErosao[Math.floor(Math.random() * gravidadesErosao.length)];
  const acoesPreventivas = [
    'Revegetação da área',
    'Drenagem instalada',
    'Contenção com geotêxtil',
    'Terraceamento realizado',
    'Barreiras físicas instaladas',
    'Monitoramento semanal'
  ];
  
  return {
    id: `ERO-${String(i + 1).padStart(3, '0')}`,
    nome: `Erosão ${i + 1}`,
    regiao: regioes[Math.floor(Math.random() * regioes.length)],
    linha: linha.id,
    ramal,
    coords: [
      -23.55 + (Math.random() - 0.5) * 2,
      -46.63 + (Math.random() - 0.5) * 2
    ],
    tipoErosao: tiposErosao[Math.floor(Math.random() * tiposErosao.length)],
    gravidadeErosao: gravidade,
    areaAfetada: Math.floor(Math.random() * 4950) + 50,
    proximidadeEstrutura: Math.floor(Math.random() * 195) + 5,
    torres_proximas: Array.from({ length: numTorres }, (_, j) => `TRN-${String(i * 10 + j).padStart(3, '0')}`),
    status: statusErosao[Math.floor(Math.random() * statusErosao.length)],
    ultimaInspecao: new Date(2025, Math.floor(Math.random() * 10), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
    acoesPreventivasRealizadas: gravidade !== 'Baixa' 
      ? Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => acoesPreventivas[Math.floor(Math.random() * acoesPreventivas.length)])
      : undefined,
    riscoDesmoronamento: gravidade === 'Alta' || gravidade === 'Crítica',
  };
});

// NDVI — Jundiaí mock polygons
export const ndviJundiai: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        ndvi: 0.72,
        area: "Serra do Japi",
        color: "#15803d",
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-46.983, -23.180],
          [-46.925, -23.180],
          [-46.925, -23.230],
          [-46.983, -23.230],
          [-46.983, -23.180],
        ]],
      },
    },
    {
      type: "Feature",
      properties: {
        ndvi: 0.48,
        area: "Zona urbana",
        color: "#facc15",
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-46.925, -23.180],
          [-46.865, -23.180],
          [-46.865, -23.230],
          [-46.925, -23.230],
          [-46.925, -23.180],
        ]],
      },
    },
    {
      type: "Feature",
      properties: {
        ndvi: 0.18,
        area: "Distrito industrial",
        color: "#f97316",
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-46.865, -23.180],
          [-46.805, -23.180],
          [-46.805, -23.230],
          [-46.865, -23.230],
          [-46.865, -23.180],
        ]],
      },
    },
    {
      type: "Feature",
      properties: {
        ndvi: 0.35,
        area: "Vale do Jundiaí",
        color: "#4ade80",
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-46.925, -23.230],
          [-46.865, -23.230],
          [-46.865, -23.280],
          [-46.925, -23.280],
          [-46.925, -23.230],
        ]],
      },
    },
  ],
};

// Queimadas
export type Queimada = {
  id: string;
  nome: string;
  regiao: 'A' | 'B' | 'C';
  linha: string;
  ramal: string;
  coords: [number, number];
  dataDeteccao: string;
  tipoQueimada: 'Controlada' | 'Acidental' | 'Criminosa' | 'Natural';
  extensaoQueimada: number; // em hectares
  statusIncendio: 'Ativo' | 'Controlado' | 'Extinto';
  nivelRisco: 'Baixo' | 'Médio' | 'Alto' | 'Crítico';
  distanciaLinha: number; // em metros
  torres_ameacadas: string[];
  equipesAcionadas?: string[];
  danosCausados?: string;
  climaNoMomento: {
    temperatura: number;
    umidade: number;
    ventoKmh: number;
  };
};

const tiposQueimada: Queimada['tipoQueimada'][] = ['Controlada', 'Acidental', 'Criminosa', 'Natural'];
const statusIncendio: Queimada['statusIncendio'][] = ['Ativo', 'Controlado', 'Extinto'];
const niveisRisco: Queimada['nivelRisco'][] = ['Baixo', 'Médio', 'Alto', 'Crítico'];

export const queimadas: Queimada[] = Array.from({ length: 30 }, (_, i) => {
  const linha = linhas[Math.floor(Math.random() * linhas.length)];
  const ramal = linha.ramais[Math.floor(Math.random() * linha.ramais.length)];
  const numTorres = Math.floor(Math.random() * 8) + 1;
  const status = statusIncendio[Math.floor(Math.random() * statusIncendio.length)];
  const nivelRisco = niveisRisco[Math.floor(Math.random() * niveisRisco.length)];
  const temperatura = Math.floor(Math.random() * 17) + 25;
  const numEquipes = status === 'Ativo' ? Math.floor(Math.random() * 3) + 2 : status === 'Controlado' ? Math.floor(Math.random() * 2) + 1 : 0;
  
  const danosPossiveis = [
    'Vegetação próxima à linha afetada',
    'Isoladores danificados pelo calor',
    'Estruturas metálicas com oxidação acelerada',
    'Cabos de comunicação comprometidos',
    'Acesso dificultado à área'
  ];
  
  return {
    id: `QMD-${String(i + 1).padStart(3, '0')}`,
    nome: `Queimada ${i + 1}`,
    regiao: regioes[Math.floor(Math.random() * regioes.length)],
    linha: linha.id,
    ramal,
    coords: [
      -23.55 + (Math.random() - 0.5) * 2,
      -46.63 + (Math.random() - 0.5) * 2
    ],
    dataDeteccao: new Date(2025, Math.floor(Math.random() * 10), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
    tipoQueimada: tiposQueimada[Math.floor(Math.random() * tiposQueimada.length)],
    extensaoQueimada: parseFloat((Math.random() * 49.5 + 0.5).toFixed(1)),
    statusIncendio: status,
    nivelRisco,
    distanciaLinha: Math.floor(Math.random() * 2900) + 100,
    torres_ameacadas: Array.from({ length: numTorres }, (_, j) => `TRN-${String(i * 10 + j + 100).padStart(3, '0')}`),
    equipesAcionadas: numEquipes > 0 
      ? Array.from({ length: numEquipes }, (_, j) => `Equipe ${String.fromCharCode(65 + j)} - Brigada de Incêndio`)
      : undefined,
    danosCausados: status !== 'Ativo' && Math.random() > 0.5 
      ? danosPossiveis[Math.floor(Math.random() * danosPossiveis.length)]
      : undefined,
    climaNoMomento: {
      temperatura,
      umidade: Math.floor(Math.random() * 55) + 15,
      ventoKmh: Math.floor(Math.random() * 40) + 5,
    },
  };
});

// Câmeras
export type Camera = {
  id: string;
  nome: string;
  linha: string;
  ramal: string;
  torre?: string;
  coords: [number, number];
  status: 'Online' | 'Offline' | 'Manutenção';
  ultimoFrame: string;
  gravando: boolean;
  eventosDetectados24h: number;
  resolucao: string;
  angulo: number;
};

// Gestão de Equipes
export type MembroEquipe = {
  id: string;
  nome: string;
  cargo: 'Eletricista' | 'Técnico' | 'Engenheiro' | 'Piloto Drone' | 'Operador' | 'Supervisor';
  especialidades: string[];
  foto?: string;
  telefone: string;
  email: string;
  status: 'Disponível' | 'Em Campo' | 'Indisponível' | 'Férias';
  localizacaoAtual?: [number, number];
  certificacoes: Array<{
    nome: string;
    validade: string;
    status: 'Válida' | 'Vencida' | 'Próximo ao Vencimento';
  }>;
  horasTrabalhadas: {
    semana: number;
    mes: number;
  };
};

export type Equipe = {
  id: string;
  nome: string;
  lider: string;
  membros: string[];
  regiao: 'A' | 'B' | 'C';
  especialidade: 'Manutenção' | 'Inspeção' | 'Emergência' | 'Drones' | 'Vegetação';
  status: 'Ativa' | 'Stand-by' | 'Em Missão' | 'Inativa';
  veiculoAtribuido?: string;
  ultimaMissao?: {
    data: string;
    local: string;
    resultado: string;
  };
};

export type Escala = {
  id: string;
  equipe: string;
  dataInicio: string;
  dataFim: string;
  turno: 'Diurno' | 'Noturno' | '24h' | 'Plantão';
  atividades: Array<{
    hora: string;
    atividade: string;
    status: 'Pendente' | 'Em Andamento' | 'Concluída';
  }>;
  observacoes?: string;
};

export type Veiculo = {
  id: string;
  placa: string;
  modelo: string;
  tipo: 'Caminhonete' | 'Van' | 'Caminhão Cesto' | 'SUV';
  status: 'Disponível' | 'Em Uso' | 'Manutenção' | 'Indisponível';
  localizacaoAtual?: [number, number];
  equipePrincipal?: string;
  kmRodados: number;
  proximaRevisao: {
    km: number;
    data: string;
  };
  equipamentos: string[];
};

export type ChecklistOperacional = {
  id: string;
  equipe: string;
  data: string;
  tipo: 'Pré-Operacional' | 'Pós-Operacional' | 'Inspeção Veículo' | 'EPIs';
  itens: Array<{
    descricao: string;
    verificado: boolean;
    observacao?: string;
    foto?: string;
  }>;
  aprovado: boolean;
  responsavel: string;
};

export const cameras: Camera[] = Array.from({ length: 25 }, (_, i) => {
  const linha = linhas[Math.floor(Math.random() * linhas.length)];
  const ramal = linha.ramais[Math.floor(Math.random() * linha.ramais.length)];
  const status = ['Online', 'Offline', 'Manutenção'][Math.floor(Math.random() * 3)] as any;
  
  return {
    id: `CAM-${String(i + 1).padStart(3, '0')}`,
    nome: `Câmera ${i + 1}`,
    linha: linha.id,
    ramal,
    torre: Math.random() > 0.3 ? `TRN-${String(Math.floor(Math.random() * 450)).padStart(3, '0')}` : undefined,
    coords: [
      -23.55 + (Math.random() - 0.5) * 2,
      -46.63 + (Math.random() - 0.5) * 2
    ],
    status,
    ultimoFrame: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    gravando: status === 'Online' && Math.random() > 0.2,
    eventosDetectados24h: status === 'Online' ? Math.floor(Math.random() * 15) : 0,
    resolucao: ['1080p', '4K', '720p'][Math.floor(Math.random() * 3)],
    angulo: Math.floor(Math.random() * 180) + 90,
  };
});

// Membros de Equipe Mock Data
export const membrosEquipe: MembroEquipe[] = [
  {
    id: 'MBR-001',
    nome: 'Carlos Silva',
    cargo: 'Engenheiro',
    especialidades: ['LIDAR', 'Estruturas', 'Análise Técnica'],
    telefone: '(61) 98765-4321',
    email: 'carlos.silva@smartline.com',
    status: 'Em Campo',
    localizacaoAtual: [-15.7942, -47.8822],
    certificacoes: [
      { nome: 'NR-10', validade: '2025-12-15', status: 'Válida' },
      { nome: 'NR-35', validade: '2025-08-20', status: 'Válida' },
    ],
    horasTrabalhadas: { semana: 42, mes: 168 },
  },
  {
    id: 'MBR-002',
    nome: 'Ana Paula Costa',
    cargo: 'Piloto Drone',
    especialidades: ['Inspeção Aérea', 'Fotogrametria', 'Missões Autônomas'],
    telefone: '(61) 98765-4322',
    email: 'ana.costa@smartline.com',
    status: 'Disponível',
    certificacoes: [
      { nome: 'ANAC - Drone', validade: '2026-03-10', status: 'Válida' },
      { nome: 'Operador Avançado', validade: '2025-11-05', status: 'Válida' },
    ],
    horasTrabalhadas: { semana: 38, mes: 152 },
  },
  {
    id: 'MBR-003',
    nome: 'Roberto Santos',
    cargo: 'Eletricista',
    especialidades: ['Manutenção', 'Instalação', 'Emergência'],
    telefone: '(61) 98765-4323',
    email: 'roberto.santos@smartline.com',
    status: 'Em Campo',
    localizacaoAtual: [-15.8100, -47.9000],
    certificacoes: [
      { nome: 'NR-10', validade: '2025-06-15', status: 'Próximo ao Vencimento' },
      { nome: 'NR-35', validade: '2026-01-10', status: 'Válida' },
    ],
    horasTrabalhadas: { semana: 45, mes: 180 },
  },
  {
    id: 'MBR-004',
    nome: 'Juliana Oliveira',
    cargo: 'Técnico',
    especialidades: ['Sensores IoT', 'Calibração', 'Manutenção Preventiva'],
    telefone: '(61) 98765-4324',
    email: 'juliana.oliveira@smartline.com',
    status: 'Disponível',
    certificacoes: [
      { nome: 'NR-10', validade: '2026-02-20', status: 'Válida' },
    ],
    horasTrabalhadas: { semana: 40, mes: 160 },
  },
  {
    id: 'MBR-005',
    nome: 'Fernando Lima',
    cargo: 'Supervisor',
    especialidades: ['Gestão de Equipes', 'Planejamento', 'Compliance'],
    telefone: '(61) 98765-4325',
    email: 'fernando.lima@smartline.com',
    status: 'Disponível',
    certificacoes: [
      { nome: 'Gestão de Projetos', validade: '2027-01-15', status: 'Válida' },
      { nome: 'NR-10', validade: '2025-09-10', status: 'Válida' },
    ],
    horasTrabalhadas: { semana: 40, mes: 160 },
  },
];

// Equipes Mock Data
export const equipes: Equipe[] = [
  {
    id: 'EQ-001',
    nome: 'Equipe Alpha',
    lider: 'MBR-005',
    membros: ['MBR-001', 'MBR-003'],
    regiao: 'A',
    especialidade: 'Manutenção',
    status: 'Em Missão',
    veiculoAtribuido: 'VEI-001',
    ultimaMissao: {
      data: '2025-01-08',
      local: 'Torre TRN-045',
      resultado: 'Manutenção preventiva concluída',
    },
  },
  {
    id: 'EQ-002',
    nome: 'Equipe Bravo',
    lider: 'MBR-002',
    membros: ['MBR-002', 'MBR-004'],
    regiao: 'B',
    especialidade: 'Drones',
    status: 'Ativa',
    veiculoAtribuido: 'VEI-002',
    ultimaMissao: {
      data: '2025-01-07',
      local: 'LT-500kV Sul',
      resultado: 'Inspeção aérea - 5 anomalias detectadas',
    },
  },
  {
    id: 'EQ-003',
    nome: 'Equipe Charlie',
    lider: 'MBR-005',
    membros: ['MBR-001', 'MBR-004'],
    regiao: 'C',
    especialidade: 'Inspeção',
    status: 'Stand-by',
    veiculoAtribuido: 'VEI-003',
  },
];

// Veículos Mock Data
export const veiculos: Veiculo[] = [
  {
    id: 'VEI-001',
    placa: 'ABC-1234',
    modelo: 'Toyota Hilux 4x4',
    tipo: 'Caminhonete',
    status: 'Em Uso',
    localizacaoAtual: [-15.7942, -47.8822],
    equipePrincipal: 'EQ-001',
    kmRodados: 45230,
    proximaRevisao: { km: 50000, data: '2025-03-15' },
    equipamentos: ['Ferramentas Elétricas', 'EPIs', 'Materiais de Sinalização'],
  },
  {
    id: 'VEI-002',
    placa: 'DEF-5678',
    modelo: 'Fiat Ducato',
    tipo: 'Van',
    status: 'Disponível',
    equipePrincipal: 'EQ-002',
    kmRodados: 32100,
    proximaRevisao: { km: 35000, data: '2025-02-20' },
    equipamentos: ['Drones DJI', 'Estação Base', 'Câmeras Térmicas'],
  },
  {
    id: 'VEI-003',
    placa: 'GHI-9012',
    modelo: 'Mercedes-Benz Atego',
    tipo: 'Caminhão Cesto',
    status: 'Manutenção',
    equipePrincipal: 'EQ-003',
    kmRodados: 78450,
    proximaRevisao: { km: 80000, data: '2025-01-25' },
    equipamentos: ['Cesto Aéreo', 'Ferramentas Pesadas', 'Materiais de Reparo'],
  },
  {
    id: 'VEI-004',
    placa: 'JKL-3456',
    modelo: 'Ford Ranger 4x4',
    tipo: 'Caminhonete',
    status: 'Disponível',
    kmRodados: 22300,
    proximaRevisao: { km: 30000, data: '2025-05-10' },
    equipamentos: ['Kit Primeiros Socorros', 'EPIs', 'Rádio Comunicação'],
  },
];

// Escalas Mock Data
export const escalas: Escala[] = [
  {
    id: 'ESC-001',
    equipe: 'EQ-001',
    dataInicio: '2025-01-08 08:00',
    dataFim: '2025-01-08 18:00',
    turno: 'Diurno',
    atividades: [
      { hora: '08:00', atividade: 'Briefing e preparação', status: 'Concluída' },
      { hora: '09:00', atividade: 'Deslocamento para Torre TRN-045', status: 'Concluída' },
      { hora: '10:30', atividade: 'Manutenção preventiva', status: 'Em Andamento' },
      { hora: '15:00', atividade: 'Relatório e retorno', status: 'Pendente' },
    ],
    observacoes: 'Condições climáticas favoráveis',
  },
  {
    id: 'ESC-002',
    equipe: 'EQ-002',
    dataInicio: '2025-01-08 07:00',
    dataFim: '2025-01-08 17:00',
    turno: 'Diurno',
    atividades: [
      { hora: '07:00', atividade: 'Preparação de drones', status: 'Concluída' },
      { hora: '08:00', atividade: 'Voo de inspeção - Trecho A', status: 'Concluída' },
      { hora: '12:00', atividade: 'Almoço', status: 'Concluída' },
      { hora: '13:00', atividade: 'Voo de inspeção - Trecho B', status: 'Pendente' },
    ],
  },
];

// Checklists Mock Data
export const checklists: ChecklistOperacional[] = [
  {
    id: 'CHK-001',
    equipe: 'EQ-001',
    data: '2025-01-08',
    tipo: 'Pré-Operacional',
    itens: [
      { descricao: 'Verificação de EPIs', verificado: true },
      { descricao: 'Inspeção visual do veículo', verificado: true },
      { descricao: 'Teste de equipamentos elétricos', verificado: true },
      { descricao: 'Comunicação com base estabelecida', verificado: true },
      { descricao: 'Briefing de segurança realizado', verificado: true },
    ],
    aprovado: true,
    responsavel: 'MBR-005',
  },
  {
    id: 'CHK-002',
    equipe: 'EQ-002',
    data: '2025-01-08',
    tipo: 'Inspeção Veículo',
    itens: [
      { descricao: 'Nível de óleo', verificado: true },
      { descricao: 'Pressão dos pneus', verificado: true },
      { descricao: 'Luzes e sinalização', verificado: true },
      { descricao: 'Freios', verificado: false, observacao: 'Necessita ajuste' },
      { descricao: 'Extintor de incêndio', verificado: true },
    ],
    aprovado: false,
    responsavel: 'MBR-002',
  },
];

// ================= QUIZZES (DEMO) =================
import type { Quiz } from "@/lib/quizTypes";

export const quizzes: Quiz[] = [
  {
    id: 'QZ-001',
    title: 'Segurança em Campo – NR-10/NR-35',
    description: 'Boas práticas de segurança em trabalhos elétricos e em altura.',
    tags: ['segurança', 'normas'],
    pointsPerQuestion: 10,
    randomized: true,
    questions: [
      {
        id: 'Q1',
        text: 'Qual EPI é indispensável em trabalho em altura (NR-35)?',
        choices: [
          { id: 'Q1A', text: 'Capacete com jugular', correct: true },
          { id: 'Q1B', text: 'Protetor auricular' },
          { id: 'Q1C', text: 'Óculos escuros' },
          { id: 'Q1D', text: 'Luvas nitrílicas' },
        ],
        explanation: 'O capacete com jugular evita a perda do EPI e protege a cabeça em quedas ou impactos.',
      },
      {
        id: 'Q2',
        text: 'Antes de iniciar serviço elétrico (NR-10), deve-se:',
        choices: [
          { id: 'Q2A', text: 'Sinalizar área e desenergizar circuito', correct: true },
          { id: 'Q2B', text: 'Manter circuitos energizados para testar ao vivo' },
          { id: 'Q2C', text: 'Usar apenas luvas comuns' },
          { id: 'Q2D', text: 'Ignorar a análise de risco' },
        ],
        explanation: 'Sinalização e desenergização com bloqueio/etiquetagem (LOTO) reduzem significativamente o risco.',
      },
      {
        id: 'Q3',
        text: 'Em inspeções perto de LT, o distanciamento mínimo serve para:',
        choices: [
          { id: 'Q3A', text: 'Reduzir risco de arco elétrico', correct: true },
          { id: 'Q3B', text: 'Economizar EPIs' },
          { id: 'Q3C', text: 'Acelerar o serviço' },
          { id: 'Q3D', text: 'Facilitar o transporte' },
        ],
      },
    ],
  },
  {
    id: 'QZ-002',
    title: 'Operação de Drones – Boas Práticas',
    description: 'Procedimentos padrão e segurança em missões com drones.',
    tags: ['drones', 'operação'],
    pointsPerQuestion: 10,
    randomized: true,
    questions: [
      {
        id: 'Q1',
        text: 'Checklist pré-voo deve incluir:',
        choices: [
          { id: 'A', text: 'Checar baterias e link de rádio', correct: true },
          { id: 'B', text: 'Usar qualquer firmware' },
          { id: 'C', text: 'Ignorar clima' },
          { id: 'D', text: 'Voar sem plano' },
        ],
      },
      {
        id: 'Q2',
        text: 'Ventos fortes requerem:',
        choices: [
          { id: 'A', text: 'Avaliar limites e ajustar o plano', correct: true },
          { id: 'B', text: 'Voar acima do teto operacional' },
          { id: 'C', text: 'Desativar sensores' },
          { id: 'D', text: 'Aproximar de cabos' },
        ],
      },
    ],
  },
];


export type EventoEnergiaTipo = 'Pisca' | 'Interrupção';

export interface EventoEnergia {
  id: string;
  tipo: EventoEnergiaTipo;
  severidade: 'Baixa' | 'Média' | 'Alta';
  status: 'Resolvido' | 'Em andamento';
  inicio: string;
  fim?: string;
  duracaoMin?: number;
  regiao: string;
  linha: string;
  subestacao?: string;
  causaProvavel: string;
  coords: [number, number];
}

export const eventosEnergia: EventoEnergia[] = [
  {
    id: 'EV-ENER-001',
    tipo: 'Pisca',
    severidade: 'Baixa',
    status: 'Resolvido',
    inicio: '2025-01-18T08:12:00-03:00',
    fim: '2025-01-18T08:20:00-03:00',
    duracaoMin: 8,
    regiao: 'A',
    linha: 'LT-001',
    subestacao: 'SE Jaguaré',
    causaProvavel: 'Oscilação de carga devido a chaveamento industrial',
    coords: [-46.733, -23.503],
  },
  {
    id: 'EV-ENER-002',
    tipo: 'Interrupção',
    severidade: 'Alta',
    status: 'Em andamento',
    inicio: '2025-01-18T07:45:00-03:00',
    regiao: 'B',
    linha: 'LT-002',
    subestacao: 'SE Ipiranga',
    causaProvavel: 'Curto-circuito fase-terra detectado por proteção diferencial',
    coords: [-46.612, -23.615],
  },
  {
    id: 'EV-ENER-003',
    tipo: 'Pisca',
    severidade: 'Média',
    status: 'Resolvido',
    inicio: '2025-01-17T19:22:00-03:00',
    fim: '2025-01-17T19:35:00-03:00',
    duracaoMin: 13,
    regiao: 'C',
    linha: 'LT-003',
    subestacao: 'SE Campos Elíseos',
    causaProvavel: 'Descarga atmosférica com religamento automático',
    coords: [-46.676, -23.545],
  },
  {
    id: 'EV-ENER-004',
    tipo: 'Interrupção',
    severidade: 'Alta',
    status: 'Resolvido',
    inicio: '2025-01-16T22:10:00-03:00',
    fim: '2025-01-16T23:02:00-03:00',
    duracaoMin: 52,
    regiao: 'A',
    linha: 'LT-001',
    subestacao: 'SE Bandeirantes',
    causaProvavel: 'Queda de árvore em trecho compartilhado',
    coords: [-46.804, -23.561],
  },
  {
    id: 'EV-ENER-005',
    tipo: 'Pisca',
    severidade: 'Baixa',
    status: 'Resolvido',
    inicio: '2025-01-16T06:55:00-03:00',
    fim: '2025-01-16T07:05:00-03:00',
    duracaoMin: 10,
    regiao: 'B',
    linha: 'LT-002',
    subestacao: 'SE São Bernardo',
    causaProvavel: 'Teste de religadores programado',
    coords: [-46.553, -23.75],
  },
  {
    id: 'EV-ENER-006',
    tipo: 'Interrupção',
    severidade: 'Média',
    status: 'Resolvido',
    inicio: '2025-01-15T14:40:00-03:00',
    fim: '2025-01-15T15:05:00-03:00',
    duracaoMin: 25,
    regiao: 'C',
    linha: 'LT-003',
    subestacao: 'SE Praia Grande',
    causaProvavel: 'Sobrecorrente devido a vandalismo em cabos de guarda',
    coords: [-46.401, -23.998],
  },
  {
    id: 'EV-ENER-007',
    tipo: 'Pisca',
    severidade: 'Média',
    status: 'Resolvido',
    inicio: '2025-01-14T11:32:00-03:00',
    fim: '2025-01-14T11:40:00-03:00',
    duracaoMin: 8,
    regiao: 'A',
    linha: 'LT-001',
    subestacao: 'SE Jaguaré',
    causaProvavel: 'Oscilação de tensão por transferência de carga',
    coords: [-46.729, -23.536],
  },
  {
    id: 'EV-ENER-008',
    tipo: 'Interrupção',
    severidade: 'Alta',
    status: 'Em andamento',
    inicio: '2025-01-18T09:05:00-03:00',
    regiao: 'B',
    linha: 'LT-002',
    subestacao: 'SE Santo André',
    causaProvavel: 'Proteção diferencial atuada - investigação em curso',
    coords: [-46.52, -23.66],
  },
  {
    id: 'EV-ENER-009',
    tipo: 'Pisca',
    severidade: 'Baixa',
    status: 'Resolvido',
    inicio: '2025-01-13T17:15:00-03:00',
    fim: '2025-01-13T17:22:00-03:00',
    duracaoMin: 7,
    regiao: 'C',
    linha: 'LT-003',
    subestacao: 'SE Cubatão',
    causaProvavel: 'Interferência marítima e religamento automático',
    coords: [-46.413, -23.89],
  },
  {
    id: 'EV-ENER-010',
    tipo: 'Interrupção',
    severidade: 'Média',
    status: 'Resolvido',
    inicio: '2025-01-12T21:40:00-03:00',
    fim: '2025-01-12T22:05:00-03:00',
    duracaoMin: 25,
    regiao: 'A',
    linha: 'LT-001',
    subestacao: 'SE Lapa',
    causaProvavel: 'Falha em isolador durante tempestade',
    coords: [-46.706, -23.528],
  },
  {
    id: 'EV-ENER-011',
    tipo: 'Pisca',
    severidade: 'Média',
    status: 'Resolvido',
    inicio: '2025-01-11T10:10:00-03:00',
    fim: '2025-01-11T10:18:00-03:00',
    duracaoMin: 8,
    regiao: 'B',
    linha: 'LT-002',
    subestacao: 'SE Mauá',
    causaProvavel: 'Teste de religadores em campo',
    coords: [-46.456, -23.67],
  },
  {
    id: 'EV-ENER-012',
    tipo: 'Interrupção',
    severidade: 'Alta',
    status: 'Em andamento',
    inicio: '2025-01-18T08:48:00-03:00',
    regiao: 'C',
    linha: 'LT-003',
    subestacao: 'SE Mongaguá',
    causaProvavel: 'Queda de árvore em faixa de servidão após chuvas',
    coords: [-46.62, -24.0],
  },
];

export type DiagramaRegime = 'Normal' | 'Contingência' | 'Manutenção Programada';

export type UnifilarBarraStatus = 'Energizada' | 'Sob Vigilância' | 'Desligada';
export type UnifilarLinhaStatus = 'Normal' | 'Sobrecarga' | 'Desligada';
export type UnifilarAlimentadorStatus = 'Normal' | 'Restrição' | 'Desligado';

export interface UnifilarBarra {
  id: string;
  nome: string;
  tensao: string;
  status: UnifilarBarraStatus;
  x: number;
  y: number;
}

export interface UnifilarLinha {
  id: string;
  nome: string;
  origem: string;
  destino: string;
  status: UnifilarLinhaStatus;
  cargaMW: number;
  correnteA: number;
}

export interface UnifilarAlimentador {
  id: string;
  nome: string;
  status: UnifilarAlimentadorStatus;
  cargaMW: number;
  conectadoABarra: string;
}

export interface UnifilarAlarme {
  id: string;
  severidade: 'Alta' | 'Média' | 'Baixa';
  mensagem: string;
  timestamp: string;
}

export interface UnifilarSugestao {
  id: string;
  titulo: string;
  descricao: string;
  impacto: string;
  tempoEstimadoMin?: number;
}

export interface UnifilarIndicadores {
  cargaTotalMW: number;
  correnteMaximaA: number;
  disponibilidade: number;
  perdasPercentual: number;
}

export interface UnifilarDiagram {
  id: string;
  titulo: string;
  subestacao: string;
  linhaPrincipal: string;
  tensao: string;
  regimeOperacao: DiagramaRegime;
  descricao: string;
  barras: UnifilarBarra[];
  linhas: UnifilarLinha[];
  alimentadores: UnifilarAlimentador[];
  alarmes: UnifilarAlarme[];
  sugestoes: UnifilarSugestao[];
  indicadores: UnifilarIndicadores;
}

export const unifilarDiagramas: UnifilarDiagram[] = [
  {
    id: 'UF-TRS-230',
    titulo: 'SE Transmissão Norte - Contingência 230kV',
    subestacao: 'SE Transmissão Norte',
    linhaPrincipal: 'LT-TRS-230',
    tensao: '230 kV',
    regimeOperacao: 'Contingência',
    descricao: 'Redistribuição de carga após desligamento de religador na LT-TRS-17.',
    barras: [
      { id: 'B1', nome: 'BARRA A1', tensao: '230 kV', status: 'Energizada', x: 12, y: 30 },
      { id: 'B2', nome: 'BARRA B2', tensao: '230 kV', status: 'Sob Vigilância', x: 48, y: 30 },
      { id: 'B3', nome: 'BARRA C3', tensao: '230 kV', status: 'Energizada', x: 82, y: 30 },
      { id: 'B4', nome: 'BARRA Distribuição', tensao: '69 kV', status: 'Energizada', x: 48, y: 65 },
    ],
    linhas: [
      { id: 'L1', nome: 'LT-TRS-17', origem: 'B1', destino: 'B2', status: 'Sobrecarga', cargaMW: 135, correnteA: 420 },
      { id: 'L2', nome: 'LT-TRS-09', origem: 'B2', destino: 'B3', status: 'Normal', cargaMW: 118, correnteA: 365 },
      { id: 'L3', nome: 'LT-TRS-Distrib', origem: 'B2', destino: 'B4', status: 'Normal', cargaMW: 96, correnteA: 310 },
      { id: 'L4', nome: 'LT-Rede de Reserva', origem: 'B1', destino: 'B4', status: 'Desligada', cargaMW: 0, correnteA: 0 },
    ],
    alimentadores: [
      { id: 'F1', nome: 'Alimentador Centro', status: 'Restrição', cargaMW: 38, conectadoABarra: 'B4' },
      { id: 'F2', nome: 'Alimentador Oeste', status: 'Normal', cargaMW: 27, conectadoABarra: 'B2' },
      { id: 'F3', nome: 'Alimentador Leste', status: 'Normal', cargaMW: 31, conectadoABarra: 'B3' },
    ],
    alarmes: [
      { id: 'ALM-TRS-01', severidade: 'Alta', mensagem: 'Sobrecarga 112% na LT-TRS-17', timestamp: '2025-01-18T09:12:00-03:00' },
      { id: 'ALM-TRS-02', severidade: 'Média', mensagem: 'Transferência automática concluída para Barra C3', timestamp: '2025-01-18T09:05:00-03:00' },
    ],
    sugestoes: [
      { id: 'SG-TRS-01', titulo: 'Redistribuir carga para Barra C3', descricao: 'Recomenda-se manobra da chave CH-23 para aliviar a LT-TRS-17.', impacto: 'Reduz a sobrecarga para 93%', tempoEstimadoMin: 8 },
      { id: 'SG-TRS-02', titulo: 'Ativar plano de contingência', descricao: 'Equipes de campo devem confirmar condições da faixa de servidão no trecho Sul.', impacto: 'Confirma integridade antes de reenergizar', tempoEstimadoMin: 25 },
    ],
    indicadores: {
      cargaTotalMW: 349,
      correnteMaximaA: 420,
      disponibilidade: 0.92,
      perdasPercentual: 2.6,
    },
  },
  {
    id: 'UF-MTR-138',
    titulo: 'SE Metropolitana - Operação Normal 138kV',
    subestacao: 'SE Metropolitana',
    linhaPrincipal: 'LT-MTR-138',
    tensao: '138 kV',
    regimeOperacao: 'Normal',
    descricao: 'Operação com fluxo balanceado entre alimentadores urbanos.',
    barras: [
      { id: 'B10', nome: 'BARRA Principal', tensao: '138 kV', status: 'Energizada', x: 20, y: 28 },
      { id: 'B11', nome: 'BARRA Transferência', tensao: '138 kV', status: 'Energizada', x: 50, y: 28 },
      { id: 'B12', nome: 'BARRA Industrial', tensao: '69 kV', status: 'Energizada', x: 80, y: 28 },
      { id: 'B13', nome: 'BARRA Reserva', tensao: '13.8 kV', status: 'Energizada', x: 50, y: 65 },
    ],
    linhas: [
      { id: 'L10', nome: 'LT-MTR-01', origem: 'B10', destino: 'B11', status: 'Normal', cargaMW: 102, correnteA: 290 },
      { id: 'L11', nome: 'LT-MTR-06', origem: 'B11', destino: 'B12', status: 'Normal', cargaMW: 88, correnteA: 260 },
      { id: 'L12', nome: 'LT-MTR-Backup', origem: 'B10', destino: 'B12', status: 'Normal', cargaMW: 54, correnteA: 180 },
      { id: 'L13', nome: 'LT-Reserva', origem: 'B11', destino: 'B13', status: 'Desligada', cargaMW: 0, correnteA: 0 },
    ],
    alimentadores: [
      { id: 'F10', nome: 'Hospital Central', status: 'Normal', cargaMW: 22, conectadoABarra: 'B13' },
      { id: 'F11', nome: 'Distrito Industrial', status: 'Normal', cargaMW: 41, conectadoABarra: 'B12' },
      { id: 'F12', nome: 'Zona Norte', status: 'Normal', cargaMW: 33, conectadoABarra: 'B11' },
    ],
    alarmes: [
      { id: 'ALM-MTR-01', severidade: 'Baixa', mensagem: 'Manutenção preventiva agendada para chave CH-11', timestamp: '2025-01-19T08:00:00-03:00' },
    ],
    sugestoes: [
      { id: 'SG-MTR-01', titulo: 'Testar religamento automático', descricao: 'Execução em janela noturna para validar L13.', impacto: 'Assegura redundância na reserva', tempoEstimadoMin: 15 },
    ],
    indicadores: {
      cargaTotalMW: 247,
      correnteMaximaA: 290,
      disponibilidade: 0.99,
      perdasPercentual: 1.4,
    },
  },
  {
    id: 'UF-LIT-69',
    titulo: 'SE Litoral Sul - Manutenção 69kV',
    subestacao: 'SE Litoral Sul',
    linhaPrincipal: 'LT-LIT-69',
    tensao: '69 kV',
    regimeOperacao: 'Manutenção Programada',
    descricao: 'Configuração reduzida para inspeção das estruturas de ancoragem.',
    barras: [
      { id: 'B20', nome: 'BARRA Principal', tensao: '69 kV', status: 'Sob Vigilância', x: 18, y: 32 },
      { id: 'B21', nome: 'BARRA Secundária', tensao: '69 kV', status: 'Energizada', x: 50, y: 32 },
      { id: 'B22', nome: 'BARRA Portuária', tensao: '34.5 kV', status: 'Energizada', x: 82, y: 32 },
      { id: 'B23', nome: 'BARRA Rural', tensao: '13.8 kV', status: 'Desligada', x: 50, y: 68 },
    ],
    linhas: [
      { id: 'L20', nome: 'LT-LIT-03', origem: 'B20', destino: 'B21', status: 'Normal', cargaMW: 64, correnteA: 210 },
      { id: 'L21', nome: 'LT-LIT-09', origem: 'B21', destino: 'B22', status: 'Normal', cargaMW: 52, correnteA: 180 },
      { id: 'L22', nome: 'LT-LIT-Rural', origem: 'B21', destino: 'B23', status: 'Desligada', cargaMW: 0, correnteA: 0 },
      { id: 'L23', nome: 'LT-LIT-Reserva', origem: 'B20', destino: 'B22', status: 'Sobrecarga', cargaMW: 71, correnteA: 235 },
    ],
    alimentadores: [
      { id: 'F20', nome: 'Porto de Santos', status: 'Restrição', cargaMW: 36, conectadoABarra: 'B22' },
      { id: 'F21', nome: 'Polo Pesqueiro', status: 'Normal', cargaMW: 18, conectadoABarra: 'B22' },
      { id: 'F22', nome: 'Comunidades Rurais', status: 'Desligado', cargaMW: 0, conectadoABarra: 'B23' },
    ],
    alarmes: [
      { id: 'ALM-LIT-01', severidade: 'Média', mensagem: 'Contato à terra detectado na LT-LIT-Rural (recloser aberto)', timestamp: '2025-01-18T05:45:00-03:00' },
      { id: 'ALM-LIT-02', severidade: 'Baixa', mensagem: 'Velocidade do vento acima de 45 km/h no trecho costeiro', timestamp: '2025-01-18T06:05:00-03:00' },
    ],
    sugestoes: [
      { id: 'SG-LIT-01', titulo: 'Manter circuito rural isolado', descricao: 'Aguardar inspeção térmica antes de reenergizar o alimentador B23.', impacto: 'Evita atuação repetitiva de proteção', tempoEstimadoMin: 40 },
      { id: 'SG-LIT-02', titulo: 'Ajustar controle de tensão', descricao: 'Elevar tap do transformador T-02 em 1% para compensar queda no alimentador portuário.', impacto: 'Estabiliza tensão nas cargas prioritárias', tempoEstimadoMin: 12 },
    ],
    indicadores: {
      cargaTotalMW: 187,
      correnteMaximaA: 235,
      disponibilidade: 0.86,
      perdasPercentual: 3.1,
    },
  },
];
