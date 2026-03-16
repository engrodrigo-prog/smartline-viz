type Geometry = {
  type: string;
  coordinates?: any;
  geometries?: Geometry[];
};

type PointGeometry = {
  type: 'Point';
  coordinates: [number, number];
};

type LineStringGeometry = {
  type: 'LineString';
  coordinates: [number, number][];
};

type Feature<TGeometry = Geometry> = {
  type: 'Feature';
  id?: string | number;
  geometry: TGeometry;
  properties?: Record<string, unknown>;
};

type FeatureCollection<TGeometry = Geometry> = {
  type: 'FeatureCollection';
  features: Array<Feature<TGeometry>>;
};

export type FirmsRiskSource = 'VIIRS_NOAA21_NRT' | 'VIIRS_NOAA20_NRT' | 'VIIRS_SNPP_NRT' | 'MODIS_NRT';

export type FirmsRiskBody = {
  lineId?: string | null;
  lineName?: string | null;
  empresa?: string | null;
  regiao?: string | null;
  seCode?: string | null;
  tensaoKv?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  daysBack?: number | null;
  count?: number | null;
  maxDistanceKm?: number | null;
  sensors?: string[] | null;
};

export type DashboardGeoAssetRow = {
  source_table: string;
  source_id: string;
  title: string;
  company_name?: string | null;
  region_code?: string | null;
  line_code?: string | null;
  asset_type?: string | null;
  geometry_kind?: string | null;
  properties?: Record<string, unknown> | string | null;
  geom_geojson?: Geometry | string | null;
  created_at?: string | null;
};

export type OperationalAsset = {
  id: string;
  name: string;
  sourceTable: string;
  assetType: string | null;
  geometryKind: string | null;
  geometry: Geometry;
  lineCode: string | null;
  lineName: string | null;
  companyName: string | null;
  regionCode: string | null;
  substationCodes: string[];
  metadata: Record<string, unknown>;
};

export type FirmsHotspotRecord = {
  id: string;
  source: string;
  satellite: string;
  latitude: number;
  longitude: number;
  brightness: number | null;
  frp: number | null;
  confidence: number;
  dayNight: string | null;
  acquiredAtIso: string;
  acquiredAtTs: number;
};

type CachedQueimadaRow = {
  id: number | string;
  fonte?: string | null;
  satelite?: string | null;
  data_aquisicao?: string | null;
  brilho?: number | string | null;
  confianca?: number | string | null;
  geometry?: string | null;
  nivel_risco?: string | null;
  distancia_m?: number | string | null;
  ramal?: string | null;
  concessao?: string | null;
  wind_direction?: number | string | null;
  wind_speed?: number | string | null;
};

export type FirmsRiskBuildOptions = {
  lineId?: string | null;
  lineName?: string | null;
  empresa?: string | null;
  regiao?: string | null;
  seCode?: string | null;
  tensaoKv?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  count?: number | null;
  maxDistanceKm?: number | null;
};

export type AssetScopeSummary = {
  count: number;
  line_count: number;
  structure_count: number;
  other_count: number;
  companies: string[];
  regions: string[];
  line_codes: string[];
  se_codes: string[];
  bbox: [number, number, number, number] | null;
};

type SourceDescriptor = {
  id: FirmsRiskSource;
  priority: number;
};

const EARTH_RADIUS_M = 6371008.8;
const MAX_FIRMS_DAYS = 10;
const DEFAULT_MAX_DISTANCE_KM = 5;
const DEFAULT_FIRMS_SOURCES: SourceDescriptor[] = [
  { id: 'VIIRS_NOAA21_NRT', priority: 1 },
  { id: 'VIIRS_NOAA20_NRT', priority: 2 },
  { id: 'VIIRS_SNPP_NRT', priority: 3 },
];
const OPTIONAL_SOURCE_IDS: FirmsRiskSource[] = ['MODIS_NRT'];

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const uniq = <T,>(items: T[]) => Array.from(new Set(items));

const normalizeText = (value: string | null | undefined) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const toRecord = (value: unknown): Record<string, unknown> => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' ? (value as Record<string, unknown>) : {};
};

const parseGeometry = (value: unknown): Geometry | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Geometry;
    } catch {
      return null;
    }
  }
  return typeof value === 'object' ? (value as Geometry) : null;
};

