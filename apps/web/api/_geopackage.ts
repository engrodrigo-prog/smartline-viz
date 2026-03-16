import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const initSqlJs = require('sql.js/dist/sql-wasm.js');
const wkx = require('wkx');
const proj4 = require('proj4');

const SQL_WASM_PATH = require.resolve('sql.js/dist/sql-wasm.wasm');

type ImportMetadata = {
  empresa: string;
  regiao: string;
  line_code: string;
  line_name: string;
  tensao_kv?: number | null;
  concessao?: string | null;
  reference_date?: string | null;
};

export type ParsedGeoPackageFeature = {
  layerName: string;
  title: string;
  geometryType: string;
  geometryWkt: string;
  geometryGeoJson: Record<string, unknown>;
  properties: Record<string, unknown>;
};

const COMMON_EPSG_DEFS: Record<string, string> = {
  'EPSG:31981': '+proj=utm +zone=21 +south +ellps=GRS80 +units=m +no_defs',
  'EPSG:31982': '+proj=utm +zone=22 +south +ellps=GRS80 +units=m +no_defs',
  'EPSG:31983': '+proj=utm +zone=23 +south +ellps=GRS80 +units=m +no_defs',
  'EPSG:31984': '+proj=utm +zone=24 +south +ellps=GRS80 +units=m +no_defs',
  'EPSG:31985': '+proj=utm +zone=25 +south +ellps=GRS80 +units=m +no_defs',
  'EPSG:4674': '+proj=longlat +ellps=GRS80 +no_defs',
  'EPSG:4326': '+proj=longlat +datum=WGS84 +no_defs',
};

Object.entries(COMMON_EPSG_DEFS).forEach(([code, definition]) => {
  proj4.defs(code, definition);
});

const quoteIdentifier = (value: string) => `"${value.replace(/"/g, '""')}"`;

const envelopeBytesForFlag = (flag: number) => {
  switch (flag) {
    case 1:
      return 32;
    case 2:
    case 3:
      return 48;
    case 4:
      return 64;
    default:
      return 0;
  }
};

const stripGeoPackageHeader = (value: Uint8Array) => {
  const buffer = Buffer.from(value);
  if (buffer.length < 8) return buffer;
  if (buffer[0] !== 0x47 || buffer[1] !== 0x50) return buffer;

  const flags = buffer[3] ?? 0;
  const envelopeIndicator = (flags >> 1) & 0x07;
  const offset = 8 + envelopeBytesForFlag(envelopeIndicator);
  return buffer.subarray(offset);
};

const transformCoordinates = (input: unknown, fromEpsg?: string | null): unknown => {
  if (!fromEpsg || fromEpsg === 'EPSG:4326' || fromEpsg === 'EPSG:4674') return input;
  if (!Array.isArray(input)) return input;

  if (input.length >= 2 && typeof input[0] === 'number' && typeof input[1] === 'number') {
    const [x, y] = proj4(fromEpsg, 'EPSG:4326', [input[0], input[1]]);
    const rest = input.slice(2);
    return [x, y, ...rest];
  }

  return input.map((item) => transformCoordinates(item, fromEpsg));
};

const normalizeProps = (row: Record<string, unknown>, geomColumn: string) =>
  Object.fromEntries(
    Object.entries(row)
      .filter(([key, value]) => key !== geomColumn && !(value instanceof Uint8Array))
      .map(([key, value]) => [key, value ?? null]),
  );

const pickTitle = (row: Record<string, unknown>, fallback: string) => {
  const candidates = ['nome', 'name', 'titulo', 'title', 'codigo', 'code', 'id'];
  for (const key of candidates) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return fallback;
};

const inferEpsg = (srsId: number) => {
  if (srsId === 4326 || srsId === 4674) return `EPSG:${srsId}`;
  if (srsId >= 31981 && srsId <= 31985) return `EPSG:${srsId}`;
  return null;
};

