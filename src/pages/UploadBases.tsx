import { useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Upload, File, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type UploadedFile = {
  file: File;
  preview?: string;
  regiao?: string;
  linha?: string;
  ramal?: string;
  categoria?: string;
  descricao?: string;
};

const UploadBases = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((file) => ({
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      }));
      setFiles([...files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast({
      title: "Arquivos salvos!",
      description: `${files.length} arquivo(s) classificado(s) com sucesso.`,
    });
    setFiles([]);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Upload de Bases" 
          subtitle="Importação e classificação de arquivos" 
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dropzone */}
            <div className="tech-card p-6">
              <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 transition-colors">
                <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
                <p className="mb-3 text-foreground">Arraste e solte arquivos aqui, ou clique para selecionar</p>
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.mp3,.wav,.csv,.xlsx,.pdf,.txt,.md"
                  onChange={handleFileChange}
                  className="hidden"
                  id="fileUpload"
                />
                <label htmlFor="fileUpload" className="btn-primary cursor-pointer inline-block">
                  Selecionar Arquivos
                </label>
                <div className="mt-4 text-xs text-muted-foreground">
                  Tipos aceitos: JPG/PNG, MP3/WAV, CSV/XLSX, PDF/TXT/MD
                </div>
              </div>

              {/* Classification Fields */}
              {files.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Região *</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="A">Região A</option>
                      <option value="B">Região B</option>
                      <option value="C">Região C</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Linha *</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="LT-001">LT-001 - Linha 1 SP Norte</option>
                      <option value="LT-002">LT-002 - Linha 2 SP Sul</option>
                      <option value="LT-003">LT-003 - Linha 3 RJ</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Ramal *</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="R1">Ramal R1</option>
                      <option value="R2">Ramal R2</option>
                      <option value="R3">Ramal R3</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Categoria *</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="travessia">Travessia</option>
                      <option value="invasao">Invasão de Faixa</option>
                      <option value="estrutura">Estrutura</option>
                      <option value="termografia">Termografia</option>
                      <option value="emenda">Emenda</option>
                      <option value="vegetacao">Vegetação</option>
                      <option value="compliance">Compliance</option>
                      <option value="corrosao">Corrosão</option>
                      <option value="furto">Furto</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium mb-2 block">Descrição (opcional)</label>
                    <Input
                      className="bg-input border-border"
                      maxLength={200}
                      placeholder="Descrição (até 200 caracteres)"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* File Previews */}
            {files.length > 0 && (
              <div className="tech-card p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Arquivos Selecionados ({files.length})
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {files.map((item, index) => (
                    <div key={index} className="relative tech-card p-4">
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      
                      {item.preview ? (
                        <img
                          src={item.preview}
                          alt={item.file.name}
                          className="w-full h-32 object-cover rounded-lg mb-2"
                        />
                      ) : (
                        <div className="w-full h-32 bg-muted rounded-lg mb-2 flex items-center justify-center">
                          <File className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      
                      <p className="text-sm font-medium truncate">{item.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(item.file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            {files.length > 0 && (
              <div className="flex justify-end">
                <Button type="submit" className="btn-primary">
                  Salvar Cadastro
                </Button>
              </div>
            )}
          </form>
        </main>
      </div>
    </div>
  );
};

export default UploadBases;