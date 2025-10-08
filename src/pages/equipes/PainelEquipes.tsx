import { useState, useMemo } from "react";
import { Users, UserCheck, UserX, Clock, Award } from "lucide-react";
import ModuleLayout from "@/components/ModuleLayout";
import CardKPI from "@/components/CardKPI";
import { membrosEquipe, equipes } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

const PainelEquipes = () => {
  const [selectedMembro, setSelectedMembro] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [cargoFilter, setCargoFilter] = useState<string>("todos");

  const filteredMembros = useMemo(() => {
    return membrosEquipe.filter(membro => {
      const matchSearch = membro.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         membro.cargo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "todos" || membro.status === statusFilter;
      const matchCargo = cargoFilter === "todos" || membro.cargo === cargoFilter;
      return matchSearch && matchStatus && matchCargo;
    });
  }, [searchTerm, statusFilter, cargoFilter]);

  const kpis = useMemo(() => {
    const totalAtivos = membrosEquipe.filter(m => m.status !== 'Indisponível' && m.status !== 'Férias').length;
    const emCampo = membrosEquipe.filter(m => m.status === 'Em Campo').length;
    const certVencendo = membrosEquipe.reduce((acc, m) => 
      acc + m.certificacoes.filter(c => c.status === 'Próximo ao Vencimento').length, 0
    );
    const mediaHoras = Math.round(
      membrosEquipe.reduce((acc, m) => acc + m.horasTrabalhadas.semana, 0) / membrosEquipe.length
    );
    const disponibilidade = Math.round((totalAtivos / membrosEquipe.length) * 100);

    return { totalAtivos, emCampo, certVencendo, mediaHoras, disponibilidade };
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'Disponível': 'default',
      'Em Campo': 'secondary',
      'Indisponível': 'destructive',
      'Férias': 'outline',
    };
    return <Badge variant={variants[status] as any}>{status}</Badge>;
  };

  const getCertificacaoColor = (status: string) => {
    if (status === 'Válida') return 'text-green-500';
    if (status === 'Próximo ao Vencimento') return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <ModuleLayout title="Painel de Equipes" icon={Users}>
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <CardKPI title="Membros Ativos" value={kpis.totalAtivos} icon={Users} />
          <CardKPI title="Em Campo" value={kpis.emCampo} icon={UserCheck} />
          <CardKPI title="Cert. Vencendo" value={kpis.certVencendo} icon={Award} className="text-yellow-500" />
          <CardKPI title="Horas/Semana (Média)" value={kpis.mediaHoras} icon={Clock} />
          <CardKPI title="Disponibilidade" value={`${kpis.disponibilidade}%`} icon={UserCheck} />
        </div>

        {/* Filtros */}
        <div className="tech-card p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <Input
                placeholder="Nome ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Disponível">Disponível</SelectItem>
                  <SelectItem value="Em Campo">Em Campo</SelectItem>
                  <SelectItem value="Indisponível">Indisponível</SelectItem>
                  <SelectItem value="Férias">Férias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Cargo</label>
              <Select value={cargoFilter} onValueChange={setCargoFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Engenheiro">Engenheiro</SelectItem>
                  <SelectItem value="Técnico">Técnico</SelectItem>
                  <SelectItem value="Eletricista">Eletricista</SelectItem>
                  <SelectItem value="Piloto Drone">Piloto Drone</SelectItem>
                  <SelectItem value="Supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Grid de Membros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembros.map((membro) => (
            <div
              key={membro.id}
              className="tech-card p-6 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedMembro(membro)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{membro.nome}</h3>
                    <p className="text-sm text-muted-foreground">{membro.cargo}</p>
                  </div>
                </div>
                {getStatusBadge(membro.status)}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Especialidades:</span>
                  <span className="font-medium">{membro.especialidades.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Horas (semana):</span>
                  <span className="font-medium">{membro.horasTrabalhadas.semana}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Certificações:</span>
                  <span className="font-medium">
                    {membro.certificacoes.filter(c => c.status === 'Válida').length}/
                    {membro.certificacoes.length}
                  </span>
                </div>
              </div>

              {membro.localizacaoAtual && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Localização em tempo real
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Drawer de Detalhes */}
        <Sheet open={!!selectedMembro} onOpenChange={() => setSelectedMembro(null)}>
          <SheetContent className="overflow-y-auto w-full sm:max-w-xl">
            {selectedMembro && (
              <>
                <SheetHeader>
                  <SheetTitle className="text-2xl">{selectedMembro.nome}</SheetTitle>
                  <SheetDescription>{selectedMembro.cargo}</SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Status e Contato */}
                  <div className="tech-card p-4">
                    <h4 className="font-semibold mb-3">Informações de Contato</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        {getStatusBadge(selectedMembro.status)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Telefone:</span>
                        <span>{selectedMembro.telefone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="text-xs">{selectedMembro.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Especialidades */}
                  <div className="tech-card p-4">
                    <h4 className="font-semibold mb-3">Especialidades</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedMembro.especialidades.map((esp: string) => (
                        <Badge key={esp} variant="secondary">{esp}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Certificações */}
                  <div className="tech-card p-4">
                    <h4 className="font-semibold mb-3">Certificações</h4>
                    <div className="space-y-3">
                      {selectedMembro.certificacoes.map((cert: any, index: number) => (
                        <div key={index} className="p-3 bg-muted/20 rounded-lg">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium">{cert.nome}</span>
                            <Badge 
                              variant={cert.status === 'Válida' ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {cert.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Validade: {cert.validade}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Horas Trabalhadas */}
                  <div className="tech-card p-4">
                    <h4 className="font-semibold mb-3">Horas Trabalhadas</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-primary/5 rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {selectedMembro.horasTrabalhadas.semana}h
                        </div>
                        <div className="text-xs text-muted-foreground">Esta Semana</div>
                      </div>
                      <div className="text-center p-3 bg-primary/5 rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {selectedMembro.horasTrabalhadas.mes}h
                        </div>
                        <div className="text-xs text-muted-foreground">Este Mês</div>
                      </div>
                    </div>
                  </div>

                  {/* Localização */}
                  {selectedMembro.localizacaoAtual && (
                    <div className="tech-card p-4">
                      <h4 className="font-semibold mb-3">Localização Atual</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span>
                          {selectedMembro.localizacaoAtual[0].toFixed(4)}, 
                          {selectedMembro.localizacaoAtual[1].toFixed(4)}
                        </span>
                      </div>
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

export default PainelEquipes;
