import { describe, it, expect } from "vitest";
import type maplibregl from "maplibre-gl";
import { changeBasemap } from "@/lib/mapConfig";

class MockMap implements Partial<maplibregl.Map> {
  private _center = { lng: -46.33, lat: -23.96 } as any;
  private _zoom = 12;
  private _bearing = -17;
  private _pitch = 45;
  private _padding = { top: 0, right: 0, bottom: 0, left: 0 } as any;
  private _styleLoaded = true;
  private _sources: Record<string, any> = {
    "smartline-source": { type: "geojson", data: { type: "FeatureCollection", features: [] } },
  };
  private _layers: any[] = [
    { id: "smartline-layer", type: "circle", source: "smartline-source" },
  ];
  public addedSources: Record<string, any> = {};
  public addedLayers: any[] = [];
  public events: Record<string, Function[]> = {};
  public lastJumpTo: any = null;
  public styleUrl: any = null;

  getCenter() { return this._center; }
  getZoom() { return this._zoom; }
  getBearing() { return this._bearing; }
  getPitch() { return this._pitch; }
  getPadding() { return this._padding; }
  isStyleLoaded() { return this._styleLoaded; }
  getStyle() { return { version: 8, sources: this._sources, layers: this._layers }; }
  getSource(id: string) { return this.addedSources[id] || this._sources[id]; }
  getLayer(id: string) { return this.addedLayers.find(l => l.id === id) || this._layers.find(l => l.id === id); }
  addSource(id: string, source: any) { this.addedSources[id] = source; }
  addLayer(layer: any) { this.addedLayers.push(layer); }
  removeLayer(id: string) { this._layers = this._layers.filter((l) => l.id !== id); }
  removeSource(id: string) { delete this._sources[id]; }
  setTerrain(_: any) { /* noop */ }
  fire(event: string) { (this.events[event] ||= []).forEach((fn) => fn()); }
  setStyle(style: any) { this.styleUrl = style; }
  once(event: string, callback: Function) { (this.events[event] ||= []).push(callback); }
  jumpTo(opts: any) { this.lastJumpTo = opts; }
}

describe("mapConfig.changeBasemap", () => {
  it("preserves camera properties across basemap change", () => {
    const map = new MockMap();
    changeBasemap(map as any, "imagery", {});
    // simulate style load
    map.fire("style.load");
    expect(map.lastJumpTo).toBeTruthy();
    expect(map.lastJumpTo.center).toEqual(map.getCenter());
    expect(map.lastJumpTo.zoom).toEqual(map.getZoom());
    expect(map.lastJumpTo.bearing).toEqual(map.getBearing());
    expect(map.lastJumpTo.pitch).toEqual(map.getPitch());
  });
});

