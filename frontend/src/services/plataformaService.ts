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

export interface EmpresaPlataforma {
  id: number
  nome: string
  razaoSocial?: string
  cnpj?: string
  email?: string
  categoria?: string
  status: 'ATIVA' | 'INATIVA'
  dataCadastro?: string
  ultimaAtividade?: string
  agendamentosMes: number
  plano: string | null
  mrr: number | null
}

export const plataformaService = {
  metricas: async (): Promise<MetricasPlataforma> => {
    const response = await api.get<MetricasPlataforma>('/plataforma/metricas')
    return response.data
  },

  listarEmpresas: async (): Promise<EmpresaPlataforma[]> => {
    const response = await api.get<EmpresaPlataforma[]>('/plataforma/empresas')
    return response.data
  },
}
