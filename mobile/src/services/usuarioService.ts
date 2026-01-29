import api from './api'

/** Nome do perfil do usuário – valor vindo do banco/API. Não usar union estático. */
export interface Usuario {
  id?: number
  nome: string
  email: string
  senha?: string
  perfil?: string
  perfilId?: number
  unidadeId?: number
  unidadesIds?: number[]
  ativo?: boolean
  nomeUnidade?: string
  nomesUnidades?: string[]
}

export const usuarioService = {
  listar: async (): Promise<Usuario[]> => {
    const response = await api.get<Usuario[]>('/usuarios')
    return response.data
  },

  buscarPorId: async (id: number): Promise<Usuario> => {
    const response = await api.get<Usuario>(`/usuarios/${id}`)
    return response.data
  },

  criar: async (usuario: Usuario): Promise<Usuario> => {
    const response = await api.post<Usuario>('/usuarios', usuario)
    return response.data
  },

  atualizar: async (id: number, usuario: Usuario): Promise<Usuario> => {
    const response = await api.put<Usuario>(`/usuarios/${id}`, usuario)
    return response.data
  },

  excluir: async (id: number): Promise<void> => {
    await api.delete(`/usuarios/${id}`)
  },
}
