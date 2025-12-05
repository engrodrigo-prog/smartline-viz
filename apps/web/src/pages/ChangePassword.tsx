import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ChangePassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Senha muito curta", description: "Use ao menos 6 caracteres.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Senhas não conferem", description: "Digite a mesma senha nos dois campos.", variant: "destructive" });
      return;
    }
    if (!supabase) {
      toast({ title: "Auth indisponível", description: "Supabase não configurado.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData.session?.user) {
        throw sessionErr ?? new Error("Sessão inválida, faça login novamente.");
      }
      const userId = sessionData.session.user.id;
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw updErr;

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", userId);
      if (profileErr) throw profileErr;

      toast({ title: "Senha alterada", description: "Você já pode acessar o dashboard." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Não foi possível alterar", description: err?.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Trocar senha</CardTitle>
          <p className="text-sm text-muted-foreground">Defina uma nova senha para continuar.</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Nova senha</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Confirmar senha</label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando..." : "Salvar e acessar"}
            </Button>
            <div className="text-center text-xs text-muted-foreground">
              <Link to="/" className="hover:underline">← Voltar para a Home</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangePassword;

