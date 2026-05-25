import api from './api'

export interface KpisGerente {
  faturamentoMes: number
  faturamentoMesAnterior: number
  variacaoPercentual: number | null
  ticketMedio: number
  totalAtendimentos: number
  atendimentosConcluidos: number
  taxaCancelamento: number
  ocupacaoMedia: number
  profissionaisAtivos: number
}

export interface PontoFaturamento {
  data: string // YYYY-MM-DD
  valor: number
}

export interface FaturamentoDiario {
  dias: number
  inicioAtual: string
  inicioAnterior: string
  atual: PontoFaturamento[]
  anterior: PontoFaturamento[]
}

export const dashboardGerenteService = {
  kpis: async (): Promise<KpisGerente> => {
    const response = await api.get<KpisGerente>('/dashboard/gerente/kpis')
    return response.data
  },

  faturamentoDiario: async (dias: number): Promise<FaturamentoDiario> => {
    const response = await api.get<FaturamentoDiario>('/dashboard/gerente/faturamento-diario', {
      params: { dias },
    })
    return response.data
  },

  equipe: async (): Promise<MembroEquipe[]> => {
    const response = await api.get<MembroEquipe[]>('/dashboard/gerente/equipe')
    return response.data
  },

  proximos: async (): Promise<ProximoAgendamento[]> => {
    const response = await api.get<ProximoAgendamento[]>('/dashboard/gerente/proximos')
    return response.data
  },

  checklist: async (): Promise<ChecklistResposta> => {
    const response = await api.get<ChecklistResposta>('/dashboard/gerente/checklist')
    return response.data
  },
}

export interface TarefaChecklist {
  id: string
  titulo: string
  path: string
  concluida: boolean
}

export interface ChecklistResposta {
  tarefas: TarefaChecklist[]
  concluidas: number
  total: number
}

export type StatusMembro = 'LIVRE' | 'EM_ATENDIMENTO' | 'PROXIMO'

export interface MembroEquipe {
  atendenteId: number
  nome: string
  status: StatusMembro
  proximoHorario: string | null
  faturamentoDia: number
  atendimentosHoje: number
}

export interface ProximoAgendamento {
  id: number
  dataHoraInicio: string
  status: string | null
  clienteNome: string
  atendenteNome: string | null
  servicos: string[]
}
