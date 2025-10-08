import { motion } from "framer-motion";
import { CheckCircle2, TrendingUp, Shield, Zap } from "lucide-react";
import bannerIA from "@/assets/banner-ia.png";
import bannerMissoes from "@/assets/banner-missoes.png";
import bannerCompliance from "@/assets/banner-compliance.png";

const Resultados = () => {
  const cases = [
    {
      id: 1,
      image: bannerIA,
      title: "Monitoramento com IA",
      description: "Redução de 85% em interrupções não programadas através de análise preditiva em tempo real.",
      icon: Zap,
    },
    {
      id: 2,
      image: bannerMissoes,
      title: "Inspeções com Drones",
      description: "Inspeções 80% mais rápidas e seguras, eliminando riscos de escalada manual.",
      icon: TrendingUp,
    },
    {
      id: 3,
      image: bannerCompliance,
      title: "Compliance Automatizado",
      description: "100% de conformidade com NBR 5422 através de validação automática contínua.",
      icon: Shield,
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {cases.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="tech-card overflow-hidden group"
              >
                <div className="h-56 overflow-hidden relative">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                  <div className="absolute bottom-4 right-4">
                    <div className="p-3 bg-primary/20 backdrop-blur-sm rounded-xl border border-primary/30">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                  </div>
                  <p className="text-muted-foreground">{item.description}</p>
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
