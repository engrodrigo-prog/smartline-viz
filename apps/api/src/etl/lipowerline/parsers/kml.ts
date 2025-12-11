import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { DOMParser } from '@xmldom/xmldom';
import { kml } from "@tmcw/togeojson";
import type { Feature, Geometry } from "geojson";

export interface ParsedKmlFeature {
  feature: Feature<Geometry | null>;
  name?: string;
}

export function parseKmlFile(filePath: string): ParsedKmlFeature[] {
  const xml = readFileSync(filePath, "utf8");
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const collection = kml(doc);

  if (!collection || !Array.isArray(collection.features)) {
    throw new Error(`Arquivo KML ${basename(filePath)} não contém features`);
  }

  return collection.features.map((feature) => ({
    feature,
    name: typeof feature.properties?.name === "string" ? feature.properties.name : feature.id,
  }));
}
