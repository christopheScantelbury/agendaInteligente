import api from './api'

export type NomePlano = 'TRIAL' | 'STARTER' | 'PRO' | 'BUSINESS'

export interface Plano {
  id: number
  nome: NomePlano
  nomePublico: string
  descricao?: string
  precoMensalBrl: number
  limiteUnidades: number | null
  limiteProfissionais: number | null
  limiteAgendamentosMes: number | null
  limiteNfseMes: number
  precoExcedenteNfseBrl: number
  duracaoTrialDias?: number
  ordem: number
  ativo: boolean
}

export interface PlanoAtual {
  plano: Plano | null
  planoInicio?: string
  planoExpiracao?: string
}

export const planoService = {
  /** Catálogo público — não exige auth. */
  listar: async (): Promise<Plano[]> => {
    const { data } = await api.get<Plano[]>('/planos')
    return data
  },

  /** Plano atual da empresa do usuário logado. */
  meu: async (): Promise<PlanoAtual> => {
    const { data } = await api.get<PlanoAtual>('/planos/meu')
    return data
  },

  /** Edita preço/limites/descrição. NOME técnico é imutável. Só ADMIN GLOBAL. */
  atualizar: async (id: number, plano: Partial<Plano>): Promise<Plano> => {
    const { data } = await api.put<Plano>(`/planos/${id}`, plano)
    return data
  },
}

/** Formata limite como "∞" quando null, número senão. */
export function formatLimite(v: number | null | undefined): string {
  if (v == null) return '∞'
  return v.toLocaleString('pt-BR')
}

/** Formata preço BRL: R$ 49,00. */
export function formatPrecoMensal(v: number | null | undefined): string {
  const n = Number(v ?? 0)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
