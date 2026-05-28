import api from './api'

export interface UnidadeHorario {
  unidadeId: number
  nome: string
  abertura: string | null  // HH:mm:ss
  fechamento: string | null
}

export const horariosConfigService = {
  listar: async (): Promise<UnidadeHorario[]> => {
    const { data } = await api.get<UnidadeHorario[]>('/configuracoes/horarios')
    return data
  },

  atualizar: async (unidadeId: number, abertura: string | null, fechamento: string | null): Promise<UnidadeHorario> => {
    const { data } = await api.put<UnidadeHorario>(`/configuracoes/horarios/${unidadeId}`, {
      abertura,
      fechamento,
    })
    return data
  },
}
