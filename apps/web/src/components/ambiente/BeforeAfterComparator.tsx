import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

interface BeforeAfterComparatorProps {
  imageT0?: string;
  imageT1?: string;
  labelT0?: string;
  labelT1?: string;
}

export function BeforeAfterComparator({
  imageT0,
  imageT1,
  labelT0 = 'Antes',
  labelT1 = 'Depois'
}: BeforeAfterComparatorProps) {
  const [position, setPosition] = useState(50);

  if (!imageT0 || !imageT1) {
    return (
      <Card className="h-96 flex items-center justify-center">
        <p className="text-muted-foreground">
          Selecione duas imagens para comparação
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="relative h-96 overflow-hidden">
        <CardContent className="p-0 relative h-full">
          {/* Imagem T0 (Antes) */}
          <div className="absolute inset-0">
            <img
              src={imageT0}
              alt={labelT0}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-background/80 px-3 py-1 rounded-lg text-sm font-medium">
              {labelT0}
            </div>
          </div>

          {/* Imagem T1 (Depois) - com clip-path */}
          <div
            className="absolute inset-0"
            style={{ clipPath: `inset(0 0 0 ${position}%)` }}
          >
            <img
              src={imageT1}
              alt={labelT1}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 bg-background/80 px-3 py-1 rounded-lg text-sm font-medium">
              {labelT1}
            </div>
          </div>

          {/* Linha divisória */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize"
            style={{ left: `${position}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <div className="flex gap-1">
                <div className="w-1 h-4 bg-background rounded-full" />
                <div className="w-1 h-4 bg-background rounded-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slider de controle */}
      <Slider
        value={[position]}
        onValueChange={([v]) => setPosition(v)}
        max={100}
        step={1}
        className="w-full"
      />
    </div>
  );
}
