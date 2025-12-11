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
}

