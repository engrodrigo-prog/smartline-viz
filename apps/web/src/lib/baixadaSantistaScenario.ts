import type { FeatureCollection, LineString, Point, Polygon } from "geojson";

export type ScenarioOccupancyType = "Residencial" | "Comercial" | "Agrícola" | "Industrial";
export type ScenarioOccupancyStatus = "Regular" | "Irregular" | "Em Regularização";
export type ScenarioRiskClass = "Observação" | "Alerta" | "Crítico";

export interface BaixadaRightOfWaySite {
  id: string;
  nome: string;
  tipo: ScenarioOccupancyType;
  situacao: ScenarioOccupancyStatus;
  municipio: string;
  bairro: string;
  trechoKm: string;
  ramal: string;
  distanciaFaixa: number;
  classeRisco: ScenarioRiskClass;
  scoreRisco: number;
  edificacao: string;
  areaConstruidaM2: number;
  responsavel?: string;
  prazoRegularizacao?: string;
  resumo: string;
  center: [number, number];
  polygon: [number, number][];
}

export interface BaixadaWildfireSeed {
  id: string;
  label: string;
  municipio: string;
  bairro: string;
  contexto: string;
  coordinates: [number, number];
  brightness: number;
  confidence: number;
  satellite: "NOAA-20" | "NOAA-21" | "MODIS" | "SNPP";
  riskMax: number;
  frp: number;
  etaH: number;
  windSpeedMs: number;
  windDirFromDeg: number;
  distanceToLineM: number;
  intersectsCorridor: boolean;
}

const makeLineFeature = (
  coordinates: [number, number][],
  properties: { color: string; width: number; opacity: number },
) => ({
  type: "Feature" as const,
  geometry: {
    type: "LineString" as const,
    coordinates,
  },
  properties,
});

const buildWindProfile = (speed: number, deg: number) => ({
  10: { speed_ms: Number((speed - 1.1).toFixed(1)), deg_from: deg - 4 },
  50: { speed_ms: Number((speed - 0.4).toFixed(1)), deg_from: deg - 2 },
  100: { speed_ms: Number(speed.toFixed(1)), deg_from: deg },
  200: { speed_ms: Number((speed + 0.8).toFixed(1)), deg_from: deg + 3 },
});

export const baixadaSantistaCorridorCoordinates: [number, number][] = [
  [-46.446, -23.881],
  [-46.421, -23.896],
  [-46.396, -23.911],
  [-46.369, -23.928],
  [-46.349, -23.945],
  [-46.333, -23.958],
  [-46.318, -23.97],
  [-46.303, -23.982],
];

export const baixadaSantistaSecondaryCircuitCoordinates: [number, number][] = [
  [-46.442, -23.875],
  [-46.417, -23.89],
  [-46.392, -23.905],
  [-46.365, -23.922],
  [-46.345, -23.939],
  [-46.329, -23.952],
  [-46.314, -23.964],
  [-46.299, -23.976],
];

export const baixadaSantistaCorridor: FeatureCollection<LineString> = {
  type: "FeatureCollection",
  features: [
    makeLineFeature(baixadaSantistaCorridorCoordinates, {
      color: "#0284c7",
      width: 4,
      opacity: 0.95,
    }),
  ],
};

export const baixadaSantistaDoubleCircuitCorridor: FeatureCollection<LineString> = {
  type: "FeatureCollection",
  features: [
    makeLineFeature(baixadaSantistaCorridorCoordinates, {
      color: "#0ea5e9",
      width: 4,
      opacity: 0.95,
    }),
    makeLineFeature(baixadaSantistaSecondaryCircuitCoordinates, {
      color: "#22d3ee",
      width: 2,
      opacity: 0.65,
    }),
  ],
};

