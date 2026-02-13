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
import LanguageMenu from "@/components/LanguageMenu";
import { useI18n } from "@/context/I18nContext";

const Resultados = () => {
  const { t } = useI18n();
  const cases = [
    {
      id: 1,
      image: geodados,
      title: t("resultados.cases.assertiveVegetation.title"),
      description: t("resultados.cases.assertiveVegetation.description"),
      icon: TreeDeciduous,
    },
    {
      id: 2,
      image: escalada,
      title: t("resultados.cases.reducedClimbing.title"),
      description: t("resultados.cases.reducedClimbing.description"),
      icon: TowerControl,
    },
    {
      id: 4,
      image: missoes,
      title: t("resultados.cases.inspectionsFrequency.title"),
      description: t("resultados.cases.inspectionsFrequency.description"),
      icon: Eye,
    },
    {
      id: 5,
      image: aves,
      title: t("resultados.cases.birdEvents.title"),
      description: t("resultados.cases.birdEvents.description"),
      icon: Bird,
    },
    {
      id: 6,
      image: erosao,
      title: t("resultados.cases.erosionAndRightOfWay.title"),
      description: t("resultados.cases.erosionAndRightOfWay.description"),
      icon: Mountain,
    },
    {
      id: 7,
      image: queimadas,
      title: t("resultados.cases.wildfires.title"),
      description: t("resultados.cases.wildfires.description"),
      icon: Flame,
    },
    {
      id: 8,
      image: corrosao,
      title: t("resultados.cases.corrosion.title"),
      description: t("resultados.cases.corrosion.description"),
      icon: Activity,
    },
    {
      id: 9,
      image: furto,
      title: t("resultados.cases.theft.title"),
      description: t("resultados.cases.theft.description"),
      icon: Package,
    },
    {
      id: 10,
      image: fiscalizacao,
      title: t("resultados.cases.fieldOversight.title"),
      description: t("resultados.cases.fieldOversight.description"),
      icon: Construction,
    },
    {
      id: 11,
      image: auditoria,
      title: t("resultados.cases.qualityAudits.title"),
      description: t("resultados.cases.qualityAudits.description"),
      icon: ClipboardCheck,
    },
    {
      id: 12,
      image: compliance,
      title: t("resultados.cases.compliance.title"),
      description: t("resultados.cases.compliance.description"),
      icon: ShieldCheck,
    },
    {
      id: 13,
      image: gemeoDigital,
      title: t("resultados.cases.digitalTwinAI.title"),
      description: t("resultados.cases.digitalTwinAI.description"),
      icon: BrainCircuit,
    },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute top-4 right-4 z-20">
        <LanguageMenu className="bg-background/60 hover:bg-background/80 border border-border/50" />
      </div>
      <div className="pt-28 pb-20 px-6 lg:px-10">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
	          >
	            <h1 className="text-4xl md:text-5xl font-bold mb-4">
	              {t("resultados.title.before")} <span className="gradient-text">{t("resultados.title.highlight")}</span>
	            </h1>
	            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
	              {t("resultados.subtitle")}
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
	              {t("resultados.backHome")}
	            </a>
	          </motion.div>
	        </div>
	      </div>
	    </div>
  );
};

export default Resultados;
