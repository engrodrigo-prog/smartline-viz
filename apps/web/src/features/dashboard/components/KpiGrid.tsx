import type { LucideIcon } from "lucide-react";
import CardKPI from "@/components/CardKPI";

export type KpiCard = {
  id: string;
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
};

type KpiGridProps = {
  cards: KpiCard[];
};

const KpiGrid = ({ cards }: KpiGridProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {cards.map((card) => (
      <CardKPI
        key={card.id}
        title={card.title}
        value={card.value}
        icon={card.icon}
        description={card.description}
        trend={card.trend}
      />
    ))}
  </div>
);

export default KpiGrid;
