import { Link, useLocation } from "react-router-dom";
import { Compass, Map, Upload, Flame, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/context/I18nContext";

const demoLinks = [
  { to: "/dashboard", labelKey: "demoNav.links.dashboard", icon: LayoutDashboard },
  { to: "/visual/mapa", labelKey: "demoNav.links.map", icon: Map },
  { to: "/upload", labelKey: "demoNav.links.upload", icon: Upload },
  { to: "/ambiental/queimadas", labelKey: "demoNav.links.wildfires", icon: Flame },
  { to: "/", labelKey: "demoNav.links.landing", icon: Compass },
];

const DemoNav = () => {
  const location = useLocation();
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-purple-500/10 border-b border-border/50">
      {demoLinks.map((item) => {
        const Icon = item.icon;
        const active = location.pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all",
              active
                ? "bg-white/20 text-foreground shadow-sm border border-white/30"
                : "text-muted-foreground hover:text-foreground hover:bg-white/10 border border-transparent"
            )}
          >
            <Icon className="w-4 h-4" />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </div>
  );
};

export default DemoNav;
