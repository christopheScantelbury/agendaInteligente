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
  servicosIds?: number[]
}

export const atendenteService = {
  listar: async (): Promise<Atendente[]> => {
    const response = await api.get<Atendente[]>('/atendentes/ativos')
    return response.data
  },

  listarTodos: async (): Promise<Atendente[]> => {
    const response = await api.get<Atendente[]>('/atendentes')
    return response.data
  },

  listarPorUnidade: async (unidadeId: number): Promise<Atendente[]> => {
    const response = await api.get<Atendente[]>(`/atendentes/unidade/${unidadeId}`)
    return response.data
  },

  listarPorUnidadeEServicos: async (unidadeId: number, servicosIds: number[]): Promise<Atendente[]> => {
    if (!servicosIds || servicosIds.length === 0) {
      return atendenteService.listarPorUnidade(unidadeId)
    }
    // Spring aceita múltiplos parâmetros com o mesmo nome
    const params = new URLSearchParams()
    servicosIds.forEach(id => params.append('servicosIds', id.toString()))
    const response = await api.get<Atendente[]>(`/atendentes/unidade/${unidadeId}/servicos?${params.toString()}`)
    return response.data
  },

  criar: async (atendente: Atendente): Promise<Atendente> => {
    const response = await api.post<Atendente>('/atendentes', atendente)
    return response.data
  },

  atualizar: async (id: number, atendente: Atendente): Promise<Atendente> => {
    const response = await api.put<Atendente>(`/atendentes/${id}`, atendente)
    return response.data
  },

  excluir: async (id: number): Promise<void> => {
    await api.delete(`/atendentes/${id}`)
  },
}

