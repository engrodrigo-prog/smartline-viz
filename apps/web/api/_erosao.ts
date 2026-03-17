import type { Feature, FeatureCollection, LineString, Point, Polygon } from 'geojson';

export type PublicErosionRiskLineInput = {
  id?: string;
  lineCode?: string | null;
  lineName?: string | null;
  companyName?: string | null;
  regionCode?: string | null;
  voltageKv?: string | null;
  coordinates: Array<[number, number]>;
};

export type PublicErosionSoilSampleInput = {
  latitude: number;
  longitude: number;
  soilType: string;
  depth?: number;
  cohesion?: number;
  permeability?: number;
  moisture?: number;
  notes?: string;
};

type SamplePoint = {
  sampleId: string;
  lineIndex: number;
  lineCode: string | null;
  lineName: string | null;
  companyName: string | null;
  regionCode: string | null;
  voltageKv: string | null;
  chainageMeters: number;
  coordinates: [number, number];
};

type RainMetrics = {
  rain3dMm: number;
  rain7dMm: number;
};

type SoilContext = {
  soilType: string;
  soilSource: string;
  soilDistanceMeters: number | null;
  soilScore: number;
};

type SegmentRisk = {
  sampleId: string;
  lineCode: string | null;
  lineName: string | null;
  companyName: string | null;
  regionCode: string | null;
  voltageKv: string | null;
  start: [number, number];
  end: [number, number];
  midpoint: [number, number];
  chainageStartMeters: number;
  chainageEndMeters: number;
  rain3dMm: number;
  rain7dMm: number;
  slopePercent: number;
  soilType: string;
  soilSource: string;
  soilDistanceMeters: number | null;
  score: number;
  severity: 'Baixo' | 'Médio' | 'Alto' | 'Crítico';
  color: string;
};

