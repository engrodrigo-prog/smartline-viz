import type { Feature, FeatureCollection, LineString, Point, Polygon, Position } from "geojson";
import type { FiltersState } from "@/context/FiltersContext";

export type FloodRiskLevel = "Baixo" | "Médio" | "Alto";
export type FloodStatus = "Monitorado" | "Alerta" | "Crítico";
export type WaterBodyKind = "Rio" | "Canal" | "Lagoa" | "Reservatório";

export type FloodAreaRecord = {
  id: string;
  nome: string;
  empresa: string;
  regiao: string;
  linha: string;
  nomeLinha: string;
  ramal: string;
  tensaoKv: string;
  coords: [number, number];
  areaCritica: number;
  nivelRisco: FloodRiskLevel;
  ultimaAtualizacao: string;
  status: FloodStatus;
  torres_afetadas: string[];
  microbaciaId: string;
  microbacia: string;
  riverId: string;
  rioPrincipal: string;
  waterBodyId: string;
  corpoHidrico: string;
  tipoCorpoHidrico: WaterBodyKind;
  distanciaCorpoHidricoM: number;
  cotaOperacionalM: number;
  observacao: string;
  areaPolygon: Position[];
};

type HydroContext = {
  empresa: string;
  regiao: string;
  linha: string;
  nomeLinha: string;
  tensaoKv: string;
};

type HydroPolygonProps = HydroContext & {
  id: string;
  layerKind: "microbacia" | "corpo_dagua" | "alerta_alagamento";
  nome: string;
  color?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
};

type HydroLineProps = HydroContext & {
  id: string;
  layerKind: "rio";
  nome: string;
  color?: string;
  width?: number;
  opacity?: number;
  corridorWidth?: number;
  corridorOpacity?: number;
};

type HydroPointProps = {
  areaId: string;
  nome: string;
  microbacia: string;
  rioPrincipal: string;
  corpoHidrico: string;
  nivelRisco: FloodRiskLevel;
  status: FloodStatus;
  color?: string;
  size?: number;
};

const baseDate = "2026-03-14T12:00:00.000Z";

const ring = (positions: Position[]): Position[] => {
  if (positions.length === 0) return positions;
  const [firstLon, firstLat] = positions[0];
  const last = positions[positions.length - 1];
  if (last?.[0] === firstLon && last?.[1] === firstLat) {
    return positions;
  }
  return [...positions, [firstLon, firstLat]];
};

const polygonFeature = (
  props: HydroPolygonProps,
  positions: Position[],
): Feature<Polygon, HydroPolygonProps> => ({
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [ring(positions)],
  },
  properties: props,
});

const lineFeature = (
  props: HydroLineProps,
  positions: Position[],
): Feature<LineString, HydroLineProps> => ({
  type: "Feature",
  geometry: {
    type: "LineString",
    coordinates: positions,
  },
  properties: props,
});

const riskColor = (risk: FloodRiskLevel) => {
  if (risk === "Alto") return "#ef4444";
  if (risk === "Médio") return "#f59e0b";
  return "#22c55e";
};

const pointSize = (risk: FloodRiskLevel) => {
  if (risk === "Alto") return 11;
  if (risk === "Médio") return 9;
  return 7;
};

const contextA: HydroContext = {
  empresa: "CPFL Transmissão",
  regiao: "A",
  linha: "LT-001",
  nomeLinha: "LT-001 - Corredor Jundiaí Mirim",
  tensaoKv: "138kV",
};

const contextB: HydroContext = {
  empresa: "CPFL Transmissão",
  regiao: "B",
  linha: "LT-002",
  nomeLinha: "LT-002 - Corredor Billings Sul",
  tensaoKv: "230kV",
};

const contextC: HydroContext = {
  empresa: "CPFL Transmissão",
  regiao: "C",
  linha: "LT-003",
  nomeLinha: "LT-003 - Corredor Cubatão Litoral",
  tensaoKv: "230kV",
};

