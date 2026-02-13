import { useMemo, useState } from "react";
import { toast } from "sonner";
import VegetacaoModuleShell from "@/modules/vegetacao/VegetacaoModuleShell";
import { VegetacaoPageHeader } from "@/modules/vegetacao/components/VegetacaoPageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CardKPI from "@/components/CardKPI";
import { CalendarDays, List as ListIcon } from "lucide-react";
import DataTableAdvanced from "@/components/DataTableAdvanced";
import type { VegScheduleEvent, VegScheduleStatus, VegLocationPayload } from "@/modules/vegetacao/api/vegetacaoApi";
import { useVegAgenda, useVegAgendaMutation, useVegDeleteAgenda } from "@/modules/vegetacao/hooks/useVegetacao";
import LocationPicker from "@/modules/vegetacao/components/LocationPicker";
import { locationPayloadFromRow } from "@/modules/vegetacao/utils/location";

type FormState = {
  id?: string;
  title: string;
  start_at: string;
  end_at: string;
  status: VegScheduleStatus;
  location_text: string;
  location: VegLocationPayload | null;
};

const emptyForm: FormState = {
  title: "",
  start_at: new Date().toISOString(),
  end_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  status: "planned",
  location_text: "",
  location: null,
};

const STATUS_LABEL: Record<VegScheduleStatus, string> = {
  planned: "Planejado",
  confirmed: "Confirmado",
  done: "Concluído",
  canceled: "Cancelado",
};

export default function AgendaPage() {
  const [tab, setTab] = useState<"calendar" | "list">("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data, isLoading, isError, refetch } = useVegAgenda({ limit: 500 });
  const saveMutation = useVegAgendaMutation();
  const deleteMutation = useVegDeleteAgenda();
  const items = data?.items ?? [];

  const byDay = useMemo(() => {
    const map = new Map<string, VegScheduleEvent[]>();
    for (const ev of items) {
      const d = new Date(ev.start_at);
      if (Number.isNaN(d.getTime())) continue;
      const key = d.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [items]);

  const selectedKey = selectedDate ? new Date(selectedDate).toISOString().slice(0, 10) : "";
  const dayEvents = selectedKey ? byDay.get(selectedKey) ?? [] : [];

  const resumo = useMemo(() => {
    const planned = items.filter((e) => e.status === "planned" || e.status === "confirmed").length;
    const done = items.filter((e) => e.status === "done").length;
    return { total: items.length, planned, done };
  }, [items]);

  const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const normalizeLocation = (loc: VegLocationPayload | null) => {
    if (!loc) return undefined;
    if ((loc.method === "gps" || loc.method === "map_pin") && !loc.coords) return undefined;
    if (loc.method === "manual_address" && !loc.address_text && !loc.coords) return undefined;
    return loc;
  };

  const openCreate = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row: VegScheduleEvent) => {
    setForm({
      id: row.id,
      title: row.title,
      start_at: row.start_at,
      end_at: row.end_at,
      status: row.status,
      location_text: row.location_text ?? "",
      location: locationPayloadFromRow(row),
    });
    setModalOpen(true);
  };

  const save = async () => {
    const title = form.title.trim();
    if (!title) {
      toast.error("Informe um título.");
      return;
    }
    try {
      await saveMutation.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        title,
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at).toISOString(),
        status: form.status,
        location_text: form.location_text.trim() ? form.location_text.trim() : null,
        location: normalizeLocation(form.location),
        metadata: {},
      });
      toast.success("Evento salvo");
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error("Falha ao salvar", { description: err?.message ?? String(err) });
    }
  };

  const remove = async () => {
    if (!form.id) return;
    try {
      await deleteMutation.mutateAsync(form.id);
      toast.success("Evento removido");
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error("Falha ao remover", { description: err?.message ?? String(err) });
    }
  };

  const columns = [
    { key: "title", label: "Título" },
    { key: "status", label: "Status", render: (_: any, row: VegScheduleEvent) => STATUS_LABEL[row.status] ?? row.status },
    { key: "start_at", label: "Início", render: (_: any, row: VegScheduleEvent) => new Date(row.start_at).toLocaleString() },
    { key: "end_at", label: "Fim", render: (_: any, row: VegScheduleEvent) => new Date(row.end_at).toLocaleString() },
  ];

  return (
    <VegetacaoModuleShell>
      <VegetacaoPageHeader
        title="Agenda"
        description="Visualização em calendário + lista de eventos de campo."
        right={
          <Button size="sm" onClick={openCreate}>
            Novo evento
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <CardKPI title="Total" value={resumo.total} icon={CalendarDays} />
        <CardKPI title="Planejados" value={resumo.planned} icon={CalendarDays} />
        <CardKPI title="Concluídos" value={resumo.done} icon={CalendarDays} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" /> Calendário
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <ListIcon className="w-4 h-4" /> Lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="tech-card p-4">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Carregando…</div>
              ) : isError ? (
                <div className="text-sm text-muted-foreground">
                  Falha ao carregar. <Button variant="link" onClick={() => refetch()}>Tentar novamente</Button>
                </div>
              ) : (
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    hasEvent: (date) => {
                      const key = date.toISOString().slice(0, 10);
                      return (byDay.get(key)?.length ?? 0) > 0;
                    },
                  }}
                  modifiersClassNames={{
                    hasEvent: "bg-primary/15 text-primary",
                  }}
                />
              )}
            </div>

            <div className="tech-card p-4 space-y-3">
              <div className="text-sm font-medium">Eventos em {selectedKey || "—"}</div>
              {dayEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhum evento.</div>
              ) : (
                dayEvents.map((ev) => (
                  <div key={ev.id} className="rounded-md border p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{ev.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {STATUS_LABEL[ev.status] ?? ev.status} • {new Date(ev.start_at).toLocaleTimeString()}–{new Date(ev.end_at).toLocaleTimeString()}
                      </div>
                      {ev.location_text ? <div className="text-xs text-muted-foreground truncate">{ev.location_text}</div> : null}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openEdit(ev)}>
                      Abrir
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <div className="tech-card p-4">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando…</div>
            ) : isError ? (
              <div className="text-sm text-muted-foreground">
                Falha ao carregar. <Button variant="link" onClick={() => refetch()}>Tentar novamente</Button>
              </div>
            ) : items.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum evento encontrado.</div>
            ) : (
              <DataTableAdvanced data={items} columns={columns} onRowClick={(row) => openEdit(row as VegScheduleEvent)} exportable />
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar evento" : "Novo evento"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Início</Label>
              <Input
                type="datetime-local"
                value={toLocalInput(form.start_at)}
                onChange={(e) => setForm((p) => ({ ...p, start_at: e.target.value ? new Date(e.target.value).toISOString() : p.start_at }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Input
                type="datetime-local"
                value={toLocalInput(form.end_at)}
                onChange={(e) => setForm((p) => ({ ...p, end_at: e.target.value ? new Date(e.target.value).toISOString() : p.end_at }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as VegScheduleStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as VegScheduleStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Local (texto)</Label>
              <Textarea value={form.location_text} onChange={(e) => setForm((p) => ({ ...p, location_text: e.target.value }))} />
            </div>

            <div className="md:col-span-2">
              <Label>Localização</Label>
              <div className="mt-2">
                <LocationPicker value={form.location} onChange={(next) => setForm((p) => ({ ...p, location: next }))} />
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2">
            <div>{form.id ? <Button variant="destructive" onClick={remove} disabled={deleteMutation.isPending}>Remover</Button> : null}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={save} disabled={saveMutation.isPending}>
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </VegetacaoModuleShell>
  );
}
