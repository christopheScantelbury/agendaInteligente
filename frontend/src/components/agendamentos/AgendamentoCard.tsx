import { format } from 'date-fns'
import { Agendamento } from '../../services/agendamentoService'

const STATUS_CONFIG: Record<string, { label: string; badge: string; barra: string }> = {
  AGENDADO: { label: 'Agendado', badge: 'bg-slate-100 text-slate-700', barra: 'bg-slate-900' },
  CONFIRMADO: { label: 'Confirmado', badge: 'bg-blue-50 text-blue-700', barra: 'bg-blue-500' },
  EM_ANDAMENTO: { label: 'Em procedimento', badge: 'bg-blue-50 text-blue-700', barra: 'bg-blue-500' },
  PROCEDIMENTO_FIM: { label: 'Procedimento OK', badge: 'bg-blue-50 text-blue-700', barra: 'bg-blue-600' },
  CONCLUIDO: { label: 'Finalizado', badge: 'bg-emerald-50 text-emerald-700', barra: 'bg-emerald-500' },
  FINALIZADO: { label: 'Finalizado', badge: 'bg-emerald-50 text-emerald-700', barra: 'bg-emerald-500' },
  CANCELADO: { label: 'Cancelado', badge: 'bg-red-50 text-red-700', barra: 'bg-red-500' },
  NO_SHOW: { label: 'Não compareceu', badge: 'bg-orange-50 text-orange-700', barra: 'bg-orange-500' },
}

function getStatus(status?: string) {
  if (!status) return { label: 'Pendente', badge: 'bg-amber-50 text-amber-700', barra: 'bg-amber-400' }
  return STATUS_CONFIG[status] ?? { label: status, badge: 'bg-amber-50 text-amber-700', barra: 'bg-amber-400' }
}

interface Props {
  agendamento: Agendamento
  /** Quando true, mostra chip do profissional no canto (usado quando filtro = Todos) */
  showProfissionalChip?: boolean
  onClick?: () => void
}

/**
 * Card de agendamento no padrão UX violet, otimizado pra mobile (430px).
 * Barra vertical colorida = status. Hora destacada. Cliente + serviço.
 */
export default function AgendamentoCard({ agendamento, showProfissionalChip = false, onClick }: Props) {
  const status = getStatus(agendamento.status)
  const inicio = agendamento.dataHoraInicio ? new Date(agendamento.dataHoraInicio) : null
  const fim = agendamento.dataHoraFim ? new Date(agendamento.dataHoraFim) : null
  const hora = inicio ? format(inicio, 'HH:mm') : '—'
  const duracao = inicio && fim ? Math.round((fim.getTime() - inicio.getTime()) / 60000) : null

  const clienteNome = agendamento.cliente?.nome ?? `Cliente #${agendamento.clienteId}`
  const profissionalNome = agendamento.atendente?.usuario?.nome ?? agendamento.atendente?.nome ?? null
  const profissionalInicial = profissionalNome ? profissionalNome.charAt(0).toUpperCase() : null

  const servicos = agendamento.servicos ?? []
  const servicosLabel = servicos
    .map((s: any) => s.servico?.nome ?? s.descricao ?? 'Serviço')
    .filter(Boolean)
    .join(' · ')
  const valorTotal = agendamento.valorTotal ?? agendamento.valorFinal ?? null
  // #155: agendamento pode ter outros profissionais nos itens
  const principalId = (agendamento as any).atendente?.id ?? agendamento.atendenteId
  const outrosProfs = new Set(
    servicos
      .map((s: any) => s.atendenteId)
      .filter((id: any) => id != null && id !== principalId)
  )

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-sm transition flex"
    >
      {/* Barra de status vertical */}
      <div className={`w-1.5 ${status.barra} flex-shrink-0`} aria-hidden />

      <div className="flex-1 min-w-0 p-3 sm:p-4">
        <div className="flex items-start gap-3">
          {/* Hora */}
          <div className="flex flex-col items-center text-center flex-shrink-0 pt-0.5">
            <p className="text-base font-bold text-slate-900 leading-tight">{hora}</p>
            {duracao && (
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{duracao}min</p>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-900 truncate">{clienteNome}</p>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${status.badge}`}
              >
                {status.label}
              </span>
            </div>
            {servicosLabel && (
              <p className="text-xs text-slate-500 truncate mt-0.5">{servicosLabel}</p>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {showProfissionalChip && profissionalNome && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-violet-50 border border-violet-100 rounded-full px-2 py-0.5">
                  <span className="h-3.5 w-3.5 rounded-full bg-violet-200 text-violet-800 flex items-center justify-center text-[9px] font-bold">
                    {profissionalInicial}
                  </span>
                  <span className="font-medium">{profissionalNome.split(' ')[0]}</span>
                  {outrosProfs.size > 0 && (
                    <span className="ml-1 text-[10px] font-bold text-violet-700">
                      +{outrosProfs.size}
                    </span>
                  )}
                </span>
              )}
              {valorTotal != null && (
                <span className="text-[11px] text-slate-500">
                  R$ {Number(valorTotal).toFixed(2).replace('.', ',')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}
