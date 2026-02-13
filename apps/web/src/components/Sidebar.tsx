import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Map,
  Network,
  FileText,
  Upload,
  Droplets,
  Mountain,
  Ruler,
  ShieldCheck,
  Building2,
  Link2,
  GitBranch,
  Shield,
  Skull,
  Camera,
  Gauge,
  ChartArea,
  Bell,
  Plane,
  Clock as ClockIcon,
  FileCheck,
  Settings,
  Users,
  Lock,
  Award,
  HardHat,
  BrainCircuit,
  MapPin,
  Flame,
  Home,
  History,
  Truck,
  CloudRain,
  Thermometer,
  ClipboardList,
  BarChart3,
  Database,
  GraduationCap,
  Trees,
  CalendarDays,
  ClipboardCheck,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoSmartline from "@/assets/logo-smartline.png";
import { LucideIcon } from "lucide-react";
import { useI18n } from "@/context/I18nContext";

interface MenuItem {
  id: string;
  titleKey: string;
  path: string;
  icon?: LucideIcon;
}

interface MenuGroup {
  id: string;
  legacyTitle: string;
  titleKey: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    id: "overview",
    legacyTitle: "Visão Geral",
    titleKey: "sidebar.categories.overview",
    items: [
      { id: "dashboard", titleKey: "sidebar.items.dashboard", path: "/dashboard", icon: LayoutDashboard },
      { id: "eventMap", titleKey: "sidebar.items.eventMap", path: "/visual/mapa", icon: Map },
      { id: "singleLine", titleKey: "sidebar.items.singleLine", path: "/visual/unifilar", icon: Network },
      { id: "generalReports", titleKey: "sidebar.items.generalReports", path: "/relatorios", icon: FileText },
    ],
  },
  {
    id: "upload",
    legacyTitle: "Upload",
    titleKey: "sidebar.categories.upload",
    items: [
      { id: "unifiedUpload", titleKey: "sidebar.items.unifiedUpload", path: "/upload", icon: Upload },
      { id: "history", titleKey: "sidebar.items.history", path: "/upload/historico", icon: History },
      { id: "mediaUpload", titleKey: "sidebar.items.mediaUpload", path: "/upload/midia", icon: Camera },
    ],
  },
  {
    id: "vegetationOps",
    legacyTitle: "Vegetação (Poda & Roçada)",
    titleKey: "sidebar.categories.vegetationOps",
    items: [
      { id: "vegDashboard", titleKey: "sidebar.items.vegDashboard", path: "/vegetacao", icon: LayoutDashboard },
      { id: "vegAnomalias", titleKey: "sidebar.items.vegAnomalias", path: "/vegetacao/anomalias", icon: AlertTriangle },
      { id: "vegInspecoes", titleKey: "sidebar.items.vegInspecoes", path: "/vegetacao/inspecoes", icon: ClipboardCheck },
      { id: "vegOs", titleKey: "sidebar.items.vegOs", path: "/vegetacao/os", icon: ClipboardList },
      { id: "vegExecucoes", titleKey: "sidebar.items.vegExecucoes", path: "/vegetacao/execucoes", icon: Trees },
      { id: "vegAuditorias", titleKey: "sidebar.items.vegAuditorias", path: "/vegetacao/auditorias", icon: ClipboardCheck },
      { id: "vegAgenda", titleKey: "sidebar.items.vegAgenda", path: "/vegetacao/agenda", icon: CalendarDays },
      { id: "vegRisco", titleKey: "sidebar.items.vegRisco", path: "/vegetacao/risco", icon: ShieldAlert },
      { id: "vegRelatorios", titleKey: "sidebar.items.vegRelatorios", path: "/vegetacao/relatorios", icon: FileText },
      { id: "vegDocumentos", titleKey: "sidebar.items.vegDocumentos", path: "/vegetacao/documentos", icon: FileText },
    ],
  },
  {
    id: "environmental",
    legacyTitle: "Ambiente",
    titleKey: "sidebar.categories.environmental",
    items: [
      { id: "floodedAreas", titleKey: "sidebar.items.floodedAreas", path: "/ambiental/alagadas", icon: Droplets },
      { id: "erosion", titleKey: "sidebar.items.erosion", path: "/ambiental/erosao", icon: Mountain },
      { id: "wildfires", titleKey: "sidebar.items.wildfires", path: "/ambiental/queimadas", icon: Flame },
      { id: "weather", titleKey: "sidebar.items.weather", path: "/ambiental/meteorologia", icon: CloudRain },
      { id: "rightOfWay", titleKey: "sidebar.items.rightOfWay", path: "/ambiental/ocupacao", icon: Home },
      { id: "clearance", titleKey: "sidebar.items.clearance", path: "/ambiental/distancia", icon: Ruler },
      { id: "envCompliance", titleKey: "sidebar.items.envCompliance", path: "/ambiental/compliance", icon: ShieldCheck },
    ],
  },
  {
    id: "structure",
    legacyTitle: "Estrutura",
    titleKey: "sidebar.categories.structure",
    items: [
      { id: "structures", titleKey: "sidebar.items.structures", path: "/estrutura/estruturas", icon: Building2 },
      { id: "splices", titleKey: "sidebar.items.splices", path: "/estrutura/emendas", icon: Link2 },
      { id: "crossings", titleKey: "sidebar.items.crossings", path: "/estrutura/travessias", icon: GitBranch },
      { id: "lineProfile", titleKey: "sidebar.items.lineProfile", path: "/estrutura/perfil-linha", icon: Ruler },
      { id: "crossingCompliance", titleKey: "sidebar.items.crossingCompliance", path: "/estrutura/compliance", icon: Shield },
      { id: "corrosionTheft", titleKey: "sidebar.items.corrosionTheft", path: "/estrutura/corrosao", icon: Skull },
      { id: "thermography", titleKey: "sidebar.items.thermography", path: "/modules/estrutura/inspecao-termografica", icon: Thermometer },
    ],
  },
  {
    id: "sensors",
    legacyTitle: "Sensores e Câmeras",
    titleKey: "sidebar.categories.sensors",
    items: [
      { id: "sensorPanel", titleKey: "sidebar.items.sensorPanel", path: "/sensores/painel", icon: Gauge },
      { id: "cameras", titleKey: "sidebar.items.cameras", path: "/sensores/cameras", icon: Camera },
      { id: "sensorDashboard", titleKey: "sidebar.items.sensorDashboard", path: "/sensores/dashboard", icon: ChartArea },
      { id: "alerts", titleKey: "sidebar.items.alerts", path: "/sensores/alertas", icon: Bell },
    ],
  },
  {
    id: "operations",
    legacyTitle: "Operações",
    titleKey: "sidebar.categories.operations",
    items: [
      { id: "droneMissions", titleKey: "sidebar.items.droneMissions", path: "/operacao/missoes", icon: Plane },
      { id: "teamTracking", titleKey: "sidebar.items.teamTracking", path: "/equipes/rastreamento", icon: Users },
      { id: "demandas", titleKey: "sidebar.items.demandManagement", path: "/operacao/demandas", icon: ClipboardList },
      { id: "historicalEvents", titleKey: "sidebar.items.historicalEvents", path: "/operacao/eventos", icon: ClockIcon },
      { id: "vehicles", titleKey: "sidebar.items.vehiclesOnline", path: "/operacao/veiculos", icon: Truck },
      { id: "opCompliance", titleKey: "sidebar.items.opCompliance", path: "/operacao/compliance", icon: FileCheck },
      { id: "opReports", titleKey: "sidebar.items.opReports", path: "/operacao/relatorios", icon: FileText },
    ],
  },
  {
    id: "analytics",
    legacyTitle: "Análises Avançadas",
    titleKey: "sidebar.categories.analytics",
    items: [
      { id: "executionCompare", titleKey: "sidebar.items.executionCompare", path: "/analytics/comparativo", icon: BarChart3 },
      { id: "digitalTwin", titleKey: "sidebar.items.digitalTwinAI", path: "/analises/gemeo-digital", icon: BrainCircuit },
      { id: "oversightWorks", titleKey: "sidebar.items.oversightWorks", path: "/fiscalizacao/obras", icon: HardHat },
      { id: "qualityAudits", titleKey: "sidebar.items.qualityAudits", path: "/auditorias/qualidade", icon: Award },
    ],
  },
  {
    id: "training",
    legacyTitle: "Treinamento",
    titleKey: "sidebar.categories.training",
    items: [
      { id: "quizzes", titleKey: "sidebar.items.quizzes", path: "/treinamento/quizzes", icon: GraduationCap },
    ],
  },
  {
    id: "settings",
    legacyTitle: "Configurações",
    titleKey: "sidebar.categories.settings",
    items: [
      { id: "general", titleKey: "sidebar.items.generalSettings", path: "/config/geral", icon: Settings },
      { id: "users", titleKey: "sidebar.items.users", path: "/config/usuarios", icon: Users },
      { id: "permissions", titleKey: "sidebar.items.permissions", path: "/config/permissoes", icon: Lock },
      { id: "layers", titleKey: "sidebar.items.layers", path: "/config/layers", icon: MapPin },
      { id: "demoDataset", titleKey: "sidebar.items.demoDataset", path: "/config/dataset", icon: Database },
    ],
  },
];

