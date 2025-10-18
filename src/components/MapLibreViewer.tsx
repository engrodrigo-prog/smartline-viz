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

const MapLibreViewer = ({ 
  data, 
  onFeatureClick, 
  height = '600px',
  center = [-47.0, -15.8], // Centro do Brasil
  zoom = 5 
}: MapLibreViewerProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return; // Initialize map only once

    map.current = initializeESRIMap(mapContainer.current, {
      center,
      zoom,
      basemap: 'imagery'
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add scale
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    return () => {
      map.current?.remove();
    };
  }, [center, zoom]);

  useEffect(() => {
    if (!map.current || !data || data.length === 0) return;

    // Wait for map to load
    map.current.on('load', () => {
      if (!map.current) return;

      // Convert data to GeoJSON
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

      // Add source
      if (!map.current!.getSource('geodata')) {
        map.current!.addSource('geodata', {
          type: 'geojson',
          data: geojson,
        });

        // Add layers for different geometry types
        // Points
        map.current!.addLayer({
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

        // Lines
        map.current!.addLayer({
          id: 'geodata-lines',
          type: 'line',
          source: 'geodata',
          filter: ['==', '$type', 'LineString'],
          paint: {
            'line-color': '#4ECDC4',
            'line-width': 3,
          },
        });

        // Polygons
        map.current!.addLayer({
          id: 'geodata-polygons',
          type: 'fill',
          source: 'geodata',
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'fill-color': '#95E1D3',
            'fill-opacity': 0.3,
          },
        });

        // Polygon outlines
        map.current!.addLayer({
          id: 'geodata-polygons-outline',
          type: 'line',
          source: 'geodata',
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'line-color': '#4ECDC4',
            'line-width': 2,
          },
        });

        // Add click handlers
        ['geodata-points', 'geodata-lines', 'geodata-polygons'].forEach(layerId => {
          map.current!.on('click', layerId, (e) => {
            if (e.features && e.features.length > 0 && onFeatureClick) {
              onFeatureClick(e.features[0]);
            }
          });

          // Change cursor on hover
          map.current!.on('mouseenter', layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = 'pointer';
          });

          map.current!.on('mouseleave', layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = '';
          });
        });
      } else {
        // Update existing source
        const source = map.current!.getSource('geodata') as maplibregl.GeoJSONSource;
        source.setData(geojson);
      }

      // Fit bounds to data
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
          map.current!.fitBounds(bounds, { padding: 50, maxZoom: 15 });
        }
      }
    });
  }, [data, onFeatureClick]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-border">
      <div ref={mapContainer} style={{ height }} />
    </div>
  );
};

export default MapLibreViewer;
