import api from './api'

export interface LinkPublicoResponse {
  empresaId: number
  empresaNome: string
  slug: string | null
}

export interface DisponibilidadeResponse {
  slug: string
  disponivel: boolean
  motivo?: string
}

export const linkPublicoService = {
  buscar: async (): Promise<LinkPublicoResponse> => {
    const { data } = await api.get<LinkPublicoResponse>('/configuracoes/link-publico')
    return data
  },

  atualizar: async (slug: string): Promise<LinkPublicoResponse> => {
    const { data } = await api.put<LinkPublicoResponse>('/configuracoes/link-publico', { slug })
    return data
  },

  remover: async (): Promise<LinkPublicoResponse> => {
    const { data } = await api.delete<LinkPublicoResponse>('/configuracoes/link-publico')
    return data
  },

  verificarDisponibilidade: async (slug: string): Promise<DisponibilidadeResponse> => {
    const { data } = await api.get<DisponibilidadeResponse>('/configuracoes/link-publico/disponibilidade', {
      params: { slug },
    })
    return data
  },
}