const normalizeSubstationCode = (value: string | null | undefined) => {
  if (!value) return null;
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);
  return normalized.length === 3 ? normalized : null;
};

const extractCodes = (value: string | null | undefined) =>
  uniq(
    ((value ?? '').toUpperCase().match(/\b[A-Z]{3}\b/g) ?? [])
      .map((item) => normalizeSubstationCode(item))
      .filter((item): item is string => Boolean(item)),
  );

const collectSubstationCodes = (assetName: string, lineCode: string | null, metadata: Record<string, unknown>) => {
  const nestedMetadata = toRecord(metadata.metadata);
  const substationCodes = Array.isArray(nestedMetadata.substation_codes)
    ? nestedMetadata.substation_codes
        .map((item) => normalizeSubstationCode(typeof item === 'string' ? item : null))
        .filter((item): item is string => Boolean(item))
    : [];
  const terminalA = normalizeSubstationCode(
    typeof nestedMetadata.terminal_a === 'string' ? nestedMetadata.terminal_a : typeof metadata.terminal_a === 'string' ? metadata.terminal_a : null,
  );
  const terminalB = normalizeSubstationCode(
    typeof nestedMetadata.terminal_b === 'string' ? nestedMetadata.terminal_b : typeof metadata.terminal_b === 'string' ? metadata.terminal_b : null,
  );

  return uniq([
    ...extractCodes(assetName),
    ...extractCodes(lineCode),
    ...substationCodes,
    terminalA,
    terminalB,
  ].filter((item): item is string => Boolean(item)));
};

const getLineName = (title: string, properties: Record<string, unknown>) => {
  const nestedMetadata = toRecord(properties.metadata);
  const candidates = [
    properties.nome,
    properties.line_name,
    properties.linha_nome,
    nestedMetadata.line_name,
    nestedMetadata.lineName,
    title,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }

  return title;
};

const listCoordinates = (geometry: Geometry, sink: Array<[number, number]>) => {
  switch (geometry.type) {
    case 'Point':
      sink.push([geometry.coordinates[0], geometry.coordinates[1]]);
      break;
    case 'MultiPoint':
    case 'LineString':
      geometry.coordinates.forEach((coord) => sink.push([coord[0], coord[1]]));
      break;
    case 'MultiLineString':
    case 'Polygon':
      geometry.coordinates.forEach((ring) => ring.forEach((coord) => sink.push([coord[0], coord[1]])));
      break;
    case 'MultiPolygon':
      geometry.coordinates.forEach((polygon) =>
        polygon.forEach((ring) => ring.forEach((coord) => sink.push([coord[0], coord[1]]))),
      );
      break;
    case 'GeometryCollection':
      geometry.geometries.forEach((child) => listCoordinates(child, sink));
      break;
  }
};

const buildPointFeature = (lon: number, lat: number, properties: Record<string, unknown>): Feature<PointGeometry> => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lon, lat] },
  properties,
});

const deg2rad = (value: number) => (value * Math.PI) / 180;

const haversineMeters = (lon1: number, lat1: number, lon2: number, lat2: number) => {
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
};

const projectPoint = (lon: number, lat: number, referenceLat: number) => {
  const x = deg2rad(lon) * EARTH_RADIUS_M * Math.cos(deg2rad(referenceLat));
  const y = deg2rad(lat) * EARTH_RADIUS_M;
  return { x, y };
};

const pointToSegmentDistanceMeters = (
  point: [number, number],
  start: [number, number],
  end: [number, number],
) => {
  const referenceLat = (point[1] + start[1] + end[1]) / 3;
  const p = projectPoint(point[0], point[1], referenceLat);
  const a = projectPoint(start[0], start[1], referenceLat);
  const b = projectPoint(end[0], end[1], referenceLat);

  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const denom = abx * abx + aby * aby;
  if (!denom) return Math.hypot(apx, apy);
  const t = clamp((apx * abx + apy * aby) / denom, 0, 1);
  const closestX = a.x + abx * t;
  const closestY = a.y + aby * t;
  return Math.hypot(p.x - closestX, p.y - closestY);
};

