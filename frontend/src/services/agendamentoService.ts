import api from './api'

export interface AgendamentoServico {
  servicoId: number
  quantidade?: number
  valor?: number
  descricao?: string
  valorTotal?: number
  // ── Issue #155: por item (opcionais) ──
  /** Profissional do item; opcional. Se nulo, herda do agendamento. */
  atendenteId?: number
  /** Início do item; opcional. Se nulo, herda do agendamento. */
  dataHoraInicio?: string
  /** Fim do item; opcional. */
  dataHoraFim?: string
  // Exibição
  nomeServico?: string
  nomeAtendente?: string
}

export interface Recorrencia {
  recorrente: boolean
  tipoRecorrencia?: 'DIARIA' | 'SEMANAL' | 'MENSAL'
  diasDaSemana?: number[]
  tipoTermino?: 'INFINITA' | 'DATA' | 'OCORRENCIAS'
  dataTermino?: string
  numeroOcorrencias?: number
  intervalo?: number
}

export interface Agendamento {
  id?: number
  clienteId: number
  unidadeId: number
  atendenteId: number
  dataHoraInicio: string
  dataHoraFim?: string
  observacoes?: string
  formaPagamentoPreferida?: string
  valorTotal?: number
  valorFinal?: number
  // ── Sinal/Adiantamento ──
  valorSinal?: number
  sinalPago?: boolean
  sinalDataPagamento?: string
  sinalFormaPagamento?: string
  status?: string
  servicos: AgendamentoServico[]
  cliente?: any
  servico?: any
  unidade?: any
  atendente?: any
  recorrencia?: Recorrencia
  agendamentoRecorrente?: boolean
  agendamentoOriginalId?: number
  serieRecorrenciaId?: string
}

export interface FinalizarAgendamento {
  valorFinal: number
  tipoPagamento?: 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'BOLETO'
}

export const agendamentoService = {
  listar: async (): Promise<Agendamento[]> => {
    const response = await api.get<Agendamento[]>('/agendamentos')
    return response.data
  },

  buscarPorId: async (id: number): Promise<Agendamento> => {
    const response = await api.get<Agendamento>(`/agendamentos/${id}`)
    return response.data
  },

  criar: async (agendamento: Agendamento): Promise<Agendamento> => {
    const response = await api.post<Agendamento>('/agendamentos', agendamento)
    return response.data
  },

  atualizar: async (id: number, agendamento: Agendamento): Promise<Agendamento> => {
    const response = await api.put<Agendamento>(`/agendamentos/${id}`, agendamento)
    return response.data
  },

  cancelar: async (id: number): Promise<void> => {
    await api.post(`/agendamentos/${id}/cancelar`)
  },

  atualizarStatus: async (id: number, status: string): Promise<Agendamento> => {
    const response = await api.patch<Agendamento>(`/agendamentos/${id}/status`, null, {
      params: { status },
    })
    return response.data
  },

  atualizarObservacao: async (id: number, observacoes: string): Promise<Agendamento> => {
    const response = await api.patch<Agendamento>(`/agendamentos/${id}/observacao`, {
      observacoes,
    })
    return response.data
  },

  excluir: async (id: number): Promise<void> => {
    await api.delete(`/agendamentos/${id}`)
  },

  finalizar: async (id: number, payload: FinalizarAgendamento): Promise<Agendamento> => {
    const response = await api.post<Agendamento>(`/agendamentos/${id}/finalizar`, payload)
    return response.data
  },

  reabrir: async (id: number, motivo: string): Promise<Agendamento> => {
    const response = await api.post<Agendamento>(`/agendamentos/${id}/reabrir`, { motivo })
    return response.data
  },

  registrarSinal: async (id: number, valor: number, formaPagamento: string): Promise<Agendamento> => {
    const response = await api.post<Agendamento>(`/agendamentos/${id}/sinal`, { valor, formaPagamento })
    return response.data
  },

  emitirNotaFiscal: async (agendamentoId: number): Promise<void> => {
    await api.post(`/notas-fiscais/agendamento/${agendamentoId}/emitir`)
  },
}
