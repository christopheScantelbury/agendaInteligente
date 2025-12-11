import api from './api'

export interface Cliente {
  id?: number
  nome: string
  cpfCnpj: string
  email?: string
  telefone?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cep?: string
  cidade?: string
  uf?: string
}

export const clienteService = {
  listar: async (): Promise<Cliente[]> => {
    const response = await api.get<Cliente[]>('/clientes')
    return response.data
  },

  buscarPorId: async (id: number): Promise<Cliente> => {
    const response = await api.get<Cliente>(`/clientes/${id}`)
    return response.data
  },

  criar: async (cliente: Cliente): Promise<Cliente> => {
    const response = await api.post<Cliente>('/clientes', cliente)
    return response.data
  },

  atualizar: async (id: number, cliente: Cliente): Promise<Cliente> => {
    const response = await api.put<Cliente>(`/clientes/${id}`, cliente)
    return response.data
  },

  excluir: async (id: number): Promise<void> => {
    await api.delete(`/clientes/${id}`)
  },
}

