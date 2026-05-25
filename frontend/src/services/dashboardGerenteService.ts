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
}
