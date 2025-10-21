import { useMemo, useState } from "react";
import { MapPin, Layers, Ruler, RefreshCw, Filter } from "lucide-react";
import ModuleLayout from "@/components/ModuleLayout";
import ModuleDemoBanner from "@/components/ModuleDemoBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePointcloudIndex, usePointcloudPlan, usePointcloudProfile, useProfilePointcloud } from "@/hooks/usePointclouds";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";

type ProfilePoint = {
  s_m: number;
  z_m: number;
  cls: number;
  x: number;
  y: number;
};

const classPalette: Record<number, { name: string; color: string }> = {
  1: { name: "Unclassified", color: "#9ca3af" },
  2: { name: "Ground", color: "#f97316" },
  3: { name: "Low Vegetation", color: "#84cc16" },
  4: { name: "Medium Vegetation", color: "#22c55e" },
  5: { name: "High Vegetation", color: "#166534" },
  6: { name: "Building", color: "#1d4ed8" },
  9: { name: "Water", color: "#0ea5e9" },
  17: { name: "Bridge", color: "#f43f5e" }
};

const PerfilLinha = () => {
  const [pointcloudId, setPointcloudId] = useState("");
  const [buffer, setBuffer] = useState(25);
  const [step, setStep] = useState(0.5);
  const [classesSelecionadas, setClassesSelecionadas] = useState<number[]>([2, 3, 4, 5]);

  const indexQuery = usePointcloudIndex(pointcloudId || undefined);
  const planQuery = usePointcloudPlan(pointcloudId || undefined);
  const profileQuery = usePointcloudProfile(pointcloudId || undefined);
  const profileMutation = useProfilePointcloud();

  const handleGerarPerfil = async () => {
    if (!pointcloudId) {
      toast.error("Informe o ID da nuvem.");
      return;
    }
    if (!indexQuery.data?.bbox_wgs84) {
      toast.error("É necessário possuir um index com bbox para gerar o perfil.");
      return;
    }
    const [[lon1, lat1], [lon2, lat2]] = [
      [indexQuery.data.bbox_wgs84.min[1], indexQuery.data.bbox_wgs84.min[0]],
      [indexQuery.data.bbox_wgs84.max[1], indexQuery.data.bbox_wgs84.max[0]]
    ];
    try {
      await profileMutation.mutateAsync({
        id: pointcloudId,
        line: {
          type: "Feature",
          geometry: { type: "LineString", coordinates: [[lon1, lat1], [lon2, lat2]] },
          properties: {}
        },
        buffer_m: buffer,
        step_m: step,
        classes: classesSelecionadas
      });
      toast.success("Job de perfil acionado. Recarregue em alguns instantes.");
    } catch (error: any) {
      toast.error(error?.message ?? "Falha ao acionar job de perfil.");
    }
  };

  const profileSeries = useMemo(() => {
    if (!profileQuery.data?.series) return [];
    return profileQuery.data.series as ProfilePoint[];
  }, [profileQuery.data]);

  const classOptions = useMemo(() => {
    if (!indexQuery.data?.classes) return [];
    return Object.keys(indexQuery.data.classes).map((key) => Number(key));
  }, [indexQuery.data]);

  return (
    <ModuleLayout title="Perfil da Linha" icon={Layers}>
      <div className="p-6 space-y-6">
        <ModuleDemoBanner />
        <Card className="border border-border/70">
          <CardHeader>
            <CardTitle>Parâmetros de análise</CardTitle>
            <CardDescription>
              Informe o ID de uma nuvem já carregada para visualizar planta, perfil longitudinal e classes LAS.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label>Pointcloud ID</Label>
              <Input value={pointcloudId} onChange={(event) => setPointcloudId(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Buffer (m)</Label>
              <Input type="number" value={buffer} onChange={(event) => setBuffer(Number(event.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Step (m)</Label>
              <Input type="number" value={step} onChange={(event) => setStep(Number(event.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Classes visíveis</Label>
              <div className="flex flex-wrap gap-1">
                {classOptions.map((cls) => (
                  <Badge
                    key={cls}
                    variant={classesSelecionadas.includes(cls) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() =>
                      setClassesSelecionadas((prev) =>
                        prev.includes(cls) ? prev.filter((item) => item !== cls) : [...prev, cls]
                      )
                    }
                  >
                    {cls}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-end justify-end gap-2">
              <Button variant="outline" onClick={() => indexQuery.refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar index
              </Button>
              <Button onClick={handleGerarPerfil} disabled={profileMutation.isPending}>
                <Ruler className="w-4 h-4 mr-2" />
                Gerar perfil
              </Button>
            </div>
          </CardContent>
        </Card>

        {indexQuery.data ? (
          <Card className="border border-border/70">
            <CardHeader>
              <CardTitle>Resumo da Nuvem</CardTitle>
              <CardDescription>
                {indexQuery.data.pointsTotal.toLocaleString("pt-BR")} pontos · Coordenadas:{" "}
                {indexQuery.data.coordinate_system ?? "N/A"}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-border/60 p-3">
                <div className="text-xs text-muted-foreground uppercase">BBox</div>
                <pre className="font-mono text-xs mt-2">
                  {JSON.stringify(indexQuery.data.bbox_native, null, 2)}
                </pre>
              </div>
              <div className="rounded-lg border border-border/60 p-3 md:col-span-2">
                <div className="text-xs text-muted-foreground uppercase mb-2">Classes</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(indexQuery.data.classes).map(([cls, total]) => (
                    <Badge key={cls} variant="outline">
                      {cls}: {total}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-dashed border-border/60">
            <CardHeader>
              <CardTitle>Index não disponível</CardTitle>
              <CardDescription>Informe um ID válido e execute a indexação para habilitar esta visão.</CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card className="border border-border/70">
          <CardHeader>
            <CardTitle>Perfil Longitudinal</CardTitle>
            <CardDescription>
              O worker gera pontos amostrados ao longo da linha. Abaixo exibimos a elevação por classe.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[360px]">
            {profileSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profileSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="s_m" label={{ value: "Distância (m)", position: "insideBottomRight", offset: -10 }} />
                  <YAxis
                    dataKey="z_m"
                    label={{ value: "Cota (m)", angle: -90, position: "insideLeft" }}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip formatter={(value: number, name) => [value.toFixed(2), name]} />
                  <Legend />
                  {Array.from(
                    profileSeries.reduce((map, item) => {
                      if (!map.has(item.cls)) map.set(item.cls, classPalette[item.cls]?.color ?? "#0ea5e9");
                      return map;
                    }, new Map<number, string>())
                  ).map(([cls, color]) => (
                    <Line
                      key={cls}
                      dataKey={(point: ProfilePoint) => (point.cls === cls ? point.z_m : null)}
                      name={classPalette[cls]?.name ?? `Classe ${cls}`}
                      stroke={color}
                      dot={false}
                      strokeWidth={1.5}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Gere o perfil para visualizar esta seção.
              </div>
            )}
          </CardContent>
        </Card>

        {planQuery.data ? (
          <Card className="border border-border/70">
            <CardHeader>
              <CardTitle>Planta amostrada (GeoJSON)</CardTitle>
              <CardDescription>
                O arquivo plan_points.geojson é amostrado com até 200 mil pontos para performance em mapas web.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 border border-border/60 rounded-lg p-3 bg-muted/40">
                <pre className="text-xs font-mono">
                  {JSON.stringify(planQuery.data.features.slice(0, 50), null, 2)}
                  {planQuery.data.features.length > 50 ? "\n... (amostra truncada)" : null}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </ModuleLayout>
  );
};

export default PerfilLinha;
