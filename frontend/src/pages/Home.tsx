import { useQuery } from '@tanstack/react-query'
import { agendamentoService } from '../services/agendamentoService'
import { authService } from '../services/authService'
import { unidadeService } from '../services/unidadeService'
import CalendarView from '../components/CalendarView'
import { SlotInfo, View } from 'react-big-calendar'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  const [view, setView] = useState<View>('week')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [showWelcome, setShowWelcome] = useState(true)

  const usuario = authService.getUsuario()

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false)
    }, 8000)

    return () => clearTimeout(timer)
  }, [])

  const { data: agendamentos = [], isLoading: isLoadingAgendamentos } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: agendamentoService.listar,
  })

  const { data: unidade, isLoading: isLoadingUnidade } = useQuery({
    queryKey: ['unidade', usuario?.unidadeId],
    queryFn: () => usuario?.unidadeId ? unidadeService.buscarPorId(usuario.unidadeId) : null,
    enabled: !!usuario?.unidadeId
  })

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    // Redireciona para a página de novo agendamento com o horário selecionado
    const start = slotInfo.start
    const startISO = start.toISOString().slice(0, 16) // Formato YYYY-MM-DDTHH:mm

    navigate('/agendamentos/novo', {
      state: {
        dataHoraInicio: startISO,
        unidadeId: usuario?.unidadeId
      }
    })
  }

  const handleSelectEvent = () => {
    // Redireciona para a página de agendamentos
    navigate('/agendamentos')
  }

  if (isLoadingAgendamentos || isLoadingUnidade) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Welcome Message with Fade Out */}
      <div
        className={`mb-6 transition-all duration-1000 ease-in-out ${showWelcome ? 'opacity-100 max-h-40' : 'opacity-0 max-h-0 overflow-hidden mb-0'
          }`}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Bem-vindo ao Agenda Inteligente
        </h1>
        <p className="text-lg text-gray-600">
          Clique em um horário no calendário para criar um novo agendamento
        </p>
      </div>

      {!unidade?.horarioAbertura && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4" role="alert">
          <p className="font-bold">Atenção</p>
          <p>Horários de funcionamento não configurados para esta unidade. O calendário pode estar totalmente liberado.</p>
        </div>
      )}

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
          horarioAbertura={unidade?.horarioAbertura}
          horarioFechamento={unidade?.horarioFechamento}
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
