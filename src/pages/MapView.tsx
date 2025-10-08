import { useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import FiltersBar from "@/components/FiltersBar";
import { Leaf, Building2, Cable, Wrench, CheckCircle2, Thermometer, Plane, Clock, MapPin } from "lucide-react";

const mockEvents = [
  { id: 1, tipo: "vegetacao", lat: -23.55, lng: -46.63, criticidade: "alta", status: "pendente", data: "2025-01-15", nome: "Evento VEG-001" },
  { id: 2, tipo: "estruturas", lat: -23.58, lng: -46.65, criticidade: "média", status: "resolvido", data: "2025-01-14", nome: "Evento EST-002" },
  { id: 3, tipo: "travessias", lat: -23.52, lng: -46.60, criticidade: "baixa", status: "em análise", data: "2025-01-13", nome: "Evento TRV-003" },
  { id: 4, tipo: "sensores", lat: -23.60, lng: -46.70, criticidade: "alta", status: "pendente", data: "2025-01-12", nome: "Sensor SEN-004" },
  { id: 5, tipo: "emendas", lat: -23.53, lng: -46.68, criticidade: "média", status: "em análise", data: "2025-01-11", nome: "Emenda EMD-005" },
  { id: 6, tipo: "compliance", lat: -23.57, lng: -46.62, criticidade: "baixa", status: "resolvido", data: "2025-01-10", nome: "Compliance CMP-006" },
];

const eventIcons: Record<string, any> = {
  vegetacao: { Icon: Leaf, color: "text-green-500", bgColor: "bg-green-500/20" },
  estruturas: { Icon: Building2, color: "text-orange-500", bgColor: "bg-orange-500/20" },
  travessias: { Icon: Cable, color: "text-blue-500", bgColor: "bg-blue-500/20" },
  emendas: { Icon: Wrench, color: "text-yellow-500", bgColor: "bg-yellow-500/20" },
  compliance: { Icon: CheckCircle2, color: "text-cyan-500", bgColor: "bg-cyan-500/20" },
  sensores: { Icon: Thermometer, color: "text-purple-500", bgColor: "bg-purple-500/20" },
  drones: { Icon: Plane, color: "text-indigo-500", bgColor: "bg-indigo-500/20" },
  eventos: { Icon: Clock, color: "text-red-500", bgColor: "bg-red-500/20" },
};

const MapViewSimple = () => {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Mapa de Eventos" 
          subtitle="Visualização geográfica dos ativos e eventos" 
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <FiltersBar />

          {/* Legend */}
          <div className="tech-card p-4 mb-4">
            <h3 className="text-sm font-semibold mb-3">Legenda</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {Object.entries(eventIcons).map(([key, { Icon, color }]) => (
                <div key={key} className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-xs capitalize">{key}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Simplified Map View - Grid of Events */}
          <div className="tech-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <MapPin className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-semibold">Eventos Georreferenciados</h3>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockEvents.map((event) => {
                const { Icon, color, bgColor } = eventIcons[event.tipo] || eventIcons.eventos;
                return (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="tech-card p-4 cursor-pointer hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-3 ${bgColor} rounded-xl`}>
                        <Icon className={`w-6 h-6 ${color}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{event.nome}</h4>
                        <p className="text-xs text-muted-foreground mb-2 capitalize">{event.tipo}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>{event.lat.toFixed(2)}°, {event.lng.toFixed(2)}°</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            event.criticidade === "alta" ? "bg-destructive/20 text-destructive" :
                            event.criticidade === "média" ? "bg-secondary/20 text-secondary" :
                            "bg-primary/20 text-primary"
                          }`}>
                            {event.criticidade}
                          </span>
                          <span className="text-xs text-muted-foreground">{event.data}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event Details */}
          {selectedEvent && (
            <div className="tech-card p-6 mt-4">
              <h3 className="text-lg font-semibold mb-4">Detalhes do Evento</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Nome</span>
                  <p className="font-medium">{selectedEvent.nome}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Tipo</span>
                  <p className="font-medium capitalize">{selectedEvent.tipo}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Data</span>
                  <p className="font-medium">{selectedEvent.data}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Criticidade</span>
                  <p className="font-medium capitalize">{selectedEvent.criticidade}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Status</span>
                  <p className="font-medium capitalize">{selectedEvent.status}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Coordenadas</span>
                  <p className="font-medium text-sm">{selectedEvent.lat.toFixed(4)}°, {selectedEvent.lng.toFixed(4)}°</p>
                </div>
              </div>
              <button 
                className="btn-primary mt-4"
                onClick={() => setSelectedEvent(null)}
              >
                Fechar
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MapViewSimple;