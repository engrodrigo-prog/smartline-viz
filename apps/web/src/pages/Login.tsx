import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import logoSmartline from "@/assets/logo-smartline.png";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ENV } from "@/config/env";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const markSessionStart = () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("smartline-session-start", new Date().toISOString());
      } catch {
        // falha em persistir não bloqueia login
      }
    }
  };

  useEffect(() => {
    // Check if already logged in (when Supabase is configured)
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
        if (meta.must_change_password === true) {
          navigate("/change-password");
        } else {
          navigate("/dashboard");
        }
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!supabase) {
        if (ENV.DEMO_MODE && ENV.DEMO_BYPASS_AUTH) {
          markSessionStart();
          navigate("/dashboard");
          return;
        }
        throw new Error("Autenticação indisponível (Supabase não configurado neste ambiente).");
      }

      // Apenas login (cadastro é administrado fora do app público)
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      markSessionStart();

      // Decide para onde ir
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) throw new Error("Sessão não encontrada após login.");
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

      if (meta.must_change_password === true) {
        toast({ title: "Troca de senha necessária", description: "Defina uma nova senha para continuar." });
        navigate("/change-password");
      } else {
        toast({ title: "Login realizado!", description: "Redirecionando para o dashboard..." });
        navigate("/dashboard");
      }
    } catch (error: any) {
      const message = (error?.message as string | undefined) ?? "";
      const friendly =
        message.toLowerCase().includes("failed to fetch") ||
        message.toLowerCase().includes("name_not_resolved")
          ? "Não foi possível conectar ao servidor de autenticação. Verifique a internet e as configurações do Supabase."
          : null;
      toast({
        title: "Erro",
        description: (friendly ?? error.message) || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 hexagon-pattern opacity-10" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="tech-card p-8">
          <div className="text-center mb-8">
            <img
              src={logoSmartline}
              alt="Smartline"
              className="w-24 h-24 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(0,166,122,0.3)]"
            />
            <h1 className="text-3xl font-bold mb-2">
              <span className="gradient-text">SmartLine Viz</span>
            </h1>
            <p className="text-muted-foreground">Dashboard Geodata + Ambiental Queimadas</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="pl-10 bg-input border-border"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="current-password"
                className="pl-10 bg-input border-border"
              />
            </div>

            <Button type="submit" className="btn-primary mt-2" disabled={loading}>
              {loading ? "Processando..." : "Entrar"}
            </Button>
          </form>

          {!supabase && (
            <p className="text-xs text-amber-400 mt-3 text-center">
              {ENV.DEMO_MODE && ENV.DEMO_BYPASS_AUTH
                ? "Modo demo ativo — você pode entrar sem login."
                : "Supabase não configurado neste ambiente."}
            </p>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/signup-request"
              className="text-sm text-primary hover:text-primary/80 transition-colors block mb-2"
            >
              Solicitar acesso ao Smartline
            </Link>
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Voltar para home
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
