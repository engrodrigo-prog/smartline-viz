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
  const dprRef = useRef<number>(1);

  const buildVectors = (src: GeoJSON.FeatureCollection): FeatureCollection<LineString> => {
    const features: Array<Feature<LineString>> = [];
    for (const f of src.features) {
      if (f.geometry?.type !== 'Point') continue;
      const props: any = f.properties || {};
      const [lon, lat] = f.geometry.coordinates as [number, number];
      const speed = typeof props.wind_speed_ms === 'number' ? props.wind_speed_ms : 3;
      const degFrom = typeof props.wind_dir_from_deg === 'number' ? props.wind_dir_from_deg : 0;
      // vetor para onde o vento sopra (from -> to)
      const rad = ((degFrom + 180) * Math.PI) / 180;
      // comprimento em graus aproximado (escala simples para visual)
      const k = Math.min(0.02, 0.004 + speed * 0.0015);
      const dx = Math.cos(rad) * k;
      const dy = Math.sin(rad) * k;
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [ [lon, lat], [lon + dx, lat + dy] ] },
        properties: {
          speed,
          dir: degFrom,
          color: props.isFocus ? '#fb923c' : '#f97316',
        },
      });
    }
    return { type: 'FeatureCollection', features };
  };

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
  const windVectorRef = useRef(windVector);
  useEffect(() => {
    windVectorRef.current = windVector;
  }, [windVector]);


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

        // set inicial de vetores direção (vento/fogo)
        map.current.addSource('queimadas-vectors', {
          type: 'geojson',
          data: buildVectors(geojson) as any
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

        // Ícone de chama para hotpots (símbolo)
        const svg = encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f97316"/><stop offset="100%" stop-color="#ef4444"/></linearGradient></defs><path d="M32 6c2 8 8 11 8 19 0 6-4 10-8 10s-8-4-8-10c0-6 3-9 8-19z" fill="#facc15"/><path d="M32 12c6 8 13 12 13 22 0 9-7 15-13 15s-13-6-13-15c0-9 6-12 13-22z" fill="url(#g)"/><path d="M32 30c3 3 6 5 6 9 0 4-3 6-6 6s-6-2-6-6c0-4 3-6 6-9z" fill="#fff" opacity=".3"/></svg>`);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try { map.current!.addImage('flame-icon', img, { pixelRatio: 2 }); } catch {}
          if (!map.current!.getLayer('risk-icons')) {
            map.current!.addLayer({
              id: 'risk-icons',
              type: 'symbol',
              source: 'queimadas',
              layout: {
                'icon-image': 'flame-icon',
                'icon-allow-overlap': true,
                'icon-size': [
                  'interpolate', ['linear'], ['coalesce', ['get', 'frp'], ['get', 'FRP'], 1],
                  1, 0.4,
                  5, 0.6,
                  10, 0.8,
                  20, 1.0
                ]
              }
            });
          }
        };
        img.src = `data:image/svg+xml;charset=UTF-8,${svg}`;

        // Vetores de direção (vento/propagação)
        map.current.addLayer({
          id: 'risk-vectors',
          type: 'line',
          source: 'queimadas-vectors',
          paint: {
            'line-color': ['coalesce', ['get', 'color'], '#f97316'],
            'line-width': 1.5,
            'line-opacity': 0.85
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
        const dpr = window.devicePixelRatio || 1;
        dprRef.current = dpr;
        canvas.width = Math.floor(mapContainer.current.clientWidth * dpr);
        canvas.height = Math.floor(mapContainer.current.clientHeight * dpr);
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.mixBlendMode = "screen";
        canvas.style.opacity = "0.8";
        windCanvasRef.current = canvas;
        mapContainer.current.appendChild(canvas);

        const setupParticles = () => {
          const count = Math.floor((canvas.width * canvas.height) / (16000 * dpr));
          particlesRef.current = Array.from({ length: Math.max(300, count) }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
          }));
        };
        setupParticles();

        const ctx = canvas.getContext('2d')!;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.scale(dpr, dpr);

        const step = () => {
          const { vx, vy, speed } = windVectorRef.current;
          const base = Math.max(0.5, Math.min(2, Math.abs(speed) / 3));
          // leve "memória" para rastro (motion blur)
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'rgba(2, 6, 23, 0.04)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.globalCompositeOperation = 'lighter';
          const t = performance.now() * 0.0007;
          for (const p of particlesRef.current) {
            const x = p.x / dpr;
            const y = p.y / dpr;
            // pseudo-noise para ondular as trajetórias
            const n = Math.sin(x * 0.015 + t) * Math.cos(y * 0.01 - t * 1.3);
            const ang = Math.atan2(vy, vx) + n * 0.6;
            const sp = base * (0.6 + 0.4 * Math.abs(n));
            const nx = x + Math.cos(ang) * sp;
            const ny = y + Math.sin(ang) * sp;

            // cor por velocidade local
            const c = Math.min(1, sp / 2.2);
            const r = Math.floor(56 + c * (239 - 56)); // 56 -> 239
            const g = Math.floor(189 + c * (68 - 189)); // 189 -> 68
            const b = Math.floor(248 + c * (35 - 248)); // 248 -> 35
            ctx.strokeStyle = `rgba(${r},${g},${b},${0.75})`;
            ctx.lineWidth = 0.9 + c * 0.8;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(nx, ny);
            ctx.stroke();

            p.x = nx * dpr;
            p.y = ny * dpr;
            if (p.x < 0 || p.x >= canvas.width || p.y < 0 || p.y >= canvas.height) {
              p.x = Math.random() * canvas.width;
              p.y = Math.random() * canvas.height;
            }
          }
          ctx.globalCompositeOperation = 'source-over';
          rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);

        const handleResize = () => {
          if (!mapContainer.current || !windCanvasRef.current) return;
          const dpr2 = window.devicePixelRatio || 1;
          dprRef.current = dpr2;
          windCanvasRef.current.width = Math.floor(mapContainer.current.clientWidth * dpr2);
          windCanvasRef.current.height = Math.floor(mapContainer.current.clientHeight * dpr2);
          setupParticles();
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
      const vectors = buildVectors(geojson) as any;
      if (map.current.getSource('queimadas-vectors')) {
        (map.current.getSource('queimadas-vectors') as maplibregl.GeoJSONSource).setData(vectors);
      }

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