const isPointInsideRing = (point: [number, number], ring: [number, number][]) => {
  let inside = false;
  const [x, y] = point;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]?.[0] ?? 0;
    const yi = ring[i]?.[1] ?? 0;
    const xj = ring[j]?.[0] ?? 0;
    const yj = ring[j]?.[1] ?? 0;
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

const distanceToRingMeters = (point: [number, number], ring: [number, number][]) => {
  if (!ring.length) return Number.POSITIVE_INFINITY;
  let minDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < ring.length - 1; index += 1) {
    minDistance = Math.min(minDistance, pointToSegmentDistanceMeters(point, ring[index], ring[index + 1]));
  }
  return minDistance;
};

const distanceToGeometryMeters = (point: [number, number], geometry: Geometry): number => {
  switch (geometry.type) {
    case 'Point':
      return haversineMeters(point[0], point[1], geometry.coordinates[0], geometry.coordinates[1]);
    case 'MultiPoint':
      return geometry.coordinates.reduce(
        (minDistance, coord) => Math.min(minDistance, haversineMeters(point[0], point[1], coord[0], coord[1])),
        Number.POSITIVE_INFINITY,
      );
    case 'LineString': {
      let minDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < geometry.coordinates.length - 1; index += 1) {
        minDistance = Math.min(
          minDistance,
          pointToSegmentDistanceMeters(point, geometry.coordinates[index], geometry.coordinates[index + 1]),
        );
      }
      return minDistance;
    }
    case 'MultiLineString':
      return geometry.coordinates.reduce((minDistance, line) => {
        const next = distanceToGeometryMeters(point, { type: 'LineString', coordinates: line });
        return Math.min(minDistance, next);
      }, Number.POSITIVE_INFINITY);
    case 'Polygon': {
      const outerRing = geometry.coordinates[0] ?? [];
      if (outerRing.length && isPointInsideRing(point, outerRing as [number, number][])) return 0;
      return geometry.coordinates.reduce((minDistance, ring) => {
        const next = distanceToRingMeters(point, ring as [number, number][]);
        return Math.min(minDistance, next);
      }, Number.POSITIVE_INFINITY);
    }
    case 'MultiPolygon':
      return geometry.coordinates.reduce((minDistance, polygon) => {
        const next = distanceToGeometryMeters(point, { type: 'Polygon', coordinates: polygon });
        return Math.min(minDistance, next);
      }, Number.POSITIVE_INFINITY);
    case 'GeometryCollection':
      return geometry.geometries.reduce((minDistance, child) => {
        const next = distanceToGeometryMeters(point, child);
        return Math.min(minDistance, next);
      }, Number.POSITIVE_INFINITY);
  }
};

const bboxFromAssets = (assets: OperationalAsset[]) => {
  const coordinates: Array<[number, number]> = [];
  assets.forEach((asset) => listCoordinates(asset.geometry, coordinates));
  if (!coordinates.length) return null;

  const lngs = coordinates.map((coord) => coord[0]);
  const lats = coordinates.map((coord) => coord[1]);
  return [
    Math.min(...lngs),
    Math.min(...lats),
    Math.max(...lngs),
    Math.max(...lats),
  ] as [number, number, number, number];
};

const expandBbox = (bbox: [number, number, number, number], paddingKm: number) => {
  const centerLat = (bbox[1] + bbox[3]) / 2;
  const latPad = paddingKm / 110.574;
  const lonPad = paddingKm / (111.320 * Math.max(Math.cos(deg2rad(centerLat)), 0.2));
  return [
    clamp(bbox[0] - lonPad, -179.999, 179.999),
    clamp(bbox[1] - latPad, -89.999, 89.999),
    clamp(bbox[2] + lonPad, -179.999, 179.999),
    clamp(bbox[3] + latPad, -89.999, 89.999),
  ] as [number, number, number, number];
};

const normalizeDateValue = (value: string | null | undefined, fallback: Date) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

