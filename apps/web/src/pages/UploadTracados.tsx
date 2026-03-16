import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileCheck, CheckCircle, ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import GeodataClassificationTable from "@/components/GeodataClassificationTable";
import QgisProjectIntake from "@/components/upload/QgisProjectIntake";
import { postJSON } from "@/services/api";

const getExtension = (fileName: string) => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".gpkg")) return ".gpkg";
  if (lower.endsWith(".kmz")) return ".kmz";
  if (lower.endsWith(".kml")) return ".kml";
  if (lower.endsWith(".zip")) return ".zip";
  return lower.slice(lower.lastIndexOf("."));
};

const isInteractiveFormat = (extension: string) => extension === ".kml" || extension === ".kmz";

type ImportMetadataState = {
  empresa: string;
  regiao: string;
  line_code: string;
  line_name: string;
  tensao_kv: string;
  concessao: string;
  reference_date: string;
};

const emptyImportMetadata: ImportMetadataState = {
  empresa: "",
  regiao: "",
  line_code: "",
  line_name: "",
  tensao_kv: "",
  concessao: "",
  reference_date: new Date().toISOString().slice(0, 10),
};

const UploadTracados = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<any>(null);
  const [features, setFeatures] = useState<any[]>([]);
  const [classifications, setClassifications] = useState<Record<string, { classification: string; customClassification?: string }>>({});
  const [importMetadata, setImportMetadata] = useState<ImportMetadataState>(emptyImportMetadata);
  const navigate = useNavigate();

  const validateMetadata = () => {
    if (!importMetadata.empresa.trim()) return "Informe a empresa.";
    if (!importMetadata.regiao.trim()) return "Informe a região.";
    if (!importMetadata.line_code.trim()) return "Informe o código da linha.";
    if (!importMetadata.line_name.trim()) return "Informe o nome da linha.";
    if (!importMetadata.tensao_kv.trim()) return "Informe o nível de tensão.";
    if (!importMetadata.reference_date.trim()) return "Informe a data de referência.";
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.kml', '.kmz', '.zip', '.gpkg'];
    const extension = getExtension(file.name);
    
    if (!validExtensions.includes(extension)) {
      toast.error("Formato inválido. Use KML, KMZ, GPKG ou ZIP com conjunto SHP.");
      return;
    }
    
    setSelectedFile(file);
    setProcessingResult(null);
    setUploadedFilePath(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    const metadataError = validateMetadata();
    if (metadataError) {
      toast.error(metadataError);
      return;
    }

    if (!supabase) {
      toast.error("Supabase não configurado", {
        description: "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para usar o upload de geodados.",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Step 1: Upload file to storage
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const extension = getExtension(selectedFile.name);
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileName = `${user.id}/${Date.now()}_${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('geodata-uploads')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;
      setUploadedFilePath(fileName);

      if (extension === ".gpkg") {
        const data = await postJSON<{
          success: boolean;
          mode: string;
          stats: { linhas: number; estruturas: number; outros: number };
          errors: string[];
          importedFeatures: number;
        }>("/geodata/import-tracado", {
          storagePath: fileName,
          fileType: extension,
          metadata: {
            ...importMetadata,
            tensao_kv: Number(importMetadata.tensao_kv),
            concessao: importMetadata.concessao.trim() || undefined,
          },
        });

        setProcessingResult({
          ...data,
          storagePath: fileName,
          fileType: "GeoPackage (.gpkg)",
        });
        setCurrentStep(4);

        if (data.success) {
          toast.success("GeoPackage importado no catálogo geoespacial", {
            description: `${data.stats.linhas} linhas, ${data.stats.estruturas} estruturas e ${data.stats.outros} geometrias auxiliares.`,
          });
        } else {
          toast.error("Importação do GeoPackage concluída com erros", {
            description: data.errors[0] ?? "Revise os detalhes da importação.",
          });
        }
        return;
      }

      if (extension === ".zip") {
        setProcessingResult({
          success: true,
          mode: "postgis_queue",
          fileType: "Shapefile ZIP (.zip)",
          storagePath: fileName,
          stats: { linhas: 0, estruturas: 0, eventos: 0, outros: 0 },
          errors: [],
          metadata: importMetadata,
        });
        setCurrentStep(4);
        toast.success("ZIP enviado para ingestão assistida", {
          description: "O parser automático do app ainda não cobre SHP ZIP; use GPKG ou KML/KMZ para publicação imediata.",
        });
        return;
      }

      toast.success("Arquivo carregado", {
        description: "Processando geometrias...",
      });

      // Step 2: Process file with edge function
      const { data, error: processError } = await supabase.functions.invoke('process-geodata', {
        body: { filePath: fileName, importMetadata },
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
    const metadataError = validateMetadata();
    if (metadataError) {
      toast.error(metadataError);
      return;
    }
    if (!supabase) {
      toast.error("Supabase não configurado", {
        description: "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para finalizar a importação.",
      });
      return;
    }

    setIsProcessing(true);
    setCurrentStep(3);

    try {
      if (!uploadedFilePath) {
        throw new Error("Arquivo enviado não encontrado. Refaça o upload antes de finalizar.");
      }

      // Get staging features and prepare classifications
      const { data: stagingData, error: stagingError } = await supabase
        .from('geodata_staging')
        .select('id')
        .eq('file_name', uploadedFilePath);

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
          fileName: uploadedFilePath,
          importMetadata,
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
    <AppLayout title="Upload de Geodados" subtitle="Porta oficial para KML/KMZ, GeoPackage e conjuntos SHP ZIP">
      <div className="max-w-4xl mx-auto">
        <QgisProjectIntake />

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
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload QGIS / PostGIS
              </CardTitle>
              <CardDescription>
                Esta é a tela certa para enviar arquivos geoespaciais. KML/KMZ seguem para classificação imediata; GPKG e SHP ZIP ficam armazenados no bucket oficial para ingestão PostGIS.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">Classificação imediata</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use <span className="font-medium text-foreground">KML</span> ou <span className="font-medium text-foreground">KMZ</span> quando quiser revisar as geometrias dentro do app antes de importar.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">Ingestão QGIS / PostGIS</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use <span className="font-medium text-foreground">GeoPackage (.gpkg)</span> ou <span className="font-medium text-foreground">ZIP com conjunto SHP</span> para o fluxo de banco geoespacial.
                  </p>
                </div>
              </div>

              <div
                className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  {selectedFile ? selectedFile.name : 'Clique para selecionar ou arraste o arquivo aqui'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Formatos suportados: KML, KMZ, GPKG, ZIP (conjunto SHP)
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  O upload é sempre feito no bucket <span className="font-mono">geodata-uploads</span>.
                </p>
                <input
                  id="file-upload"
                  type="file"
                  accept=".kml,.kmz,.gpkg,.zip"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="mb-4">
                  <p className="text-sm font-semibold">Metadados operacionais do traçado</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Esses campos alimentam o catálogo geoespacial e os filtros de empresa, região, linha, tensão e data.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="empresa">Empresa</Label>
                    <Input id="empresa" value={importMetadata.empresa} onChange={(e) => setImportMetadata((prev) => ({ ...prev, empresa: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regiao">Região</Label>
                    <Input id="regiao" value={importMetadata.regiao} onChange={(e) => setImportMetadata((prev) => ({ ...prev, regiao: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="line_code">Código da linha</Label>
                    <Input id="line_code" value={importMetadata.line_code} onChange={(e) => setImportMetadata((prev) => ({ ...prev, line_code: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="line_name">Nome da linha</Label>
                    <Input id="line_name" value={importMetadata.line_name} onChange={(e) => setImportMetadata((prev) => ({ ...prev, line_name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tensao_kv">Nível de tensão (kV)</Label>
                    <Input id="tensao_kv" inputMode="numeric" value={importMetadata.tensao_kv} onChange={(e) => setImportMetadata((prev) => ({ ...prev, tensao_kv: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference_date">Data de referência</Label>
                    <Input id="reference_date" type="date" value={importMetadata.reference_date} onChange={(e) => setImportMetadata((prev) => ({ ...prev, reference_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="concessao">Concessão / observação</Label>
                    <Input id="concessao" value={importMetadata.concessao} onChange={(e) => setImportMetadata((prev) => ({ ...prev, concessao: e.target.value }))} />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                {isUploading
                  ? 'Enviando...'
                  : selectedFile && isInteractiveFormat(getExtension(selectedFile.name))
                    ? 'Processar Arquivo'
                    : 'Enviar para Ingestão PostGIS'}
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
                {processingResult.mode === "postgis_queue"
                  ? "Arquivo enviado para a fila de ingestão QGIS/PostGIS"
                  : processingResult.success
                    ? 'Importação concluída com sucesso'
                    : 'Importação concluída com alguns erros'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {processingResult.mode === "postgis_queue" ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-sm font-semibold">Formato recebido</p>
                    <p className="text-sm text-muted-foreground mt-1">{processingResult.fileType}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-sm font-semibold">Caminho no bucket</p>
                    <p className="text-sm text-muted-foreground mt-1 break-all font-mono">
                      {processingResult.storagePath}
                    </p>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <p className="text-sm font-semibold">Próximo passo</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      O arquivo ficou salvo no bucket oficial, mas o parser automático do app ainda não cobre SHP ZIP. Use GPKG para publicação imediata ou finalize pelo conector QGIS/PostGIS.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Esta tela é o ponto oficial para upload de GeoPackage e conjuntos SHP ZIP.
                    </p>
                  </div>
                </div>
              ) : processingResult.mode === "gpkg_import" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-primary">{processingResult.stats.linhas}</p>
                      <p className="text-sm text-muted-foreground">Linhas</p>
                    </div>
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-primary">{processingResult.stats.estruturas}</p>
                      <p className="text-sm text-muted-foreground">Estruturas</p>
                    </div>
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-primary">{processingResult.stats.outros}</p>
                      <p className="text-sm text-muted-foreground">Outros</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-sm font-semibold">Arquivo importado</p>
                    <p className="text-sm text-muted-foreground mt-1 break-all font-mono">
                      {processingResult.storagePath}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Features lidas do GeoPackage: {processingResult.importedFeatures}
                    </p>
                  </div>
                </div>
              ) : (
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
              )}

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
                setUploadedFilePath(null);
                setProcessingResult(null);
                setFeatures([]);
                setClassifications({});
                setImportMetadata(emptyImportMetadata);
              }}>
                Novo Upload
              </Button>
              <Button onClick={() => navigate('/visual/mapa')}>
                Ir para o mapa
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
