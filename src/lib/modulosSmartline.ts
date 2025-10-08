import { Droplets, Trees, Mountain, Link2, GitBranch, Users, Plane, BrainCircuit } from "lucide-react";

export const modulosSmartline = [
  {
    modulo: "Áreas Alagadas",
    icon: Droplets,
    categoria: "Ambiental",
    desafio: {
      titulo: "Enchentes comprometem estruturas",
      descricao: "Áreas alagadas causam corrosão acelerada, colapso de torres e desligamentos emergenciais, com custos de reparo elevados.",
      impacto: "Prejuízo médio de R$ 500k por evento + multas regulatórias",
    },
    solucao: {
      titulo: "Monitoramento proativo de áreas de risco",
      descricao: "Análise geoespacial com imagens de satélite e dados históricos identifica zonas críticas. Proteção de pássaros e sensores de umidade previnem falhas.",
      beneficio: "Redução de 70% em desligamentos por enchentes + manutenção preditiva",
    },
    path: "/ambiental/alagadas",
  },
  {
    modulo: "Vegetação",
    icon: Trees,
    categoria: "Ambiental",
    desafio: {
      titulo: "Crescimento vegetal causa desligamentos",
      descricao: "Árvores e vegetação não controladas próximas aos cabos geram arcos elétricos, interrupções e riscos de incêndio.",
      impacto: "40% das interrupções não programadas são causadas por vegetação",
    },
    solucao: {
      titulo: "Mapas preditivos de risco de vegetação",
      descricao: "IA analisa nuvens de pontos LIDAR e ortomosaicos para identificar vegetação crítica. Cronograma otimizado de poda baseado em crescimento previsto.",
      beneficio: "Economia de 35% em custos de poda + priorização inteligente",
    },
    path: "/ambiental/vegetacao",
  },
  {
    modulo: "Ocupação de Faixa",
    icon: Mountain,
    categoria: "Ambiental",
    desafio: {
      titulo: "Invasões comprometem segurança",
      descricao: "Construções irregulares na faixa de servidão criam riscos de acidentes, dificultam manutenções e geram processos jurídicos.",
      impacto: "Processos judiciais longos e custosos + riscos à população",
    },
    solucao: {
      titulo: "Gestão automatizada de ocupações",
      descricao: "Detecção de invasões via satélite e drones. Timeline completa de processos, notificações automatizadas e documentação legal integrada.",
      beneficio: "Tempo médio de resolução reduzido em 50% + documentação completa",
    },
    path: "/ambiental/ocupacao",
  },
  {
    modulo: "Emendas e Conexões",
    icon: Link2,
    categoria: "Estrutura",
    desafio: {
      titulo: "Aquecimento de emendas causa falhas",
      descricao: "Emendas mal executadas ou degradadas geram aquecimento, podendo romper cabos e causar desligamentos graves.",
      impacto: "Rompimento de cabo: R$ 2M+ por evento + risco de blackout",
    },
    solucao: {
      titulo: "Monitoramento térmico contínuo",
      descricao: "Câmeras termográficas em drones e sensores IoT detectam aquecimento anormal. Alertas em tempo real priorizam manutenção preventiva.",
      beneficio: "Prevenção de 95% das falhas críticas + economia de milhões",
    },
    path: "/estrutura/emendas",
  },
  {
    modulo: "Travessias",
    icon: GitBranch,
    categoria: "Estrutura",
    desafio: {
      titulo: "Cruzamentos com rodovias e ferrovias são críticos",
      descricao: "Distâncias inadequadas em travessias geram não conformidade com NBR 5422 e riscos operacionais graves.",
      impacto: "Multas regulatórias + interdição por órgãos fiscalizadores",
    },
    solucao: {
      titulo: "Validação automática de conformidade",
      descricao: "Medição precisa de distâncias via LIDAR. Verificação automática de normas técnicas com relatórios para ANEEL.",
      beneficio: "100% de conformidade comprovada + relatórios automáticos",
    },
    path: "/estrutura/travessias",
  },
  {
    modulo: "Missões de Drones",
    icon: Plane,
    categoria: "Operações",
    desafio: {
      titulo: "Inspeções manuais são perigosas e caras",
      descricao: "Escalada em torres expõe equipes a riscos de queda e demora semanas para inspecionar grandes extensões.",
      impacto: "Acidentes de trabalho + custos elevados de R$ 15k por km inspecionado",
    },
    solucao: {
      titulo: "Inspeções autônomas e seguras",
      descricao: "Drones autônomos com IA detectam anomalias em tempo real. Biblioteca de missões reutilizáveis e gêmeos digitais para planejamento.",
      beneficio: "Custo 80% menor + zero acidentes + inspeções 10x mais rápidas",
    },
    path: "/operacao/missoes",
  },
  {
    modulo: "Gestão de Equipes",
    icon: Users,
    categoria: "Operações",
    desafio: {
      titulo: "Coordenação de equipes dispersas é complexa",
      descricao: "Equipes em campo sem rastreamento em tempo real dificultam logística, geram desperdício de tempo e aumentam custos operacionais.",
      impacto: "30% de tempo perdido em deslocamentos + coordenação ineficiente",
    },
    solucao: {
      titulo: "Rastreamento em tempo real e escalas inteligentes",
      descricao: "Integração com Frotolog e rastreamento de equipes. Escalas otimizadas, checklists digitais e gestão de certificações centralizada.",
      beneficio: "Aumento de 40% na produtividade + redução de custos logísticos",
    },
    path: "/equipes/painel",
  },
  {
    modulo: "Gêmeo Digital & IA",
    icon: BrainCircuit,
    categoria: "Análises Avançadas",
    desafio: {
      titulo: "Falta de visão preditiva gera manutenções reativas",
      descricao: "Sem análise preditiva, manutenções são sempre emergenciais, aumentando custos e tempo de indisponibilidade.",
      impacto: "Custos de manutenção 3x maiores + indisponibilidade não planejada",
    },
    solucao: {
      titulo: "Análise preditiva com gêmeos digitais 3D",
      descricao: "Modelos digitais 3D com nuvens de pontos LIDAR. IA detecta padrões de falha e prevê degradação de ativos.",
      beneficio: "Manutenção preditiva reduz custos em 60% + uptime de 99.9%",
    },
    path: "/analises/gemeo-digital",
  },
];