export const buildDateRange = (body: FirmsRiskBody) => {
  const now = new Date();
  const end = normalizeDateValue(body.dateTo ?? null, now);
  const daysBack = clamp(Math.round(asNumber(body.daysBack) ?? 1), 1, MAX_FIRMS_DAYS);
  const startFallback = new Date(end.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const start = normalizeDateValue(body.dateFrom ?? null, startFallback);

  const normalizedStart = start <= end ? start : new Date(end.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const spanDays = clamp(
    Math.ceil((end.getTime() - normalizedStart.getTime()) / (24 * 60 * 60 * 1000)),
    1,
    MAX_FIRMS_DAYS,
  );

  return {
    start: normalizedStart,
    end,
    days: spanDays,
    startDateParam: normalizedStart.toISOString().slice(0, 10),
  };
};

const buildFirmsUrl = (
  apiKey: string,
  source: FirmsRiskSource,
  bbox: [number, number, number, number],
  days: number,
  startDateParam: string,
) =>
  `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/${source}/${bbox.join(',')}/${days}/${startDateParam}`;

const splitCsvLine = (line: string) => {
  const values: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }
    if (char === ',' && !insideQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  values.push(current);
  return values;
};

const parseCsvRows = (csvText: string) => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return [];

  const headers = splitCsvLine(lines[0]).map((item) => item.trim());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
};

const confidenceToPercent = (value: unknown) => {
  const numeric = asNumber(value);
  if (numeric != null) return clamp(Math.round(numeric), 0, 100);
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'h') return 90;
  if (normalized === 'n') return 65;
  if (normalized === 'l') return 35;
  return 50;
};

const acquiredAtFromRow = (row: Record<string, string>) => {
  const date = row.acq_date?.trim();
  const time = row.acq_time?.trim().padStart(4, '0');
  if (!date || !time) return null;
  const iso = `${date}T${time.slice(0, 2)}:${time.slice(2, 4)}:00Z`;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return null;
  return { iso, ts };
};

const inferSatellite = (source: FirmsRiskSource, row: Record<string, string>) =>
  row.satellite?.trim() || row.instrument?.trim() || source.replace(/_/g, ' ');

