import { Zap, Radio, Activity, AlertTriangle, Trees, Home, Building2, Flame, MapPin, ShieldCheck, Camera } from "lucide-react";
import type { Layer } from "./LayerSelector";

export const DEFAULT_LAYERS: Layer[] = [
  { id: "linhas", name: "Linhas de Transmissão", icon: Zap, visible: false },
  { id: "lp_vegetacao", name: "Risco Vegetação (LiPowerline)", icon: Trees, visible: true },
  { id: "lp_queda", name: "Danger Trees", icon: AlertTriangle, visible: false },
  { id: "lp_cruzamentos", name: "Cruzamentos Críticos", icon: MapPin, visible: false },
  { id: "lp_tratamentos", name: "Trechos Tratados", icon: ShieldCheck, visible: false },
  { id: "lp_media", name: "Frames / Inspeções", icon: Camera, visible: false },
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
