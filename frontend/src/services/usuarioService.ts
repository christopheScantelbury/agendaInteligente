import api from './api'

/** Nome do perfil do usuário – valor vindo do banco/API (tela Perfis e Permissões). Não usar union estático. */
export type PerfilNome = string

export interface Usuario {
  id?: number
  nome: string
  email: string
  senha?: string
  perfil?: PerfilNome // nome do perfil (vem do banco via API)
  perfilId?: number // ID do perfil cadastrado em Perfis e Permissões
  unidadeId?: number // DEPRECATED - usar unidadesIds
  unidadesIds?: number[] // Lista de IDs das unidades
  ativo?: boolean
  nomeUnidade?: string // DEPRECATED - usar nomesUnidades
  nomesUnidades?: string[] // Lista de nomes das unidades
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

