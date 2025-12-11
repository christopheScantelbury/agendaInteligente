import { useQuery } from '@tanstack/react-query'
import { agendamentoService } from '../services/agendamentoService'
import CalendarView from '../components/CalendarView'
import { SlotInfo, View } from 'react-big-calendar'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  const [view, setView] = useState<View>('week')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: agendamentoService.listar,
  })

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    // Redireciona para a página de agendamentos com o horário selecionado
    const start = slotInfo.start
    const startISO = start.toISOString().slice(0, 16) // Formato YYYY-MM-DDTHH:mm
    navigate(`/agendamentos?start=${encodeURIComponent(startISO)}`)
  }

  const handleSelectEvent = () => {
    // Redireciona para a página de agendamentos
    navigate('/agendamentos')
  }

  if (isLoading) {
    return <div className="text-center py-8">Carregando calendário...</div>
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Bem-vindo ao Agenda Inteligente
        </h1>
        <p className="text-lg text-gray-600">
          Clique em um horário no calendário para criar um novo agendamento
        </p>
      </div>

      {/* Calendário Visual */}
      <div className="mb-6">
        <CalendarView
          agendamentos={agendamentos}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          view={view}
          onViewChange={setView}
          date={currentDate}
          onNavigate={setCurrentDate}
        />
      </div>

      {/* Legenda */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Legenda:</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Agendado</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Concluído</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Cancelado</span>
          </div>
        </div>
      </div>
    </div>
  )
}