export type PublicErosionRiskResponse = {
  generatedAt: string;
  bufferMeters: number;
  sampleSpacingMeters: number;
  source: {
    precipitation: string;
    terrain: string;
    soil: string;
  };
  degraded: boolean;
  notes: string[];
  stats: {
    linesEvaluated: number;
    samplesEvaluated: number;
    segmentsEvaluated: number;
    highRiskSegments: number;
    maxRain7dMm: number;
    maxSlopePercent: number;
    soilBackedSamples: number;
  };
  bounds: [number, number, number, number] | null;
  corridors: FeatureCollection<Polygon>;
  segments: FeatureCollection<LineString>;
  hotspots: FeatureCollection<Point>;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const round = (value: number, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineMeters = (lon1: number, lat1: number, lon2: number, lat2: number) => {
  const earthRadius = 6_371_000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const chunk = <T,>(values: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

const computeLineLengthMeters = (coordinates: Array<[number, number]>) => {
  let lengthMeters = 0;
  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const [lon1, lat1] = coordinates[index];
    const [lon2, lat2] = coordinates[index + 1];
    lengthMeters += haversineMeters(lon1, lat1, lon2, lat2);
  }
  return lengthMeters;
};

const interpolateAlongLine = (coordinates: Array<[number, number]>, distanceMeters: number): [number, number] => {
  if (coordinates.length === 0) return [0, 0];
  if (coordinates.length === 1) return coordinates[0];

  let traversedMeters = 0;
  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const start = coordinates[index];
    const end = coordinates[index + 1];
    const segmentMeters = haversineMeters(start[0], start[1], end[0], end[1]);
    if (segmentMeters <= 0) continue;

    if (traversedMeters + segmentMeters >= distanceMeters) {
      const remainingMeters = distanceMeters - traversedMeters;
      const factor = clamp(remainingMeters / segmentMeters, 0, 1);
      return [
        start[0] + (end[0] - start[0]) * factor,
        start[1] + (end[1] - start[1]) * factor,
      ];
    }
    traversedMeters += segmentMeters;
  }

  return coordinates[coordinates.length - 1];
};

const sampleLine = (
  line: PublicErosionRiskLineInput,
  lineIndex: number,
  sampleSpacingMeters: number,
): SamplePoint[] => {
  const coordinates = line.coordinates.filter(
    (coord): coord is [number, number] =>
      Array.isArray(coord) &&
      coord.length >= 2 &&
      typeof coord[0] === 'number' &&
      typeof coord[1] === 'number',
  );

  if (coordinates.length < 2) return [];

  const totalLengthMeters = computeLineLengthMeters(coordinates);
  const sampleCount = clamp(Math.floor(totalLengthMeters / sampleSpacingMeters) + 2, 2, 14);

  return Array.from({ length: sampleCount }, (_, index) => {
    const ratio = sampleCount === 1 ? 0 : index / (sampleCount - 1);
    const chainageMeters = totalLengthMeters * ratio;
    return {
      sampleId: `${line.lineCode ?? line.lineName ?? 'linha'}-${lineIndex}-${index}`,
      lineIndex,
      lineCode: line.lineCode ?? null,
      lineName: line.lineName ?? null,
      companyName: line.companyName ?? null,
      regionCode: line.regionCode ?? null,
      voltageKv: line.voltageKv ?? null,
      chainageMeters: round(chainageMeters, 0),
      coordinates: interpolateAlongLine(coordinates, chainageMeters),
    };
  });
};

const computeBounds = (coordinates: Array<[number, number]>): [number, number, number, number] | null => {
  if (coordinates.length === 0) return null;
  let minLon = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLon = coordinates[0][0];
  let maxLat = coordinates[0][1];

  coordinates.forEach(([lon, lat]) => {
    minLon = Math.min(minLon, lon);
    minLat = Math.min(minLat, lat);
    maxLon = Math.max(maxLon, lon);
    maxLat = Math.max(maxLat, lat);
  });

  return [minLon, minLat, maxLon, maxLat];
};

const severityForScore = (score: number): SegmentRisk['severity'] => {
  if (score >= 80) return 'Crítico';
  if (score >= 65) return 'Alto';
  if (score >= 45) return 'Médio';
  return 'Baixo';
};

const colorForSeverity = (severity: SegmentRisk['severity']) => {
  if (severity === 'Crítico') return '#b91c1c';
  if (severity === 'Alto') return '#ea580c';
  if (severity === 'Médio') return '#eab308';
  return '#16a34a';
};

const soilScoreFromSample = (sample: PublicErosionSoilSampleInput | null) => {
  if (!sample) return 12;

  const normalizedType = sample.soilType.toLowerCase();
  let score = 12;

  if (normalizedType.includes('aren')) score = 20;
  else if (normalizedType.includes('silt')) score = 18;
  else if (normalizedType.includes('argil')) score = 11;
  else if (normalizedType.includes('org')) score = 16;

  if (typeof sample.moisture === 'number') {
    if (sample.moisture >= 25) score += 4;
    else if (sample.moisture >= 18) score += 2;
  }

  if (typeof sample.permeability === 'number' && sample.permeability >= 1) {
    score += 2;
  }

  if (typeof sample.cohesion === 'number' && sample.cohesion >= 60) {
    score -= 4;
  }

  return clamp(score, 8, 24);
};

const nearestSoilContext = (
  point: [number, number],
  samples: PublicErosionSoilSampleInput[],
): SoilContext => {
  if (samples.length === 0) {
    return {
      soilType: 'Sem amostra',
      soilSource: 'baseline-neutro',
      soilDistanceMeters: null,
      soilScore: 12,
    };
  }

  let nearest: PublicErosionSoilSampleInput | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  samples.forEach((sample) => {
    const distance = haversineMeters(point[0], point[1], sample.longitude, sample.latitude);
    if (distance < nearestDistance) {
      nearest = sample;
      nearestDistance = distance;
    }
  });

  return {
    soilType: nearest?.soilType ?? 'Sem amostra',
    soilSource: 'amostra-local',
    soilDistanceMeters: Number.isFinite(nearestDistance) ? round(nearestDistance, 0) : null,
    soilScore: soilScoreFromSample(nearest),
  };
};

const buildCorridorPolygon = (
  start: [number, number],
  end: [number, number],
  bufferMeters: number,
): Array<[number, number]> => {
  const [lon1, lat1] = start;
  const [lon2, lat2] = end;
  const meanLat = (lat1 + lat2) / 2;
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLon = Math.max(1, 111_320 * Math.cos(toRadians(meanLat)));

  const dxMeters = (lon2 - lon1) * metersPerDegreeLon;
  const dyMeters = (lat2 - lat1) * metersPerDegreeLat;
  const segmentLengthMeters = Math.hypot(dxMeters, dyMeters);

  if (segmentLengthMeters < 1) {
    const offsetLat = bufferMeters / metersPerDegreeLat;
    const offsetLon = bufferMeters / metersPerDegreeLon;
    return [
      [lon1 - offsetLon, lat1 - offsetLat],
      [lon1 + offsetLon, lat1 - offsetLat],
      [lon1 + offsetLon, lat1 + offsetLat],
      [lon1 - offsetLon, lat1 + offsetLat],
      [lon1 - offsetLon, lat1 - offsetLat],
    ];
  }

  const perpendicularXMeters = (-dyMeters / segmentLengthMeters) * bufferMeters;
  const perpendicularYMeters = (dxMeters / segmentLengthMeters) * bufferMeters;
  const offsetLon = perpendicularXMeters / metersPerDegreeLon;
  const offsetLat = perpendicularYMeters / metersPerDegreeLat;

  return [
    [lon1 + offsetLon, lat1 + offsetLat],
    [lon2 + offsetLon, lat2 + offsetLat],
    [lon2 - offsetLon, lat2 - offsetLat],
    [lon1 - offsetLon, lat1 - offsetLat],
    [lon1 + offsetLon, lat1 + offsetLat],
  ];
};

const normalizeOpenMeteoResponse = (payload: unknown): any[] =>
  Array.isArray(payload) ? payload : payload ? [payload] : [];

const fetchRainMetrics = async (samples: SamplePoint[], notes: string[]) => {
  if (samples.length === 0) return [] as RainMetrics[];

  const output: RainMetrics[] = [];

  for (const batch of chunk(samples, 2)) {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', batch.map((sample) => sample.coordinates[1].toFixed(5)).join(','));
    url.searchParams.set('longitude', batch.map((sample) => sample.coordinates[0].toFixed(5)).join(','));
    url.searchParams.set('daily', 'precipitation_sum');
    url.searchParams.set('past_days', '7');
    url.searchParams.set('forecast_days', '1');
    url.searchParams.set('timezone', 'America/Sao_Paulo');

    const response = await fetch(url, {
      headers: { 'User-Agent': 'smartline-erosao-risk' },
    });

    if (!response.ok) {
      notes.push(`Falha ao consultar chuva acumulada pública (${response.status}).`);
      output.push(...batch.map(() => ({ rain3dMm: 0, rain7dMm: 0 })));
      continue;
    }

    const payload = normalizeOpenMeteoResponse(await response.json());
    batch.forEach((_, index) => {
      const entry = payload[index] ?? payload[0] ?? {};
      const daily = Array.isArray(entry?.daily?.precipitation_sum)
        ? entry.daily.precipitation_sum.map((value: unknown) => Number(value)).filter(Number.isFinite)
        : [];

      output.push({
        rain3dMm: round(sum(daily.slice(-3)), 1),
        rain7dMm: round(sum(daily.slice(-7)), 1),
      });
    });
  }

  return output;
};

const fetchElevations = async (samples: SamplePoint[], notes: string[]) => {
  if (samples.length === 0) return [] as number[];

  const output: number[] = [];

  for (const batch of chunk(samples, 80)) {
    const locations = batch
      .map((sample) => `${sample.coordinates[1].toFixed(5)},${sample.coordinates[0].toFixed(5)}`)
      .join('|');
    const url = `https://api.opentopodata.org/v1/srtm30m?locations=${encodeURIComponent(locations)}`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'smartline-erosao-risk' },
    });

    if (!response.ok) {
      notes.push(`Falha ao consultar topografia pública (${response.status}).`);
      output.push(...batch.map(() => 0));
      continue;
    }

    const payload = (await response.json()) as { results?: Array<{ elevation?: number | null }> };
    const elevations = Array.isArray(payload.results)
      ? payload.results.map((item) =>
          typeof item.elevation === 'number' && Number.isFinite(item.elevation) ? item.elevation : 0,
        )
      : batch.map(() => 0);

    output.push(...elevations);
  }

  return output;
};