export const fetchFirmsRecords = async ({
  apiKey,
  bbox,
  dateRange,
  sensors,
}: {
  apiKey: string;
  bbox: [number, number, number, number];
  dateRange: { days: number; startDateParam: string; start: Date; end: Date };
  sensors?: string[] | null;
}) => {
  const sourceDescriptors = uniq(
    (Array.isArray(sensors) && sensors.length
      ? sensors.filter((item): item is FirmsRiskSource =>
          [...DEFAULT_FIRMS_SOURCES.map((source) => source.id), ...OPTIONAL_SOURCE_IDS].includes(item as FirmsRiskSource),
        )
      : DEFAULT_FIRMS_SOURCES.map((source) => source.id)),
  ).map((id, index) => ({ id, priority: index + 1 }));

  const settled = await Promise.allSettled(
    sourceDescriptors.map(async (source) => {
      const response = await fetch(buildFirmsUrl(apiKey, source.id, bbox, dateRange.days, dateRange.startDateParam), {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        throw new Error(`${source.id}: HTTP ${response.status}`);
      }
      const csvText = await response.text();
      return { source, rows: parseCsvRows(csvText) };
    }),
  );

  const notes: string[] = [];
  const records = new Map<string, FirmsHotspotRecord>();

  settled.forEach((result) => {
    if (result.status === 'rejected') {
      notes.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
      return;
    }

    result.value.rows.forEach((row) => {
      const lat = asNumber(row.latitude);
      const lon = asNumber(row.longitude);
      const acquiredAt = acquiredAtFromRow(row);
      if (lat == null || lon == null || !acquiredAt) return;
      if (acquiredAt.ts < dateRange.start.getTime() || acquiredAt.ts > dateRange.end.getTime() + 24 * 60 * 60 * 1000) return;

      const frp = asNumber(row.frp);
      const brightness = asNumber(row.bright_ti4 ?? row.brightness ?? row.bright_t31);
      const confidence = confidenceToPercent(row.confidence);
      const id = `${result.value.source.id}:${acquiredAt.iso}:${lat.toFixed(5)}:${lon.toFixed(5)}`;
      const existing = records.get(id);

      if (!existing) {
        records.set(id, {
          id,
          source: result.value.source.id,
          satellite: inferSatellite(result.value.source.id, row),
          latitude: lat,
          longitude: lon,
          brightness,
          frp,
          confidence,
          dayNight: row.daynight?.trim() || null,
          acquiredAtIso: acquiredAt.iso,
          acquiredAtTs: acquiredAt.ts,
        });
        return;
      }

      const nextFrp = Math.max(existing.frp ?? 0, frp ?? 0);
      const nextBrightness = Math.max(existing.brightness ?? 0, brightness ?? 0);
      records.set(id, {
        ...existing,
        frp: nextFrp || null,
        brightness: nextBrightness || null,
        confidence: Math.max(existing.confidence, confidence),
      });
    });
  });

  return {
    records: Array.from(records.values()).sort((a, b) => b.acquiredAtTs - a.acquiredAtTs),
    notes,
  };
};

export const buildOperationalAssets = (rows: DashboardGeoAssetRow[], filters: FirmsRiskBuildOptions) => {
  const normalizedLineName = normalizeText(filters.lineName);
  const normalizedSeCode = normalizeSubstationCode(filters.seCode ?? null);
  const normalizedTensao = normalizeText(filters.tensaoKv);

  return rows
    .map((row) => {
      const geometry = parseGeometry(row.geom_geojson);
      if (!geometry) return null;
      const properties = toRecord(row.properties);
      const metadata = toRecord(properties.metadata);
      const lineCode = typeof row.line_code === 'string' && row.line_code.trim() ? row.line_code.trim() : null;
      const lineName = getLineName(row.title, properties);

      const asset: OperationalAsset = {
        id: `${row.source_table}:${row.source_id}`,
        name: row.title,
        sourceTable: row.source_table,
        assetType: row.asset_type ?? null,
        geometryKind: row.geometry_kind ?? null,
        geometry,
        lineCode,
        lineName,
        companyName: typeof row.company_name === 'string' ? row.company_name : null,
        regionCode: typeof row.region_code === 'string' ? row.region_code : null,
        substationCodes: collectSubstationCodes(row.title, lineCode, { ...properties, metadata }),
        metadata: { ...properties, metadata },
      };
      return asset;
    })
    .filter((asset): asset is OperationalAsset => asset !== null)
    .filter((asset) => {
      if (filters.lineId && asset.lineCode !== filters.lineId) return false;
      if (normalizedLineName) {
        const haystack = normalizeText([asset.name, asset.lineName, asset.lineCode].filter(Boolean).join(' '));
        if (!haystack.includes(normalizedLineName)) return false;
      }
      if (normalizedSeCode && !asset.substationCodes.includes(normalizedSeCode)) return false;
      if (normalizedTensao) {
        const tensaoCandidates = [
          asset.metadata['tensao_kv'],
          toRecord(asset.metadata['metadata']).tensao_kv,
        ]
          .map((item) => normalizeText(typeof item === 'string' || typeof item === 'number' ? String(item) : null))
          .filter(Boolean);
        if (!tensaoCandidates.some((item) => item === normalizedTensao)) return false;
      }
      return true;
    });
};

export const buildAssetScopeSummary = (assets: OperationalAsset[]): AssetScopeSummary => {
  const bbox = bboxFromAssets(assets);
  return {
    count: assets.length,
    line_count: assets.filter((asset) => asset.sourceTable === 'linhas_transmissao').length,
    structure_count: assets.filter((asset) => asset.sourceTable === 'estruturas').length,
    other_count: assets.filter((asset) => !['linhas_transmissao', 'estruturas'].includes(asset.sourceTable)).length,
    companies: uniq(assets.map((asset) => asset.companyName).filter((item): item is string => Boolean(item))).sort(),
    regions: uniq(assets.map((asset) => asset.regionCode).filter((item): item is string => Boolean(item))).sort(),
    line_codes: uniq(assets.map((asset) => asset.lineCode).filter((item): item is string => Boolean(item))).sort(),
    se_codes: uniq(assets.flatMap((asset) => asset.substationCodes)).sort(),
    bbox,
  };
};

export const buildCorridorFeatureCollection = (assets: OperationalAsset[]): FeatureCollection<LineStringGeometry> => {
  const features: Feature<LineStringGeometry>[] = [];

  assets
    .filter((asset) => asset.geometry.type === 'LineString' || asset.geometry.type === 'MultiLineString')
    .forEach((asset) => {
      if (asset.geometry.type === 'LineString') {
        features.push({
          type: 'Feature',
          geometry: asset.geometry as LineStringGeometry,
          properties: {
            asset_id: asset.id,
            asset_name: asset.name,
            line_code: asset.lineCode,
          },
        });
        return;
      }

      asset.geometry.coordinates.forEach((coordinates, index) => {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates },
          properties: {
            asset_id: asset.id,
            asset_name: asset.name,
            line_code: asset.lineCode,
            segment_index: index,
          },
        });
      });
    });

  return { type: 'FeatureCollection', features };
};

