import { useState } from "react";
import { Link } from "react-router-dom";
import logoSmartline from "@/assets/logo-smartline.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const LandingHeader = () => {
  const [showContact, setShowContact] = useState(false);
  const { toast } = useToast();

  const handleSubmitContact = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast({
      title: "Mensagem enviada!",
      description: "Entraremos em contato em breve.",
    });
    setShowContact(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 w-full bg-slate-900/70 backdrop-blur-2xl border-b border-white/10 shadow-lg shadow-black/10 z-50">
        <div className="max-w-7xl mx-auto grid grid-cols-[auto,1fr] items-center gap-10 px-10 min-h-[80px]">
          <div className="flex items-center gap-3">
            <img src={logoSmartline} alt="Smartline" className="h-10" />
            <span className="text-2xl font-semibold tracking-wide text-white/90 select-none">
              Smartline AssetHealth
            </span>
          </div>

          <nav className="hidden md:flex justify-end items-center gap-10 text-base font-medium text-white/90">
            <a
              href="https://form.jotform.com/251775321495058"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-green-400 transition-colors"
            >
              Estude seus ativos conosco
            </a>

            <button
              onClick={() => setShowContact(true)}
              className="hover:text-green-400 transition-colors"
            >
              Contatos
            </button>

            <Link to="/resultados" className="hover:text-green-400 transition-colors">
              Resultados & Casos
            </Link>

            <Link
              to="/login"
              className="px-6 py-2 rounded-xl bg-green-500/30 border border-green-400/40 hover:bg-green-500/40 hover:shadow-[0_0_10px_rgba(0,255,170,0.3)] transition-all"
            >
              Login / Acesso Livre
            </Link>
          </nav>
        </div>
      </header>

      <Dialog open={showContact} onOpenChange={setShowContact}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl text-primary">Entre em Contato</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitContact} className="flex flex-col gap-4 mt-4">
            <Input
              type="text"
              placeholder="Nome completo"
              required
              className="bg-input border-border"
            />
            <Input
              type="email"
              placeholder="E-mail"
              required
              className="bg-input border-border"
            />
            <Input
              type="text"
              placeholder="Empresa"
              required
              className="bg-input border-border"
            />
            <Input
              type="tel"
              placeholder="Telefone"
              required
              className="bg-input border-border"
            />
            
            <select 
              className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
              name="comoConheceu" 
              required
            >
              <option value="">Como conheceu a solução Smartline?</option>
              <option>LinkedIn</option>
              <option>Eventos</option>
              <option>Contato Direto</option>
              <option>E-mail</option>
              <option>Google</option>
              <option>Outro Player do Setor</option>
              <option>Outros</option>
            </select>

            <Textarea
              name="mensagem"
              className="bg-input border-border min-h-[120px]"
              maxLength={300}
              placeholder="Mensagem (opcional, até 300 caracteres)"
            />

            <Button type="submit" className="btn-primary mt-2">
              Enviar Mensagem
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LandingHeader;
