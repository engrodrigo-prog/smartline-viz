import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, Shield, Zap, Database, Cloud, TrendingUp } from "lucide-react";
import logoSmartline from "@/assets/logo-smartline.png";
import bgHero from "@/assets/bg-hero.png";
import bannerIA from "@/assets/banner-ia.png";
import bannerMissoes from "@/assets/banner-missoes.png";
import bannerCompliance from "@/assets/banner-compliance.png";

const Landing = () => {
  const features = [
    {
      icon: Activity,
      title: "Monitoramento em Tempo Real",
      description: "Sensores IoT e câmeras integradas para vigilância 24/7 dos ativos elétricos",
      image: bannerIA,
    },
    {
      icon: Shield,
      title: "Compliance Automatizado",
      description: "Análise automática de conformidade ambiental e operacional",
      image: bannerCompliance,
    },
    {
      icon: Zap,
      title: "Missões com Drones",
      description: "Inspeções aéreas inteligentes com IA para detecção de anomalias",
      image: bannerMissoes,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 opacity-30"
          style={{ 
            backgroundImage: `url(${bgHero})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 hexagon-pattern opacity-20" />
        
        <div className="container relative z-10 px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-5xl mx-auto"
          >
            <img 
              src={logoSmartline} 
              alt="Smartline" 
              className="w-32 h-32 mx-auto mb-8 drop-shadow-[0_0_30px_rgba(0,166,122,0.3)]"
            />
            
            <h1 className="text-6xl md:text-7xl font-bold mb-6">
              <span className="gradient-text">AssetHealth</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-foreground/80 mb-4">
              Monitoramento Inteligente de Ativos Elétricos
            </p>
            
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-12">
              Plataforma corporativa para gestão técnica, ambiental e operacional de infraestrutura elétrica, 
              integrando IoT, IA e análise de compliance em tempo real.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/dashboard" className="btn-primary text-lg inline-block">
                Acessar Sistema
              </Link>
              <a
                href="https://form.jotform.com/251775321495058"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-lg inline-block"
              >
                Pesquisa de Acesso Smartline
              </a>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl mx-auto"
          >
            {[
              { icon: Database, label: "Ativos Monitorados", value: "15.000+" },
              { icon: Activity, label: "Sensores Ativos", value: "3.200+" },
              { icon: Cloud, label: "Dados Processados/dia", value: "2.5TB" },
              { icon: TrendingUp, label: "Uptime", value: "99.9%" },
            ].map((stat, index) => (
              <div key={index} className="tech-card p-6 text-center">
                <stat.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Tecnologia <span className="gradient-text">de Ponta</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Integração completa de sensores, IA e análise preditiva para máxima eficiência operacional
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="tech-card overflow-hidden group"
              >
                <div className="h-48 overflow-hidden relative">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                </div>
                <div className="p-6">
                  <feature.icon className="w-12 h-12 text-primary mb-4" />
                  <h3 className="text-2xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="tech-card p-12 text-center"
          >
            <h2 className="text-4xl font-bold mb-6">
              Pronto para <span className="gradient-text">Transformar</span> sua Operação?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Junte-se às empresas que já utilizam o Smartline AssetHealth para maximizar 
              a eficiência e segurança de seus ativos elétricos.
            </p>
            <Link to="/dashboard" className="btn-primary text-lg inline-block">
              Começar Agora
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© 2025 Smartline AssetHealth. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
