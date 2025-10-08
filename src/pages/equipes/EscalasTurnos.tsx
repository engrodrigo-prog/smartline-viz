import { useMemo } from "react";
import { Clock, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import ModuleLayout from "@/components/ModuleLayout";
import CardKPI from "@/components/CardKPI";
import { escalas, equipes } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const EscalasTurnos = () => {
  const kpis = useMemo(() => {
    const total = escalas.length;
    const ativas = escalas.filter(e => {
      const now = new Date();
      const inicio = new Date(e.dataInicio);
      const fim = new Date(e.dataFim);
      return now >= inicio && now <= fim;
    }).length;
    
    const totalAtividades = escalas.reduce((acc, e) => acc + e.atividades.length, 0);
    const concluidas = escalas.reduce((acc, e) => 
      acc + e.atividades.filter(a => a.status === 'Concluída').length, 0
    );
    const taxaConclusao = Math.round((concluidas / totalAtividades) * 100);

    return { total, ativas, concluidas, totalAtividades, taxaConclusao };
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'Concluída': { variant: 'default', icon: CheckCircle2 },
      'Em Andamento': { variant: 'secondary', icon: Clock },
      'Pendente': { variant: 'outline', icon: AlertCircle },
    };
    const config = variants[status] || variants['Pendente'];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getTurnoColor = (turno: string) => {
    const colors: Record<string, string> = {
      'Diurno': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      'Noturno': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      '24h': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      'Plantão': 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return colors[turno] || colors['Diurno'];
  };

  const getEquipeName = (equipeId: string) => {
    const equipe = equipes.find(e => e.id === equipeId);
    return equipe?.nome || 'Equipe não encontrada';
  };

  return (
    <ModuleLayout title="Escalas e Turnos" icon={Clock}>
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <CardKPI title="Total de Escalas" value={kpis.total} icon={Calendar} />
          <CardKPI title="Escalas Ativas" value={kpis.ativas} icon={Clock} />
          <CardKPI title="Atividades Concluídas" value={kpis.concluidas} icon={CheckCircle2} />
          <CardKPI title="Total de Atividades" value={kpis.totalAtividades} icon={AlertCircle} />
          <CardKPI title="Taxa de Conclusão" value={`${kpis.taxaConclusao}%`} icon={CheckCircle2} />
        </div>

        {/* Lista de Escalas */}
        <div className="space-y-4">
          {escalas.map((escala) => {
            const totalAtividades = escala.atividades.length;
            const concluidas = escala.atividades.filter(a => a.status === 'Concluída').length;
            const progresso = (concluidas / totalAtividades) * 100;

            return (
              <div key={escala.id} className="tech-card p-6">
                {/* Header da Escala */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{getEquipeName(escala.equipe)}</h3>
                      <Badge className={getTurnoColor(escala.turno)}>
                        {escala.turno}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(escala.dataInicio).toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span>até</span>
                      <span>
                        {new Date(escala.dataFim).toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{Math.round(progresso)}%</div>
                    <div className="text-xs text-muted-foreground">Concluído</div>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <Progress value={progresso} className="mb-4" />

                {/* Timeline de Atividades */}
                <div className="space-y-3">
                  {escala.atividades.map((atividade, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-4 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-shrink-0 w-16 text-sm font-medium text-primary">
                        {atividade.hora}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{atividade.atividade}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(atividade.status)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Observações */}
                {escala.observacoes && (
                  <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="text-xs font-semibold text-primary mb-1">OBSERVAÇÕES</div>
                    <div className="text-sm">{escala.observacoes}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legenda de Status */}
        <div className="tech-card p-6">
          <h3 className="font-semibold mb-3">Legenda de Status</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              {getStatusBadge('Concluída')}
              <span className="text-sm text-muted-foreground">Atividade finalizada</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge('Em Andamento')}
              <span className="text-sm text-muted-foreground">Em execução</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge('Pendente')}
              <span className="text-sm text-muted-foreground">Aguardando início</span>
            </div>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
};

export default EscalasTurnos;
