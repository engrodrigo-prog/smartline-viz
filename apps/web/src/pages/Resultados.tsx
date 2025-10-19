import { motion } from "framer-motion";
import { 
  TreeDeciduous, TowerControl, Users, Eye, Bird, Mountain, 
  Flame, Activity, Package, Construction, ClipboardCheck, 
  ShieldCheck, BrainCircuit
} from "lucide-react";
import escalada from "@/assets/Escalada.png";
import fiscalizacao from "@/assets/Fiscalização Atividades e Obras.png";
import gemeoDigital from "@/assets/Gemeo Digital AI.png";
import queimadas from "@/assets/acompanhamento queimadas.png";
import auditoria from "@/assets/auditoria.png";
import compliance from "@/assets/compliance normativo.png";
import furto from "@/assets/furto de peças.png";
import missoes from "@/assets/missoes autonomas.png";
import corrosao from "@/assets/preditivo corrosao.png";
import aves from "@/assets/reducao eventos aves.png";
import erosao from "@/assets/erosao.png";
import geodados from "@/assets/cadastro_geodados.png";

const Resultados = () => {
  const cases = [
    {
      id: 1,
      image: geodados,
      title: "Manejo de vegetação assertivo",
      description: "Redução de áreas críticas e intervenções mais precisas através de análise geoespacial e IA.",
      icon: TreeDeciduous,
    },
    {
      id: 2,
      image: escalada,
      title: "Redução da escalada de estruturas",
      description: "Diminuição de invasões e riscos de furto com monitoramento contínuo e alertas inteligentes.",
      icon: TowerControl,
    },
    {
      id: 4,
      image: missoes,
      title: "Aumento da frequência de inspeções",
      description: "Planejamento dinâmico de inspeções aéreas e terrestres com drones autônomos.",
      icon: Eye,
    },
    {
      id: 5,
      image: aves,
      title: "Redução de eventos causados por aves",
      description: "Correlação com sensores e câmeras para prevenir interrupções de serviço.",
      icon: Bird,
    },
    {
      id: 6,
      image: erosao,
      title: "Análise de erosão e ocupação de faixa",
      description: "Modelos de terreno e satélite integrados para monitoramento contínuo.",
      icon: Mountain,
    },
    {
      id: 7,
      image: queimadas,
      title: "Acompanhamento online de queimadas",
      description: "Alertas automáticos com dados do INPE e detecção em tempo real.",
      icon: Flame,
    },
    {
      id: 8,
      image: corrosao,
      title: "Estudo preditivo em corrosão",
      description: "Modelos com IA para prever degradação e planejar manutenções preventivas.",
      icon: Activity,
    },
    {
      id: 9,
      image: furto,
      title: "Análise estrutural e furto de peças",
      description: "Relatórios técnicos e mapas de ocorrência para ação rápida.",
      icon: Package,
    },
    {
      id: 10,
      image: fiscalizacao,
      title: "Fiscalização de atividades e obras",
      description: "Monitoramento de campo e conformidade com evidências georreferenciadas.",
      icon: Construction,
    },
    {
      id: 11,
      image: auditoria,
      title: "Auditorias de qualidade",
      description: "Relatórios e evidências vinculadas a ativos e linhas de transmissão.",
      icon: ClipboardCheck,
    },
    {
      id: 12,
      image: compliance,
      title: "Compliance normativo e regulatório",
      description: "100% de conformidade com NBR 5422 através de validação automática contínua.",
      icon: ShieldCheck,
    },
    {
      id: 13,
      image: gemeoDigital,
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
                className="relative group cursor-pointer overflow-hidden rounded-2xl"
              >
                <div className="relative">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  
                  {/* Gradient overlay para legibilidade */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                  
                  {/* Ícone flutuante */}
                  <div className="absolute top-4 right-4 z-10">
                    <div className="p-3 bg-[hsl(var(--smartline-orange))]/90 backdrop-blur-sm rounded-xl shadow-lg">
                      <item.icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                  
                  {/* Texto sobreposto */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                    <h3 className="text-xl font-bold mb-2 text-white group-hover:text-[hsl(var(--smartline-orange))] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-white/90 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
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
