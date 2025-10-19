import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { Ruler, ZoomIn, ZoomOut } from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { BasemapSelector } from "@/components/BasemapSelector";
import { Button } from "@/components/ui/button";
import {
  addOrUpdateGeoJsonSource,
  applyTerrainAndBuildings,
  basemapIds,
  buildStyleForBasemap,
  selectBasemap,
  resetTerrain
} from "@/services/map";
import { DEFAULT_BASEMAP, type BasemapId } from "@/lib/mapConfig";
import type { FeatureCollection, Position } from "geojson";

const haversineDistance = (from: Position, to: Position) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad((to[1] as number) - (from[1] as number));
  const dLon = toRad((to[0] as number) - (from[0] as number));
  const lat1 = toRad(from[1] as number);
  const lat2 = toRad(to[1] as number);

  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const MEASUREMENT_SOURCE_ID = "smartline-measurement";

const emptyMeasurement: FeatureCollection = {
  type: "FeatureCollection",
  features: []
};

const MapView = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const measurementPoints = useRef<Position[]>([]);

  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const [currentBasemap, setCurrentBasemap] = useState<BasemapId>(() => selectBasemap(DEFAULT_BASEMAP, token));
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementKm, setMeasurementKm] = useState<number | null>(null);
  const [hoverCoords, setHoverCoords] = useState<mapboxgl.LngLat | null>(null);

  useEffect(() => {
    mapboxgl.accessToken = token ?? "";
  }, [token]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const basemap = selectBasemap(currentBasemap, token);
    const style = buildStyleForBasemap(basemap, token);

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style,
      center: [-46.333, -23.96],
      zoom: 11,
      pitch: 45,
      bearing: -17
    });

    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new mapboxgl.FullscreenControl(), "top-right");
    map.addControl(new mapboxgl.ScaleControl({ unit: "metric" }), "bottom-right");

    map.on("mousemove", (event) => setHoverCoords(event.lngLat));

    map.on("style.load", () => {
      if (token && typeof style === "string") {
        applyTerrainAndBuildings(map, token);
      } else {
        resetTerrain(map);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [currentBasemap, token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (event: mapboxgl.MapMouseEvent & mapboxgl.EventData) => {
      if (!isMeasuring) return;

      measurementPoints.current.push([event.lngLat.lng, event.lngLat.lat]);
      if (measurementPoints.current.length > 2) {
        measurementPoints.current.shift();
      }

      updateMeasurement();
    };

    map.on("click", handleClick);

    return () => {
      map.off("click", handleClick);
    };
  }, [isMeasuring]);

  const updateMeasurement = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const points = measurementPoints.current;
    if (!points.length) {
      addOrUpdateGeoJsonSource(map, MEASUREMENT_SOURCE_ID, emptyMeasurement);
      setMeasurementKm(null);
      return;
    }

    const features: FeatureCollection["features"] = [
      {
        type: "Feature",
        geometry: {
          type: "MultiPoint",
          coordinates: points
        },
        properties: {}
      }
    ];

    if (points.length === 2) {
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: points
        },
        properties: {}
      });
      setMeasurementKm(haversineDistance(points[0]!, points[1]!));
    } else {
      setMeasurementKm(null);
    }

    addOrUpdateGeoJsonSource(map, MEASUREMENT_SOURCE_ID, {
      type: "FeatureCollection",
      features
    });

    if (!map.getLayer("measurement-line")) {
      map.addLayer({
        id: "measurement-line",
        type: "line",
        source: MEASUREMENT_SOURCE_ID,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": "#0ea5e9",
          "line-width": 3,
          "line-dasharray": [2, 2]
        }
      });
    }

    if (!map.getLayer("measurement-points")) {
      map.addLayer({
        id: "measurement-points",
        type: "circle",
        source: MEASUREMENT_SOURCE_ID,
        filter: ["==", ["geometry-type"], "MultiPoint"],
        paint: {
          "circle-radius": 6,
          "circle-color": "#0ea5e9",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff"
        }
      });
    }
  }, []);

  const toggleMeasurement = () => {
    if (!mapRef.current) return;

    if (isMeasuring) {
      measurementPoints.current = [];
      updateMeasurement();
      setMeasurementKm(null);
      setIsMeasuring(false);
    } else {
      measurementPoints.current = [];
      updateMeasurement();
      setIsMeasuring(true);
    }
  };

  const handleBasemapChange = (next: BasemapId) => {
    const map = mapRef.current;
    if (!map) return;

    const resolved = selectBasemap(next, token);
    const style = buildStyleForBasemap(resolved, token);

    map.once("styledata", () => {
      if (token && typeof style === "string") {
        applyTerrainAndBuildings(map, token);
      } else {
        resetTerrain(map);
      }
    });

    map.setStyle(style, { diff: false });
    setCurrentBasemap(resolved);
    measurementPoints.current = [];
    setMeasurementKm(null);
  };

  const availableBasemaps = useMemo(() => basemapIds(), []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Mapa Interativo"
          subtitle={token ? "Use Mapbox + ESRI com terreno 3D e medições" : "Forneça VITE_MAPBOX_TOKEN para habilitar estilos Mapbox."}
        />
        <main className="flex-1 relative">
          <div ref={containerRef} className="absolute inset-0" />

          <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
            <Button size="icon" variant="secondary" className="h-9 w-9" onClick={() => mapRef.current?.zoomIn()}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="secondary" className="h-9 w-9" onClick={() => mapRef.current?.zoomOut()}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={isMeasuring ? "default" : "secondary"}
              className="h-9 mt-2"
              onClick={toggleMeasurement}
            >
              <Ruler className="w-4 h-4 mr-2" />
              {isMeasuring ? "Medição ativa" : "Medir distância"}
            </Button>
          </div>

          <BasemapSelector
            value={currentBasemap}
            onChange={handleBasemapChange}
            mapboxAvailable={Boolean(token)}
          />

          <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-xs z-20 text-foreground shadow">
            {hoverCoords ? (
              <div>
                <span className="font-medium">Coordenadas</span>
                <div className="text-muted-foreground">
                  {hoverCoords.lat.toFixed(5)}°, {hoverCoords.lng.toFixed(5)}°
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">Passe o cursor para ver as coordenadas</span>
            )}
            {measurementKm && (
              <div className="mt-2 text-foreground">
                <span className="font-medium">Distância:</span> {(measurementKm).toFixed(2)} km
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MapView;
