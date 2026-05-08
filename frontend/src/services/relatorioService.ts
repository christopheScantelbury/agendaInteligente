import api from './api'

export interface FaturamentoMensal {
  mes: string
  totalAgendamentos: number
  faturamento: number
}

export interface TopServico {
  servicoNome: string
  totalRealizados: number
  receitaTotal: number
}

export interface TaxaRetorno {
  mes: string
  clientesUnicos: number
  clientesRetorno: number
  taxaRetorno: number
}

export const relatorioService = {
  faturamentoMensal: async (meses = 6, unidadeId?: number): Promise<FaturamentoMensal[]> => {
    const { data } = await api.get('/relatorios/faturamento-mensal', { params: { meses, unidadeId } })
    return data
  },

  topServicos: async (meses = 6, unidadeId?: number): Promise<TopServico[]> => {
    const { data } = await api.get('/relatorios/top-servicos', { params: { meses, unidadeId } })
    return data
  },

  taxaRetorno: async (meses = 6, unidadeId?: number): Promise<TaxaRetorno[]> => {
    const { data } = await api.get('/relatorios/taxa-retorno', { params: { meses, unidadeId } })
    return data
  },
}
