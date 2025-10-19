import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileCheck, CheckCircle, ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import GeodataClassificationTable from "@/components/GeodataClassificationTable";

const UploadTracados = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<any>(null);
  const [features, setFeatures] = useState<any[]>([]);
  const [classifications, setClassifications] = useState<Record<string, { classification: string; customClassification?: string }>>({});
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.kml', '.kmz', '.zip'];
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(extension)) {
      toast.error("Formato inválido. Use KML, KMZ ou ZIP");
      return;
    }
    
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    
    try {
      // Step 1: Upload file to storage
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('geodata-uploads')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      toast.success("Arquivo carregado", {
        description: "Processando geometrias...",
      });

      // Step 2: Process file with edge function
      const { data, error: processError } = await supabase.functions.invoke('process-geodata', {
        body: { filePath: fileName },
      });

      if (processError) throw processError;

      if (data.success && data.features) {
        setFeatures(data.features);
        // Initialize classifications
        const initialClassifications: Record<string, any> = {};
        data.features.forEach((f: any, idx: number) => {
          initialClassifications[`${idx}`] = {
            classification: f.type === 'Point' ? 'estrutura' : f.type === 'LineString' ? 'linha' : 'outros',
            customClassification: '',
          };
        });
        setClassifications(initialClassifications);
        setCurrentStep(2);
        
        toast.success("Arquivo processado!", {
          description: `${data.features.length} features detectadas`,
        });
      } else {
        toast.error("Erro no processamento");
      }
    } catch (error: any) {
      console.error('Error processing file:', error);
      toast.error("Erro no processamento", {
        description: error.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFinalize = async () => {
    setIsProcessing(true);
    setCurrentStep(3);

    try {
      // Get staging features and prepare classifications
      const { data: stagingData, error: stagingError } = await supabase
        .from('geodata_staging')
        .select('id')
        .eq('file_name', selectedFile?.name || '');

      if (stagingError) throw stagingError;

      const classificationsArray = stagingData?.map((item: any, idx: number) => ({
        id: item.id,
        classification: classifications[`${idx}`]?.classification || 'outros',
        customClassification: classifications[`${idx}`]?.customClassification,
      })) || [];

      // Call finalize edge function
      const { data, error: finalizeError } = await supabase.functions.invoke('finalize-geodata', {
        body: { 
          classifications: classificationsArray,
          fileName: selectedFile?.name,
        },
      });

      if (finalizeError) throw finalizeError;

      setProcessingResult(data);
      setCurrentStep(4);

      if (data.success) {
        toast.success("Importação concluída!", {
          description: `Importados: ${data.stats.linhas} linhas, ${data.stats.estruturas} estruturas, ${data.stats.eventos} eventos, ${data.stats.outros} outros`,
        });
      } else {
        toast.error("Importação com erros", {
          description: "Verifique os detalhes abaixo",
        });
      }
    } catch (error: any) {
      console.error('Error finalizing:', error);
      toast.error("Erro na importação", {
        description: error.message,
      });
      setCurrentStep(2);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AppLayout title="Upload de Geodados" subtitle="Importar traçados e estruturas">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                1
              </div>
              <span className="ml-2 font-medium">Upload</span>
            </div>
            
            <div className="flex-1 h-1 mx-4 bg-muted">
              <div className={`h-full ${currentStep >= 2 ? 'bg-primary' : 'bg-muted'} transition-all`} />
            </div>
            
            <div className={`flex items-center ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                2
              </div>
              <span className="ml-2 font-medium">Revisar</span>
            </div>
            
            <div className="flex-1 h-1 mx-4 bg-muted">
              <div className={`h-full ${currentStep >= 3 ? 'bg-primary' : 'bg-muted'} transition-all`} />
            </div>
            
            <div className={`flex items-center ${currentStep >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                3
              </div>
              <span className="ml-2 font-medium">Processar</span>
            </div>

            <div className="flex-1 h-1 mx-4 bg-muted">
              <div className={`h-full ${currentStep >= 4 ? 'bg-primary' : 'bg-muted'} transition-all`} />
            </div>
            
            <div className={`flex items-center ${currentStep >= 4 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= 4 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                4
              </div>
              <span className="ml-2 font-medium">Resultado</span>
            </div>
          </div>
        </div>

        {currentStep === 1 && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload de Geodados
              </CardTitle>
              <CardDescription>
                Faça upload de arquivos KML, KMZ ou Shapefile (ZIP). O sistema detectará automaticamente os tipos de geometria.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  {selectedFile ? selectedFile.name : 'Clique para selecionar ou arraste o arquivo aqui'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Formatos suportados: KML, KMZ, ZIP (Shapefile)
                </p>
                <input
                  id="file-upload"
                  type="file"
                  accept=".kml,.kmz,.zip"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? 'Processando...' : 'Processar Arquivo'}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                Classificar Features
              </CardTitle>
              <CardDescription>
                Classifique as geometrias detectadas no arquivo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <GeodataClassificationTable
                features={features}
                classifications={classifications}
                onClassificationChange={(index, classification) => {
                  setClassifications(prev => ({
                    ...prev,
                    [index]: { ...prev[index], classification },
                  }));
                }}
                onCustomClassificationChange={(index, customClassification) => {
                  setClassifications(prev => ({
                    ...prev,
                    [index]: { ...prev[index], customClassification },
                  }));
                }}
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Voltar
              </Button>
              <Button onClick={handleFinalize} disabled={isProcessing}>
                {isProcessing ? 'Processando...' : 'Confirmar e Importar'}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {currentStep === 3 && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 animate-pulse" />
                Processando Geodados
              </CardTitle>
              <CardDescription>
                Aguarde enquanto analisamos o arquivo e importamos as geometrias...
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm text-muted-foreground">Detectando e importando geometrias</p>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && processingResult && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {processingResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-destructive" />
                )}
                Resultado da Importação
              </CardTitle>
              <CardDescription>
                {processingResult.success 
                  ? 'Importação concluída com sucesso'
                  : 'Importação concluída com alguns erros'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{processingResult.stats.linhas}</p>
                  <p className="text-sm text-muted-foreground">Linhas</p>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{processingResult.stats.estruturas}</p>
                  <p className="text-sm text-muted-foreground">Estruturas</p>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{processingResult.stats.eventos}</p>
                  <p className="text-sm text-muted-foreground">Eventos</p>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{processingResult.stats.outros}</p>
                  <p className="text-sm text-muted-foreground">Outros</p>
                </div>
              </div>

              {processingResult.errors && processingResult.errors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="font-medium text-destructive mb-2">Erros:</p>
                  <ul className="text-sm text-destructive/80 space-y-1">
                    {processingResult.errors.slice(0, 5).map((error: string, i: number) => (
                      <li key={i}>• {error}</li>
                    ))}
                    {processingResult.errors.length > 5 && (
                      <li>... e mais {processingResult.errors.length - 5} erros</li>
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => {
                setCurrentStep(1);
                setSelectedFile(null);
                setProcessingResult(null);
                setFeatures([]);
                setClassifications({});
              }}>
                Novo Upload
              </Button>
              <Button onClick={() => navigate('/dashboard')}>
                Ir para Dashboard
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default UploadTracados;