export const parseGeoPackage = async (buffer: ArrayBuffer): Promise<ParsedGeoPackageFeature[]> => {
  const SQL = await initSqlJs({
    locateFile: () => SQL_WASM_PATH,
  });

  const db = new SQL.Database(new Uint8Array(buffer));

  const contents = db.exec(`
    SELECT
      c.table_name,
      c.identifier,
      gc.column_name AS geom_column,
      gc.geometry_type_name,
      gc.srs_id
    FROM gpkg_contents c
    INNER JOIN gpkg_geometry_columns gc ON gc.table_name = c.table_name
    WHERE c.data_type = 'features'
    ORDER BY c.table_name
  `);

  const features: ParsedGeoPackageFeature[] = [];
  const layers = contents[0];
  if (!layers) return features;

  for (const rowValues of layers.values) {
    const [tableName, identifier, geomColumn, geometryTypeName, srsIdRaw] = rowValues;
    if (typeof tableName !== 'string' || typeof geomColumn !== 'string') continue;
    const layerLabel = typeof identifier === 'string' && identifier.trim() ? identifier.trim() : tableName;
    const srsId = typeof srsIdRaw === 'number' ? srsIdRaw : Number(srsIdRaw ?? 4326);
    const sourceEpsg = inferEpsg(srsId);

    const result = db.exec(`SELECT * FROM ${quoteIdentifier(tableName)}`);
    const table = result[0];
    if (!table) continue;

    for (let index = 0; index < table.values.length; index += 1) {
      const valueRow = table.values[index] ?? [];
      const row = Object.fromEntries(table.columns.map((column: string, columnIndex: number) => [column, valueRow[columnIndex]]));
      const geometryRaw = row[geomColumn];
      if (!(geometryRaw instanceof Uint8Array)) continue;

      const wkb = stripGeoPackageHeader(geometryRaw);
      const parsedWkb = wkx.Geometry.parse(wkb);
      let geometryGeoJson = parsedWkb.toGeoJSON() as Record<string, unknown>;

      if (sourceEpsg && sourceEpsg !== 'EPSG:4326' && sourceEpsg !== 'EPSG:4674') {
        geometryGeoJson = {
          ...geometryGeoJson,
          coordinates: transformCoordinates((geometryGeoJson as any).coordinates, sourceEpsg),
        };
      }

      const geometryWkt = `SRID=4326;${wkx.Geometry.parseGeoJSON(geometryGeoJson).toWkt()}`;
      const title = pickTitle(normalizeProps(row, geomColumn), `${layerLabel} ${index + 1}`);

      features.push({
        layerName: layerLabel,
        title,
        geometryType: typeof geometryTypeName === 'string' ? geometryTypeName : String((geometryGeoJson as any).type ?? 'Geometry'),
        geometryWkt,
        geometryGeoJson,
        properties: normalizeProps(row, geomColumn),
      });
    }
  }

  return features;
};

const asNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const next = Number(value);
    return Number.isFinite(next) ? next : null;
  }
  return null;
};

export const buildImportPayload = (feature: ParsedGeoPackageFeature, metadata: ImportMetadata, index: number) => {
  const kind = String(feature.geometryGeoJson.type ?? feature.geometryType).toLowerCase();
  const baseMeta = {
    source_layer: feature.layerName,
    original_properties: feature.properties,
    line_code: metadata.line_code,
    line_name: metadata.line_name,
    tensao_kv: metadata.tensao_kv ?? null,
    empresa: metadata.empresa,
    regiao: metadata.regiao,
    concessao: metadata.concessao ?? null,
    reference_date: metadata.reference_date ?? null,
  };

  if (kind.includes('line')) {
    return {
      table: 'linhas_transmissao' as const,
      payload: {
        codigo: metadata.line_code || `${feature.title}-${index + 1}`,
        nome: metadata.line_name || feature.title,
        geometry: feature.geometryWkt,
        status: 'Ativa',
        empresa: metadata.empresa,
        concessao: metadata.concessao ?? null,
        regiao: metadata.regiao,
        tensao_kv: asNumber(metadata.tensao_kv),
        tipo_material: null,
      },
    };
  }

  if (kind.includes('point')) {
    return {
      table: 'estruturas' as const,
      payload: {
        codigo: feature.title,
        geometry: feature.geometryWkt,
        tipo: 'Torre',
        estado_conservacao: 'Bom',
        empresa: metadata.empresa,
        concessao: metadata.concessao ?? null,
        regiao: metadata.regiao,
        tensao_kv: metadata.tensao_kv ? String(metadata.tensao_kv) : null,
      },
    };
  }

  return {
    table: 'geodata_outros' as const,
    payload: {
      nome: feature.title,
      categoria: kind.includes('polygon') ? 'Faixa/Poligono importado' : 'Tracado importado',
      descricao: metadata.line_name || feature.layerName,
      geometry: feature.geometryWkt,
      empresa: metadata.empresa,
      concessao: metadata.concessao ?? null,
      regiao: metadata.regiao,
      tensao_kv: metadata.tensao_kv ? String(metadata.tensao_kv) : null,
      metadata: baseMeta,
    },
  };
};
