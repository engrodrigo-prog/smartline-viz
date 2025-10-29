export type PlanoStatus = 'Concluído' | 'Aberto' | 'Em andamento' | 'Cancelado';
export type PlanoAndamento = 'No prazo' | 'Atrasado';

export interface PlanoAcao {
  id: string;
  titulo: string;
  responsavel?: string;
  prazo?: string; // ISO date
  status: PlanoStatus;
  andamento?: PlanoAndamento; // Opcional; pode ser inferido pelo prazo
}

export interface AnaliseCausaItem {
  nome: string;
  modosFalha: string[];
  planosAcao: PlanoAcao[];
}

export interface AnaliseEvento {
  causas: AnaliseCausaItem[];
}

// Mapeia id do evento -> análise de causa raiz e planos
export const eventAnalysis: Record<string, AnaliseEvento> = {
  'EV-ENER-001': {
    causas: [
      {
        nome: 'Chaveamento não coordenado em cliente industrial',
        modosFalha: ['Inrush em transformador', 'Queda momentânea de tensão'],
        planosAcao: [
          { id: 'PA-001-A', titulo: 'Revisar parâmetros de religamento', responsavel: 'Proteção', status: 'Concluído', prazo: '2025-01-18T10:00:00-03:00' },
          { id: 'PA-001-B', titulo: 'Contato com cliente para coordenação de manobras', responsavel: 'Comercial', status: 'Aberto' },
        ],
      },
    ],
  },
  'EV-ENER-002': {
    causas: [
      {
        nome: 'Contato fase-terra em trecho aéreo',
        modosFalha: ['Rompimento de isolador', 'Objetos na faixa de servidão'],
        planosAcao: [
          { id: 'PA-002-A', titulo: 'Inspeção de faixa com equipe local', responsavel: 'Manutenção', status: 'Em andamento', prazo: '2025-01-18T10:30:00-03:00' },
          { id: 'PA-002-B', titulo: 'Voo de drone para confirmação', responsavel: 'Drones', status: 'Aberto' },
        ],
      },
    ],
  },
  'EV-ENER-003': {
    causas: [
      {
        nome: 'Descarga atmosférica próxima à linha',
        modosFalha: ['Atuação de pára-raios', 'Religamento temporizado'],
        planosAcao: [
          { id: 'PA-003-A', titulo: 'Verificação de contadores de surtos', responsavel: 'Proteção', status: 'Concluído' },
        ],
      },
    ],
  },
  'EV-ENER-004': {
    causas: [
      {
        nome: 'Vegetação sobre condutor',
        modosFalha: ['Queda de galhos', 'Curto fase-terra persistente'],
        planosAcao: [
          { id: 'PA-004-A', titulo: 'Desligamento programado do trecho', responsavel: 'Operação', status: 'Concluído' },
          { id: 'PA-004-B', titulo: 'Poda emergencial com terceirizada', responsavel: 'Vegetação', status: 'Concluído' },
        ],
      },
    ],
  },
  'EV-ENER-006': {
    causas: [
      {
        nome: 'Vandalismo em aterramento/cabo-guarda',
        modosFalha: ['Elevação de corrente de curto', 'Atuação de proteção'],
        planosAcao: [
          { id: 'PA-006-A', titulo: 'Boletim de ocorrência e perícia', responsavel: 'Segurança', status: 'Concluído' },
          { id: 'PA-006-B', titulo: 'Reposição de cabos e inspeção final', responsavel: 'Manutenção', status: 'Concluído' },
        ],
      },
    ],
  },
  'EV-ENER-008': {
    causas: [
      {
        nome: 'Atuação diferencial sem evidência externa',
        modosFalha: ['CT saturado', 'Desbalanço transitório'],
        planosAcao: [
          { id: 'PA-008-A', titulo: 'Teste de secundários dos TCs', responsavel: 'Proteção', status: 'Em andamento', prazo: '2025-01-18T12:00:00-03:00' },
          { id: 'PA-008-B', titulo: 'Análise de oscilografia', responsavel: 'Automação', status: 'Em andamento', prazo: '2025-01-18T11:30:00-03:00' },
        ],
      },
    ],
  },
  'EV-ENER-012': {
    causas: [
      {
        nome: 'Interferência de vegetação após tempestade',
        modosFalha: ['Curto sustentado', 'Danos em isoladores'],
        planosAcao: [
          { id: 'PA-012-A', titulo: 'Isolamento de trecho e recomposição parcial', responsavel: 'Operação', status: 'Em andamento', prazo: '2025-01-18T13:00:00-03:00' },
          { id: 'PA-012-B', titulo: 'Poda e retirada de árvore', responsavel: 'Vegetação', status: 'Aberto' },
          { id: 'PA-012-C', titulo: 'Inspeção pós-serviço com termografia', responsavel: 'Inspeção', status: 'Aberto' },
        ],
      },
    ],
  },
};

export const statusBadge = {
  'Concluído': 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30',
  'Aberto': 'bg-slate-500/10 text-slate-600 border border-slate-500/30',
  'Em andamento': 'bg-sky-500/15 text-sky-600 border border-sky-500/30',
  'Cancelado': 'bg-rose-500/15 text-rose-600 border border-rose-500/30',
} as const;

export const andamentoBadge = {
  'No prazo': 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  'Atrasado': 'bg-amber-500/15 text-amber-600 border border-amber-500/30',
} as const;

