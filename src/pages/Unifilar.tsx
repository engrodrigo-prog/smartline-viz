import { useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import FiltersBar from "@/components/FiltersBar";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";

type NoUnifilar = {
  id: string;
  tipo: "torre" | "conexao" | "sensor";
  label: string;
  x: number;
  y: number;
};

const mockNodes: NoUnifilar[] = [
  { id: "T1", tipo: "torre", label: "Torre 1", x: 100, y: 200 },
  { id: "T2", tipo: "torre", label: "Torre 2", x: 250, y: 180 },
  { id: "T3", tipo: "torre", label: "Torre 3", x: 400, y: 220 },
  { id: "C1", tipo: "conexao", label: "Conexão 1", x: 175, y: 190 },
  { id: "S1", tipo: "sensor", label: "Sensor 1", x: 325, y: 200 },
];

const Unifilar = () => {
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<NoUnifilar | null>(null);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.5));
  const handleReset = () => setZoom(1);

  const getNodeColor = (tipo: string) => {
    switch (tipo) {
      case "torre":
        return "fill-primary";
      case "conexao":
        return "fill-secondary";
      case "sensor":
        return "fill-accent";
      default:
        return "fill-muted";
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Diagrama Unifilar" 
          subtitle="Visualização interativa da topologia da linha" 
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <FiltersBar />

          {/* Controls */}
          <div className="flex gap-2 mb-4">
            <Button onClick={handleZoomIn} variant="outline" size="sm">
              <ZoomIn className="w-4 h-4 mr-2" />
              Zoom In
            </Button>
            <Button onClick={handleZoomOut} variant="outline" size="sm">
              <ZoomOut className="w-4 h-4 mr-2" />
              Zoom Out
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm">
              <Maximize className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>

          {/* SVG Diagram */}
          <div className="tech-card p-6 overflow-auto">
            <svg
              width="800"
              height="400"
              viewBox="0 0 800 400"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
              className="transition-transform duration-300"
            >
              {/* Connections */}
              <line x1="100" y1="200" x2="250" y2="180" stroke="hsl(var(--border))" strokeWidth="2" />
              <line x1="250" y1="180" x2="400" y2="220" stroke="hsl(var(--border))" strokeWidth="2" />
              <line x1="100" y1="200" x2="175" y2="190" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="5,5" />
              <line x1="250" y1="180" x2="325" y2="200" stroke="hsl(var(--accent))" strokeWidth="2" strokeDasharray="5,5" />

              {/* Nodes */}
              {mockNodes.map((node) => (
                <g
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.tipo === "torre" ? 12 : 8}
                    className={getNodeColor(node.tipo)}
                    stroke="hsl(var(--foreground))"
                    strokeWidth="2"
                  />
                  <text
                    x={node.x}
                    y={node.y + 30}
                    textAnchor="middle"
                    fill="hsl(var(--foreground))"
                    fontSize="12"
                    fontWeight="500"
                  >
                    {node.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Legend */}
          <div className="tech-card p-4 mt-4">
            <h3 className="text-sm font-semibold mb-3">Legenda</h3>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary border-2 border-foreground" />
                <span className="text-sm">Torre</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-secondary border-2 border-foreground" />
                <span className="text-sm">Conexão</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent border-2 border-foreground" />
                <span className="text-sm">Sensor</span>
              </div>
            </div>
          </div>

          {/* Node Details */}
          {selectedNode && (
            <div className="tech-card p-6 mt-4">
              <h3 className="text-lg font-semibold mb-4">Detalhes do Nó</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">ID</span>
                  <p className="font-medium">{selectedNode.id}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Tipo</span>
                  <p className="font-medium capitalize">{selectedNode.tipo}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Label</span>
                  <p className="font-medium">{selectedNode.label}</p>
                </div>
              </div>
              <button 
                className="btn-primary mt-4"
                onClick={() => setSelectedNode(null)}
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

export default Unifilar;