const microbaciasFeatures: Feature<Polygon, HydroPolygonProps>[] = [
  polygonFeature(
    {
      ...contextA,
      id: "mb-jundiai-mirim",
      layerKind: "microbacia",
      nome: "Microbacia Jundiaí-Mirim",
      color: "#14b8a6",
      fillOpacity: 0.11,
      strokeColor: "#0f766e",
      strokeWidth: 1.4,
    },
    [
      [-47.075, -23.122],
      [-47.01, -23.095],
      [-46.955, -23.128],
      [-46.964, -23.205],
      [-47.038, -23.222],
    ],
  ),
  polygonFeature(
    {
      ...contextA,
      id: "mb-capivari-guapeva",
      layerKind: "microbacia",
      nome: "Microbacia Capivari-Guapeva",
      color: "#2dd4bf",
      fillOpacity: 0.11,
      strokeColor: "#0f766e",
      strokeWidth: 1.4,
    },
    [
      [-47.028, -23.172],
      [-46.958, -23.151],
      [-46.912, -23.197],
      [-46.935, -23.262],
      [-47.015, -23.248],
    ],
  ),
  polygonFeature(
    {
      ...contextB,
      id: "mb-taquacetuba",
      layerKind: "microbacia",
      nome: "Microbacia Billings-Taquacetuba",
      color: "#06b6d4",
      fillOpacity: 0.11,
      strokeColor: "#0f766e",
      strokeWidth: 1.4,
    },
    [
      [-46.708, -23.792],
      [-46.646, -23.748],
      [-46.58, -23.776],
      [-46.592, -23.856],
      [-46.674, -23.872],
    ],
  ),
  polygonFeature(
    {
      ...contextB,
      id: "mb-rio-grande",
      layerKind: "microbacia",
      nome: "Microbacia Rio Grande-Pedreira",
      color: "#38bdf8",
      fillOpacity: 0.11,
      strokeColor: "#0f766e",
      strokeWidth: 1.4,
    },
    [
      [-46.648, -23.706],
      [-46.57, -23.688],
      [-46.515, -23.73],
      [-46.542, -23.797],
      [-46.626, -23.774],
    ],
  ),
  polygonFeature(
    {
      ...contextC,
      id: "mb-cubatao-mogi",
      layerKind: "microbacia",
      nome: "Microbacia Cubatão-Mogi",
      color: "#22c55e",
      fillOpacity: 0.12,
      strokeColor: "#15803d",
      strokeWidth: 1.4,
    },
    [
      [-46.53, -23.828],
      [-46.455, -23.807],
      [-46.398, -23.861],
      [-46.423, -23.918],
      [-46.505, -23.902],
    ],
  ),
  polygonFeature(
    {
      ...contextC,
      id: "mb-casqueiro-piacaguera",
      layerKind: "microbacia",
      nome: "Microbacia Casqueiro-Piaçaguera",
      color: "#4ade80",
      fillOpacity: 0.12,
      strokeColor: "#15803d",
      strokeWidth: 1.4,
    },
    [
      [-46.445, -23.862],
      [-46.368, -23.846],
      [-46.322, -23.894],
      [-46.348, -23.95],
      [-46.432, -23.944],
    ],
  ),
];

const hydroLinesFeatures: Feature<LineString, HydroLineProps>[] = [
  lineFeature(
    {
      ...contextA,
      id: "rio-jundiai",
      layerKind: "rio",
      nome: "Rio Jundiaí",
      color: "#2563eb",
      width: 2.8,
      opacity: 0.88,
      corridorWidth: 0,
      corridorOpacity: 0,
    },
    [
      [-47.068, -23.106],
      [-47.028, -23.124],
      [-46.992, -23.161],
      [-46.962, -23.206],
      [-46.938, -23.236],
    ],
  ),
  lineFeature(
    {
      ...contextA,
      id: "rio-guapeva",
      layerKind: "rio",
      nome: "Ribeirão Guapeva",
      color: "#38bdf8",
      width: 2.4,
      opacity: 0.86,
      corridorWidth: 0,
      corridorOpacity: 0,
    },
    [
      [-47.02, -23.168],
      [-46.984, -23.178],
      [-46.956, -23.204],
      [-46.936, -23.236],
      [-46.923, -23.252],
    ],
  ),
  lineFeature(
    {
      ...contextB,
      id: "rio-taquacetuba",
      layerKind: "rio",
      nome: "Braço Taquacetuba",
      color: "#2563eb",
      width: 2.8,
      opacity: 0.88,
      corridorWidth: 0,
      corridorOpacity: 0,
    },
    [
      [-46.693, -23.786],
      [-46.655, -23.792],
      [-46.618, -23.81],
      [-46.594, -23.833],
      [-46.572, -23.852],
    ],
  ),
  lineFeature(
    {
      ...contextB,
      id: "rio-grande",
      layerKind: "rio",
      nome: "Rio Grande",
      color: "#38bdf8",
      width: 2.5,
      opacity: 0.84,
      corridorWidth: 0,
      corridorOpacity: 0,
    },
    [
      [-46.63, -23.705],
      [-46.602, -23.718],
      [-46.57, -23.741],
      [-46.548, -23.772],
      [-46.536, -23.794],
    ],
  ),
  lineFeature(
    {
      ...contextC,
      id: "rio-cubatao",
      layerKind: "rio",
      nome: "Rio Cubatão",
      color: "#2563eb",
      width: 3,
      opacity: 0.9,
      corridorWidth: 0,
      corridorOpacity: 0,
    },
    [
      [-46.507, -23.824],
      [-46.478, -23.84],
      [-46.45, -23.862],
      [-46.42, -23.886],
      [-46.392, -23.908],
    ],
  ),
  lineFeature(
    {
      ...contextC,
      id: "rio-casqueiro",
      layerKind: "rio",
      nome: "Rio Casqueiro",
      color: "#38bdf8",
      width: 2.6,
      opacity: 0.88,
      corridorWidth: 0,
      corridorOpacity: 0,
    },
    [
      [-46.424, -23.868],
      [-46.398, -23.883],
      [-46.372, -23.903],
      [-46.348, -23.922],
      [-46.328, -23.938],
    ],
  ),
];

