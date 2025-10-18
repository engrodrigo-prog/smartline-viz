import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  ChevronDown, ChevronRight, LayoutDashboard, Map, Network, FileText, Upload,
  Droplets, Trees, Mountain, Ruler, ShieldCheck, Building2,
  Link2, GitBranch, Shield, Skull, Camera, Gauge, ChartArea,
  Bell, Plane, Clock as ClockIcon, FileCheck, Settings, Users, Lock,
  Award, HardHat, BrainCircuit, MapPin, Flame, Home, History, Truck, CloudRain
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoSmartline from "@/assets/logo-smartline.png";
import { LucideIcon } from "lucide-react";

interface MenuItem {
  title: string;
  path: string;
  icon?: LucideIcon;
}

interface MenuGroup {
  category: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    category: "Visão Geral",
    items: [
      { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { title: "Mapa de Eventos", path: "/visual/mapa", icon: Map },
      { title: "Diagrama Unifilar", path: "/visual/unifilar", icon: Network },
      { title: "Relatórios Gerais", path: "/relatorios", icon: FileText },
    ],
  },
  {
    category: "Upload",
    items: [
      { title: "Upload Unificado", path: "/upload", icon: Upload },
      { title: "Histórico", path: "/upload/historico", icon: History },
    ],
  },
  {
    category: "Ambiental",
    items: [
      { title: "Áreas Alagadas", path: "/ambiental/alagadas", icon: Droplets },
      { title: "Erosão", path: "/ambiental/erosao", icon: Mountain },
      { title: "Queimadas", path: "/ambiental/queimadas", icon: Flame },
      { title: "Meteorologia", path: "/ambiental/meteorologia", icon: CloudRain },
      { title: "Vegetação", path: "/ambiental/vegetacao", icon: Trees },
      { title: "Ocupação de Faixa", path: "/ambiental/ocupacao", icon: Home },
      { title: "Distância Cabo x Solo", path: "/ambiental/distancia", icon: Ruler },
      { title: "Compliance Ambiental", path: "/ambiental/compliance", icon: ShieldCheck },
    ],
  },
  {
    category: "Estrutura",
    items: [
      { title: "Estruturas", path: "/estrutura/estruturas", icon: Building2 },
      { title: "Emendas e Conexões", path: "/estrutura/emendas", icon: Link2 },
      { title: "Travessias", path: "/estrutura/travessias", icon: GitBranch },
      { title: "Compliance Cruzamentos", path: "/estrutura/compliance", icon: Shield },
      { title: "Corrosão e Furto", path: "/estrutura/corrosao", icon: Skull },
    ],
  },
  {
    category: "Sensores e Câmeras",
    items: [
      { title: "Painel de Sensores", path: "/sensores/painel", icon: Gauge },
      { title: "Câmeras", path: "/sensores/cameras", icon: Camera },
      { title: "Dashboard", path: "/sensores/dashboard", icon: ChartArea },
      { title: "Alertas", path: "/sensores/alertas", icon: Bell },
    ],
  },
  {
    category: "Operações",
    items: [
      { title: "Missões de Drones", path: "/operacao/missoes", icon: Plane },
      { title: "Eventos Históricos", path: "/operacao/eventos", icon: ClockIcon },
      { title: "Veículos On-Line", path: "/operacao/veiculos", icon: Truck },
      { title: "Compliance Operacional", path: "/operacao/compliance", icon: FileCheck },
      { title: "Relatórios", path: "/operacao/relatorios", icon: FileText },
    ],
  },
  {
    category: "Análises Avançadas",
    items: [
      { title: "Gêmeo Digital & IA", path: "/analises/gemeo-digital", icon: BrainCircuit },
      { title: "Fiscalização & Obras", path: "/fiscalizacao/obras", icon: HardHat },
      { title: "Auditorias de Qualidade", path: "/auditorias/qualidade", icon: Award },
    ],
  },
  {
    category: "Configurações",
    items: [
      { title: "Configurações Gerais", path: "/config/geral", icon: Settings },
      { title: "Usuários", path: "/config/usuarios", icon: Users },
      { title: "Permissões", path: "/config/permissoes", icon: Lock },
    ],
  },
];

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

  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-smartline-green hover:text-primary/80 hover:bg-sidebar-accent rounded-lg transition-all duration-200"
      >
        <span>{group.category}</span>
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
                <span>{item.title}</span>
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
    const savedState = localStorage.getItem('sidebar-groups');
    if (savedState) {
      setOpenGroups(JSON.parse(savedState));
    } else {
      const currentGroup = menuGroups.find(g => 
        g.items.some(item => location.pathname === item.path)
      );
      if (currentGroup) {
        setOpenGroups({ [currentGroup.category]: true });
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (Object.keys(openGroups).length > 0) {
      localStorage.setItem('sidebar-groups', JSON.stringify(openGroups));
    }
  }, [openGroups]);

  // Auto-open group when navigating to a route
  useEffect(() => {
    const currentGroup = menuGroups.find(g => 
      g.items.some(item => location.pathname === item.path)
    );
    if (currentGroup && !openGroups[currentGroup.category]) {
      setOpenGroups(prev => ({
        ...prev,
        [currentGroup.category]: true
      }));
    }
  }, [location.pathname]);

  const toggleGroup = (category: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [category]: !prev[category]
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
            key={group.category} 
            group={group} 
            isOpen={!!openGroups[group.category]}
            onToggle={() => toggleGroup(group.category)}
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
