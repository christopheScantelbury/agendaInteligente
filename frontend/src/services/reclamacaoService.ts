import api from './api'
import axios from 'axios'

export interface Reclamacao {
  id?: number
  mensagem: string
  unidadeId?: number
  lida?: boolean
  dataCriacao?: string
  dataLeitura?: string
}

// Instância do axios para endpoints públicos (sem autenticação)
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

export const reclamacaoService = {
  // Endpoint público - não requer autenticação
  criar: async (reclamacao: Reclamacao): Promise<Reclamacao> => {
    const response = await publicApi.post<Reclamacao>('/publico/reclamacoes', reclamacao)
    return response.data
  },

  // Endpoints protegidos - requerem autenticação (ADMIN/GERENTE)
  listarTodas: async (): Promise<Reclamacao[]> => {
    const response = await api.get<Reclamacao[]>('/reclamacoes')
    return response.data
  },

  listarNaoLidas: async (): Promise<Reclamacao[]> => {
    const response = await api.get<Reclamacao[]>('/reclamacoes/nao-lidas')
    return response.data
  },

  contarNaoLidas: async (): Promise<number> => {
    const response = await api.get<number>('/reclamacoes/contador')
    return response.data
  },

  listarPorUnidade: async (unidadeId: number): Promise<Reclamacao[]> => {
    const response = await api.get<Reclamacao[]>(`/reclamacoes/unidade/${unidadeId}`)
    return response.data
  },

  listarNaoLidasPorUnidade: async (unidadeId: number): Promise<Reclamacao[]> => {
    const response = await api.get<Reclamacao[]>(`/reclamacoes/unidade/${unidadeId}/nao-lidas`)
    return response.data
  },

  contarNaoLidasPorUnidade: async (unidadeId: number): Promise<number> => {
    const response = await api.get<number>(`/reclamacoes/unidade/${unidadeId}/contador`)
    return response.data
  },

  buscarPorId: async (id: number): Promise<Reclamacao> => {
    const response = await api.get<Reclamacao>(`/reclamacoes/${id}`)
    return response.data
  },

  marcarComoLida: async (id: number): Promise<Reclamacao> => {
    const response = await api.put<Reclamacao>(`/reclamacoes/${id}/marcar-lida`)
    return response.data
  },
}