export const computePublicErosionRisk = async ({
  lines,
  soilSamples = [],
  bufferMeters = 50,
  sampleSpacingMeters = 1_200,
}: {
  lines: PublicErosionRiskLineInput[];
  soilSamples?: PublicErosionSoilSampleInput[];
  bufferMeters?: number;
  sampleSpacingMeters?: number;
}): Promise<PublicErosionRiskResponse> => {
  const normalizedLines = lines.filter((line) => Array.isArray(line.coordinates) && line.coordinates.length >= 2);
  const notes: string[] = [];
  const degradedReasons = new Set<string>();

  const sampledPoints = normalizedLines.flatMap((line, index) =>
    sampleLine(line, index, clamp(sampleSpacingMeters, 300, 3_000)),
  );

  const rainMetrics = await fetchRainMetrics(sampledPoints, notes);
  if (notes.some((note) => note.includes('chuva'))) degradedReasons.add('rain');

  const elevations = await fetchElevations(sampledPoints, notes);
  if (notes.some((note) => note.includes('topografia'))) degradedReasons.add('terrain');

  if (soilSamples.length === 0) {
    notes.push('Sem amostras de solo cadastradas; fator de solo operando em baseline neutra.');
    degradedReasons.add('soil');
  }

  const segments: SegmentRisk[] = [];

  sampledPoints.forEach((sample, index) => {
    const next = sampledPoints[index + 1];
    if (!next || next.lineIndex !== sample.lineIndex) return;

    const rainCurrent = rainMetrics[index] ?? { rain3dMm: 0, rain7dMm: 0 };
    const rainNext = rainMetrics[index + 1] ?? rainCurrent;
    const rain3dMm = round((rainCurrent.rain3dMm + rainNext.rain3dMm) / 2, 1);
    const rain7dMm = round((rainCurrent.rain7dMm + rainNext.rain7dMm) / 2, 1);

    const elevationCurrent = elevations[index] ?? 0;
    const elevationNext = elevations[index + 1] ?? elevationCurrent;
    const segmentLengthMeters = Math.max(
      1,
      haversineMeters(sample.coordinates[0], sample.coordinates[1], next.coordinates[0], next.coordinates[1]),
    );
    const slopePercent = round((Math.abs(elevationNext - elevationCurrent) / segmentLengthMeters) * 100, 1);

    const midpoint: [number, number] = [
      round((sample.coordinates[0] + next.coordinates[0]) / 2, 6),
      round((sample.coordinates[1] + next.coordinates[1]) / 2, 6),
    ];

    const soilContext = nearestSoilContext(midpoint, soilSamples);
    const rainScore = clamp((rain7dMm / 150) * 35 + (rain3dMm / 80) * 15, 0, 50);
    const slopeScore = clamp((slopePercent / 30) * 30, 0, 30);
    const score = round(clamp(rainScore + slopeScore + soilContext.soilScore, 0, 100), 1);
    const severity = severityForScore(score);
    const color = colorForSeverity(severity);

    segments.push({
      sampleId: sample.sampleId,
      lineCode: sample.lineCode,
      lineName: sample.lineName,
      companyName: sample.companyName,
      regionCode: sample.regionCode,
      voltageKv: sample.voltageKv,
      start: sample.coordinates,
      end: next.coordinates,
      midpoint,
      chainageStartMeters: sample.chainageMeters,
      chainageEndMeters: next.chainageMeters,
      rain3dMm,
      rain7dMm,
      slopePercent,
      soilType: soilContext.soilType,
      soilSource: soilContext.soilSource,
      soilDistanceMeters: soilContext.soilDistanceMeters,
      score,
      severity,
      color,
    });
  });

  const corridorFeatures: Feature<Polygon>[] = segments.map((segment) => ({
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [buildCorridorPolygon(segment.start, segment.end, bufferMeters)],
    },
    properties: {
      lineCode: segment.lineCode,
      lineName: segment.lineName,
      companyName: segment.companyName,
      regionCode: segment.regionCode,
      voltageKv: segment.voltageKv,
      chainageStartMeters: segment.chainageStartMeters,
      chainageEndMeters: segment.chainageEndMeters,
      rain3dMm: segment.rain3dMm,
      rain7dMm: segment.rain7dMm,
      slopePercent: segment.slopePercent,
      soilType: segment.soilType,
      soilSource: segment.soilSource,
      soilDistanceMeters: segment.soilDistanceMeters,
      riskScore: segment.score,
      severity: segment.severity,
      color: segment.color,
      fillOpacity: segment.severity === 'Crítico' ? 0.34 : segment.severity === 'Alto' ? 0.26 : 0.18,
      strokeColor: segment.color,
      strokeWidth: segment.severity === 'Crítico' ? 2 : 1.2,
      bufferMeters,
    },
  }));

  const segmentFeatures: Feature<LineString>[] = segments.map((segment) => ({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [segment.start, segment.end],
    },
    properties: {
      lineCode: segment.lineCode,
      lineName: segment.lineName,
      color: segment.color,
      width: segment.severity === 'Crítico' ? 6 : segment.severity === 'Alto' ? 5 : 4,
      opacity: 0.92,
      corridorWidth: 0,
      corridorOpacity: 0,
      riskScore: segment.score,
      severity: segment.severity,
      rain7dMm: segment.rain7dMm,
      slopePercent: segment.slopePercent,
    },
  }));

  const hotspotFeatures: Feature<Point>[] = segments.map((segment) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: segment.midpoint,
    },
    properties: {
      lineCode: segment.lineCode,
      lineName: segment.lineName,
      color: segment.color,
      size: segment.severity === 'Crítico' ? 10 : segment.severity === 'Alto' ? 9 : 7,
      riskScore: segment.score,
      severity: segment.severity,
      rain3dMm: segment.rain3dMm,
      rain7dMm: segment.rain7dMm,
      slopePercent: segment.slopePercent,
      soilType: segment.soilType,
      soilSource: segment.soilSource,
      bufferMeters,
      label: `${segment.lineName ?? segment.lineCode ?? 'Linha'} • ${segment.severity}`,
    },
  }));

  const bounds = computeBounds([
    ...segments.map((segment) => segment.start),
    ...segments.map((segment) => segment.end),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    bufferMeters,
    sampleSpacingMeters: clamp(sampleSpacingMeters, 300, 3_000),
    source: {
      precipitation: 'Open-Meteo Historical Forecast',
      terrain: 'OpenTopoData SRTM30m',
      soil: soilSamples.length > 0 ? 'Amostras locais do modulo' : 'Baseline neutra sem amostra',
    },
    degraded: degradedReasons.size > 0,
    notes,
    stats: {
      linesEvaluated: normalizedLines.length,
      samplesEvaluated: sampledPoints.length,
      segmentsEvaluated: segments.length,
      highRiskSegments: segments.filter((segment) => segment.severity === 'Crítico' || segment.severity === 'Alto')
        .length,
      maxRain7dMm: round(Math.max(0, ...segments.map((segment) => segment.rain7dMm)), 1),
      maxSlopePercent: round(Math.max(0, ...segments.map((segment) => segment.slopePercent)), 1),
      soilBackedSamples: segments.filter((segment) => segment.soilSource === 'amostra-local').length,
    },
    bounds,
    corridors: {
      type: 'FeatureCollection',
      features: corridorFeatures,
    },
    segments: {
      type: 'FeatureCollection',
      features: segmentFeatures,
    },
    hotspots: {
      type: 'FeatureCollection',
      features: hotspotFeatures,
    },
  };
};
