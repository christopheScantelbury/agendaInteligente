import api from './api'
import axios from 'axios'

export type CategoriaReclamacao = 'RECLAMACAO' | 'SUGESTAO' | 'ELOGIO'
export type StatusReclamacao = 'RECEBIDA' | 'EM_ANALISE' | 'RESOLVIDA' | 'ARQUIVADA'

export interface Reclamacao {
  id?: number
  mensagem: string
  unidadeId?: number
  nomeReclamante?: string
  emailReclamante?: string
  telefoneReclamante?: string
  categoria?: CategoriaReclamacao
  status?: StatusReclamacao
  lida?: boolean
  dataCriacao?: string
  dataLeitura?: string
  resposta?: string
  dataResposta?: string
  respondidaPor?: string
}

// Cliente axios separado pra endpoints públicos (sem header Authorization).
// Strip do BOM zero-width que às vezes aparece no início da env var quando o
// arquivo é salvo em UTF-8 BOM.
const publicApi = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/^﻿/, ''),
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

export const reclamacaoService = {
  // ── Público (sem auth) ─────────────────────────────────────────────────
  criar: async (reclamacao: Reclamacao): Promise<Reclamacao> => {
    const response = await publicApi.post<Reclamacao>('/publico/reclamacoes', reclamacao)
    return response.data
  },

  // ── Protegido (ADMIN/ADMINISTRADOR/GERENTE) ────────────────────────────
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

  atualizarStatus: async (id: number, status: StatusReclamacao): Promise<Reclamacao> => {
    const response = await api.put<Reclamacao>(`/reclamacoes/${id}/status`, null, {
      params: { status },
    })
    return response.data
  },

  responder: async (id: number, resposta: string): Promise<Reclamacao> => {
    const response = await api.post<Reclamacao>(`/reclamacoes/${id}/responder`, { resposta })
    return response.data
  },
}