const waterBodiesFeatures: Feature<Polygon, HydroPolygonProps>[] = [
  polygonFeature(
    {
      ...contextA,
      id: "wb-fazenda-grande",
      layerKind: "corpo_dagua",
      nome: "Lagoa de Detenção Fazenda Grande",
      color: "#2563eb",
      fillOpacity: 0.26,
      strokeColor: "#1d4ed8",
      strokeWidth: 1.1,
    },
    [
      [-46.984, -23.196],
      [-46.966, -23.19],
      [-46.948, -23.202],
      [-46.955, -23.218],
      [-46.977, -23.216],
    ],
  ),
  polygonFeature(
    {
      ...contextB,
      id: "wb-billings-taquacetuba",
      layerKind: "corpo_dagua",
      nome: "Reservatório Billings - Taquacetuba",
      color: "#1d4ed8",
      fillOpacity: 0.28,
      strokeColor: "#1e40af",
      strokeWidth: 1.1,
    },
    [
      [-46.666, -23.782],
      [-46.626, -23.776],
      [-46.583, -23.804],
      [-46.602, -23.842],
      [-46.654, -23.838],
    ],
  ),
  polygonFeature(
    {
      ...contextC,
      id: "wb-piacaguera",
      layerKind: "corpo_dagua",
      nome: "Lagoa Piaçaguera",
      color: "#2563eb",
      fillOpacity: 0.28,
      strokeColor: "#1e40af",
      strokeWidth: 1.1,
    },
    [
      [-46.39, -23.874],
      [-46.36, -23.868],
      [-46.336, -23.888],
      [-46.344, -23.91],
      [-46.382, -23.905],
    ],
  ),
];

