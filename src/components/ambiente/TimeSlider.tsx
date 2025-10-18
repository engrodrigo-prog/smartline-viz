import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimeSliderProps {
  dates: Date[];
  value: number;
  onChange: (value: number) => void;
}

export function TimeSlider({ dates, value, onChange }: TimeSliderProps) {
  if (dates.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label className="flex items-center justify-between">
        <span>Período Temporal</span>
        <span className="text-sm font-normal text-muted-foreground">
          {format(dates[value] || new Date(), 'dd/MM/yyyy', { locale: ptBR })}
        </span>
      </Label>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        max={dates.length - 1}
        step={1}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{format(dates[0], 'dd/MM/yy', { locale: ptBR })}</span>
        <span>{format(dates[dates.length - 1], 'dd/MM/yy', { locale: ptBR })}</span>
      </div>
    </div>
  );
}
