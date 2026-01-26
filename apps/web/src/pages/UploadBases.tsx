import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Upload, File, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLipowerlineLinhas } from "@/hooks/useLipowerlineLinhas";
import { SHOULD_USE_DEMO_API } from "@/lib/demoApi";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileAsset, listFileAssets } from "@/services/fileAssets";

type SelectedFile = {
  file: File;
  preview?: string;
};

const UploadBases = () => {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const { toast } = useToast();
  const linhasQuery = useLipowerlineLinhas();
  const queryClient = useQueryClient();

  const [lineCode, setLineCode] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [ramal, setRamal] = useState("");
  const [regiao, setRegiao] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [saving, setSaving] = useState(false);

  const formatBytes = (bytes: number) => {
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
  };

  const fileAssetsQuery = useQuery({
    queryKey: ["file-assets", lineCode],
    queryFn: () => listFileAssets({ lineCode }),
    enabled: Boolean(lineCode) && !SHOULD_USE_DEMO_API,
    staleTime: 30_000,
  });

  const canUseSupabase = Boolean(supabase) && !SHOULD_USE_DEMO_API;

  const sortedCatalog = useMemo(() => {
    const rows = fileAssetsQuery.data ?? [];
    return [...rows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }, [fileAssetsQuery.data]);

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

  const sanitizeFilename = (name: string) => {
    const normalized = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    return normalized
      .replace(/[^\w.-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 160);
  };

  const parseOptionalNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : undefined;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canUseSupabase) {
      toast({
        title: "Upload indisponível",
        description: "Este ambiente está em modo demo (ou sem Supabase configurado).",
        variant: "destructive",
      });
      return;
    }

    if (!lineCode) {
      toast({ title: "Selecione uma linha", description: "Informe a linha para catalogar os arquivos.", variant: "destructive" });
      return;
    }

    if (!category) {
      toast({ title: "Selecione uma categoria", description: "Informe a categoria para catalogar os arquivos.", variant: "destructive" });
      return;
    }

    if (!files.length) {
      toast({ title: "Nenhum arquivo selecionado", description: "Adicione ao menos um arquivo.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: authData, error: authError } = await supabase!.auth.getUser();
      if (authError || !authData?.user) {
        throw new Error("Sessão inválida. Faça login novamente.");
      }

      const userId = authData.user.id;

      const { data: appUser, error: appUserError } = await supabase!
        .from("app_user")
        .select("tenant_id")
        .eq("id", userId)
        .maybeSingle();

      if (appUserError) throw appUserError;

      const tenantId = (appUser?.tenant_id as string | null | undefined) ?? null;
      if (!tenantId) {
        throw new Error("Empresa (tenant) não definida. Faça a ingestão de uma linha (KML/KMZ) primeiro.");
      }

      const latNum = parseOptionalNumber(lat);
      const lonNum = parseOptionalNumber(lon);
      const hasCoords = typeof latNum === "number" && typeof lonNum === "number";

      for (let index = 0; index < files.length; index += 1) {
        const item = files[index];
        const originalName = item.file.name;
        const safeName = sanitizeFilename(originalName) || `upload_${index}`;
        const key = `${tenantId}/${userId}/${Date.now()}_${crypto.randomUUID()}_${safeName}`;

        const { error: uploadError } = await supabase!.storage.from("asset-files").upload(key, item.file, {
          upsert: false,
        });

        if (uploadError) {
          throw new Error(uploadError.message || "Falha ao enviar arquivo para o Storage.");
        }

        await createFileAsset({
          line_code: lineCode,
          category,
          description,
          bucket_id: "asset-files",
          object_path: key,
          file_name: safeName,
          original_name: originalName,
          mime_type: item.file.type || undefined,
          size_bytes: item.file.size,
          lat: hasCoords ? latNum : undefined,
          lon: hasCoords ? lonNum : undefined,
          meta: {
            regiao: regiao || undefined,
            ramal: ramal || undefined,
          },
        });
      }

      toast({
        title: "Arquivos catalogados!",
        description: `${files.length} arquivo(s) enviado(s) e registrados com sucesso.`,
      });

      setFiles([]);
      queryClient.invalidateQueries({ queryKey: ["file-assets", lineCode] });
    } catch (error: any) {
      toast({
        title: "Falha ao enviar",
        description: error?.message ?? "Não foi possível catalogar os arquivos.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md"
                  onChange={handleFileChange}
                  className="hidden"
                  id="fileUpload"
                />
                <label htmlFor="fileUpload" className="btn-primary cursor-pointer inline-block">
                  Selecionar Arquivos
                </label>
                <div className="mt-4 text-xs text-muted-foreground">
                  Tipos aceitos: imagens, PDF, DOC/DOCX, XLS/XLSX, CSV, TXT/MD
                </div>
              </div>

              {/* Classification Fields */}
              {files.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Região *</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
                      value={regiao}
                      onChange={(e) => setRegiao(e.target.value)}
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
                      value={lineCode}
                      onChange={(e) => setLineCode(e.target.value)}
                      disabled={!canUseSupabase && !linhasQuery.isFallback}
                    >
                      <option value="">Selecione</option>
                      {linhasQuery.data.map((linha) => (
                        <option key={linha.linhaId} value={linha.linhaId}>
                          {linha.nome}
                        </option>
                      ))}
                    </select>
                    {!linhasQuery.isFallback && !linhasQuery.isLoading && linhasQuery.data.length === 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Nenhuma linha ingerida ainda. Use /upload para cadastrar uma linha (KML/KMZ).
                      </p>
                    )}
                    {!canUseSupabase && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Modo demo: configure Supabase e desative `VITE_DEMO_MODE` para habilitar upload real.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Ramal *</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
                      value={ramal}
                      onChange={(e) => setRamal(e.target.value)}
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
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">Selecione</option>
                      <option value="relatorio">Relatório</option>
                      <option value="planilha">Planilha</option>
                      <option value="imagem">Imagem</option>
                      <option value="contrato">Contrato</option>
                      <option value="inspecao">Inspeção</option>
                      <option value="compliance">Compliance</option>
                      <option value="projeto">Projeto</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Latitude (opcional)</label>
                    <Input
                      className="bg-input border-border"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="-23.5505"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Longitude (opcional)</label>
                    <Input
                      className="bg-input border-border"
                      value={lon}
                      onChange={(e) => setLon(e.target.value)}
                      placeholder="-46.6333"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium mb-2 block">Descrição (opcional)</label>
                    <Input
                      className="bg-input border-border"
                      maxLength={200}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Descrição (até 200 caracteres)"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-xs text-muted-foreground">
                      Os arquivos serão armazenados no Supabase Storage e catalogados por empresa (tenant) e linha.
                      Se latitude/longitude forem informadas, eles poderão aparecer no mapa.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Catalog (Table) */}
            {!SHOULD_USE_DEMO_API && lineCode && (
              <div className="tech-card p-6">
                <h3 className="text-lg font-semibold mb-4">Arquivos Catalogados</h3>
                {fileAssetsQuery.isLoading && (
                  <p className="text-sm text-muted-foreground">Carregando…</p>
                )}
                {fileAssetsQuery.error && (
                  <p className="text-sm text-destructive">
                    Não foi possível listar arquivos: {(fileAssetsQuery.error as any)?.message ?? "erro"}
                  </p>
                )}
                {!fileAssetsQuery.isLoading && sortedCatalog.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum arquivo catalogado para esta linha ainda.</p>
                )}
                {sortedCatalog.length > 0 && (
                  <div className="space-y-2">
                    {sortedCatalog.map((asset) => (
                      <div
                        key={asset.id}
                        className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/60 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {asset.original_name ?? asset.file_name ?? asset.object_path}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {asset.category ?? "sem categoria"} · {asset.size_bytes ? formatBytes(asset.size_bytes) : "—"} ·{" "}
                            {new Date(asset.created_at).toLocaleString("pt-BR")}
                          </div>
                          {asset.description && (
                            <div className="mt-1 text-sm text-muted-foreground truncate">
                              {asset.description}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {asset.url ? (
                            <a
                              className="btn-primary inline-flex items-center justify-center px-4 py-2 rounded-md text-sm"
                              href={asset.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Abrir
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">URL indisponível</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
                      <p className="text-xs text-muted-foreground">{formatBytes(item.file.size)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            {files.length > 0 && (
              <div className="flex justify-end">
                <Button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Enviando…" : "Enviar e Catalogar"}
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