export const baixadaSantistaTowerPoints: FeatureCollection<Point> = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", geometry: { type: "Point", coordinates: [-46.425, -23.895] }, properties: { id: "T-201", nome: "Torre T-201" } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-46.396, -23.911] }, properties: { id: "T-204", nome: "Torre T-204" } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-46.369, -23.928] }, properties: { id: "T-209", nome: "Torre T-209" } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-46.349, -23.945] }, properties: { id: "T-214", nome: "Torre T-214" } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-46.333, -23.958] }, properties: { id: "T-218", nome: "Torre T-218" } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-46.303, -23.982] }, properties: { id: "T-225", nome: "Torre T-225" } },
  ],
};

export const baixadaSantistaRightOfWaySites: BaixadaRightOfWaySite[] = [
  {
    id: "OCP-001",
    nome: "Vila Esperança da Serra",
    tipo: "Residencial",
    situacao: "Irregular",
    municipio: "Cubatão",
    bairro: "Vila Esperança",
    trechoKm: "KM 04+600",
    ramal: "R1",
    distanciaFaixa: 12,
    classeRisco: "Crítico",
    scoreRisco: 95,
    edificacao: "3 casas térreas em alvenaria",
    areaConstruidaM2: 680,
    responsavel: "Patrimônio + Jurídico",
    resumo: "Ampliação residencial avançando sobre a faixa operacional e dificultando acesso às torres T-201 e T-202.",
    center: [-46.4195, -23.8995],
    polygon: [
      [-46.422, -23.9015],
      [-46.4175, -23.9015],
      [-46.417, -23.8976],
      [-46.4215, -23.8974],
      [-46.422, -23.9015],
    ],
  },
  {
    id: "OCP-002",
    nome: "Galpão de apoio retroportuário",
    tipo: "Industrial",
    situacao: "Em Regularização",
    municipio: "Santos",
    bairro: "Alemoa",
    trechoKm: "KM 07+300",
    ramal: "R1",
    distanciaFaixa: 24,
    classeRisco: "Alerta",
    scoreRisco: 78,
    edificacao: "Galpão metálico com doca lateral",
    areaConstruidaM2: 1240,
    responsavel: "Operação Porto",
    prazoRegularizacao: "2026-05-20",
    resumo: "Uso logístico temporário aprovado com condicionantes, exigindo recuo físico e rota segregada para manutenção.",
    center: [-46.3915, -23.9185],
    polygon: [
      [-46.3944, -23.9205],
      [-46.3892, -23.9203],
      [-46.3888, -23.9167],
      [-46.394, -23.9169],
      [-46.3944, -23.9205],
    ],
  },
  {
    id: "OCP-003",
    nome: "Pátio logístico Sambaiatuba",
    tipo: "Comercial",
    situacao: "Regular",
    municipio: "São Vicente",
    bairro: "Sambaiatuba",
    trechoKm: "KM 09+100",
    ramal: "R2",
    distanciaFaixa: 42,
    classeRisco: "Observação",
    scoreRisco: 48,
    edificacao: "Pátio de apoio com containers e guarita",
    areaConstruidaM2: 1950,
    responsavel: "Fiscalização de faixa",
    resumo: "Empreendimento licenciado com afastamento mínimo respeitado, monitorado por expansão gradual de uso.",
    center: [-46.3675, -23.934],
    polygon: [
      [-46.3705, -23.9358],
      [-46.3647, -23.9358],
      [-46.3649, -23.932],
      [-46.3703, -23.9321],
      [-46.3705, -23.9358],
    ],
  },
  {
    id: "OCP-004",
    nome: "Edificação multifamiliar Marapé",
    tipo: "Residencial",
    situacao: "Irregular",
    municipio: "Santos",
    bairro: "Marapé",
    trechoKm: "KM 11+800",
    ramal: "R2",
    distanciaFaixa: 8,
    classeRisco: "Crítico",
    scoreRisco: 97,
    edificacao: "Prédio em elevação de 4 pavimentos",
    areaConstruidaM2: 980,
    responsavel: "Jurídico contencioso",
    resumo: "Nova obra vertical identificada por comparação temporal com avanço direto sobre a zona de servidão.",
    center: [-46.3478, -23.9492],
    polygon: [
      [-46.3501, -23.9509],
      [-46.3461, -23.9511],
      [-46.3457, -23.9475],
      [-46.3498, -23.9473],
      [-46.3501, -23.9509],
    ],
  },
  {
    id: "OCP-005",
    nome: "Oficina Nova Cintra",
    tipo: "Comercial",
    situacao: "Em Regularização",
    municipio: "Santos",
    bairro: "Nova Cintra",
    trechoKm: "KM 12+900",
    ramal: "R2",
    distanciaFaixa: 18,
    classeRisco: "Alerta",
    scoreRisco: 72,
    edificacao: "Galpão leve com serralheria",
    areaConstruidaM2: 540,
    responsavel: "Patrimônio regional",
    prazoRegularizacao: "2026-04-15",
    resumo: "Atividade comercial mantida com TAC local e necessidade de readequação do cercamento.",
    center: [-46.3332, -23.9582],
    polygon: [
      [-46.3355, -23.9599],
      [-46.3311, -23.9599],
      [-46.3309, -23.9565],
      [-46.3352, -23.9565],
      [-46.3355, -23.9599],
    ],
  },
  {
    id: "OCP-006",
    nome: "Horta informal Rio Branco",
    tipo: "Agrícola",
    situacao: "Irregular",
    municipio: "São Vicente",
    bairro: "Rio Branco",
    trechoKm: "KM 10+400",
    ramal: "R2",
    distanciaFaixa: 15,
    classeRisco: "Alerta",
    scoreRisco: 69,
    edificacao: "Barracão de apoio com estufa artesanal",
    areaConstruidaM2: 310,
    responsavel: "Fiscalização de campo",
    resumo: "Cultivo e cercamento informal crescendo sobre área de acesso operacional, com risco de ocupação consolidada.",
    center: [-46.3582, -23.9418],
    polygon: [
      [-46.3608, -23.9432],
      [-46.3558, -23.9431],
      [-46.3556, -23.9402],
      [-46.3605, -23.9404],
      [-46.3608, -23.9432],
    ],
  },
  {
    id: "OCP-007",
    nome: "Depósito temporário Alemoa Sul",
    tipo: "Industrial",
    situacao: "Irregular",
    municipio: "Santos",
    bairro: "Alemoa",
    trechoKm: "KM 08+100",
    ramal: "R1",
    distanciaFaixa: 11,
    classeRisco: "Crítico",
    scoreRisco: 88,
    edificacao: "Pátio cercado com cobertura leve",
    areaConstruidaM2: 760,
    responsavel: "Operações + Jurídico",
    resumo: "Depósito provisório de materiais implantado junto ao corredor, gerando interferência direta na faixa de inspeção.",
    center: [-46.3818, -23.923],
    polygon: [
      [-46.3844, -23.9245],
      [-46.3792, -23.9245],
      [-46.3791, -23.9212],
      [-46.3842, -23.9212],
      [-46.3844, -23.9245],
    ],
  },
  {
    id: "OCP-008",
    nome: "Garagem de apoio Ponta da Praia",
    tipo: "Comercial",
    situacao: "Regular",
    municipio: "Santos",
    bairro: "Ponta da Praia",
    trechoKm: "KM 15+200",
    ramal: "R3",
    distanciaFaixa: 55,
    classeRisco: "Observação",
    scoreRisco: 35,
    edificacao: "Estacionamento descoberto com guarita",
    areaConstruidaM2: 860,
    responsavel: "Patrimônio regional",
    resumo: "Ponto regular usado como referência de afastamento mínimo para apresentação comercial do MVP.",
    center: [-46.3025, -23.9825],
    polygon: [
      [-46.3055, -23.9843],
      [-46.2998, -23.9843],
      [-46.2997, -23.9808],
      [-46.3053, -23.9807],
      [-46.3055, -23.9843],
    ],
  },
];

