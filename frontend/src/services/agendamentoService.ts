import api from './api'

export interface AgendamentoServico {
  servicoId: number
  quantidade?: number
  valor?: number
  descricao?: string
  valorTotal?: number
}

export interface Agendamento {
  id?: number
  clienteId: number
  unidadeId: number
  atendenteId: number
  dataHoraInicio: string
  dataHoraFim?: string
  observacoes?: string
  valorTotal?: number
  valorFinal?: number
  status?: string
  servicos: AgendamentoServico[]
  cliente?: any
  servico?: any
  unidade?: any
  atendente?: any
}

export interface FinalizarAgendamento {
  valorFinal: number
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

  cancelar: async (id: number): Promise<void> => {
    await api.post(`/agendamentos/${id}/cancelar`)
  },

  finalizar: async (id: number, valorFinal: number): Promise<Agendamento> => {
    const response = await api.post<Agendamento>(`/agendamentos/${id}/finalizar`, { valorFinal })
    return response.data
  },
}

