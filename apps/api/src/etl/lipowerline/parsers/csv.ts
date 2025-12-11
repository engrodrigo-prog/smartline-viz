import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";

export type CsvRow = Record<string, string>;

export function parseCsv(filePath: string): CsvRow[] {
  const data = readFileSync(filePath, "utf8");
  const rows = parse(data, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return rows as CsvRow[];
}
