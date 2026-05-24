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

// Mapa de cores por status — bordas, fundo suave e texto escuro
const STATUS_STYLE: Record<string, { border: string; bg: string; text: string }> = {
  AGENDADO:        { border: '#2563eb', bg: 'rgba(37,99,235,0.08)',   text: '#1e40af' },
  CONFIRMADO:      { border: '#7c3aed', bg: 'rgba(124,58,237,0.08)',  text: '#5b21b6' },
  EM_ANDAMENTO:    { border: '#7c3aed', bg: 'rgba(124,58,237,0.08)',  text: '#5b21b6' },
  PROCEDIMENTO_FIM:{ border: '#6d28d9', bg: 'rgba(109,40,217,0.08)', text: '#4c1d95' },
  FINALIZADO:      { border: '#10b981', bg: 'rgba(16,185,129,0.08)',  text: '#065f46' },
  CONCLUIDO:       { border: '#10b981', bg: 'rgba(16,185,129,0.08)',  text: '#065f46' },
  CANCELADO:       { border: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  text: '#475569' },
  NO_SHOW:         { border: '#f97316', bg: 'rgba(249,115,22,0.08)',  text: '#9a3412' },
}
const DEFAULT_STYLE = { border: '#3b82f6', bg: 'rgba(59,130,246,0.08)', text: '#1d4ed8' }

interface ToolbarProps {
  date: Date
  view: View
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void
  onView: (view: View) => void
}

function CalendarToolbar({ date, view, onNavigate, onView }: ToolbarProps) {
  const label = useMemo(() => {
    if (view === 'month') {
      return capitalizar(format(startOfMonth(date), 'MMMM yyyy', { locale: ptBR }))
    }
    if (view === 'week') {
      const start = startOfWeek(date, { locale: ptBR })
      const end = endOfWeek(date, { locale: ptBR })
      return `${capitalizar(format(start, 'MMMM', { locale: ptBR }))} ${format(start, 'dd')}–${format(end, 'dd')}`
    }
    return capitalizar(format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }))
  }, [date, view])

  return (
    <div className="calendar-toolbar flex items-center justify-between gap-2 px-1 pb-3 pt-0.5">
      {/* Navegação esquerda */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onNavigate('PREV')}
          aria-label="Anterior"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
        </button>
        <button
          type="button"
          onClick={() => onNavigate('TODAY')}
          className="flex h-8 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        >
          Hoje
        </button>
        <button
          type="button"
          onClick={() => onNavigate('NEXT')}
          aria-label="Próximo"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>

      {/* Label central */}
      <span className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-slate-900">
        {label}
      </span>

      {/* Seletor Dia / Semana */}
      <div className="flex shrink-0 items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5">
        <button
          type="button"
          onClick={() => onView('day')}
          className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
            view === 'day'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Dia
        </button>
        <button
          type="button"
          onClick={() => onView('week')}
          className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
            view === 'week'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Semana
        </button>
      </div>
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
  clienteNome?: string
  servicosNomes?: string
}

interface EventCardProps {
  event: CalendarEvent
}

function CalendarEventCard({ event }: EventCardProps) {
  const colors = (event.status && STATUS_STYLE[event.status]) || DEFAULT_STYLE
  const primeiroNome = event.clienteNome?.split(' ')[0] || 'Cliente'
  const servico = event.servicosNomes || ''

  return (
    <div
      className="calendar-event-card"
      style={{ color: colors.text }}
    >
      <span className="calendar-event-time">
        {format(event.start, 'HH:mm', { locale: ptBR })}–{format(event.end, 'HH:mm', { locale: ptBR })}
      </span>
      <span className="calendar-event-title">{primeiroNome}</span>
      {servico && (
        <span className="calendar-event-service">{servico}</span>
      )}
    </div>
  )
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
  const initialMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const [currentView, setCurrentView] = useState<View>(initialMobile && view === 'week' ? 'day' : view)
  const [currentDate, setCurrentDate] = useState<Date>(date)
  const [isMobile, setIsMobile] = useState(initialMobile)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const events: CalendarEvent[] = useMemo(() => {
    return agendamentos.map((agendamento) => {
      const inicio = new Date(agendamento.dataHoraInicio)
      const fim = agendamento.dataHoraFim
        ? new Date(agendamento.dataHoraFim)
        : new Date(inicio.getTime() + 60 * 60 * 1000)

      const clienteNome = agendamento.cliente?.nome || 'Cliente'
      const servicosNomes =
        agendamento.servicos?.map((s) => s.descricao || 'Serviço').join(', ') || 'Sem serviço'

      return {
        id: agendamento.id,
        title: `${clienteNome} – ${servicosNomes}`,
        start: inicio,
        end: fim,
        resource: agendamento,
        status: agendamento.status,
        clienteNome,
        servicosNomes,
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
      return { className: 'calendar-slot-disabled cursor-not-allowed' }
    }
    return {}
  }

  const eventStyleGetter = (event: CalendarEvent) => {
    const colors = (event.status && STATUS_STYLE[event.status]) || DEFAULT_STYLE
    return {
      style: {
        backgroundColor: colors.bg,
        borderLeft: `3px solid ${colors.border}`,
        borderTop: 'none',
        borderRight: 'none',
        borderBottom: 'none',
        borderRadius: '8px',
        color: colors.text,
        padding: '0',
        fontSize: '0.875rem',
        boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
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

  const effectiveView = currentView

  return (
    <div
      className={`calendar-view-shell relative w-full rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.45)] ${isMobile ? 'h-[520px] p-3' : 'h-[620px] p-4 lg:h-[700px]'} ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      {disabled && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[24px] bg-gray-900/20 backdrop-blur-sm">
          <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-xl">
            <p className="text-base font-semibold text-gray-700">Modal aberto</p>
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
          dayHeaderFormat: (date) =>
            isMobile
              ? format(date, 'dd/MM', { locale: ptBR })
              : formatarDiaCabecalho(date),
          dayFormat: (date) => formatarDiaCabecalho(date),
          weekdayFormat: (date) =>
            isMobile
              ? format(date, 'dd', { locale: ptBR })
              : formatarDiaCabecalho(date),
          dayRangeHeaderFormat: ({ start, end }) =>
            `${capitalizar(format(start, 'MMMM', { locale: ptBR }))} ${format(start, 'dd')}–${format(end, 'dd')}`,
          timeGutterFormat: 'HH:mm',
          eventTimeRangeFormat: ({ start, end }) =>
            `${format(start, 'HH:mm', { locale: ptBR })}–${format(end, 'HH:mm', { locale: ptBR })}`,
        }}
        min={new Date(2024, 0, 1, 8, 0, 0)}
        max={new Date(2024, 0, 1, 22, 0, 0)}
        scrollToTime={new Date(2024, 0, 1, 8, 0, 0)}
        step={30}
        timeslots={1}
        defaultView={isMobile ? 'day' : 'week'}
        culture="pt-BR"
      />
    </div>
  )
}
