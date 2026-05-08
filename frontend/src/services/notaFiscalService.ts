import api from './api'

export type StatusNotaFiscal = 'PENDENTE' | 'PROCESSANDO' | 'EMITIDA' | 'CANCELADA' | 'ERRO'

export interface NotaFiscal {
  id: number
  agendamentoId: number
  numeroNfse: string | null
  codigoVerificacao: string | null
  urlNfse: string | null
  status: StatusNotaFiscal
  mensagemErro: string | null
  dataEmissao: string | null
}

export const notaFiscalService = {
  buscarPorAgendamento: async (agendamentoId: number): Promise<NotaFiscal> => {
    const res = await api.get<NotaFiscal>(`/notas-fiscais/agendamento/${agendamentoId}`)
    return res.data
  },

  emitir: async (agendamentoId: number): Promise<void> => {
    await api.post(`/notas-fiscais/agendamento/${agendamentoId}/emitir`)
  },
}
