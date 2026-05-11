import { useState, useMemo, useEffect } from 'react'
import { Calendar, dateFnsLocalizer, View, SlotInfo } from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './CalendarView.css'
import { Agendamento } from '../services/agendamentoService'
import { format, parse, startOfWeek, endOfWeek, startOfMonth, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { locale: ptBR }),
  getDay,
  locales: { 'pt-BR': ptBR },
})

const capitalizar = (texto: string): string =>
  texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto

const DIAS_SEMANA_ABREVIADOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const formatarDiaCabecalho = (date: Date): string =>
  `${DIAS_SEMANA_ABREVIADOS[getDay(date)]} ${format(date, 'dd/MM', { locale: ptBR })}`

interface ToolbarProps {
  date: Date
  view: View
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void
  onView: (view: View) => void
}

function CalendarToolbar({
  date,
  view,
  onNavigate,
  onView,
}: ToolbarProps) {
  const label = useMemo(() => {
    if (view === 'month') {
      return capitalizar(format(startOfMonth(date), 'MMMM yyyy', { locale: ptBR }))
    }

    if (view === 'week') {
      const start = startOfWeek(date, { locale: ptBR })
      const end = endOfWeek(date, { locale: ptBR })
      return `${capitalizar(format(start, 'MMMM', { locale: ptBR }))} ${format(start, 'dd')} - ${format(end, 'dd')}`
    }

    return capitalizar(format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }))
  }, [date, view])

  return (
    <div className="rbc-toolbar">
      <div className="rbc-btn-group">
        <button type="button" onClick={() => onNavigate('PREV')} aria-label="Anterior">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => onNavigate('TODAY')}>
          Hoje
        </button>
        <button type="button" onClick={() => onNavigate('NEXT')} aria-label="Próximo">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <span className="rbc-toolbar-label">{label}</span>
      <div className="rbc-btn-group">
        <button
          type="button"
          onClick={() => onView('day')}
          className={view === 'day' ? 'rbc-active' : ''}
        >
          Dia
        </button>
        <button
          type="button"
          onClick={() => onView('week')}
          className={view === 'week' ? 'rbc-active' : ''}
        >
          Semana
        </button>
      </div>
    </div>
  )
}

interface EventCardProps {
  event: CalendarEvent
}

function CalendarEventCard({ event }: EventCardProps) {
  const observacao = event.resource?.observacoes?.trim()

  return (
    <div className="calendar-event-card">
      <span className="calendar-event-time">
        {format(event.start, 'HH:mm', { locale: ptBR })} - {format(event.end, 'HH:mm', { locale: ptBR })}
      </span>
      <span className="calendar-event-title">{event.title}</span>
      {observacao && <span className="calendar-event-observation">{observacao}</span>}
    </div>
  )
}

interface CalendarEvent {
  id?: number
  title: string
  start: Date
  end: Date
  resource: Agendamento
  status?: string
}

interface CalendarViewProps {
  agendamentos: Agendamento[]
  onSelectSlot?: (slotInfo: SlotInfo) => void
  onSelectEvent?: (event: CalendarEvent) => void
  view?: View
  onViewChange?: (view: View) => void
  date?: Date
  onNavigate?: (date: Date) => void
  disabled?: boolean
  horarioAbertura?: string
  horarioFechamento?: string
}

