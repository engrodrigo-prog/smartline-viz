import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import LandingHeader from "@/components/LandingHeader";
import { LoginTopbar } from "@/components/LoginTopbar";
import { cn } from "@/lib/utils";
import { modulosSmartline } from "@/lib/modulosSmartline";
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
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFirmsData } from "@/hooks/useFirmsData";
import { useMediaSearch } from "@/hooks/useMedia";
import { useDemandasAnalytics } from "@/hooks/useDemandas";
import { useMissoes } from "@/hooks/useMissoes";
import { ENV } from "@/config/env";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import logoSmartline from "@/assets/logo-smartline.png";
import bgHero from "@/assets/bg-hero.png";
import bannerIA from "@/assets/banner-ia.png";
import bannerMissoes from "@/assets/banner-missoes.png";
import bannerCompliance from "@/assets/banner-compliance.png";
import dashboardControl from "@/assets/dashboard-control.png";
import teamAnalysis from "@/assets/team-analysis.png";
import controlRoom from "@/assets/control-room.png";

const Landing = () => {
  const [apiAvailable, setApiAvailable] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setApiAvailable(false);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const base = (ENV.API_BASE_URL || "").replace(/\/+$/, "");
    fetch(`${base}/health`, { method: "GET", signal: controller.signal })
      .then((r) => setApiAvailable(r.ok))
      .catch(() => setApiAvailable(false))
      .finally(() => clearTimeout(timeout));
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);

  const firmsQuery = useFirmsData({ count: 1000, enabled: apiAvailable });
  const mediaQuery = useMediaSearch({}, { enabled: apiAvailable });
  const analyticsQuery = useDemandasAnalytics({ enabled: apiAvailable });
  const missoesQuery = useMissoes({ enabled: apiAvailable });

  const automationCards = useMemo(() => {
    const cards: {
      title: string;
      description: string;
      status: "ok" | "running" | "error";
      timestamp?: string;
      cta: { href: string; label: string };
    }[] = [];

    cards.push({
      title: "FIRMS (última sincronização)",
      description: "Hotspots NASA/VIIRS integrados ao módulo de ambiental para resposta rápida a queimadas.",
      status: firmsQuery.isError
        ? "error"
        : firmsQuery.isFetching
          ? "running"
          : firmsQuery.data
            ? "ok"
            : "error",
      timestamp: firmsQuery.data?.meta?.lastFetchedAt,
      cta: { href: "/ambiental/queimadas", label: "Ver Queimadas" }
    });

    cards.push({
      title: "Processamento de Vídeos/Frames",
      description: "Worker Python extrai frames georreferenciados, EXIF e temas para inspeções visual e térmica.",
      status: mediaQuery.isPending ? "running" : mediaQuery.isError ? "error" : "ok",
      timestamp: mediaQuery.data?.items?.[0]?.uploadedAt,
      cta: { href: "/upload", label: "Abrir Upload Unificado" }
    });

    cards.push({
      title: "Indexação Nuvens LAS/LAZ",
      description: "Pipeline PDAL/LASPy gera plan_points.geojson e perfil longitudinal para engenharia.",
      status: "ok",
      timestamp: analyticsQuery.data?.atualizadoEm,
      cta: { href: "/estrutura/perfil-linha", label: "Ver Perfil da Linha" }
    });

    cards.push({
      title: "Análises Operacionais",
      description: "Comparativo Próprio vs Terceiros com SLA, custo por km, retrabalho e reincidências.",
      status: analyticsQuery.isSuccess ? "ok" : analyticsQuery.isPending ? "running" : "error",
      timestamp: analyticsQuery.data?.atualizadoEm,
      cta: { href: "/analytics/comparativo", label: "Abrir Analytics" }
    });

    cards.push({
      title: "Missões (exportadas/enviadas)",
      description: "Biblioteca de planos LiDAR, circulares e inspeções finas com exportação DJI, Autel e Ardupilot.",
      status: missoesQuery.isSuccess ? "ok" : missoesQuery.isPending ? "running" : "error",
      timestamp: missoesQuery.data?.items?.[0]?.atualizadoEm,
      cta: { href: "/operacao/missoes", label: "Gerenciar Missões" }
    });

    return cards;
  }, [analyticsQuery.data, analyticsQuery.isPending, analyticsQuery.isSuccess, firmsQuery.data, firmsQuery.isError, firmsQuery.isFetching, mediaQuery.data, mediaQuery.isError, mediaQuery.isPending, missoesQuery.data, missoesQuery.isPending, missoesQuery.isSuccess]);

  const statusBadge = (status: "ok" | "running" | "error", timestamp?: string) => {
    const label =
      status === "ok" ? "OK" : status === "running" ? "Em execução" : "Verificar configuração";
    const variant = status === "ok" ? "secondary" : status === "running" ? "outline" : "destructive";
    return (
      <div className="flex flex-col gap-1">
        <Badge variant={variant} className="w-fit">
          {label}
        </Badge>
        {timestamp ? (
          <span className="text-xs text-muted-foreground">
            Atualizado {new Date(timestamp).toLocaleString("pt-BR")}
          </span>
        ) : null}
      </div>
    );
  };

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
    <main
      className="relative min-h-screen flex flex-col text-white"
      style={{
        backgroundImage: `url(${bgHero})`,
        backgroundAttachment: "fixed",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="bg-slate-900/40 flex-1">
        <LandingHeader />
        <LoginTopbar />

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-[80px]">
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
                integrando nuvens de pontos LIDAR, Ortomosaicos nos gêmeos digitais, imagens de satélite IoT, IA e
                análise de compliance com normas vigentes e processos de cada cliente.
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
                <button
                  type="button"
                  onClick={() => setContactOpen(true)}
                  className="btn-secondary text-lg inline-block"
                >
                  Falar com a equipe
                </button>
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
                { icon: Cloud, label: "Dados Processados", value: "2.5TB" },
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

        

        {/* Operational Excellence Section with Images */}
        <section className="py-20 px-10">
          <div className="container mx-auto max-w-7xl">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="backdrop-blur-md bg-slate-900/70 rounded-xl p-8 border border-white/10"
              >
                <h2 className="text-3xl font-bold mb-4 text-white">Operação descentralizada, controle central</h2>
                <p className="text-white/90 text-lg">
                  Acompanhe vegetação, travessias, estruturas e sensores em um único painel técnico. Decisões baseadas em
                  dados reais, processados em tempo real.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="flex items-center justify-center"
              >
                <img
                  src={controlRoom}
                  alt="Centro de Controle Smartline"
                  className="rounded-2xl shadow-lg shadow-black/30 max-h-[400px] w-auto object-contain"
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Team Analysis Section */}
        <section className="py-20 px-10">
          <div className="container mx-auto max-w-7xl">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="flex items-center justify-center order-2 lg:order-1"
              >
                <img
                  src={teamAnalysis}
                  alt="Equipe Analisando Ativos"
                  className="rounded-2xl shadow-lg shadow-black/30 max-h-[400px] w-auto object-contain"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="backdrop-blur-md bg-slate-900/70 rounded-xl p-8 border border-white/10 order-1 lg:order-2"
              >
                <h2 className="text-3xl font-bold mb-4 text-white">Análise colaborativa e preditiva</h2>
                <p className="text-white/90 text-lg">
                  Equipes multidisciplinares trabalham com gêmeos digitais 3D, identificando riscos antes que se tornem
                  problemas. IA e machine learning detectam padrões objetivamente, priorizados que estavam invisíveis ao
                  olho humano.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Dashboard Analytics Section */}
        <section className="py-20 px-10">
          <div className="container mx-auto max-w-7xl">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="backdrop-blur-md bg-slate-900/70 rounded-xl p-8 border border-white/10"
              >
                <h2 className="text-3xl font-bold mb-4 text-white">Dashboards inteligentes e acionáveis</h2>
                <p className="text-white/90 text-lg">
                  Visualize KPIs críticos, níveis de risco e anomalias. Desenhe e estude tendências, tudo numa interface
                  intuitiva e acessível.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="flex items-center justify-center"
              >
                <img
                  src={dashboardControl}
                  alt="Dashboard de Controle"
                  className="rounded-2xl shadow-lg shadow-black/30 max-h-[400px] w-auto object-contain"
                />
              </motion.div>
            </div>
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
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
                Tecnologia <span className="gradient-text">de Ponta</span>
              </h2>
              <p className="text-lg text-white/70 max-w-2xl mx-auto">
                Integração completa de sensores e câmeras, classificação de nuvens de pontos com IA e análise preditiva
                para máxima eficiência operacional.
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

        {/* Desafios e Soluções por Módulo */}
        <section className="py-20 px-4 bg-gradient-to-b from-slate-900 to-slate-800">
          <div className="container mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="text-destructive">Desafios Reais</span> ⚡{" "}
                <span className="gradient-text">Soluções Concretas</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Para cada desafio operacional crítico, a Smartline oferece uma solução tecnológica comprovada
              </p>
            </motion.div>

            <div className="space-y-8">
              {modulosSmartline.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="grid lg:grid-cols-2 gap-6"
                >
                  {/* Desafio */}
                  <div
                    className={cn(
                      "tech-card p-6 border-l-4 border-destructive",
                      index % 2 === 1 && "lg:order-2"
                    )}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 bg-destructive/10 rounded-xl">
                        <item.icon className="w-6 h-6 text-destructive" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-1">
                          DESAFIO - {item.categoria}
                        </div>
                        <h3 className="text-xl font-bold text-destructive">
                          {item.desafio.titulo}
                        </h3>
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-3">{item.desafio.descricao}</p>
                    <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                      <div className="text-xs font-semibold text-destructive mb-1">IMPACTO</div>
                      <div className="text-sm text-foreground">{item.desafio.impacto}</div>
                    </div>
                  </div>

                  {/* Solução */}
                  <div
                    className={cn(
                      "tech-card p-6 border-l-4 border-primary",
                      index % 2 === 1 && "lg:order-1"
                    )}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-1">
                          SOLUÇÃO - {item.modulo}
                        </div>
                        <h3 className="text-xl font-bold text-primary">
                          {item.solucao.titulo}
                        </h3>
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-3">{item.solucao.descricao}</p>
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 mb-4">
                      <div className="text-xs font-semibold text-primary mb-1">BENEFÍCIO</div>
                      <div className="text-sm text-foreground">{item.solucao.beneficio}</div>
                    </div>
                    <Link
                      to={item.path}
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      Ver módulo completo →
                    </Link>
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

        {/* Automações (movido para fim da página) */}
        <section className="py-16 px-6">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8"
            >
              <div>
                <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                  <Clock className="w-7 h-7 text-primary" /> Automações Inteligentes
                </h2>
                <p className="text-muted-foreground max-w-2xl">
                  Status ao vivo das rotinas críticas: ingestão FIRMS (NASA/VIIRS), processamento de mídias, indexação de
                  nuvens de pontos e análises operacionais. Tudo pronto para rodar 24/7.
                </p>
                {!apiAvailable && (
                  <p className="text-xs mt-2 text-amber-300/80">
                    API offline no momento — exibindo indicadores em modo demonstração (nenhuma chamada será feita).
                  </p>
                )}
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {automationCards.map((card) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  className="tech-card p-6 space-y-4 border border-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{card.description}</p>
                    </div>
                    {statusBadge(card.status, card.timestamp)}
                  </div>
                  <Button variant="outline" asChild className="w-full justify-between">
                    <Link to={card.cta.href}>
                      {card.cta.label}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
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
        <footer className="border-t border-white/10 py-8 px-4">
          <div className="container mx-auto text-center text-white/60">
            <p>© 2025 Smartline AssetHealth. Todos os direitos reservados.</p>
          </div>
        </footer>
      </div>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="sm:max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Contato Smartline</DialogTitle>
          </DialogHeader>
          <div className="h-[70vh]">
            <iframe
              title="Formulário de Contato Smartline"
              src="https://form.jotform.com/252925666837674"
              className="w-full h-full rounded-md border"
              allowFullScreen
              loading="lazy"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            As respostas são armazenadas com segurança no Jotform para acompanhamento da equipe Smartline.
          </p>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Landing;
