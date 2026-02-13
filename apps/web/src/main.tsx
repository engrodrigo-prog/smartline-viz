import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { I18nProvider } from "@/context/I18nContext";
import { registerSW } from "virtual:pwa-register";
import { toast } from "sonner";

if (typeof window !== "undefined") {
  const updateSW = registerSW({
    onNeedRefresh() {
      toast("Atualização disponível", {
        description: "Clique para atualizar o app.",
        action: { label: "Atualizar", onClick: () => updateSW(true) },
      });
    },
    onOfflineReady() {
      toast.success("App pronto para uso offline");
    },
  });
}

createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <App />
  </I18nProvider>
);
