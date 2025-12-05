import { Zap, Radio, Activity, AlertTriangle, Trees, Home, Building2, Flame, MapPin } from "lucide-react";
import type { Layer } from "./LayerSelector";

export const DEFAULT_LAYERS: Layer[] = [
  { id: "linhas", name: "Linhas de Transmissão", icon: Zap, visible: false },
  { id: "torres", name: "Torres/Apoios", icon: Radio, visible: false },
  { id: "sensores", name: "Sensores", icon: Activity, visible: false },
  { id: "eventos", name: "Eventos", icon: AlertTriangle, visible: false },
  { id: "vegetacao", name: "Vegetação Crítica", icon: Trees, visible: false },
  { id: "ocupacoes", name: "Ocupações de Faixa", icon: Home, visible: false },
  { id: "travessias", name: "Travessias", icon: Building2, visible: false },
  { id: "queimadas", name: "Queimadas FIRMS (Pontos)", icon: Flame, visible: false },
  { id: "queimadas_footprints", name: "Queimadas FIRMS (Áreas)", icon: Flame, visible: false },
];

export const BASE_LAYERS: Layer[] = [
  { id: "ufs", name: "Estados (UFs)", icon: MapPin, visible: false, filename: "BR_UF_2024.zip" },
  { id: "municipios_rs", name: "Municípios RS", icon: MapPin, visible: false, filename: "RS_Municipios_2024.zip" },
  { id: "municipios_sp", name: "Municípios SP", icon: MapPin, visible: false, filename: "SP_Municipios_2024.zip" },
  { id: "biomas", name: "Biomas Brasileiros", icon: Trees, visible: false, filename: "BR_Biomas.geojson" },
];

