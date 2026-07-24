import { Agendamento } from '../services/agendamentoService'

type ServicoItemLike = {
  atendenteId?: number
  dataHoraInicio?: string
  dataHoraFim?: string
  nomeServico?: string
  descricao?: string
  servico?: {
    nome?: string
    descricao?: string
  }
}

export interface AgendamentoOcorrencia {
  inicio: Date
  fim: Date
  atendenteId?: number
  nomeServico: string
}

const DURACAO_PADRAO_MINUTOS = 30

function parseDataSegura(valor?: string): Date | null {
  if (!valor) return null
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? null : data
}

function overlapsIntervalo(inicio: Date, fim: Date, intervaloInicio: Date, intervaloFim: Date): boolean {
  return inicio.getTime() <= intervaloFim.getTime() && fim.getTime() >= intervaloInicio.getTime()
}

function buildOcorrencia(
  inicioStr: string | undefined,
  fimStr: string | undefined,
  atendenteId: number | undefined,
  nomeServico: string,
): AgendamentoOcorrencia | null {
  const inicio = parseDataSegura(inicioStr)
  if (!inicio) return null

  const fim =
    parseDataSegura(fimStr) ??
    new Date(inicio.getTime() + DURACAO_PADRAO_MINUTOS * 60_000)

  return {
    inicio,
    fim,
    atendenteId,
    nomeServico,
  }
}

export function getAgendamentoOcorrencias(agendamento: Agendamento): AgendamentoOcorrencia[] {
  const servicos = (agendamento.servicos ?? []) as ServicoItemLike[]
  const ocorrenciasDoServico = servicos
    .map((servico) =>
      buildOcorrencia(
        servico.dataHoraInicio ?? agendamento.dataHoraInicio,
        servico.dataHoraFim ?? agendamento.dataHoraFim,
        servico.atendenteId ?? agendamento.atendenteId,
        servico.nomeServico ?? servico.servico?.nome ?? servico.descricao ?? agendamento.servico?.nome ?? 'Serviço',
      )
    )
    .filter((item): item is AgendamentoOcorrencia => item !== null)

  if (ocorrenciasDoServico.length > 0) {
    return ocorrenciasDoServico
  }

  const ocorrenciaPrincipal = buildOcorrencia(
    agendamento.dataHoraInicio,
    agendamento.dataHoraFim,
    agendamento.atendenteId,
    agendamento.servico?.nome ?? agendamento.servico?.descricao ?? 'Serviço',
  )

  return ocorrenciaPrincipal ? [ocorrenciaPrincipal] : []
}

export function agendamentoOcupaIntervalo(
  agendamento: Agendamento,
  intervaloInicio: Date,
  intervaloFim: Date,
): boolean {
  return getAgendamentoOcorrencias(agendamento).some((ocorrencia) =>
    overlapsIntervalo(ocorrencia.inicio, ocorrencia.fim, intervaloInicio, intervaloFim)
  )
}

export function getPrimeiraOcorrenciaNoIntervalo(
  agendamento: Agendamento,
  intervaloInicio: Date,
  intervaloFim: Date,
  atendentesPermitidos?: Set<number>,
): AgendamentoOcorrencia | null {
  const ocorrencias = getAgendamentoOcorrencias(agendamento)
    .filter((ocorrencia) =>
      overlapsIntervalo(ocorrencia.inicio, ocorrencia.fim, intervaloInicio, intervaloFim)
    )
    .filter((ocorrencia) => {
      if (!atendentesPermitidos || atendentesPermitidos.size === 0) return true
      if (typeof ocorrencia.atendenteId !== 'number') return true
      return atendentesPermitidos.has(ocorrencia.atendenteId)
    })
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime() || a.fim.getTime() - b.fim.getTime())

  return ocorrencias[0] ?? null
}
