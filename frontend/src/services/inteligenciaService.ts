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
}
