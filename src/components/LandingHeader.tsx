import { useState } from "react";
import { Link } from "react-router-dom";
import logoSmartline from "@/assets/logo-smartline.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
      <header className="fixed top-0 left-0 w-full bg-card/60 backdrop-blur-xl border-b border-border/50 z-50">
        <div className="container mx-auto flex justify-between items-center px-6 lg:px-10 py-4">
          <img src={logoSmartline} alt="Smartline" className="h-10 drop-shadow-lg" />

          <nav className="hidden md:flex gap-6 lg:gap-8 text-sm font-medium text-foreground/90">
            <a
              href="https://form.jotform.com/251775321495058"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Estude seus ativos conosco
            </a>

            <button
              onClick={() => setShowContact(true)}
              className="hover:text-primary transition-colors"
            >
              Contatos
            </button>

            <Link to="/resultados" className="hover:text-primary transition-colors">
              Resultados & Casos
            </Link>

            <Link
              to="/login"
              className="bg-primary/20 border border-primary/30 px-4 py-1.5 rounded-xl hover:bg-primary/30 transition-colors"
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
