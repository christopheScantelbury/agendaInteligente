import api from './api'

export interface Atendente {
  id?: number
  unidadeId: number
  usuarioId: number
  cpf: string
  telefone?: string
  ativo?: boolean
  nomeUsuario?: string
  nomeUnidade?: string
}

export const atendenteService = {
  listar: async (): Promise<Atendente[]> => {
    const response = await api.get<Atendente[]>('/atendentes/ativos')
    return response.data
  },

  listarPorUnidade: async (unidadeId: number): Promise<Atendente[]> => {
    const response = await api.get<Atendente[]>(`/atendentes/unidade/${unidadeId}`)
    return response.data
  },

  criar: async (atendente: Atendente): Promise<Atendente> => {
    const response = await api.post<Atendente>('/atendentes', atendente)
    return response.data
  },
}

