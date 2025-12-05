import { Clock } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { DashboardTimelinePoint } from "../hooks/useDashboardData";

type TimelineChartProps = {
  data: DashboardTimelinePoint[];
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.5rem",
};

const TimelineChart = ({ data }: TimelineChartProps) => (
  <div className="tech-card p-6">
    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
      <Clock className="w-5 h-5 text-primary" />
      Histórico de Status (Últimos 30 dias)
    </h3>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="day" stroke="hsl(var(--foreground))" />
        <YAxis stroke="hsl(var(--foreground))" />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend />
        <Line type="monotone" dataKey="operational" name="Operacional" stroke="hsl(var(--primary))" strokeWidth={2} />
        <Line type="monotone" dataKey="maintenance" name="Manutenção" stroke="hsl(var(--secondary))" strokeWidth={2} />
        <Line type="monotone" dataKey="critical" name="Crítico" stroke="hsl(var(--destructive))" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export default TimelineChart;
