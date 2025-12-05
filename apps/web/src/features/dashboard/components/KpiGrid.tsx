import CardKPI from "@/components/CardKPI";
import { Activity, AlertTriangle, CheckCircle, Database } from "lucide-react";

type Metrics = {
  operationalAssets: number;
  criticalAlerts: number;
  avgHealthScore: number;
  totalSensors: number;
};

type KpiGridProps = {
  metrics: Metrics;
};

const KpiGrid = ({ metrics }: KpiGridProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <CardKPI
      title="Ativos Operacionais"
      value={metrics.operationalAssets}
      icon={CheckCircle}
      trend={{ value: 5.2, isPositive: true }}
    />
    <CardKPI
      title="Alertas Críticos"
      value={metrics.criticalAlerts}
      icon={AlertTriangle}
      trend={{ value: 12.3, isPositive: false }}
    />
    <CardKPI
      title="Health Score Médio"
      value={`${metrics.avgHealthScore}%`}
      icon={Activity}
      trend={{ value: 3.1, isPositive: true }}
    />
    <CardKPI title="Sensores Ativos" value={metrics.totalSensors} icon={Database} />
  </div>
);

export default KpiGrid;
