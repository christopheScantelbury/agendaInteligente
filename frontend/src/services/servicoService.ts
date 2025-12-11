import api from './api'

export interface Servico {
  id: number
  nome: string
  descricao?: string
  valor: number
  duracaoMinutos: number
  ativo: boolean
}

export const servicoService = {
  listar: async (): Promise<Servico[]> => {
    const response = await api.get<Servico[]>('/servicos/ativos')
    return response.data
  },

  listarTodos: async (): Promise<Servico[]> => {
    const response = await api.get<Servico[]>('/servicos')
    return response.data
  },

  buscarPorId: async (id: number): Promise<Servico> => {
    const response = await api.get<Servico>(`/servicos/${id}`)
    return response.data
  },

  criar: async (servico: Servico): Promise<Servico> => {
    const response = await api.post<Servico>('/servicos', servico)
    return response.data
  },

  atualizar: async (id: number, servico: Servico): Promise<Servico> => {
    const response = await api.put<Servico>(`/servicos/${id}`, servico)
    return response.data
  },

  excluir: async (id: number): Promise<void> => {
    await api.delete(`/servicos/${id}`)
  },
}