export const floodedAreasScenarioAreas: FloodAreaRecord[] = [
  {
    id: "ALG-001",
    nome: "Planície aluvial Mato Dentro",
    empresa: contextA.empresa,
    regiao: contextA.regiao,
    linha: contextA.linha,
    nomeLinha: contextA.nomeLinha,
    ramal: "R1",
    tensaoKv: contextA.tensaoKv,
    coords: [-23.176, -46.982],
    areaCritica: 0.84,
    nivelRisco: "Médio",
    ultimaAtualizacao: baseDate,
    status: "Alerta",
    torres_afetadas: ["TRN-101", "TRN-102", "TRN-103"],
    microbaciaId: "mb-jundiai-mirim",
    microbacia: "Microbacia Jundiaí-Mirim",
    riverId: "rio-jundiai",
    rioPrincipal: "Rio Jundiaí",
    waterBodyId: "wb-fazenda-grande",
    corpoHidrico: "Lagoa de Detenção Fazenda Grande",
    tipoCorpoHidrico: "Lagoa",
    distanciaCorpoHidricoM: 110,
    cotaOperacionalM: 714,
    observacao: "Trecho com lençol alto e retorno frequente de saturação no acesso lateral da faixa.",
    areaPolygon: ring([
      [-46.992, -23.168],
      [-46.972, -23.168],
      [-46.968, -23.184],
      [-46.988, -23.188],
    ]),
  },
  {
    id: "ALG-002",
    nome: "Várzea Guapeva Sul",
    empresa: contextA.empresa,
    regiao: contextA.regiao,
    linha: contextA.linha,
    nomeLinha: contextA.nomeLinha,
    ramal: "R2",
    tensaoKv: contextA.tensaoKv,
    coords: [-23.223, -46.944],
    areaCritica: 1.12,
    nivelRisco: "Alto",
    ultimaAtualizacao: "2026-03-15T09:30:00.000Z",
    status: "Crítico",
    torres_afetadas: ["TRN-108", "TRN-109", "TRN-110", "TRN-111"],
    microbaciaId: "mb-capivari-guapeva",
    microbacia: "Microbacia Capivari-Guapeva",
    riverId: "rio-guapeva",
    rioPrincipal: "Ribeirão Guapeva",
    waterBodyId: "wb-fazenda-grande",
    corpoHidrico: "Lagoa de Detenção Fazenda Grande",
    tipoCorpoHidrico: "Lagoa",
    distanciaCorpoHidricoM: 68,
    cotaOperacionalM: 706,
    observacao: "Baixo caimento superficial e recorrência de bolsões sobre o eixo de manutenção.",
    areaPolygon: ring([
      [-46.955, -23.214],
      [-46.932, -23.212],
      [-46.928, -23.228],
      [-46.95, -23.233],
    ]),
  },
  {
    id: "ALG-003",
    nome: "Travessia Capivari Baixa",
    empresa: contextA.empresa,
    regiao: contextA.regiao,
    linha: contextA.linha,
    nomeLinha: contextA.nomeLinha,
    ramal: "R3",
    tensaoKv: contextA.tensaoKv,
    coords: [-23.194, -46.958],
    areaCritica: 0.58,
    nivelRisco: "Baixo",
    ultimaAtualizacao: "2026-03-13T08:15:00.000Z",
    status: "Monitorado",
    torres_afetadas: ["TRN-114", "TRN-115"],
    microbaciaId: "mb-capivari-guapeva",
    microbacia: "Microbacia Capivari-Guapeva",
    riverId: "rio-guapeva",
    rioPrincipal: "Ribeirão Guapeva",
    waterBodyId: "wb-fazenda-grande",
    corpoHidrico: "Lagoa de Detenção Fazenda Grande",
    tipoCorpoHidrico: "Lagoa",
    distanciaCorpoHidricoM: 182,
    cotaOperacionalM: 712,
    observacao: "Ponto de observação que costuma evoluir apenas em eventos acima de 60 mm/24h.",
    areaPolygon: ring([
      [-46.968, -23.187],
      [-46.952, -23.184],
      [-46.947, -23.198],
      [-46.963, -23.202],
    ]),
  },
  {
    id: "ALG-004",
    nome: "Braço Taquacetuba Operacional",
    empresa: contextB.empresa,
    regiao: contextB.regiao,
    linha: contextB.linha,
    nomeLinha: contextB.nomeLinha,
    ramal: "R1",
    tensaoKv: contextB.tensaoKv,
    coords: [-23.812, -46.621],
    areaCritica: 1.46,
    nivelRisco: "Alto",
    ultimaAtualizacao: "2026-03-15T13:10:00.000Z",
    status: "Crítico",
    torres_afetadas: ["TRN-201", "TRN-202", "TRN-203", "TRN-204"],
    microbaciaId: "mb-taquacetuba",
    microbacia: "Microbacia Billings-Taquacetuba",
    riverId: "rio-taquacetuba",
    rioPrincipal: "Braço Taquacetuba",
    waterBodyId: "wb-billings-taquacetuba",
    corpoHidrico: "Reservatório Billings - Taquacetuba",
    tipoCorpoHidrico: "Reservatório",
    distanciaCorpoHidricoM: 54,
    cotaOperacionalM: 744,
    observacao: "Encharcamento persistente em solo argiloso com histórico de recalque no acesso da equipe de linha viva.",
    areaPolygon: ring([
      [-46.633, -23.803],
      [-46.609, -23.803],
      [-46.603, -23.82],
      [-46.628, -23.824],
    ]),
  },
  {
    id: "ALG-005",
    nome: "Faixa baixa Pedreira Oeste",
    empresa: contextB.empresa,
    regiao: contextB.regiao,
    linha: contextB.linha,
    nomeLinha: contextB.nomeLinha,
    ramal: "R2",
    tensaoKv: contextB.tensaoKv,
    coords: [-23.752, -46.571],
    areaCritica: 0.94,
    nivelRisco: "Médio",
    ultimaAtualizacao: "2026-03-14T16:45:00.000Z",
    status: "Alerta",
    torres_afetadas: ["TRN-209", "TRN-210", "TRN-211"],
    microbaciaId: "mb-rio-grande",
    microbacia: "Microbacia Rio Grande-Pedreira",
    riverId: "rio-grande",
    rioPrincipal: "Rio Grande",
    waterBodyId: "wb-billings-taquacetuba",
    corpoHidrico: "Reservatório Billings - Taquacetuba",
    tipoCorpoHidrico: "Reservatório",
    distanciaCorpoHidricoM: 126,
    cotaOperacionalM: 739,
    observacao: "Acúmulo temporário em ponto de drenagem travada, com aumento após chuva convectiva de fim de tarde.",
    areaPolygon: ring([
      [-46.582, -23.744],
      [-46.559, -23.741],
      [-46.554, -23.758],
      [-46.577, -23.761],
    ]),
  },
  {
    id: "ALG-006",
    nome: "Cota baixa Rio Grande Norte",
    empresa: contextB.empresa,
    regiao: contextB.regiao,
    linha: contextB.linha,
    nomeLinha: contextB.nomeLinha,
    ramal: "R2",
    tensaoKv: contextB.tensaoKv,
    coords: [-23.784, -46.548],
    areaCritica: 0.67,
    nivelRisco: "Baixo",
    ultimaAtualizacao: "2026-03-12T11:20:00.000Z",
    status: "Monitorado",
    torres_afetadas: ["TRN-214", "TRN-215"],
    microbaciaId: "mb-rio-grande",
    microbacia: "Microbacia Rio Grande-Pedreira",
    riverId: "rio-grande",
    rioPrincipal: "Rio Grande",
    waterBodyId: "wb-billings-taquacetuba",
    corpoHidrico: "Reservatório Billings - Taquacetuba",
    tipoCorpoHidrico: "Reservatório",
    distanciaCorpoHidricoM: 214,
    cotaOperacionalM: 748,
    observacao: "Trecho estável, usado como referência de comparação para eventos realmente críticos da microbacia.",
    areaPolygon: ring([
      [-46.558, -23.776],
      [-46.541, -23.774],
      [-46.537, -23.788],
      [-46.553, -23.792],
    ]),
  },
  {
    id: "ALG-007",
    nome: "Planície Cubatão-Mogi Leste",
    empresa: contextC.empresa,
    regiao: contextC.regiao,
    linha: contextC.linha,
    nomeLinha: contextC.nomeLinha,
    ramal: "R1",
    tensaoKv: contextC.tensaoKv,
    coords: [-23.872, -46.448],
    areaCritica: 1.88,
    nivelRisco: "Alto",
    ultimaAtualizacao: "2026-03-15T10:05:00.000Z",
    status: "Crítico",
    torres_afetadas: ["TRN-301", "TRN-302", "TRN-303", "TRN-304", "TRN-305"],
    microbaciaId: "mb-cubatao-mogi",
    microbacia: "Microbacia Cubatão-Mogi",
    riverId: "rio-cubatao",
    rioPrincipal: "Rio Cubatão",
    waterBodyId: "wb-piacaguera",
    corpoHidrico: "Lagoa Piaçaguera",
    tipoCorpoHidrico: "Lagoa",
    distanciaCorpoHidricoM: 74,
    cotaOperacionalM: 9,
    observacao: "Área mais sensível do corredor litorâneo, com retorno de maré e solo permanentemente saturado.",
    areaPolygon: ring([
      [-46.462, -23.862],
      [-46.438, -23.861],
      [-46.432, -23.88],
      [-46.456, -23.883],
    ]),
  },
  {
    id: "ALG-008",
    nome: "Canal Casqueiro Industrial",
    empresa: contextC.empresa,
    regiao: contextC.regiao,
    linha: contextC.linha,
    nomeLinha: contextC.nomeLinha,
    ramal: "R2",
    tensaoKv: contextC.tensaoKv,
    coords: [-23.904, -46.372],
    areaCritica: 1.05,
    nivelRisco: "Médio",
    ultimaAtualizacao: "2026-03-14T14:00:00.000Z",
    status: "Alerta",
    torres_afetadas: ["TRN-312", "TRN-313", "TRN-314"],
    microbaciaId: "mb-casqueiro-piacaguera",
    microbacia: "Microbacia Casqueiro-Piaçaguera",
    riverId: "rio-casqueiro",
    rioPrincipal: "Rio Casqueiro",
    waterBodyId: "wb-piacaguera",
    corpoHidrico: "Lagoa Piaçaguera",
    tipoCorpoHidrico: "Canal",
    distanciaCorpoHidricoM: 92,
    cotaOperacionalM: 6,
    observacao: "Trecho exposto a refluxo do canal e drenagem urbana insuficiente junto ao pátio operacional.",
    areaPolygon: ring([
      [-46.383, -23.896],
      [-46.36, -23.896],
      [-46.355, -23.912],
      [-46.378, -23.915],
    ]),
  },
  {
    id: "ALG-009",
    nome: "Acesso Alemoa-Estuário",
    empresa: contextC.empresa,
    regiao: contextC.regiao,
    linha: contextC.linha,
    nomeLinha: contextC.nomeLinha,
    ramal: "R3",
    tensaoKv: contextC.tensaoKv,
    coords: [-23.889, -46.346],
    areaCritica: 0.73,
    nivelRisco: "Baixo",
    ultimaAtualizacao: "2026-03-11T07:55:00.000Z",
    status: "Monitorado",
    torres_afetadas: ["TRN-318", "TRN-319"],
    microbaciaId: "mb-casqueiro-piacaguera",
    microbacia: "Microbacia Casqueiro-Piaçaguera",
    riverId: "rio-casqueiro",
    rioPrincipal: "Rio Casqueiro",
    waterBodyId: "wb-piacaguera",
    corpoHidrico: "Lagoa Piaçaguera",
    tipoCorpoHidrico: "Lagoa",
    distanciaCorpoHidricoM: 208,
    cotaOperacionalM: 11,
    observacao: "Mantido como referência de baixa severidade para inspeções após chuva e maré alta combinadas.",
    areaPolygon: ring([
      [-46.355, -23.882],
      [-46.338, -23.881],
      [-46.334, -23.894],
      [-46.351, -23.897],
    ]),
  },
];

