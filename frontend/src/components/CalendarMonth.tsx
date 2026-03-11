import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns'
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
  className = '',
}: CalendarMonthProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate))

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start, end })

    const firstDayOfWeek = getDay(start)
    const daysBefore = []
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      daysBefore.push(new Date(start.getTime() - (i + 1) * 24 * 60 * 60 * 1000))
    }

    return [...daysBefore, ...days]
  }, [currentMonth])

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

  const mesAtualFormatado = currentMonth.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className={`min-w-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] ${className}`}>
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:px-6">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          Navegação mensal
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <h3 className="text-base font-bold capitalize text-slate-900 sm:text-lg">
              {mesAtualFormatado}
            </h3>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm">
            <button
              onClick={handlePreviousMonth}
              className="rounded-full p-1 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleToday}
              className="rounded-full px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 sm:text-sm"
            >
              Hoje
            </button>
            <button
              onClick={handleNextMonth}
              className="rounded-full p-1 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 px-4 pb-2 pt-4 sm:px-6">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:text-xs"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 px-4 pb-4 sm:px-6">
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
                relative aspect-square rounded-2xl p-1 text-xs font-medium transition-all sm:p-2 sm:text-sm
                ${!isCurrentMonth ? 'text-slate-300 cursor-default' : 'text-slate-900'}
                ${isSelected
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-300/60'
                  : isToday
                    ? 'bg-sky-50 text-sky-700 font-bold border border-sky-200'
                    : 'hover:bg-slate-100'
                }
                ${!isCurrentMonth ? '' : 'cursor-pointer'}
              `}
            >
              <span className="block">{format(day, 'd')}</span>

              {agendamentoInfo && agendamentoInfo.count > 0 && isCurrentMonth && (
                <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 transform gap-0.5">
                  {Array.from(agendamentoInfo.statuses).slice(0, 3).map((status, idx) => (
                    <div
                      key={idx}
                      className="h-1 w-1 rounded-full"
                      style={{ backgroundColor: getStatusColor(status) }}
                    />
                  ))}
                  {agendamentoInfo.statuses.size > 3 && (
                    <div className="h-1 w-1 rounded-full bg-gray-400" />
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="border-t border-slate-100 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap gap-3 text-xs sm:gap-4">
          <div className="flex items-center rounded-full bg-slate-50 px-3 py-1.5">
            <div className="mr-2 h-2 w-2 rounded-full bg-blue-600"></div>
            <span className="text-slate-600">Hoje</span>
          </div>
          <div className="flex items-center rounded-full bg-slate-50 px-3 py-1.5">
            <div className="mr-2 h-2 w-2 rounded-full bg-green-500"></div>
            <span className="text-slate-600">Confirmado</span>
          </div>
          <div className="flex items-center rounded-full bg-slate-50 px-3 py-1.5">
            <div className="mr-2 h-2 w-2 rounded-full bg-blue-500"></div>
            <span className="text-slate-600">Finalizado</span>
          </div>
          <div className="flex items-center rounded-full bg-slate-50 px-3 py-1.5">
            <div className="mr-2 h-2 w-2 rounded-full bg-red-500"></div>
            <span className="text-slate-600">Cancelado</span>
          </div>
        </div>
      </div>
    </div>
  )
}
