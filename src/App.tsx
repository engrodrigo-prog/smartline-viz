import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import ModulePlaceholder from "./pages/ModulePlaceholder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/relatorios" element={<ModulePlaceholder />} />
          
          {/* Ambiental */}
          <Route path="/ambiental/alagadas" element={<ModulePlaceholder />} />
          <Route path="/ambiental/vegetacao" element={<ModulePlaceholder />} />
          <Route path="/ambiental/ocupacao" element={<ModulePlaceholder />} />
          <Route path="/ambiental/distancia" element={<ModulePlaceholder />} />
          <Route path="/ambiental/compliance" element={<ModulePlaceholder />} />
          
          {/* Estrutura */}
          <Route path="/estrutura/estruturas" element={<ModulePlaceholder />} />
          <Route path="/estrutura/emendas" element={<ModulePlaceholder />} />
          <Route path="/estrutura/travessias" element={<ModulePlaceholder />} />
          <Route path="/estrutura/compliance" element={<ModulePlaceholder />} />
          <Route path="/estrutura/corrosao" element={<ModulePlaceholder />} />
          
          {/* Sensores */}
          <Route path="/sensores/painel" element={<ModulePlaceholder />} />
          <Route path="/sensores/cameras" element={<ModulePlaceholder />} />
          <Route path="/sensores/dashboard" element={<ModulePlaceholder />} />
          <Route path="/sensores/alertas" element={<ModulePlaceholder />} />
          
          {/* Operação */}
          <Route path="/operacao/missoes" element={<ModulePlaceholder />} />
          <Route path="/operacao/eventos" element={<ModulePlaceholder />} />
          <Route path="/operacao/compliance" element={<ModulePlaceholder />} />
          <Route path="/operacao/relatorios" element={<ModulePlaceholder />} />
          
          {/* Configurações */}
          <Route path="/config/geral" element={<ModulePlaceholder />} />
          <Route path="/config/usuarios" element={<ModulePlaceholder />} />
          <Route path="/config/permissoes" element={<ModulePlaceholder />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
