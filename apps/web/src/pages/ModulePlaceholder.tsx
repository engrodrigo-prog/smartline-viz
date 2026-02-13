import { useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Construction } from "lucide-react";
import { useI18n } from "@/context/I18nContext";

const ModulePlaceholder = () => {
  const { t } = useI18n();
  const location = useLocation();
  const pathParts = location.pathname.split("/").filter(Boolean);
  const moduleName = pathParts[pathParts.length - 1]
    ?.split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={moduleName || t("modulePlaceholder.fallbackTitle")} 
          subtitle={t("common.inDevelopment")} 
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="tech-card p-12 text-center max-w-2xl mx-auto">
            <Construction className="w-20 h-20 mx-auto mb-6 text-primary" />
            <h2 className="text-3xl font-bold mb-4">
              {t("modulePlaceholder.heading")} <span className="gradient-text">{moduleName}</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              {t("modulePlaceholder.description")}
            </p>
            <div className="space-y-4 text-left bg-muted/20 rounded-xl p-6">
              <h3 className="font-semibold text-lg">{t("modulePlaceholder.plannedFeatures")}</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>{t("modulePlaceholder.features.realtime")}</li>
                <li>{t("modulePlaceholder.features.integrations")}</li>
                <li>{t("modulePlaceholder.features.compliance")}</li>
                <li>{t("modulePlaceholder.features.reports")}</li>
                <li>{t("modulePlaceholder.features.alerts")}</li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ModulePlaceholder;
