import api from './api'

export type TipoPermissao = 'EDITAR' | 'VISUALIZAR' | 'SEM_ACESSO'

export interface Perfil {
  id?: number
  nome: string
  descricao?: string
  sistema?: boolean
  ativo?: boolean
  atendente?: boolean
  cliente?: boolean
  gerente?: boolean
  permissoesMenu?: string[]
  permissoesGranulares?: Record<string, TipoPermissao>
}

/** Perfil do usuário logado (permissoesGranulares). Qualquer usuário autenticado pode chamar. */
export const buscarMeuPerfil = async (): Promise<Perfil> => {
  const response = await api.get<Perfil>('/perfis/meu')
  return response.data
}

export const perfilService = {
  listarTodos: async (): Promise<Perfil[]> => {
    const response = await api.get<Perfil[]>('/perfis')
    return response.data
  },

  listarAtivos: async (): Promise<Perfil[]> => {
    const response = await api.get<Perfil[]>('/perfis/ativos')
    return response.data
  },

  listarCustomizados: async (): Promise<Perfil[]> => {
    const response = await api.get<Perfil[]>('/perfis/customizados')
    return response.data
  },

  buscarPorId: async (id: number): Promise<Perfil> => {
    const response = await api.get<Perfil>(`/perfis/${id}`)
    return response.data
  },

  buscarPorNome: async (nome: string): Promise<Perfil> => {
    const response = await api.get<Perfil>(`/perfis/nome/${nome}`)
    return response.data
  },

  criar: async (perfil: Perfil): Promise<Perfil> => {
    const response = await api.post<Perfil>('/perfis', perfil)
    return response.data
  },

  atualizar: async (id: number, perfil: Perfil): Promise<Perfil> => {
    const response = await api.put<Perfil>(`/perfis/${id}`, perfil)
    return response.data
  },

  excluir: async (id: number): Promise<void> => {
    await api.delete(`/perfis/${id}`)
  },

  buscarMeuPerfil,
}
