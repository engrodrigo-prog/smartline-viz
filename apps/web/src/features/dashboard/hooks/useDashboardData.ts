import { useMemo } from "react";
import { useDatasetData } from "@/context/DatasetContext";
import type { DashboardSensor } from "../types";

export type DashboardChartPoint = {
  region: string;
  value: number;
  target: number;
};

export type DashboardAlertSlice = {
  type: string;
  count: number;
};

export type DashboardTimelinePoint = {
  day: string;
  operational: number;
  maintenance: number;
  critical: number;
};

export type DashboardChartData = {
  performance: DashboardChartPoint[];
  alerts: DashboardAlertSlice[];
  timeline: DashboardTimelinePoint[];
};

const EMPTY_DATA: DashboardChartData = {
  performance: [],
  alerts: [],
  timeline: [],
};

export const useDashboardData = () => {
  const { sensors, assets, chartData } = useDatasetData((data) => ({
    sensors: data.mockSensors,
    assets: data.mockAssets,
    chartData: data.mockChartData,
  }));

  // TODO Supabase: trocar mocks por LiPowerline (line_asset/tower_asset/span_analysis) assim que o hook estiver pronto.

  const sensorsWithDate = useMemo<DashboardSensor[]>(
    () =>
      sensors.map((sensor) => ({
        ...sensor,
        lastUpdate: sensor.lastUpdate ? new Date(sensor.lastUpdate) : undefined,
      })),
    [sensors],
  );

  const metrics = useMemo(() => {
    const operationalAssets = assets.filter((asset) => asset.status === "operational").length;
    const criticalAlerts = sensors.filter((sensor) => sensor.status === "critical").length;
    const avgHealthScore = assets.length
      ? Math.round(assets.reduce((acc, asset) => acc + asset.healthScore, 0) / assets.length)
      : 0;

    return {
      operationalAssets,
      criticalAlerts,
      avgHealthScore,
      totalSensors: sensors.length,
    };
  }, [assets, sensors]);

  const normalizedChartData = useMemo<DashboardChartData>(
    () => ({
      performance: chartData?.performance ?? EMPTY_DATA.performance,
      alerts: chartData?.alerts ?? EMPTY_DATA.alerts,
      timeline: chartData?.timeline ?? EMPTY_DATA.timeline,
    }),
    [chartData],
  );

  return {
    sensors,
    sensorsWithDate,
    metrics,
    chartData: normalizedChartData,
  };
};