const normalizeOpenGroups = (value: unknown): Record<string, boolean> => {
  if (!value || typeof value !== "object") return {};

  const legacyToId = new Map(menuGroups.map((group) => [group.legacyTitle, group.id]));
  // Backward compatibility: prior builds stored "Ambiental" as the group key.
  legacyToId.set("Ambiental", "environmental");
  const record = value as Record<string, unknown>;
  const normalized: Record<string, boolean> = {};

  for (const [rawKey, rawValue] of Object.entries(record)) {
    if (typeof rawValue !== "boolean") continue;

    const isGroupId = menuGroups.some((group) => group.id === rawKey);
    const key = isGroupId ? rawKey : legacyToId.get(rawKey);
    if (!key) continue;

    normalized[key] = rawValue;
  }

  return normalized;
};

const SidebarGroup = ({ 
  group, 
  isOpen, 
  onToggle 
}: { 
  group: MenuGroup; 
  isOpen: boolean; 
  onToggle: () => void;
}) => {
  const location = useLocation();
  const { t } = useI18n();

  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-smartline-green hover:text-primary/80 hover:bg-sidebar-accent rounded-lg transition-all duration-200"
      >
        <span className="flex items-center gap-2">
          <span>{t(group.titleKey)}</span>
        </span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 transition-transform duration-200" />
        ) : (
          <ChevronRight className="w-4 h-4 transition-transform duration-200" />
        )}
      </button>

      <div className={cn(
        "mt-1 space-y-1 overflow-hidden transition-all duration-200",
        isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
      )}>
          {group.items.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-all duration-200 ml-2",
                  isActive
                    ? "bg-sidebar-accent text-slate-100 font-medium shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-sidebar-accent/50"
                )}
              >
                {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                <span>{t(item.titleKey)}</span>
              </Link>
            );
          })}
      </div>
    </div>
  );
};

