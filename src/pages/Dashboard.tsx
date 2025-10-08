import { Activity, AlertTriangle, CheckCircle, Clock, Database, TrendingUp, Map, Network } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import CardKPI from "@/components/CardKPI";
import FiltersBar from "@/components/FiltersBar";
import { mockSensors, mockAssets, mockChartData } from "@/lib/mockData";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const Dashboard = () => {
  const operationalAssets = mockAssets.filter((a) => a.status === "operational").length;
  const criticalAlerts = mockSensors.filter((s) => s.status === "critical").length;
  const avgHealthScore = Math.round(
    mockAssets.reduce((acc, a) => acc + a.healthScore, 0) / mockAssets.length
  );

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--destructive))"];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard Principal" 
          subtitle="Visão geral do sistema AssetHealth" 
        />
        
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Filters */}
          <FiltersBar />

          {/* Quick Access Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link to="/visual/mapa" className="tech-card p-6 hover:scale-[1.02] transition-transform">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-2xl">
                  <Map className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">🗺️ Mapa de Eventos</h3>
                  <p className="text-sm text-muted-foreground">Visualização geográfica de ativos e eventos</p>
                </div>
              </div>
            </Link>

            <Link to="/visual/unifilar" className="tech-card p-6 hover:scale-[1.02] transition-transform">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-secondary/10 rounded-2xl">
                  <Network className="w-8 h-8 text-secondary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">📈 Diagrama Unifilar</h3>
                  <p className="text-sm text-muted-foreground">Topologia interativa da linha de transmissão</p>
                </div>
              </div>
            </Link>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <CardKPI
              title="Ativos Operacionais"
              value={operationalAssets}
              icon={CheckCircle}
              trend={{ value: 5.2, isPositive: true }}
            />
            <CardKPI
              title="Alertas Críticos"
              value={criticalAlerts}
              icon={AlertTriangle}
              trend={{ value: 12.3, isPositive: false }}
            />
            <CardKPI
              title="Health Score Médio"
              value={`${avgHealthScore}%`}
              icon={Activity}
              trend={{ value: 3.1, isPositive: true }}
            />
            <CardKPI
              title="Sensores Ativos"
              value={mockSensors.length}
              icon={Database}
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance por Região */}
            <div className="tech-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Performance por Região
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockChartData.performance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="region" stroke="hsl(var(--foreground))" />
                  <YAxis stroke="hsl(var(--foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem"
                    }}
                  />
                  <Legend />
                  <Bar dataKey="value" name="Atual" fill="hsl(var(--primary))" />
                  <Bar dataKey="target" name="Meta" fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Distribuição de Alertas */}
            <div className="tech-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary" />
                Distribuição de Alertas
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={mockChartData.alerts}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.type}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="count"
                  >
                    {mockChartData.alerts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Timeline Chart */}
          <div className="tech-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Histórico de Status (Últimos 30 dias)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockChartData.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem"
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="operational" 
                  name="Operacional"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="maintenance" 
                  name="Manutenção"
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="critical" 
                  name="Crítico"
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Sensors */}
          <div className="tech-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Sensores Recentes
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">ID</th>
                    <th className="pb-3 font-medium">Nome</th>
                    <th className="pb-3 font-medium">Tipo</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Última Atualização</th>
                  </tr>
                </thead>
                <tbody>
                  {mockSensors.map((sensor) => (
                    <tr key={sensor.id} className="border-b border-border/50 last:border-0">
                      <td className="py-3 font-mono text-sm">{sensor.id}</td>
                      <td className="py-3">{sensor.name}</td>
                      <td className="py-3 text-sm text-muted-foreground">{sensor.type}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            sensor.status === "normal"
                              ? "bg-primary/20 text-primary"
                              : sensor.status === "warning"
                              ? "bg-secondary/20 text-secondary"
                              : "bg-destructive/20 text-destructive"
                          }`}
                        >
                          {sensor.status}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-muted-foreground">
                        {sensor.lastUpdate.toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
