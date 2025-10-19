import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mountain } from 'lucide-react';

export default function ErosaoRisco() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mountain className="w-5 h-5" />
            Análise de Risco de Erosão
          </CardTitle>
          <CardDescription>
            Avaliação preliminar baseada em DEM, declividade e precipitação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Funcionalidade em desenvolvimento. Combinará DEM, dados de chuva e declividade
            para calcular índice de risco de erosão.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
