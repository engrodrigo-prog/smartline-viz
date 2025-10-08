import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import logoSmartline from "@/assets/logo-smartline.png";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulação de login
    if (email && password) {
      toast({
        title: "Login realizado!",
        description: "Redirecionando para o dashboard...",
      });
      setTimeout(() => navigate("/dashboard"), 1000);
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
              <span className="gradient-text">AssetHealth</span>
            </h1>
            <p className="text-muted-foreground">Acesse o sistema Smartline</p>
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
                className="pl-10 bg-input border-border"
              />
            </div>

            <Button type="submit" className="btn-primary mt-2">
              Entrar
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border/50 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Ou continue com acesso livre
            </p>
            <Link
              to="/dashboard"
              className="text-primary hover:text-primary/80 font-medium transition-colors inline-flex items-center gap-2"
            >
              Acesso Livre ao Dashboard →
            </Link>
          </div>

          <div className="mt-6 text-center">
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
