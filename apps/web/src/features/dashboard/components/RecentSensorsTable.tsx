import type { DashboardSensor } from "../types";
import { Database } from "lucide-react";

type RecentSensorsTableProps = {
  sensors: DashboardSensor[];
};

const RecentSensorsTable = ({ sensors }: RecentSensorsTableProps) => (
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
          {sensors.map((sensor) => (
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
                {sensor.lastUpdate ? sensor.lastUpdate.toLocaleString("pt-BR") : "Sem registro"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default RecentSensorsTable;
