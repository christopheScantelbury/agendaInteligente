import api from './api'

export interface Empresa {
  id?: number
  nome: string
  razaoSocial?: string
  cnpj?: string
  email?: string
  telefone?: string
  endereco?: string
  numero?: string
  bairro?: string
  cep?: string
  cidade?: string
  uf?: string
  ativo?: boolean
  logo?: string
  corApp?: string
}

export const empresaService = {
  listarTodos: async (): Promise<Empresa[]> => {
    const response = await api.get<Empresa[]>('/empresas')
    return response.data
  },

  listarAtivas: async (): Promise<Empresa[]> => {
    const response = await api.get<Empresa[]>('/empresas/ativas')
    return response.data
  },

  buscarPorId: async (id: number): Promise<Empresa> => {
    const response = await api.get<Empresa>(`/empresas/${id}`)
    return response.data
  },

  criar: async (empresa: Empresa): Promise<Empresa> => {
    const response = await api.post<Empresa>('/empresas', empresa)
    return response.data
  },

  atualizar: async (id: number, empresa: Empresa): Promise<Empresa> => {
    const response = await api.put<Empresa>(`/empresas/${id}`, empresa)
    return response.data
  },

  excluir: async (id: number): Promise<void> => {
    await api.delete(`/empresas/${id}`)
  },
}
