import { useQuery } from '@tanstack/react-query'
import { differenceInCalendarDays, differenceInMinutes, format, parseISO } from 'date-fns'
import { Agendamento } from '../../services/agendamentoService'
import { clienteService } from '../../services/clienteService'
import AgendamentoCardContent from './AgendamentoCardContent'

function statusInfo(status?: string, dataHoraInicio?: string) {
  const agora = new Date()
  const inicio = dataHoraInicio ? parseISO(dataHoraInicio) : null
  const proximo = inicio && differenceInMinutes(inicio, agora) >= 0 && differenceInMinutes(inicio, agora) <= 30
  switch (status) {
    case 'CONFIRMADO':
      return { label: 'Cliente chegou', bar: 'bg-blue-500', tag: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' }
    case 'EM_ANDAMENTO':
      return { label: 'Em andamento', bar: 'bg-blue-500', tag: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' }
    case 'PROCEDIMENTO_FIM':
    case 'CONCLUIDO':
    case 'FINALIZADO':
      return { label: 'Concluído', bar: 'bg-slate-400', tag: 'bg-slate-200 text-slate-700', dot: 'bg-slate-400' }
    case 'NO_SHOW':
      return { label: 'Não compareceu', bar: 'bg-red-500', tag: 'bg-red-100 text-red-800', dot: 'bg-red-500' }
    case 'CANCELADO':
      return { label: 'Cancelado', bar: 'bg-red-300', tag: 'bg-red-50 text-red-700', dot: 'bg-red-300' }
    default:
      if (proximo) {
        return { label: 'Próximo', bar: 'bg-violet-500', tag: 'bg-violet-100 text-violet-800', dot: 'bg-violet-500' }
      }
      return { label: 'Agendado', bar: 'bg-slate-300', tag: 'bg-slate-100 text-slate-700', dot: 'bg-slate-300' }
  }
}

function iniciaisCliente(nome?: string): string {
  if (!nome) return '?'
  const partes = nome.trim().split(/\s+/)
  if (partes.length === 1) return partes[0][0]?.toUpperCase() ?? '?'
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

function formatDiasDesdeUltimoAtendimento(
  ultimoAtendimento?: string,
  referenceDate?: Date | null,
): string {
  if (!ultimoAtendimento) return 'Cliente nova'
  if (!referenceDate) return '—'
  const ultimo = parseISO(ultimoAtendimento)
  const dias = differenceInCalendarDays(referenceDate, ultimo)
  if (dias < 0) return '—'
  return `há ${dias} dia${dias === 1 ? '' : 's'}`
}

interface Props {
  agendamento: Agendamento
  /** Quando true, mostra chip do profissional no canto (usado quando filtro = Todos) */
  showProfissionalChip?: boolean
  /** Ocorrência efetiva quando a timeline "achata" um agendamento com itens por serviço. */
  inicioOverride?: Date | null
  /** Fim efetivo da ocorrência quando a timeline "achata" o agendamento. */
  fimOverride?: Date | null
  onClick?: () => void
}

/**
 * Card de agendamento no padrão UX violet, otimizado pra mobile (430px).
 * Barra vertical colorida = status. Hora destacada. Cliente + serviço.
 */
export default function AgendamentoCard({
  agendamento,
  showProfissionalChip,
  inicioOverride,
  fimOverride,
  onClick,
}: Props) {
  const status = statusInfo(agendamento.status, agendamento.dataHoraInicio)
  const inicio = inicioOverride ?? (agendamento.dataHoraInicio ? new Date(agendamento.dataHoraInicio) : null)
  const fim = fimOverride ?? (agendamento.dataHoraFim ? new Date(agendamento.dataHoraFim) : null)
  const duracaoMin = inicio && fim ? Math.max(0, differenceInMinutes(fim, inicio)) : null
  const clienteNome = agendamento.cliente?.nome ?? 'Cliente'
  const primeiroServico = (agendamento.servicos ?? [])[0] as any
  const servicoNome =
    primeiroServico?.nomeServico
    ?? primeiroServico?.servico?.nome
    ?? primeiroServico?.descricao
    ?? 'Procedimento'

  const { data: resumo, isLoading: loadingResumo } = useQuery({
    queryKey: ['cliente-resumo', agendamento.clienteId],
    queryFn: () => clienteService.buscarResumo(agendamento.clienteId),
    enabled: !!agendamento.clienteId,
    staleTime: 5 * 60_000,
  })

  const diasLabel = loadingResumo
    ? '...'
    : formatDiasDesdeUltimoAtendimento(resumo?.ultimoAtendimento, inicio)

  return (
    showProfissionalChip ? (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-violet-300 active:scale-[0.99] transition overflow-hidden flex"
      >
        <div className="flex flex-col items-center justify-center bg-slate-50 px-3 py-3 w-16 flex-shrink-0 border-r border-gray-100">
          <span className="text-[11px] font-bold text-slate-900 leading-tight">
            {inicio ? format(inicio, 'HH:mm') : '—'}
          </span>
          {duracaoMin != null && duracaoMin > 0 && (
            <span className="text-[9px] text-gray-500 mt-0.5">{duracaoMin} min</span>
          )}
        </div>

        <div className={`w-1 ${status.bar} flex-shrink-0`} aria-hidden />

        <div className="flex-1 px-3 py-3 min-w-0 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
            {iniciaisCliente(clienteNome)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <p className="text-[11px] font-semibold text-slate-900 truncate">{clienteNome}</p>
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${status.tag} whitespace-nowrap`}>
                {status.label}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 truncate">{servicoNome}</p>
            <p className="text-[9px] text-slate-400 mt-0.5 truncate">{diasLabel}</p>
          </div>
        </div>
      </button>
    ) : (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-sm transition flex"
      >
        <div className={`w-1.5 ${status.bar} flex-shrink-0`} aria-hidden />
        <AgendamentoCardContent
          agendamento={agendamento}
          inicio={inicio}
          fim={fim}
          referenceDate={inicio}
        />
      </button>
    )
  )
}
