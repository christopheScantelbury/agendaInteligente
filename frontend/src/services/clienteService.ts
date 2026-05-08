import api from './api'
import { Unidade } from './unidadeService'

export interface Cliente {
  id?: number
  nome: string
  cpfCnpj: string
  email?: string
  telefone?: string
  unidadeId?: number
  endereco?: string
  observacao?: string
  numero?: string
  complemento?: string
  bairro?: string
  cep?: string
  cidade?: string
  uf?: string
  dataNascimento?: string
  rg?: string
  senha?: string
  ativo?: boolean
  unidadesIds?: number[]
  unidades?: Unidade[]
}

export const clienteService = {
  listar: async (): Promise<Cliente[]> => {
    const response = await api.get<Cliente[]>('/clientes')
    return response.data
  },

  buscarMeuPerfil: async (): Promise<Cliente | null> => {
    try {
      const response = await api.get<Cliente>('/clientes/meu-perfil')
      return response.status === 200 && response.data ? response.data : null
    } catch {
      return null
    }
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