const classifyAssetType = (asset: OperationalAsset | null) => {
  if (!asset) return 'operacional';
  if (asset.sourceTable === 'linhas_transmissao') return 'linha';
  if (asset.sourceTable === 'estruturas') return 'estrutura';
  if (asset.sourceTable === 'rasters') return 'raster';
  return 'camada';
};

const riskLabelForScore = (score: number) => {
  if (score >= 90) return 'critico';
  if (score >= 75) return 'alto';
  if (score >= 55) return 'moderado';
  if (score >= 35) return 'atencao';
  return 'baixo';
};

const estimateEtaHours = (distanceMeters: number | null, frp: number | null, confidence: number) => {
  if (distanceMeters == null || !Number.isFinite(distanceMeters)) return null;
  const spreadMetersPerHour = Math.max(120, (frp ?? 0) * 14 + confidence * 2.2);
  return Number((distanceMeters / spreadMetersPerHour).toFixed(2));
};

const riskFromInputs = ({
  distanceToAssetM,
  distanceToLineM,
  confidence,
  frp,
  ageHours,
  nearestAsset,
}: {
  distanceToAssetM: number | null;
  distanceToLineM: number | null;
  confidence: number;
  frp: number | null;
  ageHours: number;
  nearestAsset: OperationalAsset | null;
}) => {
  const baseDistance = distanceToLineM ?? distanceToAssetM ?? 999999;
  const distanceScore = clamp(100 - (baseDistance / 5000) * 100, 0, 100);
  const confidenceScore = clamp(confidence, 0, 100);
  const frpScore = clamp((Math.log1p(frp ?? 0) / Math.log(61)) * 100, 0, 100);
  const recencyScore = clamp(100 - ageHours * 9, 0, 100);
  const assetWeight = nearestAsset?.sourceTable === 'estruturas' ? 92 : nearestAsset?.sourceTable === 'linhas_transmissao' ? 100 : 78;
  return Number(
    clamp(distanceScore * 0.42 + confidenceScore * 0.22 + frpScore * 0.2 + recencyScore * 0.1 + assetWeight * 0.06, 0, 100).toFixed(1),
  );
};

const chooseNearestAsset = (record: FirmsHotspotRecord, assets: OperationalAsset[]) => {
  if (!assets.length) {
    return {
      nearestAsset: null,
      distanceToAssetM: null,
      nearestLine: null,
      distanceToLineM: null,
    };
  }

  const point: [number, number] = [record.longitude, record.latitude];
  let nearestAsset: OperationalAsset | null = null;
  let distanceToAssetM = Number.POSITIVE_INFINITY;
  let nearestLine: OperationalAsset | null = null;
  let distanceToLineM = Number.POSITIVE_INFINITY;

  assets.forEach((asset) => {
    const distance = distanceToGeometryMeters(point, asset.geometry);
    if (distance < distanceToAssetM) {
      distanceToAssetM = distance;
      nearestAsset = asset;
    }
    if (asset.sourceTable === 'linhas_transmissao' && distance < distanceToLineM) {
      distanceToLineM = distance;
      nearestLine = asset;
    }
  });

  return {
    nearestAsset,
    distanceToAssetM: Number.isFinite(distanceToAssetM) ? Number(distanceToAssetM.toFixed(1)) : null,
    nearestLine,
    distanceToLineM: Number.isFinite(distanceToLineM) ? Number(distanceToLineM.toFixed(1)) : null,
  };
};

