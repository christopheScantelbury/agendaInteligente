import api from './api'

export interface Unidade {
  id?: number
  nome: string
  descricao?: string
  endereco?: string
  numero?: string
  bairro?: string
  cep?: string
  cidade?: string
  uf?: string
  telefone?: string
  email?: string
  ativo?: boolean


  horarioAbertura?: string
  horarioFechamento?: string
}

export const unidadeService = {
  listar: async (): Promise<Unidade[]> => {
    const response = await api.get<Unidade[]>('/unidades/ativas')
    return response.data
  },

  listarTodos: async (): Promise<Unidade[]> => {
    const response = await api.get<Unidade[]>('/unidades')
    return response.data
  },

  buscarPorId: async (id: number): Promise<Unidade> => {
    const response = await api.get<Unidade>(`/unidades/${id}`)
    return response.data
  },

  criar: async (unidade: Unidade): Promise<Unidade> => {
    const response = await api.post<Unidade>('/unidades', unidade)
    return response.data
  },

  atualizar: async (id: number, unidade: Unidade): Promise<Unidade> => {
    const response = await api.put<Unidade>(`/unidades/${id}`, unidade)
    return response.data
  },

  excluir: async (id: number): Promise<void> => {
    await api.delete(`/unidades/${id}`)
  },
}

