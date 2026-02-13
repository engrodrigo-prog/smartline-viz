import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import LandingHeader from "@/components/LandingHeader";
import { LoginTopbar } from "@/components/LoginTopbar";
import { cn } from "@/lib/utils";
import { modulosSmartline } from "@/lib/modulosSmartline";
import { useI18n } from "@/context/I18nContext";
import {
  Activity,
  Shield,
  Zap,
  Database,
  Cloud,
  AlertTriangle,
  TreePine,
  FileWarning,
  ClipboardCheck,
  Users,
  GraduationCap,
  Layers,
  CloudUpload,
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
import { SHOULD_USE_DEMO_API } from "@/lib/demoApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import logoSmartline from "@/assets/logo-smartline.png";
import bgHero from "@/assets/bg-hero.png";
import bannerIA from "@/assets/banner-ia.png";
import bannerMissoes from "@/assets/banner-missoes.png";
import bannerCompliance from "@/assets/banner-compliance.png";
import dashboardControl from "@/assets/dashboard-control.png";
import teamAnalysis from "@/assets/team-analysis.png";
import controlRoom from "@/assets/control-room.png";
import droneLidar from "@/assets/drone-lidar.png";

const Landing = () => {
  const [apiAvailable, setApiAvailable] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const { t, formatDateTime } = useI18n();
  const contactMailtoSubject = t("landing.contact.mailto.subject");
  const contactMailtoBody = t("landing.contact.mailto.body");
  const contactMailto = `mailto:${ENV.CONTACT_EMAIL}?subject=${encodeURIComponent(contactMailtoSubject)}&body=${encodeURIComponent(contactMailtoBody)}`;

  useEffect(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setApiAvailable(false);
      return;
    }
    // Em modo demo, não tentar /health
    if (SHOULD_USE_DEMO_API) {
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

  const firmsQuery = useFirmsData({ count: 1000, enabled: apiAvailable || SHOULD_USE_DEMO_API });
  const mediaQuery = useMediaSearch({}, { enabled: apiAvailable });
  const analyticsQuery = useDemandasAnalytics({ enabled: apiAvailable || SHOULD_USE_DEMO_API });
  const missoesQuery = useMissoes({ enabled: apiAvailable || SHOULD_USE_DEMO_API });

  const automationCards = useMemo(() => {
    return [
      {
        title: t("landing.automations.cards.firms.title"),
        description: t("landing.automations.cards.firms.description"),
        status: firmsQuery.isError
          ? "error"
          : firmsQuery.isFetching
            ? "running"
            : firmsQuery.data
              ? "ok"
              : "error",
        timestamp: firmsQuery.data?.meta?.lastFetchedAt,
        cta: { href: "/ambiental/queimadas", label: t("landing.automations.cards.firms.cta") }
      },
      {
        title: t("landing.automations.cards.media.title"),
        description: t("landing.automations.cards.media.description"),
        status: mediaQuery.isPending ? "running" : mediaQuery.isError ? "error" : "ok",
        timestamp: mediaQuery.data?.items?.[0]?.uploadedAt,
        cta: { href: "/upload", label: t("landing.automations.cards.media.cta") }
      },
      {
        title: t("landing.automations.cards.las.title"),
        description: t("landing.automations.cards.las.description"),
        status: "ok",
        timestamp: analyticsQuery.data?.atualizadoEm,
        cta: { href: "/estrutura/perfil-linha", label: t("landing.automations.cards.las.cta") }
      },
      {
        title: t("landing.automations.cards.analytics.title"),
        description: t("landing.automations.cards.analytics.description"),
        status: analyticsQuery.isSuccess ? "ok" : analyticsQuery.isPending ? "running" : "error",
        timestamp: analyticsQuery.data?.atualizadoEm,
        cta: { href: "/analytics/comparativo", label: t("landing.automations.cards.analytics.cta") }
      },
      {
        title: t("landing.automations.cards.missions.title"),
        description: t("landing.automations.cards.missions.description"),
        status: missoesQuery.isSuccess ? "ok" : missoesQuery.isPending ? "running" : "error",
        timestamp: missoesQuery.data?.items?.[0]?.atualizadoEm,
        cta: { href: "/operacao/missoes", label: t("landing.automations.cards.missions.cta") }
      },
    ] satisfies {
      title: string;
      description: string;
      status: "ok" | "running" | "error";
      timestamp?: string;
      cta: { href: string; label: string };
    }[];
  }, [analyticsQuery.data, analyticsQuery.isPending, analyticsQuery.isSuccess, firmsQuery.data, firmsQuery.isError, firmsQuery.isFetching, mediaQuery.data, mediaQuery.isError, mediaQuery.isPending, missoesQuery.data, missoesQuery.isPending, missoesQuery.isSuccess, t]);

  const statusBadge = (status: "ok" | "running" | "error", timestamp?: string) => {
    const label =
      status === "ok" ? t("common.ok") : status === "running" ? t("common.running") : t("common.checkConfiguration");
    const variant = status === "ok" ? "secondary" : status === "running" ? "outline" : "destructive";
    return (
      <div className="flex flex-col gap-1">
        <Badge variant={variant} className="w-fit">
          {label}
        </Badge>
        {timestamp ? (
          <span className="text-xs text-muted-foreground">
            {t("common.updated", { date: formatDateTime(timestamp) })}
          </span>
        ) : null}
      </div>
    );
  };

  const features = [
    {
      icon: Activity,
      title: t("landing.features.items.realtime.title"),
      description: t("landing.features.items.realtime.description"),
      image: bannerIA,
    },
    {
      icon: Shield,
      title: t("landing.features.items.compliance.title"),
      description: t("landing.features.items.compliance.description"),
      image: bannerCompliance,
    },
    {
      icon: Zap,
      title: t("landing.features.items.drones.title"),
      description: t("landing.features.items.drones.description"),
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
                {t("landing.hero.subtitle")}
              </p>

              <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-12">
                {t("landing.hero.description")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <div className="flex flex-col items-center gap-1">
                  <Link to="/dashboard" className="btn-primary text-lg inline-block">
                    {t("landing.hero.accessSystem")}
                  </Link>
                  <div className="text-[11px] text-yellow-200/80 px-2 py-0.5 bg-yellow-500/10 border border-yellow-400/40 rounded-md">
                    {t("common.inDevelopment")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSurveyOpen(true)}
                  className="btn-secondary text-lg inline-block"
                >
                  {t("landing.hero.accessSurvey")}
                </button>
                <button
                  type="button"
                  onClick={() => setContactOpen(true)}
                  className="btn-secondary text-lg inline-block"
                >
                  {t("landing.hero.talkToTeam")}
                </button>
                <Link
                  to="/signup-request"
                  className="btn-secondary text-lg inline-block"
                >
                  {t("landing.hero.requestDirectAccess")}
                </Link>
              </div>
            </motion.div>

            {/* Stats removidos conforme solicitação */}
          </div>
        </section>

        {/* LiDAR + Orto base (mesmo estilo da seção de operação) */}
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
                  src={droneLidar}
                  alt={t("landing.sections.lidar.imageAlt")}
                  className="rounded-2xl shadow-lg shadow-black/30 max-h-[400px] w-auto object-contain"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="tech-card p-8 order-1 lg:order-2"
              >
                <h2 className="text-3xl font-bold mb-4 text-white">{t("landing.sections.lidar.title")}</h2>
                <p className="text-white/90 text-lg">
                  {t("landing.sections.lidar.description")}
                </p>
              </motion.div>
            </div>
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
                className="tech-card p-8"
              >
                <h2 className="text-3xl font-bold mb-4 text-white">{t("landing.sections.operation.title")}</h2>
                <p className="text-white/90 text-lg">
                  {t("landing.sections.operation.description")}
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
                  alt={t("landing.sections.operation.imageAlt")}
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
                  alt={t("landing.sections.team.imageAlt")}
                  className="rounded-2xl shadow-lg shadow-black/30 max-h-[400px] w-auto object-contain"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="tech-card p-8 order-1 lg:order-2"
              >
                <h2 className="text-3xl font-bold mb-4 text-white">{t("landing.sections.team.title")}</h2>
                <p className="text-white/90 text-lg">
                  {t("landing.sections.team.description")}
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
                className="tech-card p-8"
              >
                <h2 className="text-3xl font-bold mb-4 text-white">{t("landing.sections.dashboards.title")}</h2>
                <p className="text-white/90 text-lg">
                  {t("landing.sections.dashboards.description")}
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
                  alt={t("landing.sections.dashboards.imageAlt")}
                  className="rounded-2xl shadow-lg shadow-black/30 max-h-[400px] w-auto object-contain"
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Training Preview Section (mesmo estilo, 1 foto + texto) */}
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
                  src="/training.png"
                  alt={t("landing.sections.trainingPreview.imageAlt")}
                  className="rounded-2xl shadow-lg shadow-black/30 max-h-[400px] w-auto object-contain"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="tech-card p-8 order-1 lg:order-2"
              >
                <h2 className="text-3xl font-bold mb-4 text-white">{t("landing.sections.trainingPreview.title")}</h2>
                <p className="text-white/90 text-lg mb-4">{t("landing.sections.trainingPreview.description")}</p>
                <a href="#treinamento" className="btn-primary inline-block">
                  {t("landing.sections.trainingPreview.cta")}
                </a>
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
                {t("landing.sections.technology.title.before")}{" "}
                <span className="gradient-text">{t("landing.sections.technology.title.highlight")}</span>
              </h2>
              <p className="text-lg text-white/70 max-w-2xl mx-auto">
                {t("landing.sections.technology.description")}
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
                  className="tech-card overflow-hidden group relative"
                >
                  <div className="postit">{t("common.simulation")}</div>
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
                {t("landing.challenges.title.before")}{" "}
                <span className="text-destructive">{t("landing.challenges.title.highlight")}</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t("landing.challenges.subtitle")}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: AlertTriangle,
                  title: t("landing.challenges.items.unplanned.title"),
                  description: t("landing.challenges.items.unplanned.description"),
                },
                {
                  icon: TreePine,
                  title: t("landing.challenges.items.vegetation.title"),
                  description: t("landing.challenges.items.vegetation.description"),
                },
                {
                  icon: FileWarning,
                  title: t("landing.challenges.items.regulatory.title"),
                  description: t("landing.challenges.items.regulatory.description"),
                },
                {
                  icon: ClipboardCheck,
                  title: t("landing.challenges.items.inspections.title"),
                  description: t("landing.challenges.items.inspections.description"),
                },
                {
                  icon: Users,
                  title: t("landing.challenges.items.climbing.title"),
                  description:
                    t("landing.challenges.items.climbing.description"),
                },
                {
                  icon: MapPin,
                  title: t("landing.challenges.items.rightOfWay.title"),
                  description: t("landing.challenges.items.rightOfWay.description"),
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
                <span className="gradient-text">{t("landing.solutions.title")}</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t("landing.solutions.subtitle")}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Brain,
                  title: t("landing.solutions.items.predictiveMonitoring.title"),
                  description: t("landing.solutions.items.predictiveMonitoring.description"),
                },
                {
                  icon: Map,
                  title: t("landing.solutions.items.vegetationRisk.title"),
                  description: t("landing.solutions.items.vegetationRisk.description"),
                },
                {
                  icon: FileCheck,
                  title: t("landing.solutions.items.nbrValidation.title"),
                  description: t("landing.solutions.items.nbrValidation.description"),
                },
                {
                  icon: BarChart3,
                  title: t("landing.solutions.items.eventAnalytics.title"),
                  description: t("landing.solutions.items.eventAnalytics.description"),
                },
                {
                  icon: Home,
                  title: t("landing.solutions.items.rightOfWay.title"),
                  description:
                    t("landing.solutions.items.rightOfWay.description"),
                },
                {
                  icon: Plane,
                  title: t("landing.solutions.items.autonomousDrones.title"),
                  description:
                    t("landing.solutions.items.autonomousDrones.description"),
                },
                {
                  icon: Box,
                  title: t("landing.solutions.items.digitalTwins.title"),
                  description: t("landing.solutions.items.digitalTwins.description"),
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
        <section className="relative py-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-900/25 to-transparent backdrop-blur-sm pointer-events-none" aria-hidden="true" />
          <div className="relative z-10 container mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="text-destructive">{t("landing.moduleShowcase.title.before")}</span> ⚡{" "}
                <span className="gradient-text">{t("landing.moduleShowcase.title.after")}</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                {t("landing.moduleShowcase.subtitle")}
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
                          {t("landing.moduleShowcase.challengeLabel", { category: t(item.categoryKey) })}
                        </div>
                        <h3 className="text-xl font-bold text-destructive">
                          {t(item.challenge.titleKey)}
                        </h3>
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-3">{t(item.challenge.descriptionKey)}</p>
                    <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                      <div className="text-xs font-semibold text-destructive mb-1">{t("landing.moduleShowcase.impact")}</div>
                      <div className="text-sm text-foreground">{t(item.challenge.impactKey)}</div>
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
                          {t("landing.moduleShowcase.solutionLabel", { module: t(item.moduleKey) })}
                        </div>
                        <h3 className="text-xl font-bold text-primary">
                          {t(item.solution.titleKey)}
                        </h3>
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-3">{t(item.solution.descriptionKey)}</p>
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 mb-4">
                      <div className="text-xs font-semibold text-primary mb-1">{t("landing.moduleShowcase.benefit")}</div>
                      <div className="text-sm text-foreground">{t(item.solution.benefitKey)}</div>
                    </div>
                    <Link
                      to={item.path}
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      {t("landing.moduleShowcase.viewModule")} →
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
                {t("landing.benefits.title.before")}{" "}
                <span className="gradient-text">{t("landing.benefits.title.highlight")}</span>{" "}
                {t("landing.benefits.title.after")}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t("landing.benefits.subtitle")}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Clock,
                  percentage: "85%",
                  title: t("landing.benefits.items.downtime.title"),
                  description: t("landing.benefits.items.downtime.description"),
                },
                {
                  icon: ShieldCheck,
                  percentage: "80%",
                  title: t("landing.benefits.items.safety.title"),
                  description: t("landing.benefits.items.safety.description"),
                },
                {
                  icon: DollarSign,
                  percentage: "60%",
                  title: t("landing.benefits.items.cost.title"),
                  description: t("landing.benefits.items.cost.description"),
                },
                {
                  icon: CheckCircle2,
                  percentage: "100%",
                  title: t("landing.benefits.items.compliance.title"),
                  description: t("landing.benefits.items.compliance.description"),
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

        {/* Treinamento & Capacitação (antes das automações) */}
        <section id="treinamento" className="py-20 px-6 bg-gradient-to-b from-slate-900/60 to-slate-900/30 border-t border-white/10">
          <div className="container mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
	              <h2 className="text-4xl md:text-5xl font-bold mb-4 flex items-center gap-3 justify-center">
	                <GraduationCap className="w-8 h-8 text-primary" />
	                {t("landing.training.program.title")}
	              </h2>
	              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
	                {t("landing.training.program.subtitle")}
	              </p>
	            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8 items-stretch">
              {/* Conteúdo */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
	                transition={{ duration: 0.6, delay: 0.1 }}
	                className="tech-card p-8 h-full"
	              >
	                <h3 className="text-2xl font-semibold mb-4">{t("landing.training.tracks.title")}</h3>
	                <ul className="space-y-3 text-sm text-muted-foreground">
	                  <li className="flex items-start gap-3">
	                    <Layers className="w-5 h-5 text-primary mt-0.5" />
	                    <span>
	                      {t("landing.training.tracks.items.pointClouds.before")}{" "}
	                      <strong className="text-foreground">{t("landing.training.tracks.items.pointClouds.highlight")}</strong>
	                      {t("landing.training.tracks.items.pointClouds.after")}
	                    </span>
	                  </li>
	                  <li className="flex items-start gap-3">
	                    <FileCheck className="w-5 h-5 text-primary mt-0.5" />
	                    <span>
	                      <strong className="text-foreground">{t("landing.training.tracks.items.dataGeneration.highlight")}</strong>
	                      {t("landing.training.tracks.items.dataGeneration.after")}
	                    </span>
	                  </li>
	                  <li className="flex items-start gap-3">
	                    <BarChart3 className="w-5 h-5 text-primary mt-0.5" />
	                    <span>
	                      <strong className="text-foreground">{t("landing.training.tracks.items.journey.highlight")}</strong>
	                      {t("landing.training.tracks.items.journey.after")}
	                    </span>
	                  </li>
	                </ul>
	                <div className="mt-6 flex flex-wrap gap-3">
	                  <Badge variant="secondary">{t("landing.training.tracks.badges.workshops")}</Badge>
	                  <Badge variant="secondary">{t("landing.training.tracks.badges.onboarding")}</Badge>
	                  <Badge variant="secondary">{t("landing.training.tracks.badges.mentoring")}</Badge>
	                </div>
	              </motion.div>

              {/* Modalidades de adoção */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
	                transition={{ duration: 0.6, delay: 0.15 }}
	                className="tech-card p-8 h-full"
	              >
	                <h3 className="text-2xl font-semibold mb-4">{t("landing.training.adoption.title")}</h3>
	                <div className="space-y-4">
	                  <div className="flex gap-3">
	                    <CloudUpload className="w-6 h-6 text-primary shrink-0" />
	                    <div>
	                      <div className="font-semibold">{t("landing.training.adoption.items.fullOutsourcing.title")}</div>
	                      <p className="text-sm text-muted-foreground">
	                        {t("landing.training.adoption.items.fullOutsourcing.description")}
	                      </p>
	                    </div>
	                  </div>
	                  <div className="flex gap-3">
	                    <Users className="w-6 h-6 text-primary shrink-0" />
	                    <div>
	                      <div className="font-semibold">{t("landing.training.adoption.items.hybrid.title")}</div>
	                      <p className="text-sm text-muted-foreground">
	                        {t("landing.training.adoption.items.hybrid.description")}
	                      </p>
	                    </div>
	                  </div>
	                  <div className="flex gap-3">
	                    <GraduationCap className="w-6 h-6 text-primary shrink-0" />
	                    <div>
	                      <div className="font-semibold">{t("landing.training.adoption.items.guided.title")}</div>
	                      <p className="text-sm text-muted-foreground">
	                        {t("landing.training.adoption.items.guided.description")}
	                      </p>
	                    </div>
	                  </div>
	                </div>

	                <div className="mt-6 flex flex-wrap gap-4">
	                  <Button className="btn-primary" onClick={() => setContactOpen(true)}>
	                    {t("landing.training.adoption.ctas.trainTeam")}
	                  </Button>
	                  <Link to="/upload" className="btn-secondary">
	                    {t("landing.training.adoption.ctas.viewDataFlow")}
	                  </Link>
	                </div>
	              </motion.div>
            </div>
          </div>
        </section>

        {/* Automações (movido para fim da página) */}
        <section className="py-16 px-10">
          <div className="container mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8"
            >
              <div>
                <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                  <Clock className="w-7 h-7 text-primary" /> {t("landing.automations.title")}
                </h2>
                <p className="text-muted-foreground max-w-2xl">
                  {t("landing.automations.subtitle")}
                </p>
                {!apiAvailable && (
                  <p className="text-xs mt-2 text-amber-300/80">
                    {t("landing.automations.apiOffline")}
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
                  className="tech-card p-6 space-y-4 border border-white/10 relative"
                >
                  <div className="postit">{t("common.simulation")}</div>
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
                {t("landing.cta.title.before")}{" "}
                <span className="gradient-text">{t("landing.cta.title.highlight")}</span>{" "}
                {t("landing.cta.title.after")}
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                {t("landing.cta.subtitle")}
              </p>
              <Link to="/dashboard" className="btn-primary text-lg inline-block">
                {t("landing.cta.button")}
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-8 px-4">
          <div className="container mx-auto text-center text-white/60">
            <p>{t("landing.footer.rights", { year: "2025" })}</p>
          </div>
        </footer>
      </div>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="w-[95vw] sm:max-w-3xl lg:max-w-4xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("landing.contact.dialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="h-[80vh]">
            <iframe
              title={t("landing.contact.dialog.iframeTitle")}
              src="https://form.jotform.com/252925666837674"
              className="w-full h-full rounded-md border"
              allowFullScreen
              loading="lazy"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("landing.contact.dialog.note")}{" "}
            {t("landing.contact.dialog.preferEmail")}{" "}
            <a className="text-primary underline" href={contactMailto}>
              {t("landing.contact.dialog.sendTo", { email: ENV.CONTACT_EMAIL })}
            </a>
            .
          </p>
        </DialogContent>
      </Dialog>

      <Dialog open={surveyOpen} onOpenChange={setSurveyOpen}>
        <DialogContent className="w-[95vw] sm:max-w-3xl lg:max-w-4xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("landing.survey.dialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="h-[80vh]">
            <iframe
              title={t("landing.survey.dialog.iframeTitle")}
              src="https://form.jotform.com/251775321495058"
              className="w-full h-full rounded-md border"
              allowFullScreen
              loading="lazy"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("landing.survey.dialog.note")}
          </p>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Landing;
