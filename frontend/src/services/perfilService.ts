import api from './api'

/** #171: define as permissões REAIS do cargo. O nome é livre; o poder vem daqui. */
export type PerfilSistemaBase = 'ADMINISTRADOR' | 'GERENTE' | 'PROFISSIONAL' | 'CLIENTE'

export interface Perfil {
  id?: number
  nome: string
  descricao?: string
  perfilSistemaBase?: PerfilSistemaBase
  /** null = cargo global do sistema (read-only pra empresa) */
  adminUnicoId?: number | null
  sistema?: boolean
  ativo?: boolean
  atendente?: boolean // perfil de atendente/profissional (presta serviços)
  cliente?: boolean   // perfil de cliente
  gerente?: boolean   // perfil de gerente
  permissoesMenu?: string[] // Compatibilidade
  permissoesGranulares?: Record<string, 'EDITAR' | 'VISUALIZAR' | 'SEM_ACESSO'> // Novo formato
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
    const response = await api.get<Perfil>(`/perfis/nome/${encodeURIComponent(nome)}`)
    return response.data
  },

  /** Perfil do usuário logado (permissoesGranulares). Qualquer usuário autenticado pode chamar. */
  buscarMeuPerfil: async (): Promise<Perfil> => {
    const response = await api.get<Perfil>('/perfis/meu')
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
}
