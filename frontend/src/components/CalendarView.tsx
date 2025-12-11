import { useState, useMemo } from 'react'
import { Calendar, momentLocalizer, View, SlotInfo } from 'react-big-calendar'
import moment from 'moment'
import 'moment/locale/pt-br'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Agendamento } from '../services/agendamentoService'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

moment.locale('pt-br')
const localizer = momentLocalizer(moment)

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
}

export default function CalendarView({
  agendamentos,
  onSelectSlot,
  onSelectEvent,
  view = 'week',
  onViewChange,
  date = new Date(),
  onNavigate,
}: CalendarViewProps) {
  const [currentView, setCurrentView] = useState<View>(view)
  const [currentDate, setCurrentDate] = useState<Date>(date)

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

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3174ad'
    let borderColor = '#3174ad'

    if (event.status === 'CONCLUIDO') {
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
    if (onSelectSlot) {
      onSelectSlot(slotInfo)
    }
  }

  const handleSelectEvent = (event: CalendarEvent) => {
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

  return (
    <div className="h-[600px] lg:h-[700px] w-full bg-white rounded-lg shadow-sm p-4">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={currentView}
        onView={handleViewChange}
        date={currentDate}
        onNavigate={handleNavigate}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        selectable
        eventPropGetter={eventStyleGetter}
        messages={{
          next: 'Próximo',
          previous: 'Anterior',
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
          dayHeaderFormat: (date) => format(date, 'EEEE, dd/MM', { locale: ptBR }),
          dayFormat: 'dd/MM',
          weekdayFormat: (date) => format(date, 'EEE', { locale: ptBR }),
          timeGutterFormat: 'HH:mm',
          eventTimeRangeFormat: ({ start, end }) =>
            `${format(start, 'HH:mm', { locale: ptBR })} - ${format(end, 'HH:mm', { locale: ptBR })}`,
        }}
        min={new Date(2024, 0, 1, 6, 0, 0)} // 6:00 AM
        max={new Date(2024, 0, 1, 22, 0, 0)} // 10:00 PM
        step={30} // Intervalo de 30 minutos
        timeslots={2} // 2 slots por hora (30 min cada)
        defaultView="week"
        culture="pt-BR"
      />
    </div>
  )
}