export const baixadaSantistaRightOfWayBuildings: FeatureCollection<Polygon> = {
  type: "FeatureCollection",
  features: baixadaSantistaRightOfWaySites.map((site) => ({
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [[...site.polygon]],
    },
    properties: {
      id: site.id,
      nome: site.nome,
      municipio: site.municipio,
      bairro: site.bairro,
      situacao: site.situacao,
      scoreRisco: site.scoreRisco,
      classeRisco: site.classeRisco,
      edificacao: site.edificacao,
    },
  })),
};

export const baixadaSantistaWildfireSeeds: BaixadaWildfireSeed[] = [
  {
    id: "HS-BS-001",
    label: "Encosta Serra do Mar",
    municipio: "Cubatão",
    bairro: "Cota 200",
    contexto: "Vegetação de encosta sob vento sudeste",
    coordinates: [-46.432, -23.885],
    brightness: 334,
    confidence: 93,
    satellite: "NOAA-20",
    riskMax: 97,
    frp: 31.4,
    etaH: 1.4,
    windSpeedMs: 10.2,
    windDirFromDeg: 128,
    distanceToLineM: 180,
    intersectsCorridor: true,
  },
  {
    id: "HS-BS-002",
    label: "Vale do Rio Cubatão",
    municipio: "Cubatão",
    bairro: "Vila Parisi",
    contexto: "Calha de vento canalizando calor para o corredor",
    coordinates: [-46.408, -23.9],
    brightness: 322,
    confidence: 90,
    satellite: "NOAA-21",
    riskMax: 92,
    frp: 25.1,
    etaH: 2.1,
    windSpeedMs: 9.6,
    windDirFromDeg: 132,
    distanceToLineM: 260,
    intersectsCorridor: true,
  },
  {
    id: "HS-BS-003",
    label: "Parque Estadual São Vicente",
    municipio: "São Vicente",
    bairro: "Área Continental",
    contexto: "Foco em borda de mata com projeção para vãos críticos",
    coordinates: [-46.375, -23.925],
    brightness: 317,
    confidence: 84,
    satellite: "SNPP",
    riskMax: 84,
    frp: 18.6,
    etaH: 3.8,
    windSpeedMs: 8.4,
    windDirFromDeg: 136,
    distanceToLineM: 420,
    intersectsCorridor: true,
  },
  {
    id: "HS-BS-004",
    label: "Morro Nova Cintra",
    municipio: "Santos",
    bairro: "Nova Cintra",
    contexto: "Vegetação urbana com risco para acesso operacional",
    coordinates: [-46.346, -23.947],
    brightness: 309,
    confidence: 78,
    satellite: "MODIS",
    riskMax: 77,
    frp: 14.3,
    etaH: 4.6,
    windSpeedMs: 7.8,
    windDirFromDeg: 141,
    distanceToLineM: 560,
    intersectsCorridor: false,
  },
  {
    id: "HS-BS-005",
    label: "Retroárea Saboó",
    municipio: "Santos",
    bairro: "Saboó",
    contexto: "Foco de baixa extensão próximo a retroporto e mangue",
    coordinates: [-46.323, -23.967],
    brightness: 301,
    confidence: 72,
    satellite: "NOAA-20",
    riskMax: 69,
    frp: 11.8,
    etaH: 6.1,
    windSpeedMs: 6.9,
    windDirFromDeg: 146,
    distanceToLineM: 890,
    intersectsCorridor: false,
  },
  {
    id: "HS-BS-006",
    label: "Ponta da Praia",
    municipio: "Santos",
    bairro: "Ponta da Praia",
    contexto: "Foco residual usado como contraste para cenário de baixa criticidade",
    coordinates: [-46.298, -23.985],
    brightness: 294,
    confidence: 66,
    satellite: "NOAA-21",
    riskMax: 54,
    frp: 8.2,
    etaH: 9.2,
    windSpeedMs: 5.7,
    windDirFromDeg: 151,
    distanceToLineM: 1340,
    intersectsCorridor: false,
  },
];

