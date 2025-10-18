import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building } from 'lucide-react';

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
            Monitoramento de invasões em faixa de servidão através de análise temporal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Funcionalidade em desenvolvimento. Utilizará detecção de mudanças com contexto
            "corridor_invasion" para identificar novas ocupações.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
