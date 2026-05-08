import api from './api'
import type { AxiosError } from 'axios'

export type TipoPagamento =
  | 'PIX'
  | 'DINHEIRO'
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO'
  | 'BOLETO'

export interface RegistrarPagamentoRequest {
  tipoPagamento: TipoPagamento
  valor: number
  dataPagamento: string // yyyy-MM-dd
}

export interface PagamentoResponse {
  id: number
  tipoPagamento: TipoPagamento
  valor: number
  dataPagamento?: string
}

export interface AjustarPagamentoRequest {
  tipoPagamento: TipoPagamento
  valorAjuste: number
  dataPagamento: string // yyyy-MM-dd
}

export const pagamentoService = {
  buscarPorAgendamento: async (agendamentoId: number): Promise<PagamentoResponse | null> => {
    try {
      const response = await api.get(`/pagamentos/agendamento/${agendamentoId}`)
      return response.data
    } catch (error) {
      const status = (error as AxiosError)?.response?.status
      if (status === 404) {
        return null
      }
      throw error
    }
  },

  registrarPorAgendamento: async (
    agendamentoId: number,
    payload: RegistrarPagamentoRequest
  ) => {
    const response = await api.post(
      `/pagamentos/agendamento/${agendamentoId}/registrar`,
      payload
    )
    return response.data
  },

  ajustarPorAgendamento: async (
    agendamentoId: number,
    payload: AjustarPagamentoRequest,
    remover: boolean
  ): Promise<void> => {
    await api.patch(`/pagamentos/agendamento/${agendamentoId}/ajustar`, payload, {
      params: { remover },
    })
  },
}
