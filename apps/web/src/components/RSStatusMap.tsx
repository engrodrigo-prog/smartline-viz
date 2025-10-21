import React, { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const styleUrl = "https://demotiles.maplibre.org/style.json";

export default function RSStatusMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [-53.5, -29.5],
      zoom: 5.2,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;
    map.on("load", () => setLoaded(true));
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;

    const sourceId = "rs-line";
    const url = "/demo-rs-line.geojson";

    const addLayers = async () => {
      try {
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, { type: "geojson", data: url });
        }

        // Wide glow/corridor
        if (!map.getLayer("rs-line-corridor")) {
          map.addLayer({
            id: "rs-line-corridor",
            type: "line",
            source: sourceId,
            paint: {
              "line-color": "#22d3ee",
              "line-width": 10,
              "line-opacity": 0.25,
            },
          });
        }

        // Main line
        if (!map.getLayer("rs-line-main")) {
          map.addLayer({
            id: "rs-line-main",
            type: "line",
            source: sourceId,
            paint: {
              "line-color": "#0284c7",
              "line-width": 3,
              "line-opacity": 0.9,
            },
          });
        }

        // Fit to line bounds
        const resp = await fetch(url);
        const data = await resp.json();
        const coords = data.features?.[0]?.geometry?.coordinates || [];
        if (Array.isArray(coords) && coords.length > 1) {
          let minX = coords[0][0], minY = coords[0][1], maxX = coords[0][0], maxY = coords[0][1];
          for (const [x, y] of coords) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
          const padding = 0.8;
          map.fitBounds([
            [minX - padding, minY - padding],
            [maxX + padding, maxY + padding]
          ], { padding: 40, duration: 800 });
        }
      } catch (e) {
        console.warn("RS line overlay error", e);
      }
    };

    if (map.isStyleLoaded()) addLayers();
    else map.once("style.load", addLayers);
  }, [loaded]);

  return <div ref={containerRef} className="w-full h-[360px] rounded-lg overflow-hidden" />;
}

