import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Loader2 } from 'lucide-react';
import { initializeESRIMap } from '@/lib/mapConfig';
import type { Feature } from 'geojson';
import type { FeatureCollection, LineString } from 'geojson';

interface MapLibreQueimadasProps {
  geojson: GeoJSON.FeatureCollection;
  onFeatureClick?: (feature: Feature) => void;
  fitBounds?: maplibregl.LngLatBoundsLike | null;
  corridor?: FeatureCollection<LineString> | null;
  showWindOverlay?: boolean;
}

const riskColorExpression = [
  "case",
  ["boolean", ["coalesce", ["get", "isFocus"], false], false], "#38bdf8",
  [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "risk_max"], 0],
    0, "#16a34a",
    25, "#84cc16",
    50, "#facc15",
    75, "#f97316",
    90, "#ef4444",
    100, "#b91c1c"
  ]
];

const riskRadiusExpression = [
  "+",
  [
    "interpolate",
    ["linear"],
    ["sqrt", ["coalesce", ["get", "frp"], 0]],
    0, 6,
    4, 10,
    8, 14
  ],
  [
    "case",
    ["boolean", ["coalesce", ["get", "isFocus"], false], false],
    4,
    0
  ]
];

export const MapLibreQueimadas = ({ geojson, onFeatureClick, fitBounds, corridor, showWindOverlay = true }: MapLibreQueimadasProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const windCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Array<{ x: number; y: number }>>([]);

  // Calcula um vetor de vento médio a partir dos hotspots (demo), caso não exista grid
  const windVector = useMemo(() => {
    const feats = geojson.features || [];
    if (!feats.length) return { vx: 0, vy: 0, speed: 0 } as const;
    let sx = 0, sy = 0, n = 0, spd = 0;
    for (const f of feats) {
      const p: any = f.properties || {};
      const dir = typeof p.wind_dir_from_deg === 'number' ? p.wind_dir_from_deg : undefined;
      const v = typeof p.wind_speed_ms === 'number' ? p.wind_speed_ms : undefined;
      if (dir == null || v == null) continue;
      const rad = (dir * Math.PI) / 180;
      // vento soprando FROM dir → vetor TO oposto (dir+180)
      const to = rad + Math.PI;
      sx += Math.cos(to) * v;
      sy += Math.sin(to) * v;
      spd += v;
      n++;
    }
    if (n === 0) return { vx: 0, vy: 0, speed: 0 } as const;
    const vx = sx / n;
    const vy = sy / n;
    const speed = spd / n;
    return { vx, vy, speed } as const;
  }, [geojson]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      map.current = initializeESRIMap(mapContainer.current, {
        center: [-47.0, -15.8],
        zoom: 5,
        basemap: 'imagery'
      });

      map.current.on('load', () => {
        setIsLoading(false);
        if (!map.current) return;

        map.current.addSource('queimadas', {
          type: 'geojson',
          data: geojson
        });

        map.current.addLayer({
          id: 'risk-points',
          type: 'circle',
          source: 'queimadas',
          paint: {
            'circle-color': riskColorExpression as any,
            'circle-radius': riskRadiusExpression as any,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#0f172a'
          }
        });

        // Hotspots no corredor: halo mais forte
        map.current.addLayer({
          id: 'risk-corridor-halo',
          type: 'circle',
          source: 'queimadas',
          filter: ['==', ['get', 'intersects_corridor'], true],
          paint: {
            'circle-color': ['interpolate', ['linear'], ['coalesce', ['get', 'risk_max'], 0], 0, '#16a34a', 75, '#f97316', 90, '#ef4444'],
            'circle-radius': ['+', 10, ['sqrt', ['coalesce', ['get', 'frp'], 0]]],
            'circle-opacity': 0.25
          }
        });

        // Corredor (linha guia)
        if (corridor && corridor.features.length) {
          map.current.addSource('queimadas-corridor', { type: 'geojson', data: corridor });
          map.current.addLayer({
            id: 'queimadas-corridor-glow',
            type: 'line',
            source: 'queimadas-corridor',
            paint: { 'line-color': '#22d3ee', 'line-width': 8, 'line-opacity': 0.2 }
          });
          map.current.addLayer({
            id: 'queimadas-corridor',
            type: 'line',
            source: 'queimadas-corridor',
            paint: { 'line-color': '#0284c7', 'line-width': 3, 'line-opacity': 0.9 }
          });
        }

        map.current.on('click', 'risk-points', (e) => {
          if (e.features && e.features[0] && onFeatureClick) {
            onFeatureClick(e.features[0] as Feature);
          }
        });

        map.current.on('mouseenter', 'risk-points', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        
        map.current.on('mouseleave', 'risk-points', () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });
      });

      // Overlay de vento estilo partículas simples
      if (showWindOverlay && mapContainer.current) {
        const canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none';
        canvas.width = mapContainer.current.clientWidth;
        canvas.height = mapContainer.current.clientHeight;
        windCanvasRef.current = canvas;
        mapContainer.current.appendChild(canvas);

        const setupParticles = () => {
          const count = Math.floor((canvas.width * canvas.height) / 20000);
          particlesRef.current = Array.from({ length: Math.max(150, count) }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
          }));
        };
        setupParticles();

        const ctx = canvas.getContext('2d')!;
        const step = () => {
          const { vx, vy, speed } = windVector;
          // escala de pixels por frame
          const scale = 0.5 + Math.min(2, speed / 6);
          ctx.fillStyle = 'rgba(15,23,42,0.08)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = 'rgba(34,197,94,0.8)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (const p of particlesRef.current) {
            const ox = p.x, oy = p.y;
            p.x += vx * scale;
            p.y += vy * scale;
            if (p.x < 0 || p.x >= canvas.width || p.y < 0 || p.y >= canvas.height) {
              p.x = Math.random() * canvas.width;
              p.y = Math.random() * canvas.height;
            }
            ctx.moveTo(ox, oy);
            ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
          rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);

        const handleResize = () => {
          if (!mapContainer.current || !windCanvasRef.current) return;
          windCanvasRef.current.width = mapContainer.current.clientWidth;
          windCanvasRef.current.height = mapContainer.current.clientHeight;
        };
        window.addEventListener('resize', handleResize);
        map.current.on('move', handleResize);

        // Cleanup do overlay
        const cleanupOverlay = () => {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
          window.removeEventListener('resize', handleResize);
          try { map.current?.off('move', handleResize as any); } catch {}
          if (windCanvasRef.current && windCanvasRef.current.parentElement) {
            windCanvasRef.current.parentElement.removeChild(windCanvasRef.current);
          }
          windCanvasRef.current = null;
        };
        // Salva função de cleanup na instância
        (map.current as any).__windCleanup = cleanupOverlay;
      }

    } catch (err) {
      console.error('Error initializing map:', err);
      setIsLoading(false);
    }

    return () => {
      if ((map.current as any)?.__windCleanup) {
        try { (map.current as any).__windCleanup(); } catch {}
      }
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (map.current && map.current.getSource('queimadas')) {
      (map.current.getSource('queimadas') as maplibregl.GeoJSONSource).setData(geojson);

      if (fitBounds) {
        try {
          map.current.fitBounds(fitBounds, { padding: 60, duration: 800, maxZoom: 11 });
        } catch (error) {
          console.warn('fitBounds (queimadas) failed', error);
        }
      }
    }
  }, [geojson, fitBounds]);

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Carregando mapa...</span>
          </div>
        </div>
      )}
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};
