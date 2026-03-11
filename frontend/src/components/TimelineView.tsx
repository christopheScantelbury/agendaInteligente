import { useMemo } from 'react'
import { format, parseISO, startOfDay, addHours, setHours, setMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Agendamento } from '../services/agendamentoService'
import { Clock, MapPin, User, Calendar as CalendarIcon } from 'lucide-react'

interface TimelineViewProps {
  agendamentos: Agendamento[]
  selectedDate: Date
  onEventClick?: (agendamento: Agendamento) => void
  onSlotClick?: (date: Date) => void
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7)

const getStatusColor = (status?: string): string => {
  switch (status) {
    case 'CONFIRMADO':
      return 'bg-green-500'
    case 'CANCELADO':
      return 'bg-red-500'
    case 'FINALIZADO':
      return 'bg-blue-500'
    default:
      return 'bg-yellow-500'
  }
}

const getStatusBorderColor = (status?: string): string => {
  switch (status) {
    case 'CONFIRMADO':
      return 'border-green-600'
    case 'CANCELADO':
      return 'border-red-600'
    case 'FINALIZADO':
      return 'border-blue-600'
    default:
      return 'border-yellow-600'
  }
}

export default function TimelineView({ agendamentos, selectedDate, onEventClick, onSlotClick }: TimelineViewProps) {
  const dayStart = startOfDay(selectedDate)

  const agendamentosPorHora = useMemo(() => {
    const agendamentosDoDia = agendamentos.filter((ag) => {
      if (!ag.dataHoraInicio) return false
      const agDate = parseISO(ag.dataHoraInicio)
      return format(agDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
    })

    const porHora: Map<number, Agendamento[]> = new Map()

    agendamentosDoDia.forEach((ag) => {
      const agDate = parseISO(ag.dataHoraInicio)
      const hora = agDate.getHours()

      if (!porHora.has(hora)) {
        porHora.set(hora, [])
      }
      porHora.get(hora)!.push(ag)
    })

    return porHora
  }, [agendamentos, selectedDate])

  const handleSlotClick = (hour: number) => {
    if (onSlotClick) {
      const slotDate = setMinutes(setHours(dayStart, hour), 0)
      onSlotClick(slotDate)
    }
  }

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)]">
      <div className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-sky-900 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200/80">
              Agenda do dia
            </p>
            <h3 className="mt-1 text-sm font-semibold text-white sm:text-base">
              {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h3>
            <p className="mt-1 text-xs text-slate-300 sm:text-sm">
              {agendamentosPorHora.size} {agendamentosPorHora.size === 1 ? 'faixa ocupada' : 'faixas ocupadas'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 max-h-[600px] overflow-y-auto overflow-x-hidden sm:max-h-[700px]">
        <div className="relative min-w-0">
          <div className="pointer-events-none absolute bottom-0 left-12 top-0 w-0.5 bg-slate-200 sm:left-16"></div>

          {HOURS.map((hour) => {
            const agendamentosNestaHora = agendamentosPorHora.get(hour) || []
            const horaFormatada = format(setHours(dayStart, hour), 'HH:mm')
            const periodo = hour < 12 ? 'AM' : 'PM'
            const hora12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour

            return (
              <div key={hour} className="relative min-w-0">
                <div className="flex min-w-0 items-start gap-2 px-3 py-3 transition-colors hover:bg-slate-50 sm:gap-0 sm:px-6 sm:py-4">
                  <div className="flex min-w-[2.5rem] shrink-0 items-center sm:min-w-[4rem]">
                    <div className="relative z-10 flex items-center">
                      <div className="h-3 w-3 rounded-full border-2 border-white bg-sky-500 shadow-sm sm:h-4 sm:w-4"></div>
                      <div className="ml-1.5 sm:ml-3">
                        <span className="text-xs font-semibold text-slate-900 sm:text-sm">
                          {horaFormatada}
                        </span>
                        <span className="ml-1 hidden text-xs text-slate-500 sm:inline">
                          {hora12}:00 {periodo}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="ml-2 min-w-0 flex-1 overflow-hidden sm:ml-6">
                    {agendamentosNestaHora.length === 0 ? (
                      <button
                        onClick={() => handleSlotClick(hour)}
                        className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-left text-sm text-slate-500 transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
                      >
                        <span className="flex items-center">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          Clique para agendar
                        </span>
                      </button>
                    ) : (
                      <div className="space-y-2 sm:space-y-3">
                        {agendamentosNestaHora.map((agendamento) => {
                          const inicio = parseISO(agendamento.dataHoraInicio)
                          const fim = agendamento.dataHoraFim
                            ? parseISO(agendamento.dataHoraFim)
                            : addHours(inicio, 1)

                          const servicosNomes = agendamento.servicos
                            ?.map((s) => s.descricao || 'Serviço')
                            .join(', ') || 'Sem serviço'

                          return (
                            <button
                              key={agendamento.id}
                              onClick={() => onEventClick?.(agendamento)}
                              className={`group w-full min-w-0 rounded-2xl border border-slate-200 border-l-4 ${getStatusBorderColor(agendamento.status)} bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg sm:p-4`}
                            >
                              <div className="mb-2 flex min-w-0 items-start justify-between gap-2">
                                <div className="min-w-0 flex-1 overflow-hidden">
                                  <h4 className="mb-1 truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-sky-700 sm:text-base">
                                    {agendamento.cliente?.nome || 'Cliente não informado'}
                                  </h4>
                                  <p className="line-clamp-1 truncate text-xs text-slate-600 sm:text-sm">
                                    {servicosNomes}
                                  </p>
                                </div>
                                <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-white ${getStatusColor(agendamento.status)}`}>
                                  {agendamento.status === 'CONFIRMADO' ? 'Confirmado' :
                                   agendamento.status === 'CANCELADO' ? 'Cancelado' :
                                   agendamento.status === 'FINALIZADO' ? 'Finalizado' : 'Pendente'}
                                </span>
                              </div>

                              <div className="mt-3 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 sm:gap-4 sm:text-sm">
                                <div className="flex shrink-0 items-center">
                                  <Clock className="mr-1.5 h-3 w-3 shrink-0 text-slate-400 sm:h-4 sm:w-4" />
                                  <span>
                                    {format(inicio, 'HH:mm')} - {format(fim, 'HH:mm')}
                                  </span>
                                </div>
                                {agendamento.atendente?.nome && (
                                  <div className="flex min-w-0 max-w-full items-center">
                                    <User className="mr-1.5 h-3 w-3 shrink-0 text-slate-400 sm:h-4 sm:w-4" />
                                    <span className="max-w-[80px] truncate sm:max-w-[120px]">
                                      {agendamento.atendente.nome}
                                    </span>
                                  </div>
                                )}
                                {agendamento.unidade?.nome && (
                                  <div className="flex min-w-0 max-w-full items-center">
                                    <MapPin className="mr-1.5 h-3 w-3 shrink-0 text-slate-400 sm:h-4 sm:w-4" />
                                    <span className="max-w-[80px] truncate sm:max-w-[120px]">
                                      {agendamento.unidade.nome}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {agendamento.valorTotal && (
                                <div className="mt-2 border-t border-slate-100 pt-2">
                                  <span className="text-xs font-semibold text-emerald-600 sm:text-sm">
                                    R$ {agendamento.valorTotal.toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {agendamentosPorHora.size === 0 && (
        <div className="flex flex-col items-center justify-center px-4 py-12">
          <CalendarIcon className="mb-4 h-12 w-12 text-slate-300 sm:h-16 sm:w-16" />
          <p className="mb-1 text-sm font-medium text-slate-500 sm:text-base">
            Nenhum agendamento neste dia
          </p>
          <p className="text-center text-xs text-slate-400 sm:text-sm">
            Clique em um horário acima para criar um novo agendamento
          </p>
        </div>
      )}
    </div>
  )
}
