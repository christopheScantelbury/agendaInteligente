import api from './api'

export interface NotaFacilPreRequisito {
  chave: string
  rotulo: string
  ok: boolean
  detalhe?: string
}

export interface NotaFacilStatus {
  provisionado: boolean
  apiKeyMascarada: string | null
  provisionadoEm: string | null
  notafacilAtivo: boolean
  preRequisitos: NotaFacilPreRequisito[]
}

export const notaFacilService = {
  status: async (unidadeId: number): Promise<NotaFacilStatus> => {
    const { data } = await api.get<NotaFacilStatus>(`/unidades/${unidadeId}/notafacil/status`)
    return data
  },
  provisionar: async (unidadeId: number): Promise<NotaFacilStatus> => {
    const { data } = await api.post<NotaFacilStatus>(`/unidades/${unidadeId}/notafacil/provisionar`)
    return data
  },
  revogar: async (unidadeId: number): Promise<NotaFacilStatus> => {
    const { data } = await api.delete<NotaFacilStatus>(`/unidades/${unidadeId}/notafacil`)
    return data
  },
}
