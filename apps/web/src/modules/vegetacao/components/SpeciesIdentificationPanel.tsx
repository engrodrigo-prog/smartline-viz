import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { vegApi } from "@/modules/vegetacao/api/vegetacaoApi";
import type { VegSpeciesIdentification, VegSpeciesStatus } from "@/modules/vegetacao/api/vegetacaoApi";
import SpeciesSelect from "@/modules/vegetacao/components/SpeciesSelect";
import type { VegSpeciesItem } from "@/modules/vegetacao/constants/species";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusLabel = (status: VegSpeciesStatus) => {
  if (status === "suggested") return "Sugerida";
  if (status === "confirmed") return "Confirmada";
  if (status === "corrected") return "Corrigida";
  return "Rejeitada";
};

export function SpeciesIdentificationPanel({
  evidenceId,
  className,
  autoIdentifyOnMount = false,
}: {
  evidenceId: string;
  className?: string;
  autoIdentifyOnMount?: boolean;
}) {
  const qc = useQueryClient();
  const [correction, setCorrection] = useState<VegSpeciesItem | null>(null);
  const [autoTriggered, setAutoTriggered] = useState(false);

  const listQuery = useQuery<{ items: VegSpeciesIdentification[] }>({
    queryKey: ["veg", "species-identifications", evidenceId],
    queryFn: () => vegApi.listSpeciesIdentifications({ evidence_id: evidenceId, limit: 10 }),
    staleTime: 10_000,
  });

  const latest = listQuery.data?.items?.[0] ?? null;

  const identifyMutation = useMutation({
    mutationFn: () => vegApi.speciesIdentify({ evidence_id: evidenceId, confidence_threshold: 0.75 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veg", "species-identifications", evidenceId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; patch: { status: VegSpeciesStatus; confirmed_species?: string | null; confirmed_scientific_name?: string | null } }) =>
      vegApi.updateSpeciesIdentification(payload.id, payload.patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veg", "species-identifications", evidenceId] });
    },
  });

  const suggested = useMemo(() => {
    if (!latest) return null;
    const species = latest.suggested_species ?? undefined;
    const scientific = latest.suggested_scientific_name ?? undefined;
    const confidence = typeof latest.suggested_confidence === "number" ? latest.suggested_confidence : 0;
    return { species, scientific, confidence };
  }, [latest]);

  const confirm = async () => {
    if (!latest) return;
    const species = latest.suggested_species?.trim();
    if (!species) {
      toast.error("Sem espécie sugerida para confirmar.");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: latest.id,
        patch: {
          status: "confirmed",
          confirmed_species: species,
          confirmed_scientific_name: latest.suggested_scientific_name ?? null,
        },
      });
      toast.success("Espécie confirmada");
    } catch (err: any) {
      toast.error("Falha ao confirmar", { description: err?.message ?? String(err) });
    }
  };

  const correct = async () => {
    if (!latest) return;
    if (!correction) {
      toast.error("Selecione uma espécie para corrigir.");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: latest.id,
        patch: {
          status: "corrected",
          confirmed_species: correction.commonName,
          confirmed_scientific_name: correction.scientificName,
        },
      });
      toast.success("Espécie corrigida");
    } catch (err: any) {
      toast.error("Falha ao corrigir", { description: err?.message ?? String(err) });
    }
  };

  const reject = async () => {
    if (!latest) return;
    try {
      await updateMutation.mutateAsync({
        id: latest.id,
        patch: { status: "rejected", confirmed_species: null, confirmed_scientific_name: null },
      });
      toast.success("Sugestão rejeitada");
    } catch (err: any) {
      toast.error("Falha ao rejeitar", { description: err?.message ?? String(err) });
    }
  };

  // Best-effort: auto-trigger only once when mounted and empty.
  useEffect(() => {
    if (!autoIdentifyOnMount) return;
    if (autoTriggered) return;
    if (latest) return;
    if (identifyMutation.isPending) return;
    identifyMutation.mutate();
    setAutoTriggered(true);
  }, [autoIdentifyOnMount, autoTriggered, identifyMutation, latest]);

  const confidencePct = Math.round(((suggested?.confidence ?? 0) * 100 + Number.EPSILON) * 10) / 10;
  const status = latest?.status ?? "suggested";

  const effectiveSpecies =
    latest?.status === "confirmed" || latest?.status === "corrected"
      ? latest.confirmed_species ?? latest.suggested_species
      : latest?.suggested_species;

  return (
    <Card className={cn("bg-card/50", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">IA — Identificação de espécie</CardTitle>
        <Badge variant="secondary">{latest ? statusLabel(status) : "Sem resultado"}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {listQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : listQuery.isError ? (
          <div className="text-sm text-muted-foreground">Falha ao carregar resultado.</div>
        ) : !latest ? (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Envie uma foto e clique em identificar para obter sugestão.
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => identifyMutation.mutate()}
              disabled={identifyMutation.isPending}
            >
              {identifyMutation.isPending ? "Identificando…" : "Identificar espécie"}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <div className="text-sm">
                <span className="font-medium">{effectiveSpecies ?? "—"}</span>
                {latest.confirmed_scientific_name || latest.suggested_scientific_name ? (
                  <span className="text-muted-foreground">
                    {" "}
                    — {latest.confirmed_scientific_name ?? latest.suggested_scientific_name}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Progress value={confidencePct} className="h-3" />
                <div className="text-xs text-muted-foreground w-14 text-right">{confidencePct}%</div>
              </div>
              <div className="text-xs text-muted-foreground">
                Modelo: {latest.model_version ?? "—"}
                {typeof (latest.raw_result as any)?.notes === "string" ? ` • ${(latest.raw_result as any).notes}` : ""}
              </div>
            </div>

            {Array.isArray((latest.raw_result as any)?.top_k) && (latest.raw_result as any).top_k.length ? (
              <div className="text-xs text-muted-foreground">
                Top-k:{" "}
                {(latest.raw_result as any).top_k
                  .slice(0, 3)
                  .map((k: any) => `${k.species} (${Math.round((k.confidence ?? 0) * 100)}%)`)
                  .join(" • ")}
              </div>
            ) : null}

            <div className="flex flex-wrap items-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => identifyMutation.mutate()} disabled={identifyMutation.isPending}>
                {identifyMutation.isPending ? "Identificando…" : "Reidentificar"}
              </Button>

              <Button type="button" size="sm" onClick={confirm} disabled={updateMutation.isPending || status === "rejected"}>
                Confirmar
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={reject} disabled={updateMutation.isPending}>
                Rejeitar
              </Button>
            </div>

            <div className="grid gap-2 md:grid-cols-3 items-end">
              <div className="md:col-span-2">
                <SpeciesSelect value={correction} onChange={setCorrection} placeholder="Corrigir (catálogo)..." />
              </div>
              <Button type="button" size="sm" variant="outline" onClick={correct} disabled={updateMutation.isPending}>
                Aplicar correção
              </Button>
            </div>

            {latest.confirmed_at ? (
              <div className="text-xs text-muted-foreground">
                Decisão em: {new Date(latest.confirmed_at).toLocaleString()}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default SpeciesIdentificationPanel;
