import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2, Layers, Map as MapIcon, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import MapViewSelector, { MapLayer } from './MapViewSelector';
import { BasemapSelector } from './BasemapSelector';
import { Button } from './ui/button';

interface MapboxUnifiedProps {
  onFeatureClick?: (feature: any) => void;
  filterRegiao?: string;
  filterEmpresa?: string;
  filterLinha?: string;
  showQueimadas?: boolean;
  showInfrastructure?: boolean;
  showVegetacao?: boolean;
  showEstruturas?: boolean;
  showTravessias?: boolean;
  showErosao?: boolean;
  showAreasAlagadas?: boolean;
  showEmendas?: boolean;
  initialCenter?: [number, number];
  initialZoom?: number;
  zoneConfig?: {
    critica: number;
    acomp: number;
    obs: number;
  };
  mode?: 'live' | 'archive';
  confiancaMin?: number;
  sateliteFilter?: string;
  focusCoord?: [number, number] | null;
}

export const MapboxUnified = ({ 
  onFeatureClick,
  filterRegiao,
  filterEmpresa,
  filterLinha,
  showQueimadas = false,
  showInfrastructure = true,
  showVegetacao = false,
  showEstruturas = false,
  showTravessias = false,
  showErosao = false,
  showAreasAlagadas = false,
  showEmendas = false,
  initialCenter = [-46.63, -23.55],
  initialZoom = 7,
  zoneConfig = { critica: 500, acomp: 1500, obs: 3000 },
  mode = 'live',
  confiancaMin = 50,
  sateliteFilter = 'ALL',
  focusCoord = null
}: MapboxUnifiedProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layers, setLayers] = useState<MapLayer[]>([]);
  const [mapStyle, setMapStyle] = useState('satellite-streets-v12');
  const [showStateBorders, setShowStateBorders] = useState(true);
  const [is3D, setIs3D] = useState(true);

  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    if (!token) {
      setError('Token do Mapbox não configurado.');
      setIsLoading(false);
      return;
    }

    if (!mapContainer.current || map.current) return;

    try {
      mapboxgl.accessToken = token;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: initialCenter,
        zoom: initialZoom,
        pitch: 50,
        bearing: -17.6,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', async () => {
        // Adicionar terreno 3D com exagero 2x
        map.current!.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14
        });

        map.current!.setTerrain({ 
          source: 'mapbox-dem', 
          exaggeration: 2
        });

        // Adicionar sky (atmosfera)
        map.current!.addLayer({
          id: 'sky',
          type: 'sky',
          paint: {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 90.0],
            'sky-atmosphere-sun-intensity': 15
          }
        });


        // Adicionar limites estaduais
        addStateBorders();

        setIsLoading(false);
        if (showInfrastructure) {
          await loadInfrastructure();
        }
        if (showQueimadas) {
          await loadQueimadas();
        }
        if (showVegetacao) {
          await loadVegetacao();
        }
        if (showEstruturas) {
          await loadEstruturas();
        }
        if (showTravessias) {
          await loadTravessias();
        }
        if (showErosao) {
          await loadErosao();
        }
        if (showAreasAlagadas) {
          await loadAreasAlagadas();
        }
        if (showEmendas) {
          await loadEmendas();
        }
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setError('Erro ao carregar mapa.');
        setIsLoading(false);
      });

    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Erro ao inicializar mapa');
      setIsLoading(false);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Efeito para focar em coordenada quando clicado na tabela
  useEffect(() => {
    if (!map.current || !focusCoord) return;
    
    // Garantir que o mapa está carregado antes de fazer flyTo
    if (!map.current.loaded()) {
      map.current.once('load', () => {
        map.current!.flyTo({
          center: focusCoord,
          zoom: 15,
          pitch: is3D ? 50 : 0,
          duration: 2000,
          essential: true
        });
      });
    } else {
      map.current.flyTo({
        center: focusCoord,
        zoom: 15,
        pitch: is3D ? 50 : 0,
        duration: 2000,
        essential: true
      });
    }
  }, [focusCoord, is3D]);

  const addStateBorders = () => {
    if (!map.current) return;

    try {
      // Adicionar linha de fronteira estadual
      map.current.addLayer({
        id: 'state-borders',
        type: 'line',
        source: {
          type: 'vector',
          url: 'mapbox://mapbox.boundaries-adm1-v4'
        },
        'source-layer': 'boundaries_admin_1',
        filter: ['==', 'iso_3166_1', 'BR'],
        paint: {
          'line-color': '#ffffff',
          'line-width': 2,
          'line-opacity': 0.8,
          'line-dasharray': [2, 2]
        }
      });

      // Adicionar labels dos estados
      map.current.addLayer({
        id: 'state-labels',
        type: 'symbol',
        source: {
          type: 'vector',
          url: 'mapbox://mapbox.boundaries-adm1-v4'
        },
        'source-layer': 'boundaries_admin_1',
        filter: ['==', 'iso_3166_1', 'BR'],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 12
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1.5
        }
      });
    } catch (error) {
      console.error('Erro ao adicionar limites estaduais:', error);
    }
  };

  const changeMapStyle = (newStyle: string) => {
    if (!map.current) return;
    
    setMapStyle(newStyle);
    map.current.setStyle(`mapbox://styles/mapbox/${newStyle}`);
    
    // Recarregar layers após troca de estilo
    map.current.once('style.load', async () => {
      // Re-adicionar terreno 3D
      map.current!.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      });

      map.current!.setTerrain({ 
        source: 'mapbox-dem', 
        exaggeration: 2
      });

      map.current!.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 90.0],
          'sky-atmosphere-sun-intensity': 15
        }
      });

      addStateBorders();

      // Recarregar dados
      if (showInfrastructure) await loadInfrastructure();
      if (showQueimadas) await loadQueimadas();
      if (showVegetacao) await loadVegetacao();
      if (showEstruturas) await loadEstruturas();
      if (showTravessias) await loadTravessias();
      if (showErosao) await loadErosao();
      if (showAreasAlagadas) await loadAreasAlagadas();
      if (showEmendas) await loadEmendas();
    });
  };

  const toggleStateBorders = () => {
    if (!map.current) return;
    
    const newVisibility = showStateBorders ? 'none' : 'visible';
    setShowStateBorders(!showStateBorders);
    
    if (map.current.getLayer('state-borders')) {
      map.current.setLayoutProperty('state-borders', 'visibility', newVisibility);
      map.current.setLayoutProperty('state-labels', 'visibility', newVisibility);
    }
  };

  const toggle3D = () => {
    if (!map.current) return;
    
    const new3D = !is3D;
    setIs3D(new3D);
    
    if (new3D) {
      // Ativar 3D
      map.current.setTerrain({ 
        source: 'mapbox-dem', 
        exaggeration: 2
      });
      map.current.easeTo({
        pitch: 50,
        duration: 1000
      });
    } else {
      // Desativar 3D
      map.current.setTerrain(null);
      map.current.easeTo({
        pitch: 0,
        duration: 1000
      });
    }
  };

  const loadInfrastructure = async () => {
    if (!map.current) return;

    try {
      let query = supabase
        .from('infrastructure')
        .select('*');

      if (filterRegiao) {
        query = query.eq('regiao', filterRegiao);
      }
      if (filterEmpresa) {
        query = query.eq('empresa', filterEmpresa);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Agrupar por arquivo de origem (simular pelo nome da linha)
      const grouped = data?.reduce((acc: any, item: any) => {
        const key = item.linha_nome || 'Sem Nome';
        if (!acc[key]) {
          acc[key] = {
            name: key,
            features: [],
            uploadDate: item.created_at,
          };
        }
        acc[key].features.push(item);
        return acc;
      }, {});

      const newLayers: MapLayer[] = [];
      
      Object.entries(grouped || {}).forEach(([name, group]: [string, any], index) => {
        const layerId = `infrastructure-${name.replace(/[^a-zA-Z0-9]/g, '-')}`;
        
        // Adicionar pontos (estruturas)
        const points = group.features.filter((f: any) => f.asset_type === 'structure');
        if (points.length > 0) {
          const geojson: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: points.map((p: any) => ({
              type: 'Feature',
              geometry: p.geometry,
              properties: p,
            }))
          };

          if (!map.current!.getSource(`${layerId}-points`)) {
            map.current!.addSource(`${layerId}-points`, {
              type: 'geojson',
              data: geojson,
            });

            map.current!.addLayer({
              id: `${layerId}-points`,
              type: 'circle',
              source: `${layerId}-points`,
              paint: {
                'circle-radius': 6,
                'circle-color': `hsl(${(index * 60) % 360}, 70%, 50%)`,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
              },
            });

            // Labels
            map.current!.addLayer({
              id: `${layerId}-labels`,
              type: 'symbol',
              source: `${layerId}-points`,
              layout: {
                'text-field': ['get', 'estrutura'],
                'text-size': 10,
                'text-offset': [0, 1.5],
              },
              paint: {
                'text-color': '#ffffff',
                'text-halo-color': '#000000',
                'text-halo-width': 1,
              },
            });
          }

          newLayers.push({
            id: `${layerId}-points`,
            name: `${name} - Estruturas`,
            type: 'infrastructure',
            visible: true,
            color: `hsl(${(index * 60) % 360}, 70%, 50%)`,
            source: name,
            uploadDate: group.uploadDate,
            count: points.length,
          });
        }

        // Adicionar linhas
        const lines = group.features.filter((f: any) => f.asset_type === 'line');
        if (lines.length > 0) {
          const lineGeojson: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: lines.map((l: any) => ({
              type: 'Feature',
              geometry: l.geometry,
              properties: l,
            }))
          };

          if (!map.current!.getSource(`${layerId}-lines`)) {
            map.current!.addSource(`${layerId}-lines`, {
              type: 'geojson',
              data: lineGeojson,
            });

            map.current!.addLayer({
              id: `${layerId}-lines`,
              type: 'line',
              source: `${layerId}-lines`,
              paint: {
                'line-color': `hsl(${(index * 60) % 360}, 70%, 50%)`,
                'line-width': 3,
              },
            });
          }

          newLayers.push({
            id: `${layerId}-lines`,
            name: `${name} - Linha`,
            type: 'infrastructure',
            visible: true,
            color: `hsl(${(index * 60) % 360}, 70%, 50%)`,
            source: name,
            uploadDate: group.uploadDate,
            count: lines.length,
          });
        }
      });

      setLayers(prev => [...prev, ...newLayers]);

      // Ajustar bounds
      if (data && data.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        data.forEach((item: any) => {
          if (item.lon && item.lat) {
            bounds.extend([item.lon, item.lat]);
          }
        });
        map.current?.fitBounds(bounds, { padding: 50 });
      }

    } catch (error) {
      console.error('Erro ao carregar infraestrutura:', error);
    }
  };

  const fetchNASAFiresFromKML = async () => {
    try {
      const kmlUrl = mode === 'live' 
        ? 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/kml/MODIS_C6_1_South_America_24h.kml'
        : 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/kml/MODIS_C6_1_South_America_48h.kml';
      
      const response = await fetch(kmlUrl);
      const kmlText = await response.text();
      
      // Parsear XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
      
      // Extrair todos os <Placemark>
      const placemarks = xmlDoc.getElementsByTagName('Placemark');
      
      const features = Array.from(placemarks).map(placemark => {
        // Extrair coordenadas
        const coordsText = placemark.getElementsByTagName('coordinates')[0]?.textContent?.trim();
        const [lon, lat] = coordsText?.split(',').map(parseFloat) || [0, 0];
        
        // Extrair descrição (contém confiança, satélite, data)
        const descText = placemark.getElementsByTagName('description')[0]?.textContent || '';
        
        // Regex para extrair dados
        const confidenceMatch = descText.match(/Confidence.*?(\d+)/);
        const satelliteMatch = descText.match(/Satellite.*?(\w+)/);
        const dateMatch = descText.match(/Date.*?([\d-]+)/);
        const timeMatch = descText.match(/Time.*?([\d:]+)/);
        
        return {
          type: 'Feature' as const,
          properties: {
            confianca: parseInt(confidenceMatch?.[1] || '0'),
            satelite: satelliteMatch?.[1] === 'T' ? 'Terra' : 'Aqua',
            data_aquisicao: `${dateMatch?.[1]} ${timeMatch?.[1]}`,
            fonte: 'NASA FIRMS KML'
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [lon, lat]
          }
        };
      });
      
      return {
        type: 'FeatureCollection' as const,
        features
      };
    } catch (error) {
      console.error('Erro ao buscar KML da NASA:', error);
      return { type: 'FeatureCollection' as const, features: [] };
    }
  };

  const calculateDistanceToNearestLine = (coords: [number, number]): number => {
    // Simplificado: retornar distância aleatória para demo
    // Em produção, calcular distância real para linhas da infraestrutura
    return Math.floor(Math.random() * 10000);
  };

  const getZonaByDistance = (distancia: number, config: any): string => {
    if (!config) return 'fora';
    if (distancia <= config.critica) return 'critica';
    if (distancia <= config.acomp) return 'acompanhamento';
    if (distancia <= config.obs) return 'observacao';
    return 'fora';
  };

  const loadQueimadas = async () => {
    if (!map.current) return;

    try {
      // Buscar KML direto da NASA (modo Live ou Archive)
      let geojson: any = await fetchNASAFiresFromKML();
      
      // Aplicar filtros de confiança e satélite
      geojson.features = geojson.features.filter((f: any) => {
        const passaConfianca = f.properties.confianca >= (confiancaMin || 0);
        const passaSatelite = !sateliteFilter || f.properties.satelite.includes(sateliteFilter);
        return passaConfianca && passaSatelite;
      });

      // Calcular distâncias e zonas
      geojson.features = geojson.features.map((f: any) => {
        const distancia = calculateDistanceToNearestLine(f.geometry.coordinates);
        const zona = getZonaByDistance(distancia, zoneConfig);
        
        return {
          ...f,
          properties: { 
            ...f.properties, 
            distancia_m: distancia, 
            zona 
          }
        };
      });

      const sourceId = 'queimadas-source';
      
      if (map.current.getSource(sourceId)) {
        (map.current.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson);
      } else {
        // Adicionar source com clustering
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: geojson,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        // Layer: Clusters
        map.current.addLayer({
          id: 'queimadas-clusters',
          type: 'circle',
          source: sourceId,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#fbbf24', 10,
              '#f97316', 25,
              '#ef4444'
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20, 10,
              30, 25,
              40
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff'
          },
        });

        // Layer: Cluster count
        map.current.addLayer({
          id: 'queimadas-cluster-count',
          type: 'symbol',
          source: sourceId,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12,
          },
          paint: {
            'text-color': '#ffffff'
          }
        });

        // Layer: Pontos individuais
        map.current.addLayer({
          id: 'queimadas-points',
          type: 'circle',
          source: sourceId,
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': [
              'match',
              ['get', 'zona'],
              'critica', '#ef4444',
              'acompanhamento', '#f59e0b',
              'observacao', '#22c55e',
              '#94a3b8'
            ],
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        // Click em cluster: zoom
        map.current.on('click', 'queimadas-clusters', (e) => {
          const features = map.current!.queryRenderedFeatures(e.point, {
            layers: ['queimadas-clusters'],
          });
          const clusterId = features[0].properties?.cluster_id;
          const source = map.current!.getSource(sourceId) as mapboxgl.GeoJSONSource;
          
          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err || !features[0].geometry || features[0].geometry.type !== 'Point') return;
            map.current!.easeTo({
              center: features[0].geometry.coordinates as [number, number],
              zoom: zoom || map.current!.getZoom() + 2
            });
          });
        });

        // Click em ponto
        map.current.on('click', 'queimadas-points', (e) => {
          if (e.features && e.features[0]) {
            onFeatureClick?.(e.features[0].properties);
          }
        });

        // Cursor pointer
        ['queimadas-clusters', 'queimadas-points'].forEach(layerId => {
          map.current!.on('mouseenter', layerId, () => {
            map.current!.getCanvas().style.cursor = 'pointer';
          });
          map.current!.on('mouseleave', layerId, () => {
            map.current!.getCanvas().style.cursor = '';
          });
        });
      }

      setLayers(prev => {
        const filtered = prev.filter(l => l.id !== 'queimadas-points');
        return [...filtered, {
          id: 'queimadas-points',
          name: `Queimadas (${mode === 'live' ? '24h' : 'Histórico'})`,
          type: 'fires' as const,
          visible: true,
          color: '#ef4444',
          count: geojson.features.length,
        }];
      });

    } catch (error) {
      console.error('Erro ao carregar queimadas:', error);
    }
  };

  const loadVegetacao = async () => {
    if (!map.current) return;

    try {
      let query = supabase
        .from('eventos_geo')
        .select('*')
        .eq('tipo_evento', 'Vegetação');

      if (filterRegiao) {
        query = query.eq('regiao', filterRegiao);
      }
      if (filterEmpresa) {
        query = query.eq('empresa', filterEmpresa);
      }
      if (filterLinha) {
        query = query.ilike('nome', `%${filterLinha}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) return;

      const features = data.map((item: any) => ({
        type: 'Feature',
        properties: {
          id: item.id,
          nome: item.nome,
          status: item.status,
        },
        geometry: item.geometry,
      }));

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: features as any[],
      };

      const sourceId = 'vegetacao-source';
      const layerId = 'vegetacao-layer';

      if (map.current.getSource(sourceId)) {
        (map.current.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson);
      } else {
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: geojson,
        });

        map.current.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 6,
            'circle-color': '#22c55e',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        map.current.on('click', layerId, (e) => {
          if (e.features && e.features[0]) {
            onFeatureClick?.(e.features[0]);
          }
        });
      }

      setLayers(prev => [...prev, {
        id: layerId,
        name: 'Vegetação',
        type: 'vegetation',
        visible: true,
        color: '#22c55e',
        count: data.length,
      }]);

    } catch (error) {
      console.error('Erro ao carregar vegetação:', error);
    }
  };

  const loadEstruturas = async () => {
    if (!map.current) return;

    try {
      let query = supabase
        .from('estruturas')
        .select('*');

      if (filterRegiao) query = query.eq('regiao', filterRegiao);
      if (filterEmpresa) query = query.eq('empresa', filterEmpresa);

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) return;

      const features = data.map((item: any) => ({
        type: 'Feature',
        properties: {
          id: item.id,
          nome: item.codigo,
          integridade: item.estado_conservacao,
          risco: item.risco_corrosao,
        },
        geometry: item.geometry,
      }));

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: features as any[],
      };

      const sourceId = 'estruturas-source';
      const layerId = 'estruturas-layer';

      if (map.current.getSource(sourceId)) {
        (map.current.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson);
      } else {
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: geojson,
        });

        map.current.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 8,
            'circle-color': [
              'case',
              ['==', ['get', 'integridade'], 'Crítico'], '#ef4444',
              ['>=', ['to-number', ['get', 'risco'], 0], 0.7], '#f97316',
              ['>=', ['to-number', ['get', 'risco'], 0], 0.4], '#eab308',
              '#22c55e'
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        map.current.on('click', layerId, (e) => {
          if (e.features && e.features[0]) {
            onFeatureClick?.(e.features[0]);
          }
        });
      }

      setLayers(prev => [...prev, {
        id: layerId,
        name: 'Estruturas',
        type: 'estruturas',
        visible: true,
        color: '#22c55e',
        count: data.length,
      }]);

    } catch (error) {
      console.error('Erro ao carregar estruturas:', error);
    }
  };

  const loadTravessias = async () => {
    if (!map.current) return;

    try {
      let query = supabase
        .from('eventos_geo')
        .select('*')
        .eq('tipo_evento', 'Travessia');

      if (filterRegiao) query = query.eq('regiao', filterRegiao);
      if (filterEmpresa) query = query.eq('empresa', filterEmpresa);

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) return;

      const features = data.map((item: any) => ({
        type: 'Feature',
        properties: {
          id: item.id,
          nome: item.nome,
          tipo: item.metadata?.tipo || 'Rodoviária',
        },
        geometry: item.geometry,
      }));

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: features as any[],
      };

      const sourceId = 'travessias-source';
      const layerId = 'travessias-layer';

      if (map.current.getSource(sourceId)) {
        (map.current.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson);
      } else {
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: geojson,
        });

        map.current.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 7,
            'circle-color': [
              'match',
              ['get', 'tipo'],
              'Fluvial', '#3b82f6',
              'Ferroviária', '#8b5cf6',
              'Rodoviária', '#64748b',
              '#94a3b8'
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        map.current.on('click', layerId, (e) => {
          if (e.features && e.features[0]) {
            onFeatureClick?.(e.features[0]);
          }
        });
      }

      setLayers(prev => [...prev, {
        id: layerId,
        name: 'Travessias',
        type: 'travessias',
        visible: true,
        color: '#3b82f6',
        count: data.length,
      }]);

    } catch (error) {
      console.error('Erro ao carregar travessias:', error);
    }
  };

  const loadErosao = async () => {
    if (!map.current || !showErosao) return;
    console.log('⛰️ Carregando erosões...');

    try {
      let query = supabase
        .from('eventos_geo')
        .select('*')
        .eq('tipo_evento', 'Erosão');

      if (filterRegiao) query = query.eq('regiao', filterRegiao);
      if (filterEmpresa) query = query.eq('empresa', filterEmpresa);
      if (filterLinha) query = query.ilike('nome', `%${filterLinha}%`);

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) return;

      const features = data.map((item: any) => ({
        type: 'Feature',
        properties: {
          id: item.id,
          nome: item.nome,
          gravidade: item.metadata?.gravidade || 'Baixa',
        },
        geometry: item.geometry,
      }));

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: features as any[],
      };

      const sourceId = 'erosao-source';
      const layerId = 'erosao-layer';

      if (map.current.getSource(sourceId)) {
        (map.current.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson);
      } else {
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: geojson,
        });

        map.current.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 8,
            'circle-color': [
              'match',
              ['get', 'gravidade'],
              'Crítica', '#ef4444',
              'Alta', '#f97316',
              'Média', '#eab308',
              '#22c55e'
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        map.current.on('click', layerId, (e) => {
          if (e.features && e.features[0]) {
            onFeatureClick?.(e.features[0]);
          }
        });
      }

      setLayers(prev => [...prev, {
        id: layerId,
        name: 'Erosão',
        type: 'erosao',
        visible: true,
        color: '#f97316',
        count: data.length,
      }]);
    } catch (error) {
      console.error('Erro ao carregar erosões:', error);
    }
  };

  const loadAreasAlagadas = async () => {
    if (!map.current || !showAreasAlagadas) return;
    console.log('💧 Carregando áreas alagadas...');

    try {
      let query = supabase
        .from('eventos_geo')
        .select('*')
        .eq('tipo_evento', 'Área Alagada');

      if (filterRegiao) query = query.eq('regiao', filterRegiao);
      if (filterEmpresa) query = query.eq('empresa', filterEmpresa);
      if (filterLinha) query = query.ilike('nome', `%${filterLinha}%`);

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) return;

      const features = data.map((item: any) => ({
        type: 'Feature',
        properties: {
          id: item.id,
          nome: item.nome,
          nivelRisco: item.metadata?.nivelRisco || 'Baixo',
        },
        geometry: item.geometry,
      }));

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: features as any[],
      };

      const sourceId = 'alagadas-source';
      const layerId = 'alagadas-layer';

      if (map.current.getSource(sourceId)) {
        (map.current.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson);
      } else {
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: geojson,
        });

        map.current.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 10,
            'circle-color': [
              'match',
              ['get', 'nivelRisco'],
              'Alto', '#ef4444',
              'Médio', '#f59e0b',
              '#3b82f6'
            ],
            'circle-opacity': 0.6,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        map.current.on('click', layerId, (e) => {
          if (e.features && e.features[0]) {
            onFeatureClick?.(e.features[0]);
          }
        });
      }

      setLayers(prev => [...prev, {
        id: layerId,
        name: 'Áreas Alagadas',
        type: 'alagadas',
        visible: true,
        color: '#3b82f6',
        count: data.length,
      }]);
    } catch (error) {
      console.error('Erro ao carregar áreas alagadas:', error);
    }
  };

  const loadEmendas = async () => {
    if (!map.current || !showEmendas) return;
    console.log('⚡ Carregando emendas...');

    try {
      let query = supabase
        .from('eventos_geo')
        .select('*')
        .eq('tipo_evento', 'Emenda');

      if (filterRegiao) query = query.eq('regiao', filterRegiao);
      if (filterEmpresa) query = query.eq('empresa', filterEmpresa);
      if (filterLinha) query = query.ilike('nome', `%${filterLinha}%`);

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) return;

      const features = data.map((item: any) => ({
        type: 'Feature',
        properties: {
          id: item.id,
          nome: item.nome,
          statusTermico: item.metadata?.statusTermico || 'Normal',
        },
        geometry: item.geometry,
      }));

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: features as any[],
      };

      const sourceId = 'emendas-source';
      const layerId = 'emendas-layer';

      if (map.current.getSource(sourceId)) {
        (map.current.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson);
      } else {
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: geojson,
        });

        map.current.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 6,
            'circle-color': [
              'match',
              ['get', 'statusTermico'],
              'Crítico', '#ef4444',
              'Atenção', '#f59e0b',
              '#22c55e'
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        map.current.on('click', layerId, (e) => {
          if (e.features && e.features[0]) {
            onFeatureClick?.(e.features[0]);
          }
        });
      }

      setLayers(prev => [...prev, {
        id: layerId,
        name: 'Emendas',
        type: 'emendas',
        visible: true,
        color: '#eab308',
        count: data.length,
      }]);
    } catch (error) {
      console.error('Erro ao carregar emendas:', error);
    }
  };

  const handleLayerVisibilityChange = (layerId: string, visible: boolean) => {
    if (!map.current) return;

    const layer = map.current.getLayer(layerId);
    if (layer) {
      map.current.setLayoutProperty(
        layerId,
        'visibility',
        visible ? 'visible' : 'none'
      );
    }

    // Update labels if exists
    const labelsId = layerId.replace('-points', '-labels');
    const labelsLayer = map.current.getLayer(labelsId);
    if (labelsLayer) {
      map.current.setLayoutProperty(
        labelsId,
        'visibility',
        visible ? 'visible' : 'none'
      );
    }

    setLayers(prev =>
      prev.map(l =>
        l.id === layerId ? { ...l, visible } : l
      )
    );
  };

  const handleLayerToggle = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      handleLayerVisibilityChange(layerId, !layer.visible);
    }
  };

  if (error) {
    return (
      <div className="w-full h-[600px] rounded-lg border border-border bg-background flex items-center justify-center">
        <div className="text-center p-6">
          <p className="text-destructive mb-2">{error}</p>
        </div>
      </div>
    );
  }

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
      
      <BasemapSelector value={mapStyle} onChange={changeMapStyle} />
      
      {/* Controles de visualização melhorados */}
      <div className="absolute top-20 right-4 flex flex-col gap-2 z-10">
        
        {/* Botão 2D/3D com ícone visual */}
        <Button
          variant="secondary"
          size="sm"
          onClick={toggle3D}
          className="shadow-lg min-w-[90px]"
          title={is3D ? "Alternar para 2D" : "Alternar para 3D"}
        >
          {is3D ? (
            <>
              <MapIcon className="w-4 h-4 mr-1" />
              2D
            </>
          ) : (
            <>
              <Layers className="w-4 h-4 mr-1" />
              3D
            </>
          )}
        </Button>

        {/* Toggle Estados com melhor visual */}
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleStateBorders}
          className="shadow-lg min-w-[90px]"
          title={showStateBorders ? "Ocultar Estados" : "Mostrar Estados"}
        >
          {showStateBorders ? (
            <>
              <EyeOff className="w-4 h-4 mr-1" />
              Estados
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-1" />
              Estados
            </>
          )}
        </Button>

        {/* Resetar Vista com ícone */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (!map.current) return;
            map.current.flyTo({
              center: initialCenter,
              zoom: initialZoom,
              pitch: is3D ? 50 : 0,
              bearing: -17.6,
              duration: 2000
            });
          }}
          className="shadow-lg min-w-[90px]"
          title="Resetar Vista"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Reset
        </Button>
      </div>
      
      <div className="absolute top-4 right-4 z-10">
        <MapViewSelector
          layers={layers}
          onLayerToggle={handleLayerToggle}
          onLayerVisibilityChange={handleLayerVisibilityChange}
        />
      </div>
      
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};
