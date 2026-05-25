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

export interface Performance {
  inicio: string
  fim: string
  diasNoPeriodo: number
  receita: number
  despesa: number
  lucro: number
  atendimentos: number
  clientesAtendidos: number
  horasAtendidas: number
  atendenteId?: number
  atendenteNome?: string
}

export interface MesValor {
  mes: string
  valor: number
}

export interface FinanceiroDashboard {
  ano: number
  receitaTotal: number
  despesaTotal: number
  lucroTotal: number
  receitaPorFormaPagamento: Record<string, number>
  receitaPorMes: MesValor[]
  despesaPorMes: MesValor[]
  melhorMes?: string
  melhorMesValor: number
  piorMes?: string
  piorMesValor: number
  ganhoMedioMensal: number
}

export interface FluxoCaixaDiario {
  dia: string
  entradas: number
  saidas: number
  saldoDia: number
  saldoAcumulado: number
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

  performance: async (inicio: string, fim: string, atendenteId?: number): Promise<Performance> => {
    const { data } = await api.get('/relatorios/performance', { params: { inicio, fim, atendenteId } })
    return data
  },

  financeiroDashboard: async (ano: number, unidadeId?: number): Promise<FinanceiroDashboard> => {
    const { data } = await api.get('/relatorios/financeiro/dashboard', { params: { ano, unidadeId } })
    return data
  },

  fluxoDiario: async (inicio: string, fim: string, unidadeId?: number): Promise<FluxoCaixaDiario[]> => {
    const { data } = await api.get('/relatorios/financeiro/fluxo-diario', { params: { inicio, fim, unidadeId } })
    return data
  },
}
