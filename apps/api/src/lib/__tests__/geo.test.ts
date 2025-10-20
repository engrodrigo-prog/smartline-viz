import { describe, expect, it } from "vitest";
import { ensureBrazilBBOX, parseCSVtoGeoJSON, parseKMLtoGeoJSON } from "../geo.js";

describe("lib/geo", () => {
  it("converte CSV com latitude/longitude em FeatureCollection", () => {
    const csv = [
      "latitude,longitude,intensity,confidence",
      "-22.1,-43.2,320,85",
      "-10.5,-50.1,290,60"
    ].join("\n");

    const collection = parseCSVtoGeoJSON(csv);
    expect(collection.type).toBe("FeatureCollection");
    expect(collection.features).toHaveLength(2);
    expect(collection.features[0].geometry?.type).toBe("Point");
    expect(collection.features[0].geometry?.coordinates).toEqual([-43.2, -22.1]);
    expect(collection.features[0].properties).toMatchObject({ intensity: 320, confidence: 85 });
  });

  it("interpreta KML gerando pontos", () => {
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
      <kml xmlns="http://www.opengis.net/kml/2.2">
        <Document>
          <Placemark>
            <name>Teste</name>
            <Point><coordinates>-43.21,-22.11,0</coordinates></Point>
          </Placemark>
        </Document>
      </kml>`;

    const collection = parseKMLtoGeoJSON(kml);
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0].geometry?.type).toBe("Point");
    expect(collection.features[0].geometry?.coordinates).toEqual([-43.21, -22.11]);
  });

  it("garante bbox do Brasil por padrão", () => {
    expect(ensureBrazilBBOX(undefined)).toBe("-34,-74.5,5.5,-28.5");
    expect(ensureBrazilBBOX("south_america")).toBe("-90,-180,90,180");
    expect(() => ensureBrazilBBOX("10,9,8,7")).toThrow();
  });
});
