import { motion } from "framer-motion";
import { 
  TreeDeciduous, TowerControl, Users, Eye, Bird, Mountain, 
  Flame, Activity, Package, Construction, ClipboardCheck, 
  ShieldCheck, BrainCircuit
} from "lucide-react";
import bannerIA from "@/assets/banner-ia.png";
import bannerMissoes from "@/assets/banner-missoes.png";
import bannerCompliance from "@/assets/banner-compliance.png";

const Resultados = () => {
  const cases = [
    {
      id: 1,
      image: bannerMissoes,
      title: "Manejo de vegetação assertivo",
      description: "Redução de áreas críticas e intervenções mais precisas através de análise geoespacial e IA.",
      icon: TreeDeciduous,
    },
    {
      id: 2,
      image: bannerIA,
      title: "Redução da escalada de estruturas",
      description: "Diminuição de invasões e riscos de furto com monitoramento contínuo e alertas inteligentes.",
      icon: TowerControl,
    },
    {
      id: 3,
      image: bannerMissoes,
      title: "Despacho de equipes otimizado",
      description: "Logística mais eficiente via insights do sistema e roteamento inteligente.",
      icon: Users,
    },
    {
      id: 4,
      image: bannerIA,
      title: "Aumento da frequência de inspeções",
      description: "Planejamento dinâmico de inspeções aéreas e terrestres com drones autônomos.",
      icon: Eye,
    },
    {
      id: 5,
      image: bannerMissoes,
      title: "Redução de eventos causados por aves",
      description: "Correlação com sensores e câmeras para prevenir interrupções de serviço.",
      icon: Bird,
    },
    {
      id: 6,
      image: bannerIA,
      title: "Análise de erosão e ocupação de faixa",
      description: "Modelos de terreno e satélite integrados para monitoramento contínuo.",
      icon: Mountain,
    },
    {
      id: 7,
      image: bannerMissoes,
      title: "Acompanhamento online de queimadas",
      description: "Alertas automáticos com dados do INPE e detecção em tempo real.",
      icon: Flame,
    },
    {
      id: 8,
      image: bannerIA,
      title: "Estudo preditivo em corrosão",
      description: "Modelos com IA para prever degradação e planejar manutenções preventivas.",
      icon: Activity,
    },
    {
      id: 9,
      image: bannerMissoes,
      title: "Análise estrutural e furto de peças",
      description: "Relatórios técnicos e mapas de ocorrência para ação rápida.",
      icon: Package,
    },
    {
      id: 10,
      image: bannerIA,
      title: "Fiscalização de atividades e obras",
      description: "Monitoramento de campo e conformidade com evidências georreferenciadas.",
      icon: Construction,
    },
    {
      id: 11,
      image: bannerMissoes,
      title: "Auditorias de qualidade",
      description: "Relatórios e evidências vinculadas a ativos e linhas de transmissão.",
      icon: ClipboardCheck,
    },
    {
      id: 12,
      image: bannerCompliance,
      title: "Compliance normativo e regulatório",
      description: "100% de conformidade com NBR 5422 através de validação automática contínua.",
      icon: ShieldCheck,
    },
    {
      id: 13,
      image: bannerIA,
      title: "Criação de gêmeo digital e análise com IA",
      description: "Modelagem inteligente e predição operacional para manutenção preventiva.",
      icon: BrainCircuit,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-28 pb-20 px-6 lg:px-10">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Resultados & <span className="gradient-text">Casos de Sucesso</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Cases reais de implementação da plataforma Smartline AssetHealth
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cases.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="tech-card overflow-hidden group cursor-pointer"
              >
                <div className="h-48 overflow-hidden relative">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                  <div className="absolute top-4 right-4">
                    <div className="p-3 bg-[hsl(var(--smartline-orange))]/90 backdrop-blur-sm rounded-xl shadow-lg">
                      <item.icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-16 text-center"
          >
            <a
              href="/"
              className="btn-secondary text-lg inline-block"
            >
              Voltar para Home
            </a>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Resultados;
