import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Flame } from "lucide-react";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const FIRMS_KEY = import.meta.env.VITE_NASA_FIRMS_KEY;

const Queimadas = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [empresa, setEmpresa] = useState("todas");
  const [regiao, setRegiao] = useState("todas");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [-46.6333, -23.5505], // São Paulo
      zoom: 8,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

    map.current.on("load", async () => {
      if (!map.current) return;

      // Add FIRMS WMS layer for fires
      map.current.addSource("firms-fires", {
        type: "raster",
        tiles: [
          `https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/${FIRMS_KEY}/?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&FORMAT=image/png&TRANSPARENT=true&HEIGHT=256&WIDTH=256&SRS=EPSG:3857&LAYERS=fires_viirs_24&BBOX={bbox-epsg-3857}`,
        ],
        tileSize: 256,
      });

      map.current.addLayer({
        id: "firms-fires-layer",
        type: "raster",
        source: "firms-fires",
        paint: {
          "raster-opacity": 0.8,
        },
      });

      // Load infrastructure from database
      await loadInfrastructure();
      
      setLoading(false);
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  const loadInfrastructure = async () => {
    if (!map.current) return;

    try {
      let query = supabase.from("infrastructure").select("*");

      if (empresa !== "todas") {
        query = query.eq("empresa", empresa);
      }
      if (regiao !== "todas") {
        query = query.eq("regiao", regiao);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) return;

      // Convert to GeoJSON
      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: data.map((item) => ({
          type: "Feature",
          geometry: item.geometry as any,
          properties: {
            id: item.id,
            empresa: item.empresa,
            regiao: item.regiao,
            linha_nome: item.linha_nome,
            asset_type: item.asset_type,
            estrutura: item.estrutura,
          },
        })),
      };

      // Add infrastructure source
      if (map.current.getSource("infrastructure")) {
        (map.current.getSource("infrastructure") as mapboxgl.GeoJSONSource).setData(geojson);
      } else {
        map.current.addSource("infrastructure", {
          type: "geojson",
          data: geojson,
        });

        // Add layers for different geometry types
        map.current.addLayer({
          id: "infrastructure-lines",
          type: "line",
          source: "infrastructure",
          filter: ["==", ["get", "asset_type"], "line"],
          paint: {
            "line-color": "#00a67a",
            "line-width": 2,
          },
        });

        map.current.addLayer({
          id: "infrastructure-points",
          type: "circle",
          source: "infrastructure",
          filter: ["==", ["get", "asset_type"], "structure"],
          paint: {
            "circle-radius": 6,
            "circle-color": "#00a67a",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        // Add click handlers
        map.current.on("click", "infrastructure-points", (e) => {
          if (!e.features || e.features.length === 0) return;
          const feature = e.features[0];
          const props = feature.properties;

          new mapboxgl.Popup()
            .setLngLat((feature.geometry as any).coordinates)
            .setHTML(
              `
              <div class="p-2">
                <h3 class="font-bold">${props?.estrutura || "Estrutura"}</h3>
                <p class="text-sm">Linha: ${props?.linha_nome}</p>
                <p class="text-sm">Empresa: ${props?.empresa}</p>
                <p class="text-sm">Região: ${props?.regiao}</p>
              </div>
            `
            )
            .addTo(map.current!);
        });

        map.current.on("mouseenter", "infrastructure-points", () => {
          if (map.current) map.current.getCanvas().style.cursor = "pointer";
        });

        map.current.on("mouseleave", "infrastructure-points", () => {
          if (map.current) map.current.getCanvas().style.cursor = "";
        });
      }

      // Fit bounds to infrastructure
      if (data.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        data.forEach((item) => {
          if (item.bbox && Array.isArray(item.bbox) && item.bbox.length === 4) {
            const bbox = item.bbox as number[];
            bounds.extend([bbox[0], bbox[1]]);
            bounds.extend([bbox[2], bbox[3]]);
          }
        });
        map.current.fitBounds(bounds, { padding: 50 });
      }
    } catch (error) {
      console.error("Error loading infrastructure:", error);
    }
  };

  useEffect(() => {
    if (map.current && map.current.loaded()) {
      loadInfrastructure();
    }
  }, [empresa, regiao]);

  if (!MAPBOX_TOKEN) {
    return (
      <AppLayout title="Queimadas - Configuração">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-destructive">Mapbox token não configurado</p>
            <p className="text-sm text-muted-foreground mt-2">
              Configure VITE_MAPBOX_TOKEN nas variáveis de ambiente
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Queimadas - Monitoramento FIRMS">
      <div className="relative h-[calc(100vh-4rem)]">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute left-4 top-4 z-10 bg-card/95 backdrop-blur-sm p-4 rounded-lg shadow-lg w-72 space-y-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Filtros</h2>
          </div>

          <div>
            <Label>Empresa</Label>
            <Select value={empresa} onValueChange={setEmpresa}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="CPFL Piratininga">CPFL Piratininga</SelectItem>
                <SelectItem value="CPFL Santa Cruz">CPFL Santa Cruz</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Região</Label>
            <Select value={regiao} onValueChange={setRegiao}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="DJTB-Baixada">DJTB-Baixada</SelectItem>
                <SelectItem value="DJTV-Itapetininga">DJTV-Itapetininga</SelectItem>
                <SelectItem value="DJTV-Piraju">DJTV-Piraju</SelectItem>
                <SelectItem value="DJTV-Sul">DJTV-Sul</SelectItem>
                <SelectItem value="DJTV-Sudeste">DJTV-Sudeste</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-medium mb-2">Legenda</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Focos FIRMS (24h)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-primary"></div>
                <span>Linhas de Transmissão</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary rounded-full border-2 border-white"></div>
                <span>Estruturas</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div ref={mapContainer} className="w-full h-full" />

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