const allHydroPolygons = [...microbaciasFeatures, ...waterBodiesFeatures];

const matchesFilterContext = (
  props: HydroContext,
  filters: FiltersState,
) => {
  if (filters.empresa && props.empresa !== filters.empresa) return false;
  if (filters.regiao && props.regiao !== filters.regiao) return false;
  if (filters.linha && props.linha !== filters.linha) return false;
  if (filters.tensaoKv && props.tensaoKv !== filters.tensaoKv) return false;
  if (filters.linhaNome) {
    const haystack = `${props.nomeLinha} ${props.linha}`.toLowerCase();
    if (!haystack.includes(filters.linhaNome.toLowerCase())) return false;
  }
  return true;
};

const extentFromPositions = (positions: Position[], bounds: [number, number, number, number] | null) => {
  let next = bounds;
  positions.forEach((position) => {
    const [lon, lat] = position;
    if (!next) {
      next = [lon, lat, lon, lat];
      return;
    }
    next = [
      Math.min(next[0], lon),
      Math.min(next[1], lat),
      Math.max(next[2], lon),
      Math.max(next[3], lat),
    ];
  });
  return next;
};

const buildBounds = (
  polygons: FeatureCollection<Polygon, HydroPolygonProps>,
  lines: FeatureCollection<LineString, HydroLineProps>,
  points: FeatureCollection<Point, HydroPointProps>,
): [number, number, number, number] | null => {
  let bounds: [number, number, number, number] | null = null;
  polygons.features.forEach((feature) => {
    bounds = extentFromPositions(feature.geometry.coordinates[0] ?? [], bounds);
  });
  lines.features.forEach((feature) => {
    bounds = extentFromPositions(feature.geometry.coordinates, bounds);
  });
  points.features.forEach((feature) => {
    bounds = extentFromPositions([feature.geometry.coordinates], bounds);
  });
  return bounds;
};

