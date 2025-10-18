import { ReactNode } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminOnly({ children, fallback }: AdminOnlyProps) {
  const { isAdmin, loading } = useUserRole();

  if (loading) {
    return <div className="text-muted-foreground">Verificando permissões...</div>;
  }

  if (!isAdmin) {
    return fallback || (
      <Alert variant="destructive">
        <Lock className="h-4 w-4" />
        <AlertDescription>
          Acesso restrito a administradores
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}
