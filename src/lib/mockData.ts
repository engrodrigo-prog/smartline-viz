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
  lastUpdate: Date;
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
    lastUpdate: new Date(),
  },
  {
    id: "S002",
    name: "Subestação Central",
    type: "Estrutural",
    location: { lat: -23.5605, lng: -46.6433 },
    corrosion: 12.3,
    vibration: 3.2,
    status: "warning",
    lastUpdate: new Date(),
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
    lastUpdate: new Date(),
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
    lastUpdate: new Date(),
  },
  {
    id: "S005",
    name: "Ponto Crítico - Área Urbana",
    type: "Estrutural",
    location: { lat: -23.5805, lng: -46.6633 },
    corrosion: 45.7,
    vibration: 8.9,
    status: "critical",
    lastUpdate: new Date(),
  },
];

export interface AssetData {
  id: string;
  name: string;
  type: "torre" | "subestacao" | "linha" | "travessia";
  status: "operational" | "maintenance" | "critical";
  location: { lat: number; lng: number };
  healthScore: number;
  lastInspection: Date;
}

export const mockAssets: AssetData[] = [
  {
    id: "A001",
    name: "Torre TRN-001",
    type: "torre",
    status: "operational",
    location: { lat: -23.5505, lng: -46.6333 },
    healthScore: 92,
    lastInspection: new Date("2025-09-15"),
  },
  {
    id: "A002",
    name: "Subestação SE-Central",
    type: "subestacao",
    status: "operational",
    location: { lat: -23.5605, lng: -46.6433 },
    healthScore: 88,
    lastInspection: new Date("2025-09-20"),
  },
  {
    id: "A003",
    name: "Linha LT-500kV-Sul",
    type: "linha",
    status: "maintenance",
    location: { lat: -23.5705, lng: -46.6533 },
    healthScore: 75,
    lastInspection: new Date("2025-08-30"),
  },
  {
    id: "A004",
    name: "Travessia Rio Tietê",
    type: "travessia",
    status: "operational",
    location: { lat: -23.5405, lng: -46.6233 },
    healthScore: 95,
    lastInspection: new Date("2025-09-25"),
  },
  {
    id: "A005",
    name: "Torre TRN-045",
    type: "torre",
    status: "critical",
    location: { lat: -23.5805, lng: -46.6633 },
    healthScore: 58,
    lastInspection: new Date("2025-07-15"),
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
