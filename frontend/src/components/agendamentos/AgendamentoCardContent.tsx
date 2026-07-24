import { useQuery } from '@tanstack/react-query'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { clienteService } from '../../services/clienteService'
import { Agendamento } from '../../services/agendamentoService'

interface Props {
  agendamento: Agendamento
  inicio?: Date | null
  fim?: Date | null
  referenceDate?: Date | null
  compact?: boolean
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

export default function AgendamentoCardContent({
  agendamento,
  inicio,
  fim,
  referenceDate,
  compact = false,
}: Props) {
  const { data: resumo, isLoading } = useQuery({
    queryKey: ['cliente-resumo', agendamento.clienteId],
    queryFn: () => clienteService.buscarResumo(agendamento.clienteId),
    enabled: !!agendamento.clienteId,
    staleTime: 5 * 60_000,
  })

  const timeLabel = inicio
    ? `${format(inicio, 'HH:mm')}${fim ? ` - ${format(fim, 'HH:mm')}` : ''}`
    : '—'

  const clienteNome = agendamento.cliente?.nome ?? `Cliente #${agendamento.clienteId}`
  const primeiroServico = (agendamento.servicos ?? [])[0] as any
  const procedimentoNome =
    primeiroServico?.nomeServico
    ?? primeiroServico?.servico?.nome
    ?? primeiroServico?.descricao
    ?? 'Procedimento'

  const diasLabel = isLoading
    ? '...'
    : formatDiasDesdeUltimoAtendimento(resumo?.ultimoAtendimento, referenceDate ?? inicio ?? null)

  const clienteClass = compact ? 'text-[11px]' : 'text-base'
  const timeClass = clienteClass
  const procedimentoClass = clienteClass
  const diasClass = compact ? 'text-[9px]' : 'text-xs'

  return (
    <div className={`flex-1 min-w-0 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}>
      <p className={`font-bold text-slate-900 leading-tight truncate ${timeClass}`}>
        {timeLabel}
      </p>
      <p className={`font-semibold text-slate-900 leading-tight truncate mt-0.5 ${clienteClass}`}>
        {clienteNome}
      </p>
      <p className={`text-slate-500 leading-tight truncate mt-0.5 ${procedimentoClass}`}>
        {procedimentoNome}
      </p>
      <p className={`text-slate-400 leading-tight truncate mt-0.5 ${diasClass}`}>
        {diasLabel}
      </p>
    </div>
  )
}
