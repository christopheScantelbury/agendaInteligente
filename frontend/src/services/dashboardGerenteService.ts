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

export const dashboardGerenteService = {
  kpis: async (): Promise<KpisGerente> => {
    const response = await api.get<KpisGerente>('/dashboard/gerente/kpis')
    return response.data
  },
}
