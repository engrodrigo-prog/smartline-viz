import { isAbsolute, join } from "node:path";
import { readdirSync } from "node:fs";
import type { DatasetFilesMap } from "./types.js";

const PATTERNS: Record<keyof DatasetFilesMap, RegExp[]> = {
  lineKml: [/linha/i, /tracado/i, /line/i],
  structureKml: [/estrutura/i, /torre/i, /tower/i],
  treatedKml: [/tratad/i, /manejo/i, /treated/i],
  vegetationCsv: [/vegetaca/i, /trees/i],
  vegetationRiskCsv: [/risco/i, /clearance/i],
  lateralRiskCsv: [/queda/i, /danger/i],
  crossingsCsv: [/cruzamento/i, /cross/i],
};

export function autodetectDatasetFiles(datasetPath: string, overrides: Partial<DatasetFilesMap> = {}): DatasetFilesMap {
  const entries = readdirSync(datasetPath, { withFileTypes: true });
  const resolved: DatasetFilesMap = {};

  for (const key of Object.keys(PATTERNS) as (keyof DatasetFilesMap)[]) {
    const overridePath = overrides[key];
    if (overridePath) {
      resolved[key] = resolvePath(datasetPath, overridePath);
      continue;
    }
    const match = entries.find((entry) => {
      if (!entry.isFile()) return false;
      return PATTERNS[key].some((regex) => regex.test(entry.name));
    });
    if (match) {
      resolved[key] = join(datasetPath, match.name);
    }
  }

  return resolved;
}

function resolvePath(base: string, value: string) {
  if (isAbsolute(value)) return value;
  return join(base, value);
}

export function pickValue<T = unknown>(record: Record<string, any>, keys: string[]): T | undefined {
  for (const key of keys) {
    const direct = record[key];
    if (direct !== undefined && direct !== null && String(direct).trim() !== "") {
      return direct as T;
    }
    const normalizedKey = Object.keys(record).find((entry) => entry.toLowerCase() === key.toLowerCase());
    if (normalizedKey) {
      const value = record[normalizedKey];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return value as T;
      }
    }
  }
  return undefined;
}

export function toNumber(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function toBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).toLowerCase();
  if (["true", "1", "sim", "yes"].includes(normalized)) return true;
  if (["false", "0", "nao", "não", "no"].includes(normalized)) return false;
  return undefined;
}

export function sanitizeClass(value?: string): string | undefined {
  return value?.trim() ? value.trim() : undefined;
}
