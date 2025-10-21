import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import LegalNotice from "@/components/LegalNotice";
import { FiltersProvider } from "./context/FiltersContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
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
import UploadKml from "./pages/UploadKml";
import UploadUnificado from "./pages/upload/UploadUnificado";
import UploadHistorico from "./pages/upload/UploadHistorico";
import LayerUpload from "./pages/upload/LayerUpload";
import LayerManager from "./pages/settings/LayerManager";
import QueimadasModern from "./pages/modules/ambiental/Queimadas";
import Vegetacao from "./pages/modules/Vegetacao";
import AmbienteModule from "./modules/ambiente";
import Travessias from "./pages/modules/Travessias";
import Estruturas from "./pages/modules/Estruturas";
import AreasAlagadas from "./pages/modules/ambiental/AreasAlagadas";
import Erosao from "./pages/modules/ambiental/Erosao";
import OcupacaoFaixa from "./pages/modules/ambiental/OcupacaoFaixa";
import Emendas from "./pages/modules/estrutura/Emendas";
import VeiculosOnline from "./pages/operacao/VeiculosOnline";
import PainelSensores from "./pages/sensores/PainelSensores";
import Cameras from "./pages/sensores/Cameras";
import SensorDashboard from "./pages/sensores/SensorDashboard";
import Alertas from "./pages/sensores/Alertas";
import WeatherPanel from "./modules/Ambiental/Meteorologia/WeatherPanel";
import UploadMidiaPage from "./pages/upload/Midia";
import InspecaoTermografica from "./pages/modules/estrutura/InspecaoTermografica";
import Demandas from "./pages/operacao/Demandas";
import MissoesPage from "./pages/missoes";
import PerfilLinha from "./pages/modules/estrutura/PerfilLinha";
import ComparativoExecucao from "./pages/analytics/ComparativoExecucao";
import Legal from "./pages/Legal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ErrorBoundary>
          <FiltersProvider>
            <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/resultados" element={<Resultados />} />
          <Route path="/login" element={<Login />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/relatorios" element={<ProtectedRoute><ModulePlaceholder /></ProtectedRoute>} />
          
          {/* Visual */}
          <Route path="/visual/mapa" element={<ProtectedRoute><MapView /></ProtectedRoute>} />
          <Route path="/visual/unifilar" element={<ProtectedRoute><Unifilar /></ProtectedRoute>} />
          
          {/* Upload */}
          <Route path="/upload" element={<ProtectedRoute><UploadUnificado /></ProtectedRoute>} />
          <Route path="/upload/historico" element={<ProtectedRoute><UploadHistorico /></ProtectedRoute>} />
          <Route path="/upload/layers" element={<ProtectedRoute><LayerUpload /></ProtectedRoute>} />
          <Route path="/upload/bases" element={<ProtectedRoute><UploadBases /></ProtectedRoute>} />
          <Route path="/upload/tracados" element={<ProtectedRoute><UploadTracados /></ProtectedRoute>} />
          <Route path="/upload/kml" element={<ProtectedRoute><UploadKml /></ProtectedRoute>} />
          <Route path="/upload/midia" element={<ProtectedRoute><UploadMidiaPage /></ProtectedRoute>} />
          
          {/* Ambiental */}
          <Route path="/ambiental/alagadas" element={<ProtectedRoute><AreasAlagadas /></ProtectedRoute>} />
          <Route path="/ambiental/erosao" element={<ProtectedRoute><Erosao /></ProtectedRoute>} />
          <Route path="/ambiental/queimadas" element={<ProtectedRoute><QueimadasModern /></ProtectedRoute>} />
          <Route path="/ambiental/meteorologia" element={<ProtectedRoute><WeatherPanel /></ProtectedRoute>} />
          <Route path="/ambiental/vegetacao" element={<ProtectedRoute><Vegetacao /></ProtectedRoute>} />
          <Route path="/ambiental/ocupacao" element={<ProtectedRoute><OcupacaoFaixa /></ProtectedRoute>} />
          <Route path="/ambiental/distancia" element={<ProtectedRoute><ModulePlaceholder /></ProtectedRoute>} />
          <Route path="/ambiental/compliance" element={<ProtectedRoute><ModulePlaceholder /></ProtectedRoute>} />
          <Route path="/ambiente" element={<ProtectedRoute><AmbienteModule /></ProtectedRoute>} />
          
          {/* Estrutura */}
          <Route path="/estrutura/estruturas" element={<ProtectedRoute><Estruturas /></ProtectedRoute>} />
          <Route path="/estrutura/emendas" element={<ProtectedRoute><Emendas /></ProtectedRoute>} />
          <Route path="/estrutura/travessias" element={<ProtectedRoute><Travessias /></ProtectedRoute>} />
          <Route path="/estrutura/perfil-linha" element={<ProtectedRoute><PerfilLinha /></ProtectedRoute>} />
          <Route path="/estrutura/compliance" element={<ProtectedRoute><ModulePlaceholder /></ProtectedRoute>} />
          <Route path="/estrutura/corrosao" element={<ProtectedRoute><ModulePlaceholder /></ProtectedRoute>} />
          <Route path="/modules/estrutura/inspecao-termografica" element={<ProtectedRoute><InspecaoTermografica /></ProtectedRoute>} />
          
          {/* Sensores */}
          <Route path="/sensores/painel" element={<ProtectedRoute><PainelSensores /></ProtectedRoute>} />
          <Route path="/sensores/cameras" element={<ProtectedRoute><Cameras /></ProtectedRoute>} />
          <Route path="/sensores/dashboard" element={<ProtectedRoute><SensorDashboard /></ProtectedRoute>} />
          <Route path="/sensores/alertas" element={<ProtectedRoute><Alertas /></ProtectedRoute>} />
          
          {/* Operação */}
          <Route path="/operacao/missoes" element={<ProtectedRoute><MissoesPage /></ProtectedRoute>} />
          <Route path="/operacao/demandas" element={<ProtectedRoute><Demandas /></ProtectedRoute>} />
          <Route path="/operacao/eventos" element={<ProtectedRoute><ModulePlaceholder /></ProtectedRoute>} />
          <Route path="/operacao/veiculos" element={<ProtectedRoute><VeiculosOnline /></ProtectedRoute>} />
          <Route path="/operacao/compliance" element={<ProtectedRoute><ModulePlaceholder /></ProtectedRoute>} />
          <Route path="/operacao/relatorios" element={<ProtectedRoute><ModulePlaceholder /></ProtectedRoute>} />
          
          {/* Análises Avançadas */}
          <Route path="/analytics/comparativo" element={<ProtectedRoute><ComparativoExecucao /></ProtectedRoute>} />
          <Route path="/analises/gemeo-digital" element={<ProtectedRoute><ModulePlaceholder /></ProtectedRoute>} />
          <Route path="/fiscalizacao/obras" element={<ProtectedRoute><ModulePlaceholder /></ProtectedRoute>} />
          <Route path="/auditorias/qualidade" element={<ProtectedRoute><ModulePlaceholder /></ProtectedRoute>} />
          
          {/* Configurações */}
          <Route path="/config/geral" element={<ProtectedRoute><ModulePlaceholder /></ProtectedRoute>} />
          <Route path="/config/usuarios" element={<ProtectedRoute><ModulePlaceholder /></ProtectedRoute>} />
          <Route path="/config/permissoes" element={<ProtectedRoute><ModulePlaceholder /></ProtectedRoute>} />
          <Route path="/config/layers" element={<ProtectedRoute><LayerManager /></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
            </Routes>
            <LegalNotice />
          </FiltersProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
