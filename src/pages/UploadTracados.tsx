import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, Map, FileCheck, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type TipoGeodado = "linhas" | "estruturas" | "concessoes";

const UploadTracados = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState<TipoGeodado>("linhas");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validExtensions = ['.kml', '.kmz', '.zip'];
      const fileExt = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExt)) {
        toast.error("Formato inválido. Use KML, KMZ ou ZIP (Shapefile)");
        return;
      }
      
      setFile(selectedFile);
      toast.success("Arquivo selecionado");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecione um arquivo");
      return;
    }

    setUploading(true);
    try {
      // Upload para storage
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('geodata-uploads')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      toast.success("Upload realizado com sucesso!");
      toast.info("Processamento será implementado em breve");
      
      setTimeout(() => {
        navigate('/ambiental/queimadas');
      }, 2000);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Erro no upload: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout title="Upload de Geodados" subtitle="Importar traçados e estruturas">
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[
            { num: 1, label: "Arquivo" },
            { num: 2, label: "Tipo" },
            { num: 3, label: "Revisão" }
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= s.num ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {s.num}
              </div>
              <span className="ml-2 text-sm font-medium">{s.label}</span>
              {idx < 2 && <div className={`flex-1 h-0.5 mx-4 ${step > s.num ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Selecionar Arquivo
              </CardTitle>
              <CardDescription>
                Formatos aceitos: KML, KMZ, ZIP (Shapefile)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <input
                  type="file"
                  accept=".kml,.kmz,.zip"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span>Escolher Arquivo</span>
                  </Button>
                </label>
                {file && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Arquivo selecionado: <span className="font-medium">{file.name}</span>
                  </p>
                )}
              </div>
              
              <div className="flex justify-end mt-6">
                <Button onClick={() => setStep(2)} disabled={!file}>
                  Próximo <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Tipo */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="w-5 h-5" />
                Tipo de Geodado
              </CardTitle>
              <CardDescription>
                Selecione o tipo de feature geográfica
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as TipoGeodado)}>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="linhas" id="linhas" />
                    <Label htmlFor="linhas" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Linhas de Transmissão</div>
                      <div className="text-sm text-muted-foreground">Geometria: LineString</div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="estruturas" id="estruturas" />
                    <Label htmlFor="estruturas" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Estruturas (Torres)</div>
                      <div className="text-sm text-muted-foreground">Geometria: Point</div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="concessoes" id="concessoes" />
                    <Label htmlFor="concessoes" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Concessões</div>
                      <div className="text-sm text-muted-foreground">Geometria: Polygon/MultiPolygon</div>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
              
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>
                <Button onClick={() => setStep(3)}>
                  Próximo <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Revisão */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                Revisão Final
              </CardTitle>
              <CardDescription>
                Confirme as informações antes de importar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between p-4 bg-muted rounded-lg">
                  <span className="font-medium">Arquivo:</span>
                  <span className="text-muted-foreground">{file?.name}</span>
                </div>
                <div className="flex justify-between p-4 bg-muted rounded-lg">
                  <span className="font-medium">Tipo:</span>
                  <span className="text-muted-foreground capitalize">{tipo}</span>
                </div>
                <div className="flex justify-between p-4 bg-muted rounded-lg">
                  <span className="font-medium">Tamanho:</span>
                  <span className="text-muted-foreground">
                    {file ? (file.size / 1024 / 1024).toFixed(2) : 0} MB
                  </span>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  <strong>Nota:</strong> O arquivo será reprojetado para EPSG:4326 automaticamente.
                  Duplicados serão ignorados com base no código.
                </p>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)} disabled={uploading}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? "Importando..." : "Confirmar Importação"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default UploadTracados;