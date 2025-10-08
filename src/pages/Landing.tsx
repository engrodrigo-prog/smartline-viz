import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import LandingHeader from "@/components/LandingHeader";
import {
  Activity,
  Shield,
  Zap,
  Database,
  Cloud,
  TrendingUp,
  AlertTriangle,
  TreePine,
  FileWarning,
  ClipboardCheck,
  Users,
  MapPin,
  Brain,
  Map,
  FileCheck,
  BarChart3,
  Home,
  Plane,
  Box,
  Clock,
  ShieldCheck,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
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
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url(${bgHero})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
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

            <p className="text-xl md:text-2xl text-foreground/80 mb-4">Monitoramento Inteligente de Ativos Elétricos</p>

            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-12">
              Plataforma corporativa para gestão técnica, ambiental e operacional de infraestrutura elétrica, integrando
              IoT, IA e análise de compliance em tempo real.
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

      {/* Desafios Section */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Desafios em <span className="text-destructive">Linhas de Transmissão</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Desafios críticos que impactam operações de transmissão
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: AlertTriangle,
                title: "Interrupções Não Programadas",
                description: "Falhas inesperadas geram multas regulatórias e perda de receita significativa",
              },
              {
                icon: TreePine,
                title: "Risco de Vegetação",
                description: "Crescimento vegetal não controlado causa desligamentos e riscos operacionais",
              },
              {
                icon: FileWarning,
                title: "Não Conformidade Regulatória",
                description: "Dificuldade em atender normas técnicas como NBR 5422 de forma contínua",
              },
              {
                icon: ClipboardCheck,
                title: "Inspeções Ineficientes",
                description: "Métodos manuais são custosos, demorados e sujeitos a falhas humanas",
              },
              {
                icon: Users,
                title: "Tempo e Segurança na Escalada de Estruturas",
                description:
                  "Escaladas manuais expõem equipes a riscos de queda, acidentes e condições climáticas adversas, além de serem demoradas e dispendiosas",
              },
              {
                icon: MapPin,
                title: "Ocupação Irregular de Faixa",
                description: "Invasões e construções não autorizadas na faixa de servidão comprometem a segurança",
              },
            ].map((challenge, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="tech-card p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-destructive/10 rounded-xl">
                    <challenge.icon className="w-6 h-6 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{challenge.title}</h3>
                    <p className="text-sm text-muted-foreground">{challenge.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Soluções Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Soluções SmartLine</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tecnologia preditiva para cada desafio operacional
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: "Monitoramento Preditivo",
                description: "IA identifica padrões de falha antes que ocorram, permitindo manutenção preventiva",
              },
              {
                icon: Map,
                title: "Mapas de Risco de Vegetação",
                description: "Análise geoespacial identifica pontos críticos, otimizando cronogramas de poda",
              },
              {
                icon: FileCheck,
                title: "Validação de Conformidade NBR 5422",
                description: "Verificação automática de distâncias mínimas e parâmetros normativos em tempo real",
              },
              {
                icon: BarChart3,
                title: "Analytics de Eventos",
                description: "Análise avançada de dados históricos para identificar tendências e causas raiz",
              },
              {
                icon: Home,
                title: "Gestão de Ocupação de Faixa",
                description:
                  "Controle automatizado de invasões com notificações, processos judiciais e timeline completa",
              },
              {
                icon: Plane,
                title: "Missões Autônomas para Drones",
                description:
                  "Inspeções automatizadas com biblioteca de missões e solicitação para trechos com gêmeo digital",
              },
              {
                icon: Box,
                title: "Exploração de Gêmeos Digitais",
                description: "Análise preditiva avançada através de modelos digitais 3D das linhas de transmissão",
              },
            ].map((solution, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="tech-card p-6 hover:border-primary/50"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <solution.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{solution.title}</h3>
                    <p className="text-sm text-muted-foreground">{solution.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios Section */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Benefícios <span className="gradient-text">Comprovados</span> para Seu Negócio
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              ROI mensurável e impacto direto nos resultados operacionais
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Clock,
                percentage: "85%",
                title: "Redução de Downtime",
                description: "Menos interrupções - Causa Árvore - através de manutenção preditiva",
              },
              {
                icon: ShieldCheck,
                percentage: "80%",
                title: "Melhoria na Segurança",
                description: "Identificação proativa de riscos operacionais sem escalada",
              },
              {
                icon: DollarSign,
                percentage: "60%",
                title: "Economia de Custos",
                description: "Redução significativa em custos operacionais e de manutenção",
              },
              {
                icon: CheckCircle2,
                percentage: "100%",
                title: "Confiança em Conformidade",
                description: "Atendimento contínuo às normas técnicas e regulatórias",
              },
            ].map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="tech-card p-8 text-center"
              >
                <div className="inline-block p-4 bg-primary/10 rounded-2xl mb-4">
                  <benefit.icon className="w-10 h-10 text-primary" />
                </div>
                <div className="text-5xl font-bold gradient-text mb-2">{benefit.percentage}</div>
                <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
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
              Junte-se às empresas que já utilizam o Smartline AssetHealth para maximizar a eficiência e segurança de
              seus ativos elétricos.
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
