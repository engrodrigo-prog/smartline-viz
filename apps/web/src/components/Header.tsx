import { useEffect, useState } from "react";
import { Bell, User, Settings, LogOut, RefreshCw, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useDatasetContext } from "@/context/DatasetContext";
import { ENV } from "@/config/env";
import { useQuery } from "@tanstack/react-query";
import LanguageMenu from "@/components/LanguageMenu";
import { useI18n } from "@/context/I18nContext";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const Header = ({ title, subtitle }: HeaderProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resetDataset, lastUpdated } = useDatasetContext();
  const [isAdmin, setIsAdmin] = useState(false);
  const { t, formatDateTime } = useI18n();

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!user) {
        setIsAdmin(false);
        return;
      }
      if ((user.app_metadata as any)?.smartline_role === "admin") {
        setIsAdmin(true);
        return;
      }
      try {
        const { data: roles, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        if (error) throw error;
        setIsAdmin(Boolean(roles?.some((r) => r.role === "admin")));
      } catch {
        const adminEmails = ["eng.rodrigo@gmail.com", "guilherme@gpcad.com.br"];
        setIsAdmin(adminEmails.includes(user.email ?? ""));
      }
    });
  }, []);

  const handleLogout = async () => {
    try {
      // Logout Supabase, se estiver configurado
      if (supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) {
          throw error;
        }
      }
      // Limpa sessão demo local
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("smartline-demo-user");
      }
      toast({
        title: t("header.toasts.logoutSuccess.title"),
        description: t("header.toasts.logoutSuccess.description"),
      });
      navigate("/login");
    } catch (error: any) {
      toast({
        title: t("header.toasts.logoutError.title"),
        description: error?.message ?? t("header.toasts.logoutError.description"),
        variant: "destructive",
      });
    }
  };

  const handleResetDemo = () => {
    resetDataset();
    toast({
      title: t("header.toasts.demoReset.title"),
      description: t("header.toasts.demoReset.description"),
    });
  };

  return (
    <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
          {ENV.DEMO_MODE && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {t("header.demo.active")}{" "}
              {lastUpdated ? `• ${t("header.demo.updatedAt", { date: formatDateTime(lastUpdated) })}` : ""}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <LanguageMenu showShortLabel={false} />
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </Button>

          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/requests")} className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              Studio
            </Button>
          )}

          {ENV.DEMO_MODE && (
            <Button variant="outline" size="sm" onClick={handleResetDemo} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              {t("header.demo.reset")}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t("header.account.label")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                {t("header.account.profile")}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                {t("header.account.settings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                {t("header.account.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
