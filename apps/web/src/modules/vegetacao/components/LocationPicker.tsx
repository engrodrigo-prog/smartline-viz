import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { VegLocationPayload } from "@/modules/vegetacao/api/vegetacaoApi";
import { MapLibreUnified } from "@/components/MapLibreUnified";

type Coords = { lat: number; lng: number };

const formatCoords = (coords?: Coords) => {
  if (!coords) return "—";
  return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
};

export function LocationPicker({
  value,
  onChange,
  defaultCenter,
}: {
  value: VegLocationPayload | null;
  onChange: (next: VegLocationPayload | null) => void;
  defaultCenter?: [number, number];
}) {
  const [mapOpen, setMapOpen] = useState(false);
  const [manualAddress, setManualAddress] = useState(value?.address_text ?? "");
  const [tempCoords, setTempCoords] = useState<Coords | null>(value?.coords ?? null);

  const center = useMemo<[number, number]>(() => {
    if (value?.coords) return [value.coords.lng, value.coords.lat];
    if (tempCoords) return [tempCoords.lng, tempCoords.lat];
    return defaultCenter ?? [-46.333, -23.96];
  }, [defaultCenter, tempCoords, value?.coords]);

  const captureGps = async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocalização não disponível neste dispositivo/navegador.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChange({
          method: "gps",
          coords,
          captured_at: new Date(pos.timestamp).toISOString(),
          accuracy_m: pos.coords.accuracy ?? undefined,
        });
      },
      (err) => {
        toast.error("Falha ao capturar GPS", { description: err.message });
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 15_000 },
    );
  };

  const confirmManual = () => {
    const text = manualAddress.trim();
    if (!text) {
      toast.error("Informe um endereço/referência.");
      return;
    }
    onChange({
      method: "manual_address",
      address_text: text,
      captured_at: new Date().toISOString(),
      coords: value?.coords,
      accuracy_m: value?.accuracy_m,
    });
  };

  const openMap = () => {
    setTempCoords(value?.coords ?? null);
    setMapOpen(true);
  };

  const confirmMap = () => {
    if (!tempCoords) {
      toast.error("Clique no mapa para marcar um ponto.");
      return;
    }
    onChange({
      method: "map_pin",
      coords: tempCoords,
      captured_at: new Date().toISOString(),
    });
    setMapOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button type="button" variant="outline" size="sm" onClick={captureGps}>
          Capturar GPS
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={openMap}>
          Marcar no mapa
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={confirmManual}>
          Endereço manual
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          Limpar
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Método</Label>
          <div className="text-sm text-muted-foreground">{value?.method ?? "—"}</div>
        </div>
        <div className="space-y-1">
          <Label>Coordenadas</Label>
          <div className="text-sm text-muted-foreground">{formatCoords(value?.coords)}</div>
        </div>
        <div className="space-y-1">
          <Label>Precisão (m)</Label>
          <div className="text-sm text-muted-foreground">
            {value?.accuracy_m !== undefined ? Math.round(value.accuracy_m) : "—"}
          </div>
        </div>
        <div className="space-y-1">
          <Label>Capturado em</Label>
          <div className="text-sm text-muted-foreground">{value?.captured_at ?? "—"}</div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Endereço / referência</Label>
        <Input
          value={manualAddress}
          onChange={(e) => setManualAddress(e.target.value)}
          placeholder="Ex.: Estrutura SE-123, acesso pela estrada X, km 12"
        />
      </div>

      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Marcar no mapa</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg overflow-hidden border">
            <MapLibreUnified
              height="420px"
              initialCenter={center}
              initialZoom={tempCoords ? 15 : 12}
              customPoints={
                tempCoords
                  ? {
                      type: "FeatureCollection",
                      features: [
                        {
                          type: "Feature",
                          geometry: { type: "Point", coordinates: [tempCoords.lng, tempCoords.lat] },
                          properties: { color: "#22c55e", isFocus: true, size: 10 },
                        },
                      ],
                    }
                  : undefined
              }
              onMapLoad={(map) => {
                map.on("click", (e) => {
                  setTempCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
                });
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMapOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmMap}>
              Usar ponto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LocationPicker;
