import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  level: "Baixa" | "Média" | "Alta";
  className?: string;
}

const StatusBadge = ({ level, className }: StatusBadgeProps) => {
  const variants = {
    Baixa: "bg-[hsl(var(--level-low))] hover:bg-[hsl(var(--level-low))]/80 text-white border-[hsl(var(--level-low))]",
    Média: "bg-[hsl(var(--level-medium))] hover:bg-[hsl(var(--level-medium))]/80 text-white border-[hsl(var(--level-medium))]",
    Alta: "bg-[hsl(var(--level-high))] hover:bg-[hsl(var(--level-high))]/80 text-white border-[hsl(var(--level-high))]",
  };

  return (
    <Badge className={cn(variants[level], className)}>
      {level}
    </Badge>
  );
};

export default StatusBadge;