export const baixadaSantistaWildfireSimulatedSeeds: BaixadaWildfireSeed[] = [
  ...baixadaSantistaWildfireSeeds,
  {
    id: "HS-BS-007",
    label: "Manguezal Rio Branco",
    municipio: "São Vicente",
    bairro: "Rio Branco",
    contexto: "Queima rasteira com rajadas canalizadas pelo vale",
    coordinates: [-46.358, -23.94],
    brightness: 316,
    confidence: 87,
    satellite: "SNPP",
    riskMax: 88,
    frp: 19.8,
    etaH: 2.9,
    windSpeedMs: 8.8,
    windDirFromDeg: 138,
    distanceToLineM: 340,
    intersectsCorridor: true,
  },
  {
    id: "HS-BS-008",
    label: "Encosta Sambaiatuba",
    municipio: "São Vicente",
    bairro: "Sambaiatuba",
    contexto: "Foco elevado em cota intermediária do corredor",
    coordinates: [-46.366, -23.933],
    brightness: 312,
    confidence: 83,
    satellite: "NOAA-20",
    riskMax: 81,
    frp: 16.2,
    etaH: 3.6,
    windSpeedMs: 8.1,
    windDirFromDeg: 140,
    distanceToLineM: 410,
    intersectsCorridor: true,
  },
  {
    id: "HS-BS-009",
    label: "Talude Alemoa",
    municipio: "Santos",
    bairro: "Alemoa",
    contexto: "Material seco em faixa lateral do porto",
    coordinates: [-46.388, -23.918],
    brightness: 305,
    confidence: 75,
    satellite: "MODIS",
    riskMax: 73,
    frp: 12.6,
    etaH: 5.1,
    windSpeedMs: 7.4,
    windDirFromDeg: 144,
    distanceToLineM: 620,
    intersectsCorridor: false,
  },
  {
    id: "HS-BS-010",
    label: "Área continental Praia Grande",
    municipio: "Praia Grande",
    bairro: "Melvi Continental",
    contexto: "Foco remoto usado para calibrar filtro por corredor",
    coordinates: [-46.34, -23.995],
    brightness: 298,
    confidence: 68,
    satellite: "NOAA-21",
    riskMax: 58,
    frp: 9.4,
    etaH: 8.4,
    windSpeedMs: 6.1,
    windDirFromDeg: 152,
    distanceToLineM: 1510,
    intersectsCorridor: false,
  },
];

