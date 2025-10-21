import React, { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useFirmsData } from "@/hooks/useFirmsData";
import { useFirmsFootprints } from "@/hooks/useFirmsFootprints";

const basemapStyle = "https://demotiles.maplibre.org/style.json";

export default function FirmsViewer() {
  const mapRef = useRef<MapLibreMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showPoints, setShowPoints] = useState(true);
  const [showFootprints, setShowFootprints] = useState(true);

  const points = useFirmsData({ count: 2000, format: "auto", bboxMode: "south_america" });
  const footprints = useFirmsFootprints({});

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: basemapStyle,
      center: [-55, -14],
      zoom: 3.5,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Render points layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const sourceId = "firms-wfs-points";
    const layerId = "firms-wfs-points-layer";

    const data = points.data ?? { type: "FeatureCollection", features: [] };
    const has = map.getSource(sourceId);
    if (!has) {
      map.addSource(sourceId, { type: "geojson", data });
      map.addLayer({
        id: layerId,
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": 4,
          "circle-color": [
            "interpolate",
            ["linear"],
            ["to-number", ["get", "confidence"], 0],
            0, "#66c2ff",
            50, "#ffcc00",
            75, "#ff6600",
            90, "#ff0000"
          ],
          "circle-opacity": 0.8,
          "circle-stroke-width": 0.5,
          "circle-stroke-color": "#000000"
        }
      });
    } else {
      (map.getSource(sourceId) as any).setData(data);
    }

    map.setLayoutProperty(layerId, "visibility", showPoints ? "visible" : "none");
  }, [points.data, showPoints]);

  // Render footprints polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const sourceId = "firms-footprints";
    const fillId = "firms-footprints-fill";
    const outlineId = "firms-footprints-outline";

    const data = (footprints.data as any) ?? { type: "FeatureCollection", features: [] };
    const has = map.getSource(sourceId);
    if (!has) {
      map.addSource(sourceId, { type: "geojson", data });
      map.addLayer({
        id: fillId,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": [
            "match",
            ["get", "nivel_risco"],
            "critico", "#ff0000",
            "alto", "#ff9900",
            "medio", "#ffd166",
            "baixo", "#06d6a0",
            "#999999"
          ],
          "fill-opacity": 0.25
        }
      });
      map.addLayer({
        id: outlineId,
        type: "line",
        source: sourceId,
        paint: { "line-color": "#333", "line-width": 1, "line-opacity": 0.6 }
      });
    } else {
      (map.getSource(sourceId) as any).setData(data);
    }

    const vis = showFootprints ? "visible" : "none";
    map.setLayoutProperty(fillId, "visibility", vis);
    map.setLayoutProperty(outlineId, "visibility", vis);
  }, [footprints.data, showFootprints]);

  const kpis = useMemo(() => {
    const pts = points.data?.features?.length ?? 0;
    const fps = (footprints.data as any)?.features?.length ?? 0;
    return { pts, fps };
  }, [points.data, footprints.data]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: 12, display: "flex", gap: 16, alignItems: "center" }}>
        <strong>FIRMS Viewer</strong>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={showPoints} onChange={(e) => setShowPoints(e.target.checked)} />
          Hotspots (WFS)
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={showFootprints} onChange={(e) => setShowFootprints(e.target.checked)} />
          Áreas (KML→GeoJSON)
        </label>
        <span style={{ color: "#666" }}>pts: {kpis.pts} • áreas: {kpis.fps}</span>
      </div>
      <div ref={containerRef} style={{ flex: 1, minHeight: 480 }} />
    </div>
  );
}

