import { useMemo } from "react";
import { ClipboardCheck, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import ModuleLayout from "@/components/ModuleLayout";
import CardKPI from "@/components/CardKPI";
import { checklists, equipes } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const ChecklistOperacional = () => {
  const kpis = useMemo(() => {
    const total = checklists.length;
    const aprovados = checklists.filter(c => c.aprovado).length;
    const reprovados = total - aprovados;
    const taxaAprovacao = Math.round((aprovados / total) * 100);
    
    const totalItens = checklists.reduce((acc, c) => acc + c.itens.length, 0);
    const itensVerificados = checklists.reduce((acc, c) => 
      acc + c.itens.filter(i => i.verificado).length, 0
    );

    return { total, aprovados, reprovados, taxaAprovacao, itensVerificados, totalItens };
  }, []);

  const getTipoColor = (tipo: string) => {
    const colors: Record<string, string> = {
      'Pré-Operacional': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'Pós-Operacional': 'bg-green-500/10 text-green-500 border-green-500/20',
      'Inspeção Veículo': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      'EPIs': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    };
    return colors[tipo] || colors['Pré-Operacional'];
  };

  const getEquipeName = (equipeId: string) => {
    const equipe = equipes.find(e => e.id === equipeId);
    return equipe?.nome || 'Equipe não encontrada';
  };

  return (
    <ModuleLayout title="Checklist Operacional" icon={ClipboardCheck}>
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <CardKPI title="Total de Checklists" value={kpis.total} icon={ClipboardCheck} />
          <CardKPI title="Aprovados" value={kpis.aprovados} icon={CheckCircle2} />
          <CardKPI title="Reprovados" value={kpis.reprovados} icon={XCircle} className="text-destructive" />
          <CardKPI title="Taxa de Aprovação" value={`${kpis.taxaAprovacao}%`} icon={CheckCircle2} />
          <CardKPI 
            title="Itens Verificados" 
            value={`${kpis.itensVerificados}/${kpis.totalItens}`} 
            icon={AlertTriangle} 
          />
        </div>

        {/* Lista de Checklists */}
        <div className="space-y-4">
          {checklists.map((checklist) => {
            const totalItens = checklist.itens.length;
            const verificados = checklist.itens.filter(i => i.verificado).length;
            const progresso = (verificados / totalItens) * 100;

            return (
              <div key={checklist.id} className="tech-card p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{getEquipeName(checklist.equipe)}</h3>
                      <Badge className={getTipoColor(checklist.tipo)}>
                        {checklist.tipo}
                      </Badge>
                      {checklist.aprovado ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Aprovado
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Reprovado
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Data: {new Date(checklist.data).toLocaleDateString('pt-BR')} • 
                      Responsável: {checklist.responsavel}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{verificados}/{totalItens}</div>
                    <div className="text-xs text-muted-foreground">Itens</div>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <Progress value={progresso} className="mb-4" />

                {/* Lista de Itens */}
                <div className="space-y-2">
                  {checklist.itens.map((item, index) => (
                    <div 
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg ${
                        item.verificado 
                          ? 'bg-green-500/5 border border-green-500/20' 
                          : 'bg-red-500/5 border border-red-500/20'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {item.verificado ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{item.descricao}</div>
                        {item.observacao && (
                          <div className="text-sm text-muted-foreground mt-1">
                            <span className="font-medium">Obs:</span> {item.observacao}
                          </div>
                        )}
                        {item.foto && (
                          <div className="text-xs text-primary mt-1">📷 Foto anexada</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dashboard de Conformidade */}
        <div className="tech-card p-6">
          <h3 className="font-semibold mb-4">Análise de Conformidade</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-semibold">Aprovados</span>
              </div>
              <div className="text-3xl font-bold text-green-500">{kpis.aprovados}</div>
              <div className="text-sm text-muted-foreground">
                {kpis.taxaAprovacao}% do total
              </div>
            </div>

            <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="font-semibold">Reprovados</span>
              </div>
              <div className="text-3xl font-bold text-red-500">{kpis.reprovados}</div>
              <div className="text-sm text-muted-foreground">
                {100 - kpis.taxaAprovacao}% do total
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                <span className="font-semibold">Itens Verificados</span>
              </div>
              <div className="text-3xl font-bold text-primary">
                {Math.round((kpis.itensVerificados / kpis.totalItens) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">
                {kpis.itensVerificados} de {kpis.totalItens} itens
              </div>
            </div>
          </div>
        </div>

        {/* Tipos de Checklist */}
        <div className="tech-card p-6">
          <h3 className="font-semibold mb-3">Tipos de Checklist</h3>
          <div className="flex flex-wrap gap-3">
            {['Pré-Operacional', 'Pós-Operacional', 'Inspeção Veículo', 'EPIs'].map(tipo => {
              const count = checklists.filter(c => c.tipo === tipo).length;
              return (
                <Badge key={tipo} className={getTipoColor(tipo)}>
                  {tipo} ({count})
                </Badge>
              );
            })}
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
};

export default ChecklistOperacional;
