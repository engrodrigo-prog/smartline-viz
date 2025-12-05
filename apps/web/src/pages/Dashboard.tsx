import { Map, Network, MapPin } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import FilterPanel from "@/components/FilterPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UnifiedMapView from "@/features/map/UnifiedMapView";
import QuickAccessGrid, { type QuickAccessItem } from "@/features/dashboard/components/QuickAccessGrid";
import KpiGrid from "@/features/dashboard/components/KpiGrid";
import PerformanceCharts from "@/features/dashboard/components/PerformanceCharts";
import TimelineChart from "@/features/dashboard/components/TimelineChart";
import RecentSensorsTable from "@/features/dashboard/components/RecentSensorsTable";
import { useDashboardData } from "@/features/dashboard/hooks/useDashboardData";

const Dashboard = () => {
  const { chartData, metrics, sensorsWithDate } = useDashboardData();

  // TODO Supabase: substituir quick links por destinos condicionais assim que o dataset LiPowerline estiver conectado.

  const quickLinks: QuickAccessItem[] = [
    {
      id: "mapa-eventos",
      title: "Mapa de Eventos",
      description: "Visualização geográfica de ativos",
      to: "/visual/mapa",
      Icon: Map,
      iconWrapperClass: "bg-primary/10",
      iconClass: "text-primary",
    },
    {
      id: "unifilar",
      title: "Diagrama Unifilar",
      description: "Topologia da linha",
      to: "/visual/unifilar",
      Icon: Network,
      iconWrapperClass: "bg-secondary/10",
      iconClass: "text-secondary",
    },
    {
      id: "rastreamento",
      title: "Rastreamento",
      description: "Equipes em campo",
      to: "/equipes/rastreamento",
      Icon: MapPin,
      iconWrapperClass: "bg-blue-500/10",
      iconClass: "text-blue-500",
    },
  ];

  return (
    <AppLayout title="Dashboard Principal" subtitle="Visão geral do sistema AssetHealth">
      <div className="space-y-6">
        {/* Filters */}
        <FilterPanel />

        {/* Tabs: Dashboard e Mapa */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="mapa">Mapa</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <QuickAccessGrid links={quickLinks} />
            <KpiGrid metrics={metrics} />
            <PerformanceCharts chartData={chartData} />
            <TimelineChart data={chartData.timeline} />
            <RecentSensorsTable sensors={sensorsWithDate} />
          </TabsContent>

          {/* Aba Mapa */}
          <TabsContent value="mapa" className="h-[calc(100vh-250px)]">
            <UnifiedMapView />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
