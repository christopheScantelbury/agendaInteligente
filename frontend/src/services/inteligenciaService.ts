import api from './api'

export interface HorarioPopular {
  hora: number
  diaSemana: number
  total: number
  noShows: number
  taxaNoShow: number
  popular: boolean
}

export interface NoShowRisco {
  agendamentoId: number
  clienteNome: string
  dataHoraInicio: string
  scoreRisco: number
  nivelRisco: 'BAIXO' | 'MEDIO' | 'ALTO'
}

export interface ServicoComplementar {
  servicoId: number
  servicoNome: string
  coOcorrencias: number
  percentual: number
}

export interface InsightSemanal {
  id: number
  unidadeId: number | null
  semana: string
  texto: string
  criadoEm: string
}

export interface ClienteRisco {
  clienteId: number
  clienteNome: string
  diasAusente: number
  ultimoServico: string
  mensagemSugerida: string
}

export interface ProfissionalChurn {
  atendenteId: number
  atendenteNome: string
  clientesRecorrentes90dias: number
  clientesRecorrentes30dias: number
  taxaChurn: number
}

export const inteligenciaService = {
  horariosPopulares: async (unidadeId?: number): Promise<HorarioPopular[]> => {
    const params = unidadeId ? { unidadeId } : {}
    const { data } = await api.get('/inteligencia/horarios-populares', { params })
    return data
  },

  riscoNoShow: async (unidadeId?: number): Promise<NoShowRisco[]> => {
    const params = unidadeId ? { unidadeId } : {}
    const { data } = await api.get('/inteligencia/risco-no-show', { params })
    return data
  },

  servicosComplementares: async (servicoId: number): Promise<ServicoComplementar[]> => {
    const { data } = await api.get('/inteligencia/servicos-complementares', { params: { servicoId } })
    return data
  },

  insightsSemanal: async (unidadeId?: number): Promise<InsightSemanal[]> => {
    const params = unidadeId ? { unidadeId } : {}
    const { data } = await api.get('/inteligencia/insights-semanais', { params })
    return data
  },

  clientesEmRisco: async (unidadeId?: number): Promise<ClienteRisco[]> => {
    const params = unidadeId ? { unidadeId } : {}
    const { data } = await api.get('/inteligencia/clientes-risco', { params })
    return data
  },

  churnPorProfissional: async (unidadeId?: number): Promise<ProfissionalChurn[]> => {
    const params = unidadeId ? { unidadeId } : {}
    const { data } = await api.get('/inteligencia/churn-profissional', { params })
    return data
  },
}
