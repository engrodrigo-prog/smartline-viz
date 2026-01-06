import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ChangePassword = () => {
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      if (!supabase) {
        setLoadingProfile(false);
        return;
      }
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user) return;

        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
        const metaName = typeof meta.full_name === "string" ? meta.full_name : "";
        const metaOrg = typeof meta.organization === "string" ? meta.organization : "";

        const attemptFull = async (columns: string) =>
          supabase.from("profiles").select(columns).eq("id", user.id).single();

        const first = await attemptFull("full_name, organization");
        const second =
          first.error && (first.error as any)?.code === "PGRST204"
            ? await attemptFull("full_name")
            : null;

        const profile = (first.data ?? second?.data) as any | null;

        setFullName((profile?.full_name ?? metaName ?? user.email ?? "").toString());
        setOrganization((profile?.organization ?? metaOrg ?? "").toString());
      } finally {
        setLoadingProfile(false);
      }
    };

    void load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe seu nome completo.", variant: "destructive" });
      return;
    }
    if (!organization.trim()) {
      toast({ title: "Empresa obrigatória", description: "Informe sua empresa/organização.", variant: "destructive" });
      return;
    }
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
      const { error: updErr } = await supabase.auth.updateUser({
        password,
        data: {
          must_change_password: false,
          full_name: fullName.trim(),
          organization: organization.trim(),
        },
      });
      if (updErr) throw updErr;

      const updateProfile = async (payload: Record<string, unknown>) =>
        supabase.from("profiles").update(payload as any).eq("id", userId);

      const profileAttempt = await updateProfile({
        full_name: fullName.trim(),
        organization: organization.trim(),
      });
      if (profileAttempt.error && (profileAttempt.error as any)?.code === "PGRST204") {
        const retry = await updateProfile({ full_name: fullName.trim() });
        if (retry.error) {
          console.warn("[profile] falha ao atualizar cadastro", retry.error);
        }
      } else if (profileAttempt.error) {
        console.warn("[profile] falha ao atualizar cadastro", profileAttempt.error);
      }

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
          <p className="text-sm text-muted-foreground">Complete seu cadastro e defina uma nova senha para continuar.</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Nome completo</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loadingProfile}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Empresa / Organização</label>
              <Input
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                required
                disabled={loadingProfile}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Nova senha</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Confirmar senha</label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
              />
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
