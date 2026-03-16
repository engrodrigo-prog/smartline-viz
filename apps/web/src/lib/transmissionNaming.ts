export type SubstationBinding = {
  terminalA: string | null;
  terminalB: string | null;
  segmentCode: string | null;
  allCodes: string[];
};

const unique = <T,>(items: T[]) => Array.from(new Set(items));

export const normalizeSubstationCode = (value: string | null | undefined) => {
  if (!value) return null;
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);
  return normalized.length === 3 ? normalized : null;
};

const extractCodes = (value: string) =>
  unique(
    (value.toUpperCase().match(/\b[A-Z]{3}\b/g) ?? [])
      .map((item) => normalizeSubstationCode(item))
      .filter((item): item is string => Boolean(item)),
  );

export const parseSubstationBinding = (label: string | null | undefined): SubstationBinding => {
  const source = (label ?? "").trim();
  if (!source) {
    return {
      terminalA: null,
      terminalB: null,
      segmentCode: null,
      allCodes: [],
    };
  }

  const primaryPart = source.split("(")[0] ?? source;
  const primaryCodes = extractCodes(primaryPart);
  const parentheticalCodes = Array.from(source.matchAll(/\(([^)]+)\)/g))
    .flatMap((match) => extractCodes(match[1] ?? ""));

  const terminalA = primaryCodes[0] ?? null;
  const terminalB = primaryCodes[1] ?? null;
  const segmentCodes = parentheticalCodes.length >= 2 ? parentheticalCodes.slice(0, 2) : primaryCodes.slice(0, 2);
  const segmentCode = segmentCodes.length >= 2 ? `${segmentCodes[0]}-${segmentCodes[1]}` : null;

  return {
    terminalA,
    terminalB,
    segmentCode,
    allCodes: unique([...primaryCodes, ...parentheticalCodes]),
  };
};
