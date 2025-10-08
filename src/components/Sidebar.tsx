import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  ChevronDown, ChevronRight, LayoutDashboard, Map, Network, FileText, Upload,
  Droplets, Trees, Mountain, Ruler, ShieldCheck, Building2,
  Link2, GitBranch, Shield, Skull, Camera, Gauge, ChartArea,
  Bell, Plane, Clock, FileCheck, Settings, Users, Lock,
  Award, HardHat, BrainCircuit, TrendingUp, MapPin, Truck, ClipboardCheck
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
      { title: "Bases de Dados", path: "/upload/bases", icon: Upload },
    ],
  },
  {
    category: "Ambiental",
    items: [
      { title: "Áreas Alagadas", path: "/ambiental/alagadas", icon: Droplets },
      { title: "Vegetação", path: "/ambiental/vegetacao", icon: Trees },
      { title: "Ocupação de Faixa", path: "/ambiental/ocupacao", icon: Mountain },
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
      { title: "Eventos Históricos", path: "/operacao/eventos", icon: Clock },
      { title: "Compliance Operacional", path: "/operacao/compliance", icon: FileCheck },
      { title: "Relatórios", path: "/operacao/relatorios", icon: FileText },
    ],
  },
  {
    category: "Gestão de Equipes",
    items: [
      { title: "Painel de Equipes", path: "/equipes/painel", icon: Users },
      { title: "Escalas e Turnos", path: "/equipes/escalas", icon: Clock },
      { title: "Rastreamento em Campo", path: "/equipes/rastreamento", icon: MapPin },
      { title: "Gestão de Frota", path: "/equipes/frota", icon: Truck },
      { title: "Checklist Operacional", path: "/equipes/checklist", icon: ClipboardCheck },
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

const SidebarGroup = ({ group }: { group: MenuGroup }) => {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors"
      >
        <span>{group.category}</span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {isOpen && (
        <div className="mt-1 space-y-1">
          {group.items.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ml-2",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Sidebar = () => {
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
          <SidebarGroup key={group.category} group={group} />
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
