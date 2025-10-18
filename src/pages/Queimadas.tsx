import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Flame, RefreshCw } from "lucide-react";
import { useQueimadas } from "@/hooks/useQueimadas";
import { useFirmsFootprints } from "@/hooks/useFirmsFootprints";
import { FirmsFootprintsLayer } from "@/components/ambiente/FirmsFootprintsLayer";
import { Button } from "@/components/ui/button";
import CardKPI from "@/components/CardKPI";
import { initializeESRIMap } from "@/lib/mapConfig";

const Queimadas = () => {
  const [concessao, setConcessao] = useState("TODAS");
  const [showFootprints, setShowFootprints] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [loading, setLoading] = useState(true);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  // Fetch fire points (existing)
  const { data: pointsData, refetch: refetchPoints } = useQueimadas({
    concessao,
    minConf: 50,
    satelite: 'ALL',
    maxKm: 3,
    mode: 'live'
  });

  // Fetch fire footprints (NEW)
  const { data: footprintsData, refetch: refetchFootprints } = useFirmsFootprints({
    concessao,
    minArea: 0
  });

  // Calculate KPIs
  const kpis = useMemo(() => {
    const pointsCount = pointsData?.features.length || 0;
    const footprintsCount = footprintsData?.features.length || 0;
    const totalArea = footprintsData?.features.reduce((acc, f) => acc + (f.properties?.area_ha || 0), 0) || 0;
    const criticalAlerts = footprintsData?.features.filter(f => f.properties?.nivel_risco === 'critico').length || 0;

    return { pointsCount, footprintsCount, totalArea, criticalAlerts };
  }, [pointsData, footprintsData]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = initializeESRIMap(mapContainer.current, {
      center: [-46.6333, -23.5505],
      zoom: 8,
      basemap: 'imagery'
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");
    map.current.addControl(new maplibregl.FullscreenControl(), "top-right");

    map.current.on("load", () => {
      setLoading(false);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Add fire points layer
  useEffect(() => {
    if (!map.current || !pointsData) return;

    const sourceId = 'firms-points';
    const layerId = 'firms-points-layer';

    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId);
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId);
    }

    map.current.addSource(sourceId, {
      type: 'geojson',
      data: pointsData,
    });

    map.current.addLayer({
      id: layerId,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 3, 15, 8],
        'circle-color': [
          'step',
          ['get', 'confianca'],
          '#ffeb3b', 60,
          '#ff9800', 80,
          '#f44336'
        ],
        'circle-opacity': 0.8,
      },
      layout: {
        visibility: showPoints ? 'visible' : 'none',
      },
    });

    // Click handler
    map.current.on('click', layerId, (e) => {
      if (e.features && e.features.length > 0) {
        const props = e.features[0].properties;
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="p-2">
              <h3 class="font-bold text-primary">Foco de Incêndio</h3>
              <p class="text-sm">Confiança: ${props?.confianca}%</p>
              <p class="text-sm">Brilho: ${props?.brilho}</p>
              <p class="text-sm">Satélite: ${props?.satelite}</p>
              <p class="text-sm">Distância: ${props?.distancia_m}m</p>
            </div>
          `)
          .addTo(map.current!);
      }
    });
  }, [map.current, pointsData, showPoints]);

  const handleRefresh = () => {
    refetchPoints();
    refetchFootprints();
  };

  return (
    <AppLayout title="Queimadas - Monitoramento FIRMS">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <CardKPI
          title="Focos Ativos"
          value={kpis.pointsCount.toString()}
          icon={Flame}
        />
        <CardKPI
          title="Áreas Queimadas"
          value={kpis.footprintsCount.toString()}
          icon={Flame}
        />
        <CardKPI
          title="Área Total (ha)"
          value={kpis.totalArea.toFixed(1)}
          icon={Flame}
        />
        <CardKPI
          title="Alertas Críticos"
          value={kpis.criticalAlerts.toString()}
          icon={Flame}
        />
      </div>

      <div className="relative h-[calc(100vh-16rem)]">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute left-4 top-4 z-10 bg-card/95 backdrop-blur-sm p-4 rounded-lg shadow-lg w-72 space-y-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Controles</h2>
            </div>
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <div>
            <Label>Concessão</Label>
            <Select value={concessao} onValueChange={setConcessao}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas</SelectItem>
                <SelectItem value="CPFL">CPFL</SelectItem>
                <SelectItem value="ENEL">ENEL</SelectItem>
                <SelectItem value="ENERGISA">ENERGISA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-points"
              checked={showPoints}
              onChange={(e) => setShowPoints(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="show-points">Mostrar Focos</Label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-footprints"
              checked={showFootprints}
              onChange={(e) => setShowFootprints(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="show-footprints">Mostrar Áreas</Label>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-medium mb-2">Legenda</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-[#f44336] rounded-full"></div>
                <span>Focos Alta Confiança</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-[#d32f2f] opacity-35"></div>
                <span>Áreas Críticas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-[#f57c00] opacity-35"></div>
                <span>Áreas Alto Risco</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div ref={mapContainer} className="w-full h-full" />
        
        <FirmsFootprintsLayer 
          map={map.current} 
          geojson={footprintsData || null} 
          visible={showFootprints}
        />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <div className="text-center">
              <div className="animate-pulse text-primary mb-2">Carregando mapa...</div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Queimadas;
