import { useEffect, useMemo, useState } from "react";
import { LogIn, LogOut, ShieldCheck, ShieldOff, User2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { getJSON, postJSON } from "@/services/api";

interface DemoUser {
  id: string;
  display_name: string;
  email?: string;
  issued_at: string;
}

type LoginTopbarVariant = "landing" | "compact";

interface LoginTopbarProps {
  variant?: LoginTopbarVariant;
}

const STORAGE_KEY = "smartline-demo-user";

const loadStoredUser = (): DemoUser | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DemoUser;
  } catch (error) {
    console.warn("Failed to parse stored user", error);
    return null;
  }
};

const storeUser = (user: DemoUser | null) => {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

export const LoginTopbar = ({ variant = "landing" }: LoginTopbarProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<DemoUser | null>(() => loadStoredUser());
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const response = await getJSON<{ user: DemoUser | null }>("/auth/demo/me");
        if (response.user) {
          setUser(response.user);
          storeUser(response.user);
        } else {
          storeUser(null);
        }
      } catch (error) {
        storeUser(null);
      }
    };

    bootstrap();
  }, []);

  const initials = useMemo(() => {
    if (!user) return "?";
    return user.display_name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase())
      .join("");
  }, [user]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!displayName.trim()) {
      toast({
        title: "Informe um nome",
        description: "Digite pelo menos 2 caracteres para continuar.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const response = await postJSON<{ user: DemoUser }>("/auth/demo/login", {
        display_name: displayName.trim(),
        email: email.trim() || undefined
      });
      setUser(response.user);
      storeUser(response.user);
      toast({
        title: "Sessão iniciada",
        description: `Bem-vindo(a), ${response.user.display_name}!`
      });
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Não foi possível entrar",
        description: error?.message || "Tente novamente em instantes.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await postJSON("/auth/demo/logout", {});
    } catch (error) {
      console.warn("logout", error);
    }
    setUser(null);
    storeUser(null);
    toast({ title: "Sessão encerrada", description: "O cookie demo foi removido." });
  };

  const renderDialog = (trigger: React.ReactNode) => (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Entrar com conta demo</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleLogin}>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nome para exibição</label>
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Ex.: SmartLine Convidado"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">E-mail (opcional)</label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@empresa.com"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              <LogIn className="w-3 h-3 mr-1" />
              Entrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  const statusIcon = user ? (
    <ShieldCheck className="w-4 h-4 text-emerald-400" />
  ) : (
    <ShieldOff className="w-4 h-4 text-amber-400" />
  );

  const userBadge = user ? (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/10">
      <Avatar className="h-7 w-7">
        <AvatarFallback className="bg-emerald-500/30 text-white text-[11px]">
          {initials || <User2 className="w-3 h-3" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-medium text-white/90">{user.display_name}</span>
        {user.email && <span className="text-[11px] text-white/60">{user.email}</span>}
      </div>
    </div>
  ) : null;

  const loginTrigger = variant === "compact"
    ? renderDialog(
        <Button size="sm" variant="secondary" className="h-8 px-3">
          <LogIn className="w-3 h-3 mr-1" />
          Login
        </Button>
      )
    : renderDialog(
        <Button size="sm" className="h-8 px-4 bg-emerald-500/80 hover:bg-emerald-500">
          <LogIn className="w-3 h-3 mr-1" />
          Login
        </Button>
      );

  if (variant === "compact") {
    return (
      <div className="bg-muted/40 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground">
            {statusIcon}
            <span className="uppercase tracking-[0.22em] text-[10px] font-semibold">
              {user ? "Sessão demo ativa" : "Login demo disponível"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {userBadge}
                <Button variant="ghost" size="sm" className="h-8 px-3" onClick={handleLogout}>
                  <LogOut className="w-3 h-3 mr-1" />
                  Sair
                </Button>
              </>
            ) : (
              loginTrigger
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/70 border-b border-white/10 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-white/90">
        <div className="flex items-center gap-2">
          {statusIcon}
          <span className="uppercase tracking-[0.28em] text-[11px] font-semibold">
            {user ? "Sessão demo ativa" : "Login demo disponível"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {userBadge}
              <Button variant="ghost" size="sm" className="h-8 px-4 text-white/80" onClick={handleLogout}>
                <LogOut className="w-3 h-3 mr-1" />
                Sair
              </Button>
            </>
          ) : (
            loginTrigger
          )}
        </div>
      </div>
    </div>
  );
};
