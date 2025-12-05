import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Mail, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ENV } from "@/config/env";

type SignupRequest = {
  id: string;
  type: "new" | "extend";
  full_name: string;
  email: string;
  phone: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

const RequestsPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [daysById, setDaysById] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "signup-requests"],
    queryFn: async (): Promise<SignupRequest[]> => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("signup_requests")
        .select("id, type, full_name, email, phone, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as SignupRequest[]) ?? [];
    },
  });

  const updateStatus = async (req: SignupRequest, nextStatus: "approved" | "rejected") => {
    if (!supabase || !userId) {
      toast({
        title: "Sessão admin necessária",
        description: "Faça login como administrador para aprovar ou rejeitar.",
        variant: "destructive",
      });
      return;
    }
    try {
      const { error } = await supabase
        .from("signup_requests")
        .update({
          status: nextStatus,
          handled_by: userId,
          handled_at: new Date().toISOString(),
        } as any)
        .eq("id", req.id);
      if (error) throw error;

      if (nextStatus === "approved") {
        const days = daysById[req.id] ?? 7;
        try {
          await fetch("/api/admin/send-approval-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: req.email,
              full_name: req.full_name,
              days,
              type: req.type,
            }),
          });
        } catch (err) {
          console.warn("[studio] falha ao acionar e-mail automático", err);
        }
      }
      toast({
        title: nextStatus === "approved" ? "Solicitação aprovada" : "Solicitação rejeitada",
        description: `${req.full_name} (${req.email})`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "signup-requests"] });
    } catch (err: any) {
      toast({
        title: "Não foi possível atualizar",
        description: err?.message ?? "Erro ao atualizar a solicitação.",
        variant: "destructive",
      });
    }
  };

  const mailto = (req: SignupRequest) =>
    `mailto:${req.email}?subject=Smartline%20-%20Acesso&body=Olá%20${encodeURIComponent(
      req.full_name,
    )},%0A%0ASua%20solicitação%20de%20acesso%20ao%20Smartline%20foi%20recebida.%0A%0AObrigado!`;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Studio – Solicitações de Acesso</h1>
          <p className="text-sm text-muted-foreground">
            Pedidos enviados pela rota pública. Aprove para seguir com a criação de usuários no Supabase.
          </p>
        </div>
        <div className="text-xs text-muted-foreground text-right">
          Contato admin:{" "}
          <a className="text-primary underline" href={`mailto:${ENV.CONTACT_EMAIL}`}>
            {ENV.CONTACT_EMAIL}
          </a>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando solicitações...</p>}
      {isError && <p className="text-sm text-destructive">Erro ao carregar solicitações.</p>}

      {!isLoading && !data?.length && (
        <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente no momento.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.map((req) => (
          <Card key={req.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">{req.full_name}</CardTitle>
                <p className="text-xs text-muted-foreground">{req.email}</p>
              </div>
              <Badge variant={req.type === "new" ? "default" : "outline"}>
                {req.type === "new" ? "Novo acesso" : "Extensão"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Telefone: <span className="font-mono">{req.phone || "—"}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Criado em:{" "}
                {format(new Date(req.created_at), "dd/MM/yyyy HH:mm")}
              </p>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Prazo sugerido:</span>
                <select
                  className="border rounded px-2 py-1 bg-background text-xs"
                  value={daysById[req.id] ?? 7}
                  onChange={(e) =>
                    setDaysById((prev) => ({
                      ...prev,
                      [req.id]: Number(e.target.value) || 7,
                    }))
                  }
                >
                  <option value={7}>7 dias</option>
                  <option value={14}>14 dias</option>
                  <option value={30}>30 dias</option>
                </select>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 flex items-center gap-1"
                  asChild
                >
                  <a href={mailto(req)}>
                    <Mail className="w-4 h-4" />
                    E-mail
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 flex items-center gap-1"
                  onClick={() => updateStatus(req, "approved")}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 flex items-center gap-1 text-destructive"
                  onClick={() => updateStatus(req, "rejected")}
                >
                  <XCircle className="w-4 h-4" />
                  Rejeitar
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Após aprovar, crie ou ajuste o usuário correspondente no Supabase (Auth) e, se necessário,
                defina o prazo de expiração em <code>profiles.expires_at</code>.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RequestsPage;
