import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAlarmZones } from '@/hooks/useAlarmZones';

interface AlarmZoneConfigProps {
  concessao?: string;
}

const AlarmZoneConfig = ({ concessao }: AlarmZoneConfigProps) => {
  const { config, saveConfig, isLoading } = useAlarmZones(concessao);
  const [open, setOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setLocalConfig(config);
    }
  };

  const handleSave = async () => {
    await saveConfig(localConfig);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          Configurar Zonas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configuração de Zonas de Alarme</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="critica" className="flex items-center gap-2">
              🔴 Zona Crítica (Ação Imediata)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="critica"
                type="number"
                min="100"
                max="10000"
                step="50"
                value={localConfig.zonaCritica}
                onChange={(e) => setLocalConfig({ ...localConfig, zonaCritica: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">metros</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Focos de incêndio até {localConfig.zonaCritica}m da infraestrutura requerem ação imediata
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="acomp" className="flex items-center gap-2">
              🟡 Zona de Acompanhamento (Monitoramento Ativo)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="acomp"
                type="number"
                min={localConfig.zonaCritica + 100}
                max="10000"
                step="50"
                value={localConfig.zonaAcomp}
                onChange={(e) => setLocalConfig({ ...localConfig, zonaAcomp: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">metros</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Focos entre {localConfig.zonaCritica}m e {localConfig.zonaAcomp}m requerem inspeção programada
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs" className="flex items-center gap-2">
              🟢 Zona de Observação (Registro)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="obs"
                type="number"
                min={localConfig.zonaAcomp + 100}
                max="10000"
                step="50"
                value={localConfig.zonaObs}
                onChange={(e) => setLocalConfig({ ...localConfig, zonaObs: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">metros</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Focos entre {localConfig.zonaAcomp}m e {localConfig.zonaObs}m apenas para registro
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm">Resumo das Zonas</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-destructive/10 p-2 rounded text-center">
                <div className="font-bold text-destructive">0 - {localConfig.zonaCritica}m</div>
                <div className="text-muted-foreground mt-1">Crítica</div>
              </div>
              <div className="bg-warning/10 p-2 rounded text-center">
                <div className="font-bold text-warning">{localConfig.zonaCritica} - {localConfig.zonaAcomp}m</div>
                <div className="text-muted-foreground mt-1">Acompanhamento</div>
              </div>
              <div className="bg-primary/10 p-2 rounded text-center">
                <div className="font-bold text-primary">{localConfig.zonaAcomp} - {localConfig.zonaObs}m</div>
                <div className="text-muted-foreground mt-1">Observação</div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              Salvar Configuração
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AlarmZoneConfig;
