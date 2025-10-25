import { getJSON, postJSON } from "./api";
import { SHOULD_USE_DEMO_API } from "@/lib/demoApi";
import { demoMissoesStore } from "@/data/demo/apiFallbacks";

export type MissaoTipoId = "LiDAR_Corredor" | "Circular_Torre" | "Eletromec_Fina" | "Express_Faixa";

export interface MissaoCampo {
  chave: string;
  titulo: string;
  tipo: "number" | "string" | "boolean" | "select";
  unidade?: string;
  minimo?: number;
  maximo?: number;
  sugestao?: number | string | boolean;
  opcoes?: { valor: string; label: string }[];
}

export interface MissaoTipo {
  id: MissaoTipoId;
  titulo: string;
  descricao: string;
  campos: MissaoCampo[];
  recomenda: string[];
}

export interface MissaoRecord {
  id: string;
  tipo: MissaoTipoId;
  nome: string;
  parametros: Record<string, unknown>;
  linha?: GeoJSON.FeatureCollection | GeoJSON.Feature;
  waypoints?: GeoJSON.FeatureCollection;
  mediaPattern: string;
  criadoEm: string;
  atualizadoEm: string;
  exports: {
    formato: string;
    arquivo: string;
    geradoEm: string;
    email?: string;
  }[];
}

export interface MissaoLista {
  items: MissaoRecord[];
}

export const fetchMissaoTipos = () => {
  if (SHOULD_USE_DEMO_API) {
    return Promise.resolve({ tipos: demoMissoesStore.getTipos() });
  }
  return postJSON<{ tipos: MissaoTipo[] }>("/missoes/tipos");
};

export const fetchMissoes = () => {
  if (SHOULD_USE_DEMO_API) {
    return Promise.resolve(demoMissoesStore.getMissoes());
  }
  return getJSON<MissaoLista>("/missoes");
};

export const createMissao = (payload: {
  tipo: MissaoTipoId;
  nome: string;
  linha?: GeoJSON.FeatureCollection | GeoJSON.Feature;
  parametros?: Record<string, unknown>;
  waypoints?: GeoJSON.FeatureCollection;
}) => {
  if (SHOULD_USE_DEMO_API) {
    return Promise.resolve(demoMissoesStore.createMissao(payload));
  }
  return postJSON<MissaoRecord>("/missoes/criar", payload);
};

export const fetchMissao = (id: string) => getJSON<MissaoRecord>(`/missoes/${encodeURIComponent(id)}`);

export const exportMissao = (id: string, formato: string, email?: string) => {
  if (SHOULD_USE_DEMO_API) {
    return Promise.resolve(demoMissoesStore.exportMissao(id, formato, email));
  }
  return postJSON<{ ok: boolean; downloadUrl: string; emailEnviado: boolean }>(
    `/missoes/${encodeURIComponent(id)}/export`,
    {
      formato,
      email,
    },
  );
};
