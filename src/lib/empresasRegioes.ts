export const EMPRESAS = [
  'CPFL Piratininga',
  'CPFL Santa Cruz',
  'ENEL',
  'CPFL Transmissão',
  'ARGO',
  'CPFL RGE',
  'CEMIG',
  'EQUATORIAL'
] as const;

export type Empresa = typeof EMPRESAS[number];

export const REGIOES_POR_EMPRESA: Record<string, string[]> = {
  'CPFL Piratininga': ['DJTV-Sudeste', 'DJTV-Sul', 'Interior-Norte'],
  'CPFL Santa Cruz': ['Litoral', 'Vale do Paraíba'],
  'ENEL': ['A', 'B', 'C'],
  'CPFL Transmissão': ['A', 'B', 'C'],
  'ARGO': ['A', 'B', 'C'],
  'CPFL RGE': ['A', 'B', 'C'],
  'CEMIG': ['A', 'B', 'C'],
  'EQUATORIAL': ['A', 'B', 'C']
};

export const LINHAS_POR_REGIAO: Record<string, string[]> = {
  'DJTV-Sudeste': ['407', 'DERIVAÇÃO RAE CLI'],
  'DJTV-Sul': ['1', '2', '3'],
  'Interior-Norte': ['1', '2', '3'],
  'Litoral': ['1', '2', '3'],
  'Vale do Paraíba': ['1', '2', '3'],
  'A': ['1', '2', '3'],
  'B': ['1', '2', '3'],
  'C': ['1', '2', '3']
};

export const TIPOS_MATERIAL = [
  'Concreto',
  'Metálica',
  'Madeira'
] as const;

export type TipoMaterial = typeof TIPOS_MATERIAL[number];

export const NIVEIS_TENSAO = [
  '34,5kV',
  '69kV',
  '88kV',
  '138kV',
  '230kV',
  '440kV',
  'Acima de 440kV'
] as const;

export type NivelTensao = typeof NIVEIS_TENSAO[number];
