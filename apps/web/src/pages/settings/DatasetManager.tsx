import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useDatasetContext } from "@/context/DatasetContext";
import { Upload, Download, RefreshCcw, Database } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const formatNumber = (value: number | undefined) => (typeof value === "number" ? value.toLocaleString("pt-BR") : "0");

const DatasetManager = () => {
  const { dataset, importDatasetFile, exportDataset, resetDataset, lastUpdated } = useDatasetContext();
  const [mode, setMode] = useState<"replace" | "merge">("replace");
  const [isProcessing, setIsProcessing] = useState(false);
  const [keepLineCode, setKeepLineCode] = useState("PoC SM 230KV");
  const [isCleaning, setIsCleaning] = useState(false);

  const datasetMetrics = useMemo(
    () => [
      { label: "Linhas", value: dataset.linhas.length },
      { label: "Eventos", value: dataset.eventos.length },
      { label: "Missões", value: dataset.missoesDrones.length },
      { label: "Áreas Alagadas", value: dataset.areasAlagadas.length },
      { label: "Erosões", value: dataset.erosoes.length },
      { label: "Ocupações de Faixa", value: dataset.ocupacoesFaixa.length },
      { label: "Emendas", value: dataset.emendas.length },
      { label: "Queimadas", value: dataset.queimadas.length },
      { label: "Câmeras", value: dataset.cameras.length },
      { label: "Sensores", value: dataset.mockSensors.length },
      { label: "Veículos", value: dataset.veiculos.length },
      { label: "Membros de Equipe", value: dataset.membrosEquipe.length },
    ],
    [dataset],
  );

  const handleImport: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      toast.error("Envie um arquivo JSON válido.");
      return;
    }

    setIsProcessing(true);
    try {
      await importDatasetFile(file, { replace: mode === "replace" });
      toast.success("Dataset importado com sucesso.");
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível importar o dataset.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    resetDataset();
    toast.success("Dataset padrão restaurado.");
  };

  const handleSupabaseCleanup = async () => {
    if (!supabase) {
      toast.error("Supabase não configurado neste ambiente.");
      return;
    }
    if (!keepLineCode.trim()) {
      toast.error("Informe o código da linha a manter.");
      return;
    }
    setIsCleaning(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-cleanup", {
        body: { keep_line_code: keepLineCode.trim(), wipe_legacy: true, dry_run: false },
      });
      if (error) throw error;
      toast.success("Base limpa. Mantida apenas a linha informada (câmeras preservadas).");
      if (import.meta.env.DEV) {
        console.info("[admin-cleanup]", data);
      }
    } catch (error: any) {
      const message = error?.context?.body || error?.message || "Falha na limpeza do Supabase.";
      toast.error(message);
      if (import.meta.env.DEV) {
        console.error("[admin-cleanup]", error);
      }
    } finally {
      setIsCleaning(false);
    }
  };

  const instructions = [
    "O arquivo deve estar em JSON e conter as chaves já utilizadas no protótipo (ex: eventos, areasAlagadas, emendas...).",
    "Campos ausentes manterão os dados atuais quando o modo Merge estiver selecionado.",
    "Datas devem ser fornecidas como ISO 8601 (ex.: 2025-10-12T15:30:00Z).",
    "Você pode exportar o dataset atual para entender a estrutura esperada.",
  ];

  return (
    <AppLayout title="Gerenciar Dataset" subtitle="Carregue ou exporte dados para o MVP demonstrativo">
      <div className="space-y-6">
        <Card className="border border-border/60">
          <CardHeader className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Status do Dataset
            </CardTitle>
            <CardDescription>
              {lastUpdated ? (
                <span>
                  Atualizado em{" "}
                  <Badge variant="outline">{new Date(lastUpdated).toLocaleString("pt-BR")}</Badge>
                </span>
              ) : (
                "Utilizando dados padrão do protótipo."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {datasetMetrics.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-border/60 px-4 py-3 bg-card/70 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{metric.label}</span>
                  <span className="text-lg font-semibold text-foreground">
                    {formatNumber(metric.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60">
          <CardHeader>
            <CardTitle>Importar Dataset</CardTitle>
            <CardDescription>
              Selecione um arquivo JSON exportado do SmartLine ou adaptado ao formato esperado e escolha como aplicar a carga.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={mode} onValueChange={(value) => setMode(value as "replace" | "merge")} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Label
                htmlFor="mode-replace"
                className="flex items-start gap-3 border border-border/60 rounded-xl px-4 py-3 cursor-pointer hover:border-primary/50 transition-colors"
              >
                <RadioGroupItem value="replace" id="mode-replace" className="mt-1" />
                <div>
                  <div className="font-medium text-foreground">Sobrescrever (recomendado)</div>
                  <p className="text-sm text-muted-foreground">
                    Substitui completamente o dataset atual pelos dados importados, mantendo qualquer campo ausente com os valores padrão.
                  </p>
                </div>
              </Label>

              <Label
                htmlFor="mode-merge"
                className="flex items-start gap-3 border border-border/60 rounded-xl px-4 py-3 cursor-pointer hover:border-primary/50 transition-colors"
              >
                <RadioGroupItem value="merge" id="mode-merge" className="mt-1" />
                <div>
                  <div className="font-medium text-foreground">Mesclar</div>
                  <p className="text-sm text-muted-foreground">
                    Apenas atualiza as chaves presentes no arquivo, preservando os demais dados já carregados.
                  </p>
                </div>
              </Label>
            </RadioGroup>

            <div className="flex flex-wrap items-center gap-3">
              <div>
                <Input type="file" accept="application/json" onChange={handleImport} disabled={isProcessing} />
              </div>
              <Button type="button" variant="secondary" onClick={exportDataset}>
                <Download className="w-4 h-4 mr-2" />
                Exportar atual
              </Button>
              <Button type="button" variant="outline" onClick={handleReset}>
                <RefreshCcw className="w-4 h-4 mr-2" />
                Restaurar padrão
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Arquivo aceito: JSON. Tamanho recomendado &lt; 5 MB.</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60">
          <CardHeader>
            <CardTitle>Limpeza do Supabase (PoC)</CardTitle>
            <CardDescription>
              Remove dados de teste/demonstração e mantém apenas a linha informada. Não remove câmeras.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end">
              <div className="flex-1">
                <Label htmlFor="keep_line_code">Código da Linha a manter</Label>
                <Input
                  id="keep_line_code"
                  value={keepLineCode}
                  onChange={(event) => setKeepLineCode(event.target.value)}
                  placeholder="Ex: PoC SM 230KV"
                />
              </div>
              <Button type="button" variant="destructive" onClick={handleSupabaseCleanup} disabled={isCleaning}>
                {isCleaning ? "Limpando…" : "Limpar base (manter linha)"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Atenção: esta ação é irreversível. Garanta que a ingestão da PoC esteja correta antes de limpar.
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60">
          <CardHeader>
            <CardTitle>Formato Esperado</CardTitle>
            <CardDescription>
              Estrutura resumida das principais coleções. Ajuste os nomes das chaves conforme necessário.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/60 bg-card/70 p-4 text-sm">
                <pre className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
{`{
  "linhas": [{ "id": "LT-001", "nome": "Linha 1", "ramais": ["R1", "R2"] }],
  "eventos": [{ "id": "EVT-001", "tipo": "Vegetação", "coords": [-46.6, -23.5] }],
  "areasAlagadas": [{ "id": "ALG-001", "nivelRisco": "Alto" }],
  "erosoes": [{ "id": "ERO-001", "gravidadeErosao": "Alta" }],
  "ocupacoesFaixa": [{ "id": "OCP-001", "tipo": "Residencial" }],
  "emendas": [{ "id": "EMD-001", "statusTermico": "Crítico" }],
  "queimadas": [{ "id": "QMD-001", "statusIncendio": "Ativo" }],
  "mockSensors": [{ "id": "S001", "lastUpdate": "2025-10-12T15:30:00Z" }],
  "veiculos": [{ "id": "VEH-001", "status": "Disponível" }]
}`}
                </pre>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/70 p-4 text-sm space-y-3">
                <p>Boas práticas:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {instructions.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60">
          <CardHeader>
            <CardTitle>Histórico de Uso</CardTitle>
            <CardDescription>
              Referência rápida para validar se o dataset atual cobre as principais telas do MVP.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-border/60 p-3 bg-card/60">
              <div className="font-medium text-foreground">Mapa & Travessias</div>
              <p className="text-muted-foreground text-xs mt-1">
                Utiliza coleções de <strong>eventos</strong> com campo <code>tipo</code> marcado como Travessias.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-3 bg-card/60">
              <div className="font-medium text-foreground">Áreas Alagadas & Proteções</div>
              <p className="text-muted-foreground text-xs mt-1">
                Espera dados de <strong>areasAlagadas</strong> e <strong>protecoesPassaros</strong>.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-3 bg-card/60">
              <div className="font-medium text-foreground">Sensores & Dashboard</div>
              <p className="text-muted-foreground text-xs mt-1">
                KPIs e alertas são calculados a partir de <strong>mockSensors</strong>, <strong>mockAssets</strong> e <strong>mockChartData</strong>.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-3 bg-card/60">
              <div className="font-medium text-foreground">Gestão de Equipes</div>
              <p className="text-muted-foreground text-xs mt-1">
                Usa coleções de <strong>membrosEquipe</strong>, <strong>equipes</strong>, <strong>veiculos</strong> e <strong>checklists</strong>.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-3 bg-card/60">
              <div className="font-medium text-foreground">Erosão & Vegetação</div>
              <p className="text-muted-foreground text-xs mt-1">
                Camadas e polígonos baseados em <strong>erosoes</strong>, <strong>ndviJundiai</strong> e <strong>queimadas</strong>.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-3 bg-card/60">
              <div className="font-medium text-foreground">Upload & Relatórios</div>
              <p className="text-muted-foreground text-xs mt-1">
                O histórico de <strong>uploads</strong> ajuda a ilustrar fluxos de ingestão sem depender do backend.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default DatasetManager;
