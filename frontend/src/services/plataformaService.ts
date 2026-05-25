import api from './api'

export interface MetricasPlataforma {
  empresasAtivas: number
  totalEmpresas: number
  usuariosAtivos: number
  totalAgendamentos: number
  agendamentosMes: number
  totalNfse: number
  nfseMes: number
  mrr: number | null
  churn: number | null
}

export const plataformaService = {
  metricas: async (): Promise<MetricasPlataforma> => {
    const response = await api.get<MetricasPlataforma>('/plataforma/metricas')
    return response.data
  },
}
