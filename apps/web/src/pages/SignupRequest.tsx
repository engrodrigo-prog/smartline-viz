import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const SignupRequest = () => {
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      toast({ title: "Indisponível", description: "Supabase não configurado para receber solicitações.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("signup_requests").insert({
        type: "new",
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        status: "pending",
        // campo extra opcional
        notes: message?.trim() || null,
      } as any);
      if (error) throw error;
      toast({
        title: "Solicitação enviada",
        description: "Nossa equipe vai revisar e liberar o acesso. Você receberá instruções por e-mail.",
      });
      setFullName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (err: any) {
      toast({
        title: "Não foi possível enviar",
        description: err?.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="tech-card w-full max-w-2xl p-8">
        <h1 className="text-2xl font-bold mb-2">Solicitar acesso</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Preencha os dados para solicitar acesso ao Smartline. Admins (Rodrigo ou Guilherme) aprovarão e você receberá um e-mail com instruções.
        </p>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Input
            placeholder="Nome completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            type="email"
            placeholder="E-mail corporativo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            placeholder="Telefone (WhatsApp)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <Textarea
            placeholder="Mensagem (opcional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Enviar solicitação"}
          </Button>
          <div className="text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:underline">← Voltar para home</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupRequest;

