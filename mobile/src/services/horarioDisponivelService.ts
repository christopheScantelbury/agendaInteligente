import api from './api'

export interface HorarioDisponivel {
  id?: number
  atendenteId: number
  atendenteNome?: string
  unidadeId?: number
  unidadeNome?: string
  dataHoraInicio: string
  dataHoraFim: string
  disponivel?: boolean
  observacoes?: string
}

export const horarioDisponivelService = {
  buscarHorariosDisponiveis: async (
    unidadeId: number,
    servicoId: number,
    dataInicio: string,
    dataFim: string
  ): Promise<HorarioDisponivel[]> => {
    const response = await api.get<HorarioDisponivel[]>('/horarios-disponiveis/buscar', {
      params: { unidadeId, servicoId, dataInicio, dataFim },
    })
    return response.data
  },
  
  buscarHorariosDisponiveisMultiplosServicos: async (
    unidadeId: number,
    servicosIds: number[],
    dataInicio: string,
    dataFim: string
  ): Promise<HorarioDisponivel[]> => {
    // Buscar horários para cada serviço e combinar
    const promises = servicosIds.map(servicoId =>
      horarioDisponivelService.buscarHorariosDisponiveis(unidadeId, servicoId, dataInicio, dataFim)
    )
    const resultados = await Promise.all(promises)
    // Combinar e remover duplicatas (mesmo atendente e horário)
    const horariosUnicos = new Map<string, HorarioDisponivel>()
    resultados.flat().forEach(horario => {
      const key = `${horario.atendenteId}-${horario.dataHoraInicio}-${horario.dataHoraFim}`
      if (!horariosUnicos.has(key)) {
        horariosUnicos.set(key, horario)
      }
    })
    return Array.from(horariosUnicos.values())
  },
}
