import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { AdminOnly } from "@/components/AdminOnly";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Construction, Upload, ZoomIn, ZoomOut, Maximize } from "lucide-react";

const Unifilar = () => {
  const [zoom, setZoom] = useState(1);
  const [diagrams, setDiagrams] = useState<any[]>([]);
  const [selectedDiagram, setSelectedDiagram] = useState<any>(null);

  useEffect(() => {
    async function fetchDiagrams() {
      const { data, error } = await supabase
        .from('unifilar_diagrams')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setDiagrams(data);
        if (data.length > 0) {
          setSelectedDiagram(data[0]);
        }
      }
    }
    
    fetchDiagrams();
  }, []);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.5));
  const handleReset = () => setZoom(1);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Diagrama Unifilar" 
          subtitle="Visualização interativa da topologia da linha" 
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {diagrams.length === 0 ? (
            <div className="tech-card p-12 text-center max-w-2xl mx-auto">
              <Construction className="w-20 h-20 mx-auto mb-6 text-primary" />
              <h2 className="text-3xl font-bold mb-4">
                Diagrama <span className="gradient-text">Unifilar</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Nenhum diagrama disponível. 
              </p>
              <AdminOnly fallback={
                <p className="text-sm text-muted-foreground">
                  Contate um administrador para fazer upload de diagramas.
                </p>
              }>
                <Link to="/upload">
                  <Button>
                    <Upload className="w-4 h-4 mr-2" />
                    Fazer Upload de Diagrama
                  </Button>
                </Link>
              </AdminOnly>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Diagramas Unifilares Disponíveis</h2>
                
                <AdminOnly fallback={null}>
                  <Link to="/upload">
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Novo Diagrama
                    </Button>
                  </Link>
                </AdminOnly>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {diagrams.map(diagram => (
                  <Card 
                    key={diagram.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedDiagram?.id === diagram.id ? 'border-primary ring-2 ring-primary/20' : ''
                    }`}
                    onClick={() => setSelectedDiagram(diagram)}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-1">{diagram.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Código: {diagram.line_code}
                      </p>
                      {diagram.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {diagram.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {diagram.file_type.toUpperCase()}
                        </span>
                        {diagram.organization && (
                          <span className="text-xs text-muted-foreground">
                            {diagram.organization}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedDiagram && (
                <>
                  <div className="flex gap-2">
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

                  <Card className="p-6">
                    <div className="mb-4">
                      <h3 className="text-xl font-semibold mb-2">{selectedDiagram.name}</h3>
                      {selectedDiagram.description && (
                        <p className="text-muted-foreground">{selectedDiagram.description}</p>
                      )}
                    </div>

                    <div className="border rounded-lg p-4 bg-secondary/5 overflow-auto">
                      {selectedDiagram.file_type === 'svg' && (
                        <div 
                          className="w-full transition-transform duration-300"
                          style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
                        >
                          <img 
                            src={selectedDiagram.file_url} 
                            alt={selectedDiagram.name} 
                            className="w-full h-auto"
                          />
                        </div>
                      )}
                      
                      {selectedDiagram.file_type === 'json' && selectedDiagram.diagram_data && (
                        <div className="w-full overflow-auto max-h-96">
                          <pre className="text-xs bg-secondary p-4 rounded">
                            {JSON.stringify(selectedDiagram.diagram_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {(selectedDiagram.file_type === 'png' || selectedDiagram.file_type === 'jpg') && (
                        <div 
                          className="w-full transition-transform duration-300"
                          style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
                        >
                          <img 
                            src={selectedDiagram.file_url} 
                            alt={selectedDiagram.name} 
                            className="w-full h-auto rounded"
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Unifilar;