const Sidebar = () => {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Initialize: open the group containing the current route
  useEffect(() => {
    const savedState = localStorage.getItem("sidebar-groups");
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        const normalized = normalizeOpenGroups(parsed);
        if (Object.keys(normalized).length > 0) {
          setOpenGroups(normalized);
          return;
        }
      } catch {
        // ignore
      }
    }

    const currentGroup = menuGroups.find((g) => g.items.some((item) => location.pathname === item.path));
    if (currentGroup) {
      setOpenGroups({ [currentGroup.id]: true });
    }
  }, [location.pathname, setOpenGroups]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (Object.keys(openGroups).length > 0) {
      localStorage.setItem('sidebar-groups', JSON.stringify(openGroups));
    }
  }, [openGroups]);

  // Auto-open group when navigating to a route
  useEffect(() => {
    const currentGroup = menuGroups.find((g) => g.items.some((item) => location.pathname === item.path));
    if (currentGroup && !openGroups[currentGroup.id]) {
      setOpenGroups((prev) => ({
        ...prev,
        [currentGroup.id]: true,
      }));
    }
  }, [location.pathname, openGroups]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border overflow-y-auto flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoSmartline} alt="Smartline" className="w-10 h-10" />
          <div>
            <div className="font-bold text-lg gradient-text">Smartline</div>
            <div className="text-xs text-muted-foreground">AssetHealth</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4">
        {menuGroups.map((group) => (
          <SidebarGroup 
            key={group.id} 
            group={group} 
            isOpen={!!openGroups[group.id]}
            onToggle={() => toggleGroup(group.id)}
          />
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground text-center">
          v1.0.0 | © 2025 Smartline
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