const buildHotspotFeature = (
  record: FirmsHotspotRecord,
  nearest: ReturnType<typeof chooseNearestAsset>,
  nowTs: number,
): Feature<PointGeometry> => {
  const ageHours = Math.max(0, (nowTs - record.acquiredAtTs) / (60 * 60 * 1000));
  const score = riskFromInputs({
    distanceToAssetM: nearest.distanceToAssetM,
    distanceToLineM: nearest.distanceToLineM,
    confidence: record.confidence,
    frp: record.frp,
    ageHours,
    nearestAsset: nearest.nearestAsset,
  });
  const eta = estimateEtaHours(nearest.distanceToAssetM, record.frp, record.confidence);
  const nearestAssetType = classifyAssetType(nearest.nearestAsset);
  const companyName = nearest.nearestAsset?.companyName ?? null;
  const regionCode = nearest.nearestAsset?.regionCode ?? null;
  const lineCode = nearest.nearestAsset?.lineCode ?? nearest.nearestLine?.lineCode ?? null;
  const lineName = nearest.nearestAsset?.lineName ?? nearest.nearestLine?.lineName ?? null;
  const seCodes = uniq([
    ...(nearest.nearestAsset?.substationCodes ?? []),
    ...(nearest.nearestLine?.substationCodes ?? []),
  ]);

  return buildPointFeature(record.longitude, record.latitude, {
    id: record.id,
    hotspot_id: record.id,
    label: nearest.nearestAsset?.name ?? lineName ?? `${record.source} ${new Date(record.acquiredAtTs).toLocaleTimeString('pt-BR')}`,
    municipio: lineName ?? companyName ?? 'Corredor monitorado',
    bairro: nearest.nearestAsset?.name ?? null,
    contexto: nearest.nearestAsset
      ? `Ativo ${nearestAssetType} mais próximo: ${nearest.nearestAsset.name}`
      : 'Sem ativo correlacionado no escopo atual',
    risk_max: score,
    risk_label: riskLabelForScore(score),
    frp: record.frp ?? record.brightness ?? 0,
    FRP: record.frp ?? record.brightness ?? 0,
    confidence: record.confidence,
    daynight: record.dayNight,
    source_sensor: record.source,
    satelite: record.satellite,
    acq_date_ts: record.acquiredAtTs,
    acq_iso: record.acquiredAtIso,
    eta_h: eta,
    intersects_corridor: nearest.distanceToLineM != null ? nearest.distanceToLineM <= 1000 : false,
    distance_to_asset_m: nearest.distanceToAssetM,
    distance_to_line_m: nearest.distanceToLineM,
    nearest_asset_id: nearest.nearestAsset?.id ?? null,
    nearest_asset_name: nearest.nearestAsset?.name ?? null,
    nearest_asset_type: nearestAssetType,
    nearest_asset_source: nearest.nearestAsset?.sourceTable ?? null,
    company_name: companyName,
    region_code: regionCode,
    line_code: lineCode,
    line_name: lineName,
    se_codes: seCodes,
    empresa: companyName,
    regiao: regionCode,
    data_aquisicao: record.acquiredAtIso,
  });
};

