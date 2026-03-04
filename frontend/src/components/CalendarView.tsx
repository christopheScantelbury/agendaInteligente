import { useState, useMemo, useEffect } from 'react'
import { Calendar, momentLocalizer, View, SlotInfo } from 'react-big-calendar'
import moment from 'moment'
import 'moment/locale/pt-br'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './CalendarView.css'
import { Agendamento } from '../services/agendamentoService'
import { format, startOfWeek, endOfWeek, startOfMonth, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

moment.locale('pt-br')
const localizer = momentLocalizer(moment)

const capitalizar = (texto: string): string =>
  texto.charAt(0).toUpperCase() + texto.slice(1)

const DIAS_SEMANA_ABREVIADOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

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

  // Detectar se está em mobile e ajustar visualização
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      
      // No mobile, forçar visualização de dia se estiver em semana
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
        : new Date(inicio.getTime() + 60 * 60 * 1000) // 1 hora padrão

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

    // Converter horário atual do slot para minutos do dia
    const currentMinutes = date.getHours() * 60 + date.getMinutes()

    // Parse horário de abertura
    const [openHour, openMinute] = horarioAbertura.split(':').map(Number)
    const openMinutes = openHour * 60 + openMinute

    // Parse horário de fechamento
    const [closeHour, closeMinute] = horarioFechamento.split(':').map(Number)
    const closeMinutes = closeHour * 60 + closeMinute

    // Check if slot is in the past
    const now = new Date()
    if (date < now) return true

    return currentMinutes < openMinutes || currentMinutes >= closeMinutes
  }

  const slotPropGetter = (date: Date) => {
    const isDisabled = isSlotDisabled(date)

    if (isDisabled) {
      return {
        className: 'bg-red-50 cursor-not-allowed',
        style: {
          backgroundColor: '#fef2f2', // red-50
        }
      }
    }
    return {}
  }

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3174ad'
    let borderColor = '#3174ad'

    if (event.status === 'FINALIZADO') {
      backgroundColor = '#10b981'
      borderColor = '#059669'
    } else if (event.status === 'CANCELADO') {
      backgroundColor = '#ef4444'
      borderColor = '#dc2626'
    } else if (event.status === 'AGENDADO') {
      backgroundColor = '#3b82f6'
      borderColor = '#2563eb'
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth: '2px',
        borderRadius: '4px',
        color: 'white',
        padding: '2px 4px',
        fontSize: '0.875rem',
      },
    }
  }

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    if (disabled) return

    // Verificar se o slot selecionado está dentro do horário de funcionamento
    // Checa tanto o início quanto o (fim - 1 minuto) para garantir que intervalos longos não furem
    if (isSlotDisabled(slotInfo.start) || isSlotDisabled(new Date(slotInfo.end.getTime() - 1))) {
      return // Ignora o clique se estiver fora do horário
    }

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

  const handleViewChange = (view: View) => {
    setCurrentView(view)
    if (onViewChange) {
      onViewChange(view)
    }
  }

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate)
    if (onNavigate) {
      onNavigate(newDate)
    }
  }

  // No mobile, usar visualização de dia por padrão
  const effectiveView = isMobile && currentView === 'week' ? 'day' : currentView

  return (
    <div className={`${isMobile ? 'h-[500px]' : 'h-[600px] lg:h-[700px]'} w-full bg-white rounded-lg shadow-sm ${isMobile ? 'p-2' : 'p-4'} relative ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
      {disabled && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-30 z-10 rounded-lg flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl p-6 border-2 border-blue-300">
            <p className="text-gray-700 font-semibold text-lg">Modal aberto</p>
            <p className="text-gray-500 text-sm mt-1">O calendário está desabilitado enquanto o modal estiver aberto</p>
          </div>
        </div>
      )}
      <Calendar
        localizer={localizer}
        components={{
          toolbar: CalendarToolbar,
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
          dayHeaderFormat: (date) => {
            return isMobile ? format(date, 'dd/MM', { locale: ptBR }) : formatarDiaCabecalho(date)
          },
          dayFormat: (date) => {
            return formatarDiaCabecalho(date)
          },
          weekdayFormat: (date) => {
            return isMobile ? format(date, 'dd', { locale: ptBR }) : formatarDiaCabecalho(date)
          },
          dayRangeHeaderFormat: ({ start, end }) =>
            `${capitalizar(format(start, 'MMMM', { locale: ptBR }))} ${format(start, 'dd')} - ${format(end, 'dd')}`,
          timeGutterFormat: isMobile ? 'HH:mm' : 'HH:mm',
          eventTimeRangeFormat: ({ start, end }) =>
            `${format(start, 'HH:mm', { locale: ptBR })} - ${format(end, 'HH:mm', { locale: ptBR })}`,
        }}
        min={new Date(2024, 0, 1, 6, 0, 0)} // 6:00 AM
        max={new Date(2024, 0, 1, 22, 0, 0)} // 10:00 PM
        step={30} // Intervalo de 30 minutos
        timeslots={1} // Exibir grade e marcação a cada 30 minutos
        defaultView={isMobile ? 'day' : 'week'}
        culture="pt-BR"
      />
    </div>
  )
}
