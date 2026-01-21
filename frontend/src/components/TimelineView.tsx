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

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7:00 até 20:00

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
  
  // Agrupar agendamentos por hora
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
    <div className="flex flex-col bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-sm sm:text-base">
              {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h3>
            <p className="text-blue-100 text-xs sm:text-sm mt-1">
              {agendamentosPorHora.size} {agendamentosPorHora.size === 1 ? 'agendamento' : 'agendamentos'}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto max-h-[600px] sm:max-h-[700px]">
        <div className="relative">
          {/* Linha do tempo */}
          <div className="absolute left-12 sm:left-16 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          {HOURS.map((hour) => {
            const agendamentosNestaHora = agendamentosPorHora.get(hour) || []
            const horaFormatada = format(setHours(dayStart, hour), 'HH:mm')
            const periodo = hour < 12 ? 'AM' : 'PM'
            const hora12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour

            return (
              <div key={hour} className="relative">
                {/* Marcador de hora */}
                <div className="flex items-start px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center min-w-[3rem] sm:min-w-[4rem]">
                    <div className="relative z-10 flex items-center">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm"></div>
                      <div className="ml-2 sm:ml-3">
                        <span className="text-xs sm:text-sm font-semibold text-gray-900">
                          {horaFormatada}
                        </span>
                        <span className="text-xs text-gray-500 ml-1 hidden sm:inline">
                          {hora12}:00 {periodo}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Área de eventos */}
                  <div className="flex-1 ml-4 sm:ml-6">
                    {agendamentosNestaHora.length === 0 ? (
                      <button
                        onClick={() => handleSlotClick(hour)}
                        className="w-full text-left py-2 px-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-sm text-gray-500 hover:text-blue-600"
                      >
                        <span className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2" />
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
                              className={`w-full text-left p-3 sm:p-4 rounded-lg border-l-4 ${getStatusBorderColor(agendamento.status)} bg-white shadow-sm hover:shadow-md transition-all transform hover:scale-[1.02] group`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 text-sm sm:text-base mb-1 group-hover:text-blue-600 transition-colors">
                                    {agendamento.cliente?.nome || 'Cliente não informado'}
                                  </h4>
                                  <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">
                                    {servicosNomes}
                                  </p>
                                </div>
                                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(agendamento.status)}`}>
                                  {agendamento.status === 'CONFIRMADO' ? 'Confirmado' :
                                   agendamento.status === 'CANCELADO' ? 'Cancelado' :
                                   agendamento.status === 'FINALIZADO' ? 'Finalizado' : 'Pendente'}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-3 sm:gap-4 mt-3 text-xs sm:text-sm text-gray-500">
                                <div className="flex items-center">
                                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 text-gray-400" />
                                  <span>
                                    {format(inicio, 'HH:mm')} - {format(fim, 'HH:mm')}
                                  </span>
                                </div>
                                {agendamento.atendente?.nome && (
                                  <div className="flex items-center">
                                    <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 text-gray-400" />
                                    <span className="truncate max-w-[120px] sm:max-w-none">
                                      {agendamento.atendente.nome}
                                    </span>
                                  </div>
                                )}
                                {agendamento.unidade?.nome && (
                                  <div className="flex items-center">
                                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 text-gray-400" />
                                    <span className="truncate max-w-[120px] sm:max-w-none">
                                      {agendamento.unidade.nome}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {agendamento.valorTotal && (
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                  <span className="text-xs sm:text-sm font-semibold text-green-600">
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

      {/* Empty state */}
      {agendamentosPorHora.size === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <CalendarIcon className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mb-4" />
          <p className="text-gray-500 text-sm sm:text-base font-medium mb-1">
            Nenhum agendamento neste dia
          </p>
          <p className="text-gray-400 text-xs sm:text-sm text-center">
            Clique em um horário acima para criar um novo agendamento
          </p>
        </div>
      )}
    </div>
  )
}
