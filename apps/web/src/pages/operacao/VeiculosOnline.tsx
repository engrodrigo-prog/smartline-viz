import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Truck, MapPin, Clock, Activity } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VehicleMarker } from '@/components/vehicles/VehicleMarker';
import { VehicleLegend } from '@/components/vehicles/VehicleLegend';
import CardKPI from '@/components/CardKPI';
import { useDatasetData } from "@/context/DatasetContext";

const SENSOR_DB_ENABLED = import.meta.env.VITE_ENABLE_SENSOR_DB === 'true';

const SKILL_COLORS = {
  electrician: 'hsl(217, 91%, 60%)',
  technician: 'hsl(48, 96%, 53%)',
  leadership: 'hsl(142, 71%, 45%)',
  support: 'hsl(271, 91%, 65%)'
};

export default function VeiculosOnline() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [filters, setFilters] = useState({
    skill: 'all',
    status: 'active'
  });
  const demoVehicles = useDatasetData((data) => data.veiculos);

  const getFilteredDemoVehicles = useCallback(() => {
    return demoVehicles
      .map((vehicle) => {
        const status = mapStatus(vehicle.status);
        return {
          ...vehicle,
          status: status.code,
          statusLabel: status.label,
          skill_type: mapSkill(vehicle.tipo),
          region: vehicle.equipePrincipal ?? "N/D",
          line_code: vehicle.equipePrincipal ?? "Linha demo",
          latitude: vehicle.localizacaoAtual ? vehicle.localizacaoAtual[0] : undefined,
          longitude: vehicle.localizacaoAtual ? vehicle.localizacaoAtual[1] : undefined,
          plate: vehicle.placa,
          brand: vehicle.tipo,
          model: vehicle.modelo,
          speed_kmh: vehicle.kmRodados ? Math.round((vehicle.kmRodados % 80) + 10) : 0,
          fuel_level: 65,
          assigned_team: vehicle.equipePrincipal ? { name: vehicle.equipePrincipal } : undefined,
        };
      })
      .filter((vehicle) => {
        if (filters.status !== "all" && vehicle.status !== filters.status) {
          return false;
        }
        if (filters.skill !== "all" && vehicle.skill_type !== filters.skill) {
          return false;
        }
        return true;
      });
  }, [demoVehicles, filters]);

  const mapSkill = (tipo: string): string => {
    switch (tipo) {
      case "Caminhão Cesto":
        return "electrician";
      case "Caminhonete":
        return "technician";
      case "Van":
        return "support";
      default:
        return "leadership";
    }
  };

  const mapStatus = (status: string): { code: string; label: string } => {
    switch (status) {
      case "Em Uso":
        return { code: "active", label: "Em uso" };
      case "Disponível":
        return { code: "active", label: "Disponível" };
      case "Manutenção":
        return { code: "maintenance", label: "Manutenção" };
      case "Indisponível":
      default:
        return { code: "inactive", label: status };
    }
  };

  const fetchVehicles = useCallback(async () => {
    setLoading(true);

    if (!supabase || !SENSOR_DB_ENABLED) {
      setVehicles(getFilteredDemoVehicles());
      setLoading(false);
      return;
    }

    let query = supabase
      .from('vehicles')
      .select('*, assigned_team:teams(*)');

    if (filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    
    if (filters.skill !== 'all') {
      query = query.eq('skill_type', filters.skill);
    }

    const { data, error } = await query;
    
    if (!error && data) {
      setVehicles(data);
    } else {
      console.warn("[VeiculosOnline] Falha ao carregar tabela vehicles; usando fallback local.", error);
      setVehicles(getFilteredDemoVehicles());
    }
    
    setLoading(false);
  }, [filters, getFilteredDemoVehicles]);

  useEffect(() => {
    fetchVehicles();

    if (!supabase || !SENSOR_DB_ENABLED) return;
    const channel = supabase
      .channel('vehicles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
        fetchVehicles();
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (unsubscribeError) {
        console.warn("[VeiculosOnline] Falha ao remover canal do supabase.", unsubscribeError);
      }
    };
  }, [fetchVehicles]);

  const kpis = {
    total: vehicles.length,
    electricians: vehicles.filter(v => v.skill_type === 'electrician').length,
    technicians: vehicles.filter(v => v.skill_type === 'technician').length,
    leadership: vehicles.filter(v => v.skill_type === 'leadership').length,
    support: vehicles.filter(v => v.skill_type === 'support').length
  };

  return (
    <AppLayout title="Veículos On-Line" subtitle="Rastreamento em tempo real da frota">
      <div className="tech-card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Tipo de Equipe</label>
            <Select 
              value={filters.skill}
              onValueChange={(v) => setFilters({...filters, skill: v})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Equipes</SelectItem>
                <SelectItem value="electrician">⚡ Eletricistas</SelectItem>
                <SelectItem value="technician">🔧 Técnicos</SelectItem>
                <SelectItem value="leadership">👨‍💼 Liderança</SelectItem>
                <SelectItem value="support">🛠️ Suporte</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Status</label>
            <Select 
              value={filters.status}
              onValueChange={(v) => setFilters({...filters, status: v})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="maintenance">Em Manutenção</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <CardKPI 
          title="Veículos Ativos"
          value={kpis.total}
          icon={Truck}
        />
        
        <Card style={{ borderLeft: `4px solid ${SKILL_COLORS.electrician}` }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">⚡ Eletricistas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: SKILL_COLORS.electrician }}>
              {kpis.electricians}
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderLeft: `4px solid ${SKILL_COLORS.technician}` }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">🔧 Técnicos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: SKILL_COLORS.technician }}>
              {kpis.technicians}
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderLeft: `4px solid ${SKILL_COLORS.leadership}` }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">👨‍💼 Liderança</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: SKILL_COLORS.leadership }}>
              {kpis.leadership}
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderLeft: `4px solid ${SKILL_COLORS.support}` }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">🛠️ Suporte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: SKILL_COLORS.support }}>
              {kpis.support}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
        <TabsList>
          <TabsTrigger value="list">
            <Truck className="w-4 h-4 mr-2" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="map">
            <MapPin className="w-4 h-4 mr-2" />
            Mapa
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="w-4 h-4 mr-2" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="events">
            <Activity className="w-4 h-4 mr-2" />
            Comparação com Eventos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {loading ? (
            <div className="text-center py-12">Carregando veículos...</div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum veículo encontrado. Configure veículos para começar o rastreamento.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {vehicles.map(vehicle => (
                <Card 
                  key={vehicle.id} 
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedVehicle(vehicle)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{vehicle.plate}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {vehicle.brand} {vehicle.model}
                        </p>
                      </div>
                      <Badge 
                        style={{ 
                          backgroundColor: SKILL_COLORS[vehicle.skill_type as keyof typeof SKILL_COLORS] + '20',
                          color: SKILL_COLORS[vehicle.skill_type as keyof typeof SKILL_COLORS]
                        }}
                      >
                        {vehicle.skill_type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Velocidade:</span>
                        <span className="font-semibold">{vehicle.speed_kmh || 0} km/h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Combustível:</span>
                        <span className="font-semibold">{vehicle.fuel_level || 0}%</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={vehicle.status === 'active' ? 'default' : vehicle.status === 'maintenance' ? 'secondary' : 'outline'}>
                          {vehicle.statusLabel ?? vehicle.status}
                        </Badge>
                      </div>
                      {vehicle.assigned_team?.name && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Equipe:</span>
                          <span className="font-semibold">{vehicle.assigned_team.name}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="map">
          <div className="relative h-[600px] rounded-lg overflow-hidden border bg-muted">
            <VehicleLegend />
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Visualização de mapa em desenvolvimento</p>
                <p className="text-sm mt-2">Integração com MapboxUnified em breve</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Trajetos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Funcionalidade de histórico em desenvolvimento</p>
                <p className="text-sm mt-2">Replay de trajetos e análise de rotas</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Comparação com Eventos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Análise de proximidade com eventos em desenvolvimento</p>
                <p className="text-sm mt-2">Distância, ETA e correlação com sensores</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