export const buildAreasAlagadasMapData = (
  areas: FloodAreaRecord[],
  filters: FiltersState,
) => {
  const activeAreaMicrobacias = new Set(areas.map((area) => area.microbaciaId));
  const activeAreaRivers = new Set(areas.map((area) => area.riverId));
  const activeAreaWaterBodies = new Set(areas.map((area) => area.waterBodyId));
  const useAreaScopedHydrology = activeAreaMicrobacias.size > 0 || activeAreaRivers.size > 0 || activeAreaWaterBodies.size > 0;

  const microbacias = microbaciasFeatures.filter((feature) => {
    if (!matchesFilterContext(feature.properties, filters)) return false;
    if (!useAreaScopedHydrology) return true;
    return activeAreaMicrobacias.has(feature.properties.id);
  });

  const waterBodies = waterBodiesFeatures.filter((feature) => {
    if (!matchesFilterContext(feature.properties, filters)) return false;
    if (!useAreaScopedHydrology) return true;
    return activeAreaWaterBodies.has(feature.properties.id);
  });

  const hydroLines = hydroLinesFeatures.filter((feature) => {
    if (!matchesFilterContext(feature.properties, filters)) return false;
    if (!useAreaScopedHydrology) return true;
    return activeAreaRivers.has(feature.properties.id);
  });

  const alertPolygons: Feature<Polygon, HydroPolygonProps>[] = areas.map((area) =>
    polygonFeature(
      {
        empresa: area.empresa,
        regiao: area.regiao,
        linha: area.linha,
        nomeLinha: area.nomeLinha,
        tensaoKv: area.tensaoKv,
        id: area.id,
        layerKind: "alerta_alagamento",
        nome: area.nome,
        color: riskColor(area.nivelRisco),
        fillOpacity: area.nivelRisco === "Alto" ? 0.46 : area.nivelRisco === "Médio" ? 0.34 : 0.24,
        strokeColor: "#0f172a",
        strokeWidth: area.nivelRisco === "Alto" ? 1.7 : 1.3,
      },
      area.areaPolygon,
    ),
  );

  const alertPoints: Feature<Point, HydroPointProps>[] = areas.map((area) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [area.coords[1], area.coords[0]],
    },
    properties: {
      areaId: area.id,
      nome: area.nome,
      microbacia: area.microbacia,
      rioPrincipal: area.rioPrincipal,
      corpoHidrico: area.corpoHidrico,
      nivelRisco: area.nivelRisco,
      status: area.status,
      color: riskColor(area.nivelRisco),
      size: pointSize(area.nivelRisco),
    },
  }));

  const polygons: FeatureCollection<Polygon, HydroPolygonProps> = {
    type: "FeatureCollection",
    features: [...microbacias, ...waterBodies, ...alertPolygons],
  };

  const lines: FeatureCollection<LineString, HydroLineProps> = {
    type: "FeatureCollection",
    features: hydroLines,
  };

  const points: FeatureCollection<Point, HydroPointProps> = {
    type: "FeatureCollection",
    features: alertPoints,
  };

  return {
    polygons,
    lines,
    points,
    fitBounds: buildBounds(polygons, lines, points),
    hydroSummary: {
      microbacias: microbacias.length,
      rios: hydroLines.length,
      corposDagua: waterBodies.length,
    },
  };
};

export const getAreasAlagadasHydroLabels = (kind: WaterBodyKind) => {
  if (kind === "Rio") return "Rio";
  if (kind === "Canal") return "Rio/Canal";
  if (kind === "Reservatório") return "Lagoa/Reservatório";
  return "Lagoa/Reservatório";
};

export const areasAlagadasHydroBase = {
  microbacias: {
    type: "FeatureCollection",
    features: microbaciasFeatures,
  } as FeatureCollection<Polygon, HydroPolygonProps>,
  rios: {
    type: "FeatureCollection",
    features: hydroLinesFeatures,
  } as FeatureCollection<LineString, HydroLineProps>,
  corposDagua: {
    type: "FeatureCollection",
    features: waterBodiesFeatures,
  } as FeatureCollection<Polygon, HydroPolygonProps>,
  bounds: buildBounds(
    {
      type: "FeatureCollection",
      features: allHydroPolygons,
    },
    {
      type: "FeatureCollection",
      features: hydroLinesFeatures,
    },
    { type: "FeatureCollection", features: [] },
  ),
};
