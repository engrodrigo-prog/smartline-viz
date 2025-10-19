import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AlarmZoneConfig {
  id?: string;
  zonaCritica: number;
  zonaAcomp: number;
  zonaObs: number;
}

const DEFAULT_CONFIG: AlarmZoneConfig = {
  zonaCritica: 500,
  zonaAcomp: 1500,
  zonaObs: 3000,
};

export const useAlarmZones = (concessao?: string) => {
  const [config, setConfig] = useState<AlarmZoneConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, [concessao]);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setConfig(DEFAULT_CONFIG);
        return;
      }

      const { data, error } = await supabase
        .from('alarm_zones_config')
        .select('*')
        .eq('user_id', user.id)
        .eq('concessao', concessao || '')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          id: data.id,
          zonaCritica: data.zona_critica_max_m,
          zonaAcomp: data.zona_acomp_max_m,
          zonaObs: data.zona_obs_max_m,
        });
      } else {
        setConfig(DEFAULT_CONFIG);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração de zonas:', error);
      setConfig(DEFAULT_CONFIG);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async (newConfig: Omit<AlarmZoneConfig, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Validar ranges
      if (newConfig.zonaCritica >= newConfig.zonaAcomp) {
        throw new Error('Zona crítica deve ser menor que zona de acompanhamento');
      }
      if (newConfig.zonaAcomp >= newConfig.zonaObs) {
        throw new Error('Zona de acompanhamento deve ser menor que zona de observação');
      }

      const payload = {
        user_id: user.id,
        concessao: concessao || '',
        zona_critica_max_m: newConfig.zonaCritica,
        zona_acomp_max_m: newConfig.zonaAcomp,
        zona_obs_max_m: newConfig.zonaObs,
      };

      const { error } = await supabase
        .from('alarm_zones_config')
        .upsert(payload, {
          onConflict: 'user_id,concessao'
        });

      if (error) throw error;

      setConfig({ ...newConfig, id: config.id });
      toast({
        title: 'Configuração salva',
        description: 'As zonas de alarme foram atualizadas com sucesso.',
      });
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getZone = (distancia: number): 'critica' | 'acompanhamento' | 'observacao' | 'fora' => {
    if (distancia <= config.zonaCritica) return 'critica';
    if (distancia <= config.zonaAcomp) return 'acompanhamento';
    if (distancia <= config.zonaObs) return 'observacao';
    return 'fora';
  };

  const getZoneColor = (zona: string): string => {
    switch (zona) {
      case 'critica': return 'hsl(var(--destructive))';
      case 'acompanhamento': return 'hsl(var(--warning))';
      case 'observacao': return 'hsl(var(--primary))';
      default: return 'hsl(var(--muted))';
    }
  };

  const getZoneLabel = (zona: string): string => {
    switch (zona) {
      case 'critica': return '🔴 Crítica';
      case 'acompanhamento': return '🟡 Acompanhamento';
      case 'observacao': return '🟢 Observação';
      default: return '⚪ Fora de Zona';
    }
  };

  const getAcionamento = (zona: string): string => {
    switch (zona) {
      case 'critica': return 'Ação Imediata';
      case 'acompanhamento': return 'Agendar Inspeção';
      case 'observacao': return 'Monitorar';
      default: return 'Nenhuma Ação';
    }
  };

  return {
    config,
    isLoading,
    saveConfig,
    getZone,
    getZoneColor,
    getZoneLabel,
    getAcionamento,
  };
};
