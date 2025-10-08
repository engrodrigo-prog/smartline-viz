import { useState, useMemo } from "react";
import { Truck, CheckCircle2, AlertTriangle, Wrench, Package } from "lucide-react";
import ModuleLayout from "@/components/ModuleLayout";
import CardKPI from "@/components/CardKPI";
import { veiculos, equipes } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GestaoFrota = () => {
  const [selectedVeiculo, setSelectedVeiculo] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const filteredVeiculos = useMemo(() => {
    if (statusFilter === "todos") return veiculos;
    return veiculos.filter(v => v.status === statusFilter);
  }, [statusFilter]);

  const kpis = useMemo(() => {
    const total = veiculos.length;
    const disponiveis = veiculos.filter(v => v.status === 'Disponível').length;
    const emManutencao = veiculos.filter(v => v.status === 'Manutenção').length;
    const kmTotal = veiculos.reduce((acc, v) => acc + v.kmRodados, 0);
    const proximosRevisao = veiculos.filter(v => 
      v.proximaRevisao.km - v.kmRodados < 5000
    ).length;

    return { total, disponiveis, emManutencao, kmTotal, proximosRevisao };
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'Disponível': { variant: 'default', icon: CheckCircle2 },
      'Em Uso': { variant: 'secondary', icon: Truck },
      'Manutenção': { variant: 'destructive', icon: Wrench },
      'Indisponível': { variant: 'outline', icon: AlertTriangle },
    };
    const config = variants[status] || variants['Indisponível'];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getEquipeName = (veiculoId: string) => {
    const veiculo = veiculos.find(v => v.id === veiculoId);
    if (!veiculo?.equipePrincipal) return 'Não atribuída';
    const equipe = equipes.find(e => e.id === veiculo.equipePrincipal);
    return equipe?.nome || 'Não atribuída';
  };

  return (
    <ModuleLayout title="Gestão de Frota" icon={Truck}>
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <CardKPI title="Total de Veículos" value={kpis.total} icon={Truck} />
          <CardKPI title="Disponíveis" value={kpis.disponiveis} icon={CheckCircle2} />
          <CardKPI title="Em Manutenção" value={kpis.emManutencao} icon={Wrench} className="text-destructive" />
          <CardKPI title="KM Rodados (Total)" value={kpis.kmTotal.toLocaleString()} icon={Truck} />
          <CardKPI title="Próx. Revisão" value={kpis.proximosRevisao} icon={AlertTriangle} className="text-yellow-500" />
        </div>

        {/* Filtro */}
        <div className="tech-card p-6">
          <div className="max-w-xs">
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Disponível">Disponível</SelectItem>
                <SelectItem value="Em Uso">Em Uso</SelectItem>
                <SelectItem value="Manutenção">Manutenção</SelectItem>
                <SelectItem value="Indisponível">Indisponível</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid de Veículos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVeiculos.map((veiculo) => {
            const kmRestante = veiculo.proximaRevisao.km - veiculo.kmRodados;
            const percRevisao = ((veiculo.kmRodados / veiculo.proximaRevisao.km) * 100);
            
            return (
              <div
                key={veiculo.id}
                className="tech-card p-6 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedVeiculo(veiculo)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Truck className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{veiculo.placa}</h3>
                      <p className="text-sm text-muted-foreground">{veiculo.modelo}</p>
                    </div>
                  </div>
                  {getStatusBadge(veiculo.status)}
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="font-medium">{veiculo.tipo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">KM Rodados:</span>
                    <span className="font-medium">{veiculo.kmRodados.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Equipe:</span>
                    <span className="font-medium text-xs">{getEquipeName(veiculo.id)}</span>
                  </div>
                </div>

                {/* Barra de Progresso para Revisão */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Próxima revisão</span>
                    <span className={kmRestante < 5000 ? 'text-yellow-500 font-medium' : ''}>
                      {kmRestante.toLocaleString()} km
                    </span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        percRevisao > 90 ? 'bg-red-500' : 
                        percRevisao > 80 ? 'bg-yellow-500' : 
                        'bg-primary'
                      }`}
                      style={{ width: `${Math.min(percRevisao, 100)}%` }}
                    />
                  </div>
                </div>

                {veiculo.localizacaoAtual && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      Rastreamento ativo
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Drawer de Detalhes */}
        <Sheet open={!!selectedVeiculo} onOpenChange={() => setSelectedVeiculo(null)}>
          <SheetContent className="overflow-y-auto w-full sm:max-w-xl">
            {selectedVeiculo && (
              <>
                <SheetHeader>
                  <SheetTitle className="text-2xl">{selectedVeiculo.placa}</SheetTitle>
                  <SheetDescription>{selectedVeiculo.modelo}</SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Informações Básicas */}
                  <div className="tech-card p-4">
                    <h4 className="font-semibold mb-3">Informações do Veículo</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        {getStatusBadge(selectedVeiculo.status)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo:</span>
                        <span>{selectedVeiculo.tipo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">KM Rodados:</span>
                        <span className="font-medium">{selectedVeiculo.kmRodados.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Equipe Principal:</span>
                        <span>{getEquipeName(selectedVeiculo.id)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Próxima Revisão */}
                  <div className="tech-card p-4">
                    <h4 className="font-semibold mb-3">Próxima Revisão</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-primary/5 rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {selectedVeiculo.proximaRevisao.km.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">KM Revisão</div>
                      </div>
                      <div className="text-center p-3 bg-primary/5 rounded-lg">
                        <div className="text-lg font-bold text-primary">
                          {selectedVeiculo.proximaRevisao.data}
                        </div>
                        <div className="text-xs text-muted-foreground">Data Prevista</div>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <span className="text-sm text-muted-foreground">Faltam </span>
                      <span className="text-lg font-bold text-yellow-500">
                        {(selectedVeiculo.proximaRevisao.km - selectedVeiculo.kmRodados).toLocaleString()} km
                      </span>
                    </div>
                  </div>

                  {/* Equipamentos */}
                  <div className="tech-card p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Equipamentos Alocados
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedVeiculo.equipamentos.map((equip: string) => (
                        <Badge key={equip} variant="secondary">{equip}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Localização */}
                  {selectedVeiculo.localizacaoAtual && (
                    <div className="tech-card p-4">
                      <h4 className="font-semibold mb-3">Localização Atual</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span>
                          {selectedVeiculo.localizacaoAtual[0].toFixed(4)}, 
                          {selectedVeiculo.localizacaoAtual[1].toFixed(4)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Integração Frotolog ativa
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </ModuleLayout>
  );
};

export default GestaoFrota;
