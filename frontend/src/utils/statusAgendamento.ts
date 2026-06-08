/**
 * #151: paleta de status consolidada — uma fonte de verdade pra todas as views
 * (Day/Week/Month/Card/Lista). Resolve B-NEW-4 (CONFIRMADO e EM_ANDAMENTO antes
 * usavam mesma cor azul, confundia agente QA).
 *
 * Semântica:
 * - AGENDADO            → slate-700 (neutro, ainda sem ação)
 * - CONFIRMADO          → emerald-500 (cliente confirmou — verde positivo)
 * - EM_ANDAMENTO        → violet-500 (em curso — cor de marca)
 * - PROCEDIMENTO_FIM    → violet-600 (curso quase finalizando — mesma família)
 * - CONCLUIDO/FINALIZADO → emerald-600 (verde forte — fechado com sucesso)
 * - NO_SHOW             → orange-500 (alerta — não compareceu)
 * - CANCELADO           → red-500 (negativo terminal)
 */

export type StatusKey =
  | 'AGENDADO'
  | 'CONFIRMADO'
  | 'EM_ANDAMENTO'
  | 'PROCEDIMENTO_FIM'
  | 'CONCLUIDO'
  | 'FINALIZADO'
  | 'CANCELADO'
  | 'NO_SHOW'
  | string

/** Cor de fundo sólida (dots, badges sólidos). */
export const STATUS_DOT: Record<string, string> = {
  AGENDADO: 'bg-slate-700',
  CONFIRMADO: 'bg-emerald-500',
  EM_ANDAMENTO: 'bg-violet-500',
  PROCEDIMENTO_FIM: 'bg-violet-600',
  CONCLUIDO: 'bg-emerald-600',
  FINALIZADO: 'bg-emerald-600',
  CANCELADO: 'bg-red-500',
  NO_SHOW: 'bg-orange-500',
}

/** Hex pra <Cell> / SVG charts. Mesma paleta do Tailwind 500-600. */
export const STATUS_HEX: Record<string, string> = {
  AGENDADO: '#334155',          // slate-700
  CONFIRMADO: '#10b981',        // emerald-500
  EM_ANDAMENTO: '#8b5cf6',      // violet-500
  PROCEDIMENTO_FIM: '#7c3aed',  // violet-600
  CONCLUIDO: '#059669',         // emerald-600
  FINALIZADO: '#059669',
  CANCELADO: '#ef4444',         // red-500
  NO_SHOW: '#f97316',           // orange-500
}

/** Classe Tailwind completa para badge (bg-XXX-50 + text-XXX-700). */
export const STATUS_BADGE: Record<string, string> = {
  AGENDADO: 'bg-slate-100 text-slate-700',
  CONFIRMADO: 'bg-emerald-50 text-emerald-700',
  EM_ANDAMENTO: 'bg-violet-50 text-violet-700',
  PROCEDIMENTO_FIM: 'bg-violet-50 text-violet-800',
  CONCLUIDO: 'bg-emerald-50 text-emerald-800',
  FINALIZADO: 'bg-emerald-50 text-emerald-800',
  CANCELADO: 'bg-red-50 text-red-700',
  NO_SHOW: 'bg-orange-50 text-orange-700',
}

/** Label pt-BR humano para exibir ao usuário. */
export const STATUS_LABEL: Record<string, string> = {
  AGENDADO: 'Agendado',
  CONFIRMADO: 'Confirmado',
  EM_ANDAMENTO: 'Em atendimento',
  PROCEDIMENTO_FIM: 'Procedimento finalizado',
  CONCLUIDO: 'Concluído',
  FINALIZADO: 'Concluído',
  CANCELADO: 'Cancelado',
  NO_SHOW: 'Não compareceu',
}

/** Acessor seguro. Default usado quando status desconhecido (futuro-prof). */
export const dotClass = (status?: string | null): string =>
  STATUS_DOT[status ?? ''] ?? 'bg-amber-400'

export const badgeClass = (status?: string | null): string =>
  STATUS_BADGE[status ?? ''] ?? 'bg-amber-50 text-amber-700'

export const hexColor = (status?: string | null): string =>
  STATUS_HEX[status ?? ''] ?? '#fbbf24' // amber-400

export const labelOf = (status?: string | null): string =>
  STATUS_LABEL[status ?? ''] ?? (status ?? '—')
