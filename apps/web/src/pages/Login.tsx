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
import LanguageMenu from "@/components/LanguageMenu";
import { useI18n } from "@/context/I18nContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useI18n();

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
        throw new Error(t("login.errors.authUnavailable"));
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
        toast({ title: t("login.toasts.mustChangePassword.title"), description: t("login.toasts.mustChangePassword.description") });
        navigate("/change-password");
      } else {
        const isMobile =
          typeof window !== "undefined" &&
          window.matchMedia &&
          window.matchMedia("(max-width: 768px)").matches;
        toast({
          title: t("login.toasts.success.title"),
          description: isMobile
            ? `${t("login.toasts.success.description")} ${t("login.toasts.desktopHint")}`
            : t("login.toasts.success.description"),
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      const message = (error?.message as string | undefined) ?? "";
      const friendly =
        message.toLowerCase().includes("failed to fetch") ||
        message.toLowerCase().includes("name_not_resolved")
          ? t("login.errors.cannotConnectAuth")
          : null;
      toast({
        title: t("login.toasts.error.title"),
        description: (friendly ?? error.message) || t("login.toasts.error.description"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 hexagon-pattern opacity-10" />
      <div className="absolute top-4 right-4 z-20">
        <LanguageMenu className="bg-background/60 hover:bg-background/80 border border-border/50" />
      </div>
      
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
	              <span className="gradient-text">{ENV.APP_NAME}</span>
	            </h1>
	            <p className="text-muted-foreground">{t("login.subtitle")}</p>
	          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
	              <Input
	                type="email"
	                placeholder={t("login.form.email")}
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
	                placeholder={t("login.form.password")}
	                value={password}
	                onChange={(e) => setPassword(e.target.value)}
	                required
	                minLength={6}
                autoComplete="current-password"
                className="pl-10 bg-input border-border"
              />
            </div>

	            <Button type="submit" className="btn-primary mt-2" disabled={loading}>
	              {loading ? t("login.form.processing") : t("login.form.submit")}
	            </Button>
	          </form>

	          {!supabase && (
	            <p className="text-xs text-amber-400 mt-3 text-center">
	              {ENV.DEMO_MODE && ENV.DEMO_BYPASS_AUTH
	                ? t("login.demo.bypass")
	                : t("login.demo.supabaseNotConfigured")}
	            </p>
	          )}

          <div className="mt-6 text-center">
	            <Link
	              to="/signup-request"
	              className="text-sm text-primary hover:text-primary/80 transition-colors block mb-2"
	            >
	              {t("login.links.requestAccess")}
	            </Link>
	            <Link
	              to="/"
	              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
	            >
	              {t("login.links.backHome")}
	            </Link>
	          </div>
	        </div>
	      </motion.div>
    </div>
  );
};

export default Login;