export const buildFirmsRiskCollection = ({
  records,
  assets,
  options,
  source,
}: {
  records: FirmsHotspotRecord[];
  assets: OperationalAsset[];
  options: FirmsRiskBuildOptions;
  source: string;
}) => {
  const maxDistanceMeters = Math.max(250, (options.maxDistanceKm ?? DEFAULT_MAX_DISTANCE_KM) * 1000);
  const normalizedCompany = normalizeText(options.empresa);
  const normalizedRegion = normalizeText(options.regiao);
  const normalizedLineId = normalizeText(options.lineId);
  const normalizedLineName = normalizeText(options.lineName);
  const normalizedSeCode = normalizeSubstationCode(options.seCode ?? null);
  const startTs = options.dateFrom ? Date.parse(options.dateFrom) : null;
  const endTs = options.dateTo ? Date.parse(options.dateTo) : null;
  const nowTs = Date.now();

  const features = records
    .map((record) => {
      const nearest = chooseNearestAsset(record, assets);
      if (assets.length && nearest.distanceToAssetM != null && nearest.distanceToAssetM > maxDistanceMeters) return null;
      const feature = buildHotspotFeature(record, nearest, nowTs);
      const props = feature.properties as Record<string, unknown>;

      if (normalizedCompany && normalizeText(typeof props.company_name === 'string' ? props.company_name : null) !== normalizedCompany) return null;
      if (normalizedRegion && normalizeText(typeof props.region_code === 'string' ? props.region_code : null) !== normalizedRegion) return null;
      if (normalizedLineId && normalizeText(typeof props.line_code === 'string' ? props.line_code : null) !== normalizedLineId) return null;
      if (normalizedLineName) {
        const haystack = normalizeText([props.line_name, props.label, props.nearest_asset_name].filter((item) => typeof item === 'string').join(' '));
        if (!haystack.includes(normalizedLineName)) return null;
      }
      if (normalizedSeCode) {
        const seCodes = Array.isArray(props.se_codes) ? props.se_codes.map((item) => normalizeSubstationCode(typeof item === 'string' ? item : null)) : [];
        if (!seCodes.includes(normalizedSeCode)) return null;
      }

      const acquiredAtTs = asNumber(props.acq_date_ts);
      if (startTs != null && acquiredAtTs != null && acquiredAtTs < startTs) return null;
      if (endTs != null && acquiredAtTs != null && acquiredAtTs > endTs + 24 * 60 * 60 * 1000) return null;

      return feature;
    })
    .filter((feature): feature is Feature<PointGeometry> => feature !== null)
    .sort((a, b) => Number((b.properties?.risk_max as number) ?? 0) - Number((a.properties?.risk_max as number) ?? 0))
    .slice(0, Math.max(1, Math.min(options.count ?? 1200, 5000)));

  const stats = {
    hotspots_total: features.length,
    risk_max: features.length ? Math.max(...features.map((feature) => Number(feature.properties?.risk_max ?? 0))) : 0,
    risk_avg: features.length
      ? Number(
          (
            features.reduce((sum, feature) => sum + Number(feature.properties?.risk_max ?? 0), 0) / features.length
          ).toFixed(1),
        )
      : 0,
    corridor_count: features.filter((feature) => Boolean(feature.properties?.intersects_corridor)).length,
    frp_sum: Number(features.reduce((sum, feature) => sum + Number(feature.properties?.frp ?? 0), 0).toFixed(1)),
  };

  const scope = buildAssetScopeSummary(assets);
  const corridor = buildCorridorFeatureCollection(assets.filter((asset) => asset.sourceTable === 'linhas_transmissao'));

  return {
    type: 'FeatureCollection' as const,
    features,
    meta: {
      generated_at: new Date().toISOString(),
      source,
      stats,
      asset_scope: scope,
      corridor,
      query: {
        lineId: options.lineId ?? null,
        lineName: options.lineName ?? null,
        empresa: options.empresa ?? null,
        regiao: options.regiao ?? null,
        seCode: options.seCode ?? null,
        maxDistanceKm: options.maxDistanceKm ?? DEFAULT_MAX_DISTANCE_KM,
      },
    },
  };
};

export const cachedQueimadasToRecords = (rows: CachedQueimadaRow[]) =>
  rows
    .map((row) => {
      const acquiredAtIso = typeof row.data_aquisicao === 'string' && row.data_aquisicao ? row.data_aquisicao : null;
      const acquiredAtTs = acquiredAtIso ? Date.parse(acquiredAtIso) : NaN;
      const pointMatch = typeof row.geometry === 'string' ? row.geometry.match(/POINT\(([-0-9.]+)\s+([-0-9.]+)\)/i) : null;
      if (!pointMatch || !acquiredAtIso || Number.isNaN(acquiredAtTs)) return null;
      return {
        id: `cache:${row.id}`,
        source: typeof row.fonte === 'string' && row.fonte ? row.fonte : 'cache',
        satellite: typeof row.satelite === 'string' && row.satelite ? row.satelite : 'FIRMS cache',
        latitude: Number(pointMatch[2]),
        longitude: Number(pointMatch[1]),
        brightness: asNumber(row.brilho),
        frp: asNumber(row.brilho),
        confidence: clamp(Math.round(asNumber(row.confianca) ?? 50), 0, 100),
        dayNight: null,
        acquiredAtIso,
        acquiredAtTs,
      } satisfies FirmsHotspotRecord;
    })
    .filter((record): record is FirmsHotspotRecord => Boolean(record));

export const computeAssetBboxForFirms = (assets: OperationalAsset[], maxDistanceKm: number) => {
  const bbox = bboxFromAssets(assets);
  if (!bbox) return null;
  return expandBbox(bbox, Math.max(1, maxDistanceKm));
};
