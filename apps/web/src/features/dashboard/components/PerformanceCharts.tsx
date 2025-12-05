import { TrendingUp, AlertTriangle } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { DashboardChartData } from "../hooks/useDashboardData";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--destructive))"];

type PerformanceChartsProps = {
  chartData: DashboardChartData;
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.5rem",
};

const PerformanceCharts = ({ chartData }: PerformanceChartsProps) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="tech-card p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        Performance por Região
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData.performance}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="region" stroke="hsl(var(--foreground))" />
          <YAxis stroke="hsl(var(--foreground))" />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Bar dataKey="value" name="Atual" fill="hsl(var(--primary))" />
          <Bar dataKey="target" name="Meta" fill="hsl(var(--secondary))" />
        </BarChart>
      </ResponsiveContainer>
    </div>

    <div className="tech-card p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-primary" />
        Distribuição de Alertas
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData.alerts}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => entry.type}
            outerRadius={80}
            fill="hsl(var(--primary))"
            dataKey="count"
          >
            {chartData.alerts.map((entry, index) => (
              <Cell key={`cell-${entry.type}-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default PerformanceCharts;
