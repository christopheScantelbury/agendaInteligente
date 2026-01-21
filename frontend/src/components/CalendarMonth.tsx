import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Agendamento } from '../services/agendamentoService'
import { parseISO } from 'date-fns'

interface CalendarMonthProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  agendamentos?: Agendamento[]
  className?: string
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const getStatusColor = (status?: string): string => {
  switch (status) {
    case 'CONFIRMADO':
      return '#16a34a'
    case 'CANCELADO':
      return '#dc2626'
    case 'FINALIZADO':
      return '#2563eb'
    default:
      return '#f59e0b'
  }
}

export default function CalendarMonth({ 
  selectedDate, 
  onDateSelect, 
  agendamentos = [],
  className = '' 
}: CalendarMonthProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate))

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start, end })
    
    // Adicionar dias do mês anterior para completar a primeira semana
    const firstDayOfWeek = getDay(start)
    const daysBefore = []
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      daysBefore.push(new Date(start.getTime() - (i + 1) * 24 * 60 * 60 * 1000))
    }
    
    return [...daysBefore, ...days]
  }, [currentMonth])

  // Agrupar agendamentos por data
  const agendamentosPorData = useMemo(() => {
    const map = new Map<string, { count: number; statuses: Set<string> }>()
    
    agendamentos.forEach((ag) => {
      if (!ag.dataHoraInicio) return
      const date = format(parseISO(ag.dataHoraInicio), 'yyyy-MM-dd')
      if (!map.has(date)) {
        map.set(date, { count: 0, statuses: new Set() })
      }
      const entry = map.get(date)!
      entry.count++
      if (ag.status) {
        entry.statuses.add(ag.status)
      }
    })
    
    return map
  }, [agendamentos])

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const handleToday = () => {
    const today = new Date()
    setCurrentMonth(startOfMonth(today))
    onDateSelect(today)
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={handlePreviousMonth}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
          </button>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          <button
            onClick={handleNextMonth}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
          </button>
        </div>
        <button
          onClick={handleToday}
          className="px-3 py-1.5 text-xs sm:text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          Hoje
        </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs sm:text-sm font-semibold text-gray-600 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = isSameDay(day, selectedDate)
          const isToday = isSameDay(day, new Date())
          const dateKey = format(day, 'yyyy-MM-dd')
          const agendamentoInfo = agendamentosPorData.get(dateKey)

          return (
            <button
              key={`${day.getTime()}-${index}`}
              onClick={() => {
                if (isCurrentMonth) {
                  onDateSelect(day)
                }
              }}
              className={`
                relative aspect-square p-1 sm:p-2 rounded-lg text-xs sm:text-sm font-medium
                transition-all hover:scale-105
                ${!isCurrentMonth ? 'text-gray-300 cursor-default' : 'text-gray-900'}
                ${isSelected 
                  ? 'bg-blue-600 text-white shadow-lg scale-105' 
                  : isToday 
                    ? 'bg-blue-50 text-blue-600 font-bold border-2 border-blue-300' 
                    : 'hover:bg-gray-100'
                }
                ${!isCurrentMonth ? '' : 'cursor-pointer'}
              `}
            >
              <span className="block">{format(day, 'd')}</span>
              
              {/* Indicador de agendamentos */}
              {agendamentoInfo && agendamentoInfo.count > 0 && isCurrentMonth && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                  {Array.from(agendamentoInfo.statuses).slice(0, 3).map((status, idx) => (
                    <div
                      key={idx}
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: getStatusColor(status) }}
                    />
                  ))}
                  {agendamentoInfo.statuses.size > 3 && (
                    <div className="w-1 h-1 rounded-full bg-gray-400" />
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-3 sm:gap-4 text-xs">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-blue-600 mr-2"></div>
            <span className="text-gray-600">Hoje</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
            <span className="text-gray-600">Confirmado</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
            <span className="text-gray-600">Finalizado</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
            <span className="text-gray-600">Cancelado</span>
          </div>
        </div>
      </div>
    </div>
  )
}
