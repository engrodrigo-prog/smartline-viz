import { Upload, Building2, Ruler, Trees, AlertTriangle, GitBranch, AlertOctagon, Mountain, Network } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface FileType {
  id: string;
  label: string;
  subtitle?: string;
  description: string;
  acceptedFormats: string[];
  targetTable: string;
  edgeFunction: string;
  category: 'linha' | 'estrutura' | 'analise' | 'perigo' | 'outros';
  icon: LucideIcon;
  requiredFields?: string[];
  metadata?: Record<string, any>;
}

export const FILE_TYPES: FileType[] = [
  // Linha
  {
    id: 'line_kml',
    label: 'KML da Linha',
    description: 'Traçado principal da linha de transmissão',
    acceptedFormats: ['.kml', '.kmz'],
    targetTable: 'line_asset',
    edgeFunction: 'line-upload',
    category: 'linha',
    icon: Network,
    requiredFields: ['x_left', 'x_right', 'line_code']
  },
  
  // Estruturas
  {
    id: 'towers',
    label: 'Torres',
    description: 'Posições GPS das torres/estruturas',
    acceptedFormats: ['.csv', '.kml', '.kmz'],
    targetTable: 'tower_asset',
    edgeFunction: 'process-tower-asset',
    category: 'estrutura',
    icon: Building2,
    requiredFields: ['line_code']
  },
  
  // Análises
  {
    id: 'span_analysis',
    label: 'Análise de Vãos',
    description: 'Dados de vãos, flecha e clearance',
    acceptedFormats: ['.csv'],
    targetTable: 'span_analysis',
    edgeFunction: 'process-span-analysis',
    category: 'analise',
    icon: Ruler,
    requiredFields: ['line_code']
  },
  
  // Perigos
  {
    id: 'danger_trees',
    label: 'Danger Trees',
    description: 'Árvores com risco de queda',
    acceptedFormats: ['.kml', '.kmz', '.csv'],
    targetTable: 'eventos_geo',
    edgeFunction: 'process-evento',
    category: 'perigo',
    icon: Trees,
    requiredFields: ['concessao'],
    metadata: { tipo_evento: 'arvore_queda' }
  },
  
  {
    id: 'tree_fall',
    label: 'Tree Fall',
    subtitle: 'Árvores Laterais',
    description: 'Árvores próximas à faixa de domínio',
    acceptedFormats: ['.kml', '.kmz', '.csv'],
    targetTable: 'eventos_geo',
    edgeFunction: 'process-evento',
    category: 'perigo',
    icon: Trees,
    requiredFields: ['concessao'],
    metadata: { tipo_evento: 'arvore_lateral' }
  },
  
  {
    id: 'clearance_danger',
    label: 'Clearance Danger',
    subtitle: 'Distância de Segurança',
    description: 'Pontos com clearance comprometido',
    acceptedFormats: ['.kml', '.kmz', '.csv'],
    targetTable: 'eventos_geo',
    edgeFunction: 'process-evento',
    category: 'perigo',
    icon: AlertTriangle,
    requiredFields: ['concessao'],
    metadata: { tipo_evento: 'clearance_perigo' }
  },
  
  {
    id: 'scissor_crossing',
    label: 'Scissor Crossing',
    subtitle: 'Cruzamentos',
    description: 'Cruzamentos com outras linhas',
    acceptedFormats: ['.kml', '.kmz'],
    targetTable: 'eventos_geo',
    edgeFunction: 'process-evento',
    category: 'perigo',
    icon: GitBranch,
    requiredFields: ['concessao'],
    metadata: { tipo_evento: 'cruzamento' }
  },
  
  {
    id: 'dangers_kml',
    label: 'Dangers KML',
    description: 'Outros perigos georreferenciados',
    acceptedFormats: ['.kml', '.kmz'],
    targetTable: 'eventos_geo',
    edgeFunction: 'process-evento',
    category: 'perigo',
    icon: AlertOctagon,
    requiredFields: ['concessao'],
    metadata: { tipo_evento: 'perigo_generico' }
  },
  
  // Outros
  {
    id: 'dem_surface',
    label: 'DEM Surface',
    description: 'Modelo Digital de Elevação (GeoTIFF)',
    acceptedFormats: ['.tif', '.tiff'],
    targetTable: 'dem_surface',
    edgeFunction: 'process-dem-surface',
    category: 'outros',
    icon: Mountain,
    requiredFields: ['line_code', 'gsd_cm']
  }
];

export const CATEGORIES = [
  { value: 'linha', label: '📍 Linha de Transmissão', icon: Network },
  { value: 'estrutura', label: '🗼 Estruturas e Torres', icon: Building2 },
  { value: 'analise', label: '📏 Análises de Vãos', icon: Ruler },
  { value: 'perigo', label: '⚠️ Perigos e Riscos', icon: AlertTriangle },
  { value: 'outros', label: '🗺️ Outros Dados', icon: Upload }
] as const;

export function getFileTypeById(id: string): FileType | undefined {
  return FILE_TYPES.find(ft => ft.id === id);
}

export function getFileTypesByCategory(category: string): FileType[] {
  return FILE_TYPES.filter(ft => ft.category === category);
}
