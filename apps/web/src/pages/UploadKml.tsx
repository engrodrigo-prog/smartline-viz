import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, FileUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AppLayout from "@/components/AppLayout";
import { EMPRESAS, REGIOES_POR_EMPRESA, TIPOS_MATERIAL, NIVEIS_TENSAO } from "@/lib/empresasRegioes";

const UploadKml = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // Upload KML form
  const [empresa, setEmpresa] = useState("");
  const [regiao, setRegiao] = useState("");
  const [linhaPrefixo, setLinhaPrefixo] = useState("");
  const [linhaCodigo, setLinhaCodigo] = useState("");
  const [nomeMaterial, setNomeMaterial] = useState("");
  const [tensaoKv, setTensaoKv] = useState("");

  // Manual entry form
  const [manualEmpresa, setManualEmpresa] = useState("");
  const [manualRegiao, setManualRegiao] = useState("");
  const [manualPrefixo, setManualPrefixo] = useState("");
  const [manualCodigo, setManualCodigo] = useState("");
  const [manualRamal, setManualRamal] = useState("");
  const [manualEstrutura, setManualEstrutura] = useState("");
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [manualAlt, setManualAlt] = useState("");
  const [manualMaterial, setManualMaterial] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.toLowerCase();
      if (ext.endsWith('.kml') || ext.endsWith('.kmz')) {
        setFile(selectedFile);
      } else {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione um arquivo KML ou KMZ",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        title: "Arquivo não selecionado",
        description: "Por favor, selecione um arquivo KML/KMZ",
        variant: "destructive",
      });
      return;
    }

    if (!supabase) {
      toast({
        title: "Supabase não configurado",
        description: "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para usar upload/processamento.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Não autenticado",
          description: "Por favor, faça login para fazer upload",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      // Prepare metadata
      const metadata = {
        empresa,
        regiao,
        linha_prefixo: linhaPrefixo,
        linha_codigo: linhaCodigo,
        nome_material: nomeMaterial,
        tensao_kv: tensaoKv,
      };

      // Call edge function to parse KML
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify(metadata));

      const { data, error } = await supabase.functions.invoke('parse-kml', {
        body: formData,
      });

      if (error) throw error;

      toast({
        title: "✅ Upload concluído!",
        description: data.message || "Arquivo processado com sucesso",
      });

      // Reset form
      setFile(null);
      setEmpresa("");
      setRegiao("");
      setLinhaPrefixo("");
      setLinhaCodigo("");
      setNomeMaterial("");
      setTensaoKv("");
      
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erro no upload",
        description: error.message || "Não foi possível processar o arquivo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!supabase) {
        toast({
          title: "Supabase não configurado",
          description: "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para cadastrar estrutura.",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Não autenticado",
          description: "Por favor, faça login",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      const { data, error } = await supabase.functions.invoke('add-manual-structure', {
        body: {
          empresa: manualEmpresa,
          regiao: manualRegiao,
          linha_prefixo: manualPrefixo,
          linha_codigo: manualCodigo,
          ramal: manualRamal,
          estrutura: manualEstrutura,
          latitude: manualLat,
          longitude: manualLon,
          altitude: manualAlt,
          nome_material: manualMaterial,
        },
      });

      if (error) throw error;

      toast({
        title: "✅ Estrutura adicionada!",
        description: "Estrutura cadastrada com sucesso",
      });

      // Reset form
      setManualEmpresa("");
      setManualRegiao("");
      setManualPrefixo("");
      setManualCodigo("");
      setManualRamal("");
      setManualEstrutura("");
      setManualLat("");
      setManualLon("");
      setManualAlt("");
      setManualMaterial("");
      setDialogOpen(false);
      
    } catch (error: any) {
      console.error('Manual entry error:', error);
      toast({
        title: "Erro ao adicionar",
        description: error.message || "Não foi possível adicionar a estrutura",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Upload de Dados Geográficos">
      <div className="container mx-auto p-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold gradient-text">Gerenciamento de Dados Geográficos</h1>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Estrutura Manual
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>📝 Adicionar Estrutura Manualmente</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="manual-empresa">Empresa</Label>
                      <Select value={manualEmpresa} onValueChange={setManualEmpresa} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CPFL Piratininga">CPFL Piratininga</SelectItem>
                          <SelectItem value="CPFL Santa Cruz">CPFL Santa Cruz</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="manual-regiao">Região</Label>
                      <Select value={manualRegiao} onValueChange={setManualRegiao} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DJTB-Baixada">DJTB-Baixada</SelectItem>
                          <SelectItem value="DJTV-Itapetininga">DJTV-Itapetininga</SelectItem>
                          <SelectItem value="DJTV-Piraju">DJTV-Piraju</SelectItem>
                          <SelectItem value="DJTV-Sul">DJTV-Sul</SelectItem>
                          <SelectItem value="DJTV-Sudeste">DJTV-Sudeste</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="manual-prefixo">Prefixo da Linha</Label>
                      <Select value={manualPrefixo} onValueChange={setManualPrefixo} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LT">LT</SelectItem>
                          <SelectItem value="RAE">RAE</SelectItem>
                          <SelectItem value="RAC">RAC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="manual-codigo">Código da Linha</Label>
                      <Input
                        id="manual-codigo"
                        value={manualCodigo}
                        onChange={(e) => setManualCodigo(e.target.value)}
                        placeholder="Ex: 123"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="manual-ramal">Ramal</Label>
                      <Input
                        id="manual-ramal"
                        value={manualRamal}
                        onChange={(e) => setManualRamal(e.target.value)}
                        placeholder="Ex: R1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="manual-estrutura">Estrutura</Label>
                      <Input
                        id="manual-estrutura"
                        value={manualEstrutura}
                        onChange={(e) => setManualEstrutura(e.target.value)}
                        placeholder="Ex: T001"
                      />
                    </div>

                    <div>
                      <Label htmlFor="manual-lat">Latitude</Label>
                      <Input
                        id="manual-lat"
                        type="number"
                        step="any"
                        value={manualLat}
                        onChange={(e) => setManualLat(e.target.value)}
                        placeholder="-23.5505"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="manual-lon">Longitude</Label>
                      <Input
                        id="manual-lon"
                        type="number"
                        step="any"
                        value={manualLon}
                        onChange={(e) => setManualLon(e.target.value)}
                        placeholder="-46.6333"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="manual-alt">Altitude (m)</Label>
                      <Input
                        id="manual-alt"
                        type="number"
                        step="any"
                        value={manualAlt}
                        onChange={(e) => setManualAlt(e.target.value)}
                        placeholder="760"
                      />
                    </div>

                    <div>
                      <Label htmlFor="manual-material">Nome do Material</Label>
                      <Input
                        id="manual-material"
                        value={manualMaterial}
                        onChange={(e) => setManualMaterial(e.target.value)}
                        placeholder="Concreto"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Salvando..." : "Adicionar Estrutura"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="tech-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <FileUp className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">📁 Enviar Linha (KML/KMZ)</h2>
            </div>

            <form onSubmit={handleUpload} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="empresa">Empresa *</Label>
                  <Select value={empresa} onValueChange={(val) => { setEmpresa(val); setRegiao(""); }} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPRESAS.map(emp => (
                        <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="regiao">Região *</Label>
                  <Select value={regiao} onValueChange={setRegiao} required disabled={!empresa}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a região" />
                    </SelectTrigger>
                    <SelectContent>
                      {(REGIOES_POR_EMPRESA[empresa] || []).map(reg => (
                        <SelectItem key={reg} value={reg}>{reg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="prefixo">Prefixo da Linha *</Label>
                  <Select value={linhaPrefixo} onValueChange={setLinhaPrefixo} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o prefixo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LT">LT</SelectItem>
                      <SelectItem value="RAE">RAE</SelectItem>
                      <SelectItem value="RAC">RAC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="codigo">Código da Linha *</Label>
                  <Input
                    id="codigo"
                    value={linhaCodigo}
                    onChange={(e) => setLinhaCodigo(e.target.value)}
                    placeholder="Ex: 123"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="material">Tipo de Material</Label>
                  <Select value={nomeMaterial} onValueChange={setNomeMaterial}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o material" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_MATERIAL.map(tipo => (
                        <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tensao">Nível de Tensão</Label>
                  <Select value={tensaoKv} onValueChange={setTensaoKv}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a tensão" />
                    </SelectTrigger>
                    <SelectContent>
                      {NIVEIS_TENSAO.map(tensao => (
                        <SelectItem key={tensao} value={tensao}>{tensao}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="file">Arquivo KML/KMZ *</Label>
                  <div className="relative">
                    <Input
                      id="file"
                      type="file"
                      accept=".kml,.kmz"
                      onChange={handleFileChange}
                      required
                      className="cursor-pointer"
                    />
                    <Upload className="absolute right-3 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
                  </div>
                  {file && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Arquivo selecionado: {file.name}
                    </p>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Processando..." : "Fazer Upload"}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default UploadKml;