export const buildBaixadaWildfireCollection = (
  capturedAt = Date.now(),
  seeds: BaixadaWildfireSeed[] = baixadaSantistaWildfireSeeds,
): FeatureCollection<Point> => ({
  type: "FeatureCollection",
  features: seeds.map((seed, index) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: seed.coordinates,
    },
    properties: {
      hotspot_id: seed.id,
      id: seed.id,
      label: seed.label,
      municipio: seed.municipio,
      bairro: seed.bairro,
      contexto: seed.contexto,
      brightness: seed.brightness,
      confidence: seed.confidence,
      satellite: seed.satellite,
      risk_max: seed.riskMax,
      frp: seed.frp,
      eta_h: seed.etaH,
      wind_speed_ms: seed.windSpeedMs,
      wind_dir_from_deg: seed.windDirFromDeg,
      distance_to_line_m: seed.distanceToLineM,
      intersects_corridor: seed.intersectsCorridor,
      acq_date_ts: capturedAt - index * 42 * 60 * 1000,
      wind_profile: buildWindProfile(seed.windSpeedMs, seed.windDirFromDeg),
    },
  })),
});

export const baixadaSantistaBounds = {
  bbox: "-46.48,-24.02,-46.26,-23.84",
  center: { lat: -23.932, lon: -46.356 },
};