export default function CalendarView({
  agendamentos,
  onSelectSlot,
  onSelectEvent,
  view = 'week',
  onViewChange,
  date = new Date(),
  onNavigate,
  disabled = false,
  horarioAbertura,
  horarioFechamento,
}: CalendarViewProps) {
  const [currentView, setCurrentView] = useState<View>(view)
  const [currentDate, setCurrentDate] = useState<Date>(date)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)

      if (mobile && currentView === 'week') {
        setCurrentView('day')
        if (onViewChange) {
          onViewChange('day')
        }
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [currentView, onViewChange])

  const events: CalendarEvent[] = useMemo(() => {
    return agendamentos.map((agendamento) => {
      const inicio = new Date(agendamento.dataHoraInicio)
      const fim = agendamento.dataHoraFim
        ? new Date(agendamento.dataHoraFim)
        : new Date(inicio.getTime() + 60 * 60 * 1000)

      const servicosNomes = agendamento.servicos
        ?.map((s) => s.descricao || 'Serviço')
        .join(', ') || 'Sem serviço'

      return {
        id: agendamento.id,
        title: `${agendamento.cliente?.nome || 'Cliente'} - ${servicosNomes}`,
        start: inicio,
        end: fim,
        resource: agendamento,
        status: agendamento.status,
      }
    })
  }, [agendamentos])

  const isSlotDisabled = (date: Date) => {
    if (!horarioAbertura || !horarioFechamento) return false

    const currentMinutes = date.getHours() * 60 + date.getMinutes()
    const [openHour, openMinute] = horarioAbertura.split(':').map(Number)
    const [closeHour, closeMinute] = horarioFechamento.split(':').map(Number)
    const openMinutes = openHour * 60 + openMinute
    const closeMinutes = closeHour * 60 + closeMinute

    const now = new Date()
    if (date < now) return true

    return currentMinutes < openMinutes || currentMinutes >= closeMinutes
  }

  const slotPropGetter = (date: Date) => {
    if (isSlotDisabled(date)) {
      return {
        className: 'calendar-slot-disabled cursor-not-allowed',
      }
    }
    return {}
  }

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3174ad'
    let borderColor = '#3174ad'

    if (event.status === 'FINALIZADO' || event.status === 'CONCLUIDO') {
      backgroundColor = '#10b981'
      borderColor = '#059669'
    } else if (event.status === 'CONFIRMADO' || event.status === 'EM_ANDAMENTO') {
      backgroundColor = '#7c3aed'
      borderColor = '#6d28d9'
    } else if (event.status === 'PROCEDIMENTO_FIM') {
      backgroundColor = '#6d28d9'
      borderColor = '#5b21b6'
    } else if (event.status === 'CANCELADO') {
      backgroundColor = '#ef4444'
      borderColor = '#dc2626'
    } else if (event.status === 'NO_SHOW') {
      backgroundColor = '#f97316'
      borderColor = '#ea580c'
    } else if (event.status === 'AGENDADO') {
      backgroundColor = '#111111'
      borderColor = '#000000'
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth: '1px',
        borderRadius: '10px',
        color: 'white',
        padding: '0',
        fontSize: '0.875rem',
        boxShadow: '0 6px 14px -12px rgba(15, 23, 42, 0.55)',
      },
    }
  }

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    if (disabled) return
    if (isSlotDisabled(slotInfo.start) || isSlotDisabled(new Date(slotInfo.end.getTime() - 1))) return
    if (onSelectSlot) {
      onSelectSlot(slotInfo)
    }
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    if (disabled) return
    if (onSelectEvent) {
      onSelectEvent(event)
    }
  }

  const handleViewChange = (nextView: View) => {
    setCurrentView(nextView)
    if (onViewChange) {
      onViewChange(nextView)
    }
  }

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate)
    if (onNavigate) {
      onNavigate(newDate)
    }
  }

  const effectiveView = isMobile && currentView === 'week' ? 'day' : currentView

  return (
    <div
      className={`calendar-view-shell ${isMobile ? 'h-[500px]' : 'h-[600px] lg:h-[700px]'} relative w-full rounded-[24px] border border-slate-200 bg-white ${isMobile ? 'p-2' : 'p-4'} shadow-[0_18px_50px_-34px_rgba(15,23,42,0.45)] ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      {disabled && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-gray-900 bg-opacity-30 backdrop-blur-sm">
          <div className="rounded-lg border-2 border-blue-300 bg-white p-6 shadow-xl">
            <p className="text-lg font-semibold text-gray-700">Modal aberto</p>
            <p className="mt-1 text-sm text-gray-500">O calendário está desabilitado enquanto o modal estiver aberto</p>
          </div>
        </div>
      )}
      <Calendar
        localizer={localizer}
        components={{
          toolbar: CalendarToolbar,
          event: CalendarEventCard,
        }}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={effectiveView}
        onView={handleViewChange}
        date={currentDate}
        onNavigate={handleNavigate}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        selectable={!disabled}
        eventPropGetter={eventStyleGetter}
        slotPropGetter={slotPropGetter}
        messages={{
          next: '>',
          previous: '<',
          today: 'Hoje',
          month: 'Mês',
          week: 'Semana',
          day: 'Dia',
          agenda: 'Agenda',
          date: 'Data',
          time: 'Hora',
          event: 'Evento',
          noEventsInRange: 'Não há agendamentos neste período.',
        }}
        formats={{
          dayHeaderFormat: (date) => (isMobile ? format(date, 'dd/MM', { locale: ptBR }) : formatarDiaCabecalho(date)),
          dayFormat: (date) => formatarDiaCabecalho(date),
          weekdayFormat: (date) => (isMobile ? format(date, 'dd', { locale: ptBR }) : formatarDiaCabecalho(date)),
          dayRangeHeaderFormat: ({ start, end }) =>
            `${capitalizar(format(start, 'MMMM', { locale: ptBR }))} ${format(start, 'dd')} - ${format(end, 'dd')}`,
          timeGutterFormat: 'HH:mm',
          eventTimeRangeFormat: ({ start, end }) =>
            `${format(start, 'HH:mm', { locale: ptBR })} - ${format(end, 'HH:mm', { locale: ptBR })}`,
        }}
        min={new Date(2024, 0, 1, 8, 0, 0)}
        max={new Date(2024, 0, 1, 22, 0, 0)}
        step={30}
        timeslots={1}
        defaultView={isMobile ? 'day' : 'week'}
        culture="pt-BR"
      />
    </div>
  )
}
