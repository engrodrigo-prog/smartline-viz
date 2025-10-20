import { useMemo, useState } from "react";
import {
  AirVent,
  Download,
  Bot,
  Mail,
  Map,
  Aperture,
  Plane,
  Send
} from "lucide-react";
import ModuleLayout from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMissoes, useMissoesTipos, useCriarMissao, useExportarMissao } from "@/hooks/useMissoes";
import type { MissaoCampo, MissaoRecord, MissaoTipo } from "@/services/missoes";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type FormValues = {
  nome: string;
  parametros: Record<string, any>;
};

const campoPlaceholder = (campo: MissaoCampo) => {
  if (campo.tipo === "number") return campo.unidade ? `Valor (${campo.unidade})` : "Valor numérico";
  if (campo.tipo === "boolean") return "";
  if (campo.tipo === "select") return "Selecione";
  return "Valor";
};

const Stepper = ({ passos }: { passos: string[] }) => (
  <div className="flex flex-col gap-3">
    {passos.map((passo, index) => (
      <div key={passo} className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
          {index + 1}
        </div>
        <div className="text-sm text-muted-foreground">{passo}</div>
      </div>
    ))}
  </div>
);

const MissoesPage = () => {
  const { data: tiposData } = useMissoesTipos();
  const tipos = tiposData?.tipos ?? [];
  const { data: missoesLista, refetch } = useMissoes();
  const missoes = missoesLista?.items ?? [];

  const [tipoSelecionado, setTipoSelecionado] = useState<MissaoTipo | null>(null);
  const [modalCriacao, setModalCriacao] = useState(false);
  const [form, setForm] = useState<FormValues>({ nome: "", parametros: {} });
  const [exportando, setExportando] = useState<string | null>(null);
  const [formatoExport, setFormatoExport] = useState<string>("DJI");
  const [emailExport, setEmailExport] = useState<string>("");

  const criarMutation = useCriarMissao();
  const exportMutation = useExportarMissao();

  const abrirCriacao = (tipo: MissaoTipo) => {
    setTipoSelecionado(tipo);
    const parametros: Record<string, any> = {};
    tipo.campos.forEach((campo) => {
      if (campo.sugestao !== undefined) {
        parametros[campo.chave] = campo.sugestao;
      }
    });
    setForm({ nome: `${tipo.titulo} - ${format(new Date(), "dd/MM")}`, parametros });
    setModalCriacao(true);
  };

  const atualizarParametro = (chave: string, value: any) => {
    setForm((prev) => ({
      ...prev,
      parametros: {
        ...prev.parametros,
        [chave]: value
      }
    }));
  };

  const salvarMissao = async () => {
    if (!tipoSelecionado) return;
    if (!form.nome.trim()) {
      toast.error("Informe o nome da missão.");
      return;
    }
    try {
      await criarMutation.mutateAsync({
        tipo: tipoSelecionado.id,
        nome: form.nome.trim(),
        parametros: form.parametros
      });
      toast.success("Missão criada com sucesso.");
      setModalCriacao(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível criar a missão.");
    }
  };

  const exportar = async (missao: MissaoRecord) => {
    setExportando(missao.id);
    try {
      const resposta = await exportMutation.mutateAsync({ id: missao.id, formato: formatoExport, email: emailExport });
      toast.success(
        resposta.emailEnviado
          ? "Pacote exportado e enviado por e-mail."
          : "Pacote exportado. Use o botão de download."
      );
    } catch (error: any) {
      toast.error(error?.message ?? "Falha ao exportar missão.");
    } finally {
      setExportando(null);
      refetch();
    }
  };

  const iconByTipo: Record<string, React.ReactNode> = {
    LiDAR_Corredor: <AirVent className="w-10 h-10 text-primary" />,
  Circular_Torre: <Bot className="w-10 h-10 text-primary" />,
    Eletromec_Fina: <Aperture className="w-10 h-10 text-primary" />,
    Express_Faixa: <Plane className="w-10 h-10 text-primary" />
  };

  const passosExecucao = ["Planejar e validar parâmetros", "Exportar pacote", "Enviar ao piloto ou controlador", "Executar missão seguindo o padrão de mídia"];

  return (
    <ModuleLayout title="Missões Autônomas" icon={Plane}>
      <div className="p-6 space-y-8">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tipos.map((tipo) => (
            <Card key={tipo.id} className="border border-border/70 shadow-sm backdrop-blur">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold">{tipo.titulo}</CardTitle>
                  <CardDescription className="mt-2 max-w-lg leading-relaxed">{tipo.descricao}</CardDescription>
                </div>
                  {iconByTipo[tipo.id] ?? <Plane className="w-10 h-10 text-primary" />}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {tipo.campos.map((campo) => (
                    <div key={campo.chave} className="rounded-lg border border-border/60 p-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">{campo.titulo}</div>
                      <div className="text-sm text-foreground mt-1">
                        {campo.sugestao !== undefined ? String(campo.sugestao) : "Configurar"}
                        {campo.unidade ? <span className="ml-1 text-muted-foreground">{campo.unidade}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {tipo.recomenda.map((item) => (
                    <Badge key={item} variant="outline">
                      {item}
                    </Badge>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => abrirCriacao(tipo)}>Configurar missão</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          <Card className="border border-border/70">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Biblioteca de Missões</CardTitle>
                <Badge variant="outline">{missoes.length} cadastradas</Badge>
              </div>
              <CardDescription>Selecione uma missão para exportar o pacote ou acionar envio por e-mail.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[420px] pr-4">
                <div className="space-y-4">
                  {missoes.map((missao) => (
                    <div key={missao.id} className="border border-border/60 rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{missao.nome}</h3>
                            <Badge variant="secondary">{missao.tipo}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Criada em {format(new Date(missao.criadoEm), "dd/MM/yyyy HH:mm")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Padrão de mídia: <span className="font-mono text-[11px]">{missao.mediaPattern}</span>
                          </p>
                        </div>
                        <div className="flex gap-2 items-center">
                          <SelectFormato formato={formatoExport} onChange={setFormatoExport} />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => exportar(missao)}
                            disabled={exportMutation.isPending && exportando === missao.id}
                          >
                            {exportMutation.isPending && exportando === missao.id ? (
                              <Send className="w-4 h-4 animate-pulse" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        {Object.entries(missao.parametros).map(([chave, valor]) => (
                          <div key={chave} className="rounded-md bg-muted/40 p-2">
                            <div className="uppercase text-muted-foreground tracking-wide">{chave}</div>
                            <div className="mt-1 text-foreground font-medium">{String(valor)}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Input
                          placeholder="Enviar por e-mail"
                          value={emailExport}
                          onChange={(event) => setEmailExport(event.target.value)}
                          className="max-w-xs"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => exportar(missao)}
                          disabled={exportMutation.isPending && exportando === missao.id}
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Exportar & Enviar
                        </Button>
                        {missao.exports.length > 0 ? (
                          <Badge variant="outline" className="ml-auto">
                            Último pacote {format(new Date(missao.exports.at(-1)!.geradoEm), "dd/MM HH:mm")}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {missoes.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-muted-foreground">
                      Nenhuma missão cadastrada. Escolha um tipo ao lado para iniciar.
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="border border-border/70">
            <CardHeader>
              <CardTitle>Padrão de Nomes de Mídia</CardTitle>
              <CardDescription>
                Utilize o padrão abaixo para garantir sincronização automática com LiPowerline e Upload Unificado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="font-mono text-xs bg-muted/60 border border-border/60 rounded-md p-3">
                {"{lineId}{missionId}{YYYYMMDD_HHmmss}{lat}{lon}{alt}{seq}.{jpg|mp4}"}
              </div>
              <p className="text-sm text-muted-foreground">
                • Não aplicar compressão nos arquivos originais.
                <br />• Registrar SRT (telemetria) com o mesmo nome do vídeo.
                <br />• Para fotos, preservar EXIF com posição e orientação.
              </p>
              <Tabs defaultValue="passos">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="passos">Passos de execução</TabsTrigger>
                  <TabsTrigger value="uploads">Uploads unificados</TabsTrigger>
                </TabsList>
                <TabsContent value="passos" className="mt-3">
                  <Stepper passos={passosExecucao} />
                </TabsContent>
                <TabsContent value="uploads" className="mt-3 text-sm text-muted-foreground space-y-2">
                  <p>
                    Após a missão, utilize <strong>Upload Unificado → Mídias de Missão</strong> para enviar fotos, vídeos e
                    trilhas SRT. O worker gera frames georreferenciados e sidecar GeoJSON automaticamente.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/upload" className="flex items-center gap-2">
                      <Map className="w-4 h-4" />
                      Ir para Upload Unificado
                    </a>
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>
      </div>

      <Dialog open={modalCriacao} onOpenChange={setModalCriacao}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Criar Missão {tipoSelecionado?.titulo}</DialogTitle>
            <DialogDescription>
              Configure parâmetros de voo, envelope operacional e metas de captura. Todos os campos podem ser ajustados
              posteriormente no pacote exportado.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3 space-y-2">
              <Label>Nome da missão</Label>
              <Input value={form.nome} onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))} />
            </div>
            {tipoSelecionado?.campos.map((campo) => (
              <div key={campo.chave} className="space-y-2">
                <Label>{campo.titulo}</Label>
                {campo.tipo === "select" ? (
                  <select
                    className="w-full border border-border/60 rounded-md bg-background px-3 py-2 text-sm"
                    value={form.parametros[campo.chave] ?? ""}
                    onChange={(event) => atualizarParametro(campo.chave, event.target.value)}
                  >
                    {campo.opcoes?.map((opcao) => (
                      <option key={opcao.valor} value={opcao.valor}>
                        {opcao.label}
                      </option>
                    ))}
                  </select>
                ) : campo.tipo === "boolean" ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant={form.parametros[campo.chave] ? "default" : "outline"}
                      size="sm"
                      onClick={() => atualizarParametro(campo.chave, true)}
                    >
                      Ativar
                    </Button>
                    <Button
                      variant={!form.parametros[campo.chave] ? "default" : "outline"}
                      size="sm"
                      onClick={() => atualizarParametro(campo.chave, false)}
                    >
                      Desativar
                    </Button>
                  </div>
                ) : (
                  <Input
                    type={campo.tipo === "number" ? "number" : "text"}
                    placeholder={campoPlaceholder(campo)}
                    value={form.parametros[campo.chave] ?? ""}
                    onChange={(event) =>
                      atualizarParametro(
                        campo.chave,
                        campo.tipo === "number" ? Number(event.target.value) : event.target.value
                      )
                    }
                  />
                )}
              </div>
            ))}
            <div className="md:col-span-3 space-y-2">
              <Label>Observações</Label>
              <Textarea rows={3} placeholder="Checklist, necessidades específicas de captura, sensores utilizados…" />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalCriacao(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarMissao} disabled={criarMutation.isPending}>
              Salvar missão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
};

const SelectFormato = ({ formato, onChange }: { formato: string; onChange: (value: string) => void }) => (
  <select
    value={formato}
    onChange={(event) => onChange(event.target.value)}
    className="border border-border/60 rounded-md px-3 py-1.5 text-xs bg-background"
  >
    {["DJI", "Autel", "Ardupilot", "KML", "CSV", "JSON"].map((option) => (
      <option key={option} value={option}>
        {option}
      </option>
    ))}
  </select>
);

export default MissoesPage;
