import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { initializeESRIMap } from '@/lib/mapConfig';

interface MapLibreViewerProps {
  data: Array<{
    id: string | number;
    geometry: any; // GeoJSON geometry
    properties?: Record<string, any>;
  }>;
  onFeatureClick?: (feature: any) => void;
  height?: string;
  center?: [number, number];
  zoom?: number;
}

const DEFAULT_CENTER: [number, number] = [-47.0, -15.8];

const MapLibreViewer = ({ 
  data, 
  onFeatureClick, 
  height = '600px',
  center = DEFAULT_CENTER, // Centro do Brasil
  zoom = 5 
}: MapLibreViewerProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const initialCenterRef = useRef(center);
  const initialZoomRef = useRef(zoom);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return; // Initialize map only once

    map.current = initializeESRIMap(mapContainer.current, {
      center: initialCenterRef.current,
      zoom: initialZoomRef.current,
      basemap: 'imagery'
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add scale
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !data || data.length === 0) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: data.map(item => ({
        type: 'Feature',
        id: item.id,
        geometry: typeof item.geometry === 'string'
          ? JSON.parse(item.geometry)
          : item.geometry,
        properties: item.properties || {},
      })),
    };

    const applyData = () => {
      if (!map.current) {
        return;
      }

      if (!map.current.getSource('geodata')) {
        map.current.addSource('geodata', {
          type: 'geojson',
          data: geojson,
        });

        map.current.addLayer({
          id: 'geodata-points',
          type: 'circle',
          source: 'geodata',
          filter: ['==', '$type', 'Point'],
          paint: {
            'circle-radius': 6,
            'circle-color': '#FF6B35',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        });

        map.current.addLayer({
          id: 'geodata-lines',
          type: 'line',
          source: 'geodata',
          filter: ['==', '$type', 'LineString'],
          paint: {
            'line-color': '#4ECDC4',
            'line-width': 3,
          },
        });

        map.current.addLayer({
          id: 'geodata-polygons',
          type: 'fill',
          source: 'geodata',
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'fill-color': '#95E1D3',
            'fill-opacity': 0.3,
          },
        });

        map.current.addLayer({
          id: 'geodata-polygons-outline',
          type: 'line',
          source: 'geodata',
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'line-color': '#4ECDC4',
            'line-width': 2,
          },
        });

        ['geodata-points', 'geodata-lines', 'geodata-polygons'].forEach(layerId => {
          map.current!.on('click', layerId, (e) => {
            if (e.features && e.features.length > 0 && onFeatureClick) {
              onFeatureClick(e.features[0]);
            }
          });

          map.current!.on('mouseenter', layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = 'pointer';
          });

          map.current!.on('mouseleave', layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = '';
          });
        });
      } else {
        (map.current.getSource('geodata') as maplibregl.GeoJSONSource).setData(geojson);
      }

      if (geojson.features.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        geojson.features.forEach(feature => {
          if (feature.geometry.type === 'Point') {
            bounds.extend(feature.geometry.coordinates as [number, number]);
          } else if (feature.geometry.type === 'LineString') {
            feature.geometry.coordinates.forEach(coord => bounds.extend(coord as [number, number]));
          } else if (feature.geometry.type === 'Polygon') {
            feature.geometry.coordinates[0].forEach(coord => bounds.extend(coord as [number, number]));
          }
        });

        if (!bounds.isEmpty()) {
          map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
        }
      }
    };

    const mapInstance = map.current;
    const handleLoad = () => applyData();

    try {
      if (mapInstance.isStyleLoaded()) {
        applyData();
        return;
      }
      mapInstance.once('load', handleLoad);
    } catch {
      // Guard against "There is no style added to the map" when a stale map instance exists.
      mapInstance.once('styledata', handleLoad);
    }

    return () => {
      try {
        mapInstance.off('load', handleLoad);
        mapInstance.off('styledata', handleLoad);
      } catch {
        /* ignore */
      }
    };
  }, [data, onFeatureClick]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-border">
      <div ref={mapContainer} style={{ height }} />
    </div>
  );
};

export default MapLibreViewer;
