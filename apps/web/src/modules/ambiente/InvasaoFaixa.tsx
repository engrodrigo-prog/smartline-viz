import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from "react-router-dom";
import { Building, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function InvasaoFaixa() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Detecção de Ocupações Irregulares
          </CardTitle>
          <CardDescription>
            Monitoramento de invasões em faixa de servidão com cenário demo na Baixada Santista
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            O MVP agora usa um traçado simulado entre Cubatão, São Vicente e Santos, com edificações em conflito,
            classificação de risco e leitura pronta para apresentação comercial.
          </p>
          <Button asChild>
            <Link to="/ambiental/ocupacao" className="inline-flex items-center gap-2">
              Abrir cenário detalhado
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
