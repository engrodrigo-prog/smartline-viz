import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import ModulePlaceholder from "./pages/ModulePlaceholder";
import NotFound from "./pages/NotFound";
import Resultados from "./pages/Resultados";
import Login from "./pages/Login";
import MapView from "./pages/MapView";
import Unifilar from "./pages/Unifilar";
import UploadBases from "./pages/UploadBases";
import UploadTracados from "./pages/UploadTracados";
import Vegetacao from "./pages/modules/Vegetacao";
import Travessias from "./pages/modules/Travessias";
import Estruturas from "./pages/modules/Estruturas";
import AreasAlagadas from "./pages/modules/ambiental/AreasAlagadas";
import Erosao from "./pages/modules/ambiental/Erosao";
import Queimadas from "./pages/modules/ambiental/Queimadas";
import OcupacaoFaixa from "./pages/modules/ambiental/OcupacaoFaixa";
import Emendas from "./pages/modules/estrutura/Emendas";
import RastreamentoCampo from "./pages/equipes/RastreamentoCampo";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/resultados" element={<Resultados />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/relatorios" element={<ModulePlaceholder />} />
          
          {/* Visual */}
          <Route path="/visual/mapa" element={<MapView />} />
          <Route path="/visual/unifilar" element={<Unifilar />} />
          
          {/* Upload */}
          <Route path="/upload/bases" element={<UploadBases />} />
          <Route path="/upload/tracados" element={<UploadTracados />} />
          
          {/* Ambiental */}
          <Route path="/ambiental/alagadas" element={<AreasAlagadas />} />
          <Route path="/ambiental/erosao" element={<Erosao />} />
          <Route path="/ambiental/queimadas" element={<Queimadas />} />
          <Route path="/ambiental/vegetacao" element={<Vegetacao />} />
          <Route path="/ambiental/ocupacao" element={<OcupacaoFaixa />} />
          <Route path="/ambiental/distancia" element={<ModulePlaceholder />} />
          <Route path="/ambiental/compliance" element={<ModulePlaceholder />} />
          
          {/* Estrutura */}
          <Route path="/estrutura/estruturas" element={<Estruturas />} />
          <Route path="/estrutura/emendas" element={<Emendas />} />
          <Route path="/estrutura/travessias" element={<Travessias />} />
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
          
          {/* Análises Avançadas */}
          <Route path="/analises/gemeo-digital" element={<ModulePlaceholder />} />
          <Route path="/fiscalizacao/obras" element={<ModulePlaceholder />} />
          <Route path="/auditorias/qualidade" element={<ModulePlaceholder />} />
          
          {/* Gestão de Equipes */}
          <Route path="/equipes/rastreamento" element={<RastreamentoCampo />} />
          
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
