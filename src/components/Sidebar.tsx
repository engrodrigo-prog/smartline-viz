import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import logoSmartline from "@/assets/logo-smartline.png";

interface MenuItem {
  title: string;
  path: string;
  icon?: React.ReactNode;
}

interface MenuGroup {
  category: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    category: "Base",
    items: [
      { title: "Dashboard", path: "/dashboard" },
      { title: "Relatórios", path: "/relatorios" },
    ],
  },
  {
    category: "Ambiental",
    items: [
      { title: "Áreas Alagadas", path: "/ambiental/alagadas" },
      { title: "Vegetação", path: "/ambiental/vegetacao" },
      { title: "Ocupação de Faixa", path: "/ambiental/ocupacao" },
      { title: "Distância Cabo x Solo", path: "/ambiental/distancia" },
      { title: "Compliance Ambiental", path: "/ambiental/compliance" },
    ],
  },
  {
    category: "Estruturas",
    items: [
      { title: "Estruturas", path: "/estrutura/estruturas" },
      { title: "Emendas e Conexões", path: "/estrutura/emendas" },
      { title: "Travessias", path: "/estrutura/travessias" },
      { title: "Compliance Cruzamentos", path: "/estrutura/compliance" },
      { title: "Corrosão e Furto", path: "/estrutura/corrosao" },
    ],
  },
  {
    category: "Sensores e Câmeras",
    items: [
      { title: "Painel de Sensores", path: "/sensores/painel" },
      { title: "Câmeras", path: "/sensores/cameras" },
      { title: "Dashboard de Sensores", path: "/sensores/dashboard" },
      { title: "Alertas", path: "/sensores/alertas" },
    ],
  },
  {
    category: "Operações",
    items: [
      { title: "Missões de Drones", path: "/operacao/missoes" },
      { title: "Eventos Históricos", path: "/operacao/eventos" },
      { title: "Compliance Operacional", path: "/operacao/compliance" },
      { title: "Relatórios Operacionais", path: "/operacao/relatorios" },
    ],
  },
  {
    category: "Configurações",
    items: [
      { title: "Configurações Gerais", path: "/config/geral" },
      { title: "Usuários", path: "/config/usuarios" },
      { title: "Permissões", path: "/config/permissoes" },
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
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "block px-4 py-2 text-sm rounded-lg transition-colors ml-2",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                {item.title}
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
