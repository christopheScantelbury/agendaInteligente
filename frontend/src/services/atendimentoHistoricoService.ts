import api from './api'

// #174: um atendimento na linha do tempo da cliente.
export interface AtendimentoHistorico {
  id?: number
  clienteId: number
  clienteNome?: string
  data: string // yyyy-MM-dd
  avaliacaoInicial?: string
  procedimento?: string
  orientacoes?: string
  observacoes?: string
  fotos?: string // URLs/descrição, uma por linha
  proximaManutencao?: string
  dataCriacao?: string
  dataAtualizacao?: string
}

export type AtendimentoHistoricoFormData = Omit<
  AtendimentoHistorico,
  'id' | 'clienteNome' | 'dataCriacao' | 'dataAtualizacao'
>

export const atendimentoHistoricoService = {
  listarPorCliente: async (clienteId: number): Promise<AtendimentoHistorico[]> => {
    const response = await api.get<AtendimentoHistorico[]>(
      `/atendimentos-historico?clienteId=${clienteId}`,
    )
    return response.data
  },

  criar: async (data: AtendimentoHistoricoFormData): Promise<AtendimentoHistorico> => {
    const response = await api.post<AtendimentoHistorico>('/atendimentos-historico', data)
    return response.data
  },

  atualizar: async (
    id: number,
    data: AtendimentoHistoricoFormData,
  ): Promise<AtendimentoHistorico> => {
    const response = await api.put<AtendimentoHistorico>(`/atendimentos-historico/${id}`, data)
    return response.data
  },

  excluir: async (id: number): Promise<void> => {
    await api.delete(`/atendimentos-historico/${id}`)
  },
}
