import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientePublicoService } from '../services/clientePublicoService'
import { unidadeService, Unidade } from '../services/unidadeService'
import { servicoService, Servico } from '../services/servicoService'
import { useNotification } from '../contexts/NotificationContext'
import DateSlotPicker from '../components/DateSlotPicker'
import {
  Building2,
  MapPin,
  ChevronRight,
  Scissors,
  Clock,
  DollarSign,
  CheckCircle2,
  Calendar as CalendarIcon,
  ArrowLeft
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Step = 'unidade' | 'servico' | 'data' | 'confirmacao'

export default function AgendarCliente() {
  const navigate = useNavigate()
  const { showNotification } = useNotification()

  // Data
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])

  // Selection State
  const [selectedUnidade, setSelectedUnidade] = useState<Unidade | null>(null)
  const [selectedServico, setSelectedServico] = useState<Servico | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<any>(null)

  // Flow State
  const [currentStep, setCurrentStep] = useState<Step>('unidade')
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<any[]>([])

  useEffect(() => {
    if (!clientePublicoService.isAuthenticated()) {
      navigate('/cliente/login')
      return
    }
    carregarDados()
  }, [navigate])

  useEffect(() => {
    if (currentStep === 'data' && selectedUnidade && selectedServico) {
      buscarHorarios(selectedDate)
    }
  }, [currentStep, selectedDate, selectedUnidade, selectedServico])

  const carregarDados = async () => {
    try {
      const [unidadesData, servicosData] = await Promise.all([
        unidadeService.listar(),
        servicoService.listar(),
      ])
      setUnidades(unidadesData)
      setServicos(servicosData)
    } catch (error) {
      showNotification('error', 'Erro ao carregar dados')
    }
  }

  const buscarHorarios = async (date: Date) => {
    if (!selectedUnidade || !selectedServico) return

    setLoadingSlots(true)
    setAvailableSlots([]) // Clear previous slots
    setSelectedSlot(null) // Deselect when date changes

    try {
      // API expects strings for startDate and endDate
      // We will search for the specific selected day
      const dateStr = date.toISOString().split('T')[0]

      const horariosData = await clientePublicoService.buscarHorariosDisponiveis(
        selectedUnidade.id!,
        selectedServico.id!,
        dateStr,
        dateStr // Same day to get specific slots
      )
      setAvailableSlots(horariosData)
    } catch (error) {
      console.error(error)
      // Doesn't need to notify error on every date change if empty
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleAgendar = async () => {
    if (!selectedSlot || !selectedUnidade || !selectedServico) return

    setLoading(true)
    try {
      const cliente = clientePublicoService.getCliente()
      if (!cliente) throw new Error('Cliente não encontrado')

      const agendamento = {
        clienteId: cliente.clienteId,
        unidadeId: selectedUnidade.id!,
        atendenteId: selectedSlot.atendenteId,
        dataHoraInicio: selectedSlot.dataHoraInicio,
        servicos: [
          {
            servicoId: selectedServico.id!,
            quantidade: 1,
            valor: selectedServico.valor,
          },
        ],
      }

      await clientePublicoService.criarAgendamento(agendamento)
      showNotification('success', 'Agendamento realizado com sucesso!')

      // Success Animation/Transition could go here
      setTimeout(() => {
        navigate('/cliente/meus-agendamentos')
      }, 1000)
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao realizar agendamento'
      showNotification('error', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { id: 'unidade', label: 'Unidade', icon: Building2 },
    { id: 'servico', label: 'Serviço', icon: Scissors },
    { id: 'data', label: 'Data e Hora', icon: CalendarIcon },
    { id: 'confirmacao', label: 'Confirmar', icon: CheckCircle2 },
  ]

  const getStepStatus = (stepId: string) => {
    const stepOrder = ['unidade', 'servico', 'data', 'confirmacao']
    const currentIndex = stepOrder.indexOf(currentStep)
    const stepIndex = stepOrder.indexOf(stepId)

    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'current'
    return 'upcoming'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">

        {/* Progress Header */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol role="list" className="flex items-center">
              {steps.map((step, stepIdx) => {
                const status = getStepStatus(step.id)
                return (
                  <li key={step.id} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                    {status === 'completed' ? (
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="h-0.5 w-full bg-indigo-600" />
                      </div>
                    ) : null}
                    <div className={`relative flex h-8 w-8 items-center justify-center rounded-full ${status === 'completed' || status === 'current' ? 'bg-indigo-600 hover:bg-indigo-900' : 'bg-gray-200'
                      }`}>
                      <step.icon className="h-5 w-5 text-white" aria-hidden="true" />
                      <span className="sr-only">{step.label}</span>
                    </div>
                    <div className="mt-2 hidden sm:block">
                      <span className={`text-xs font-medium ${status === 'current' ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {step.label}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ol>
          </nav>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden min-h-[600px] flex flex-col">
          {/* Header Area with Back Button */}
          <div className="p-6 border-b border-gray-100 flex items-center gap-4 bg-white sticky top-0 z-10">
            {currentStep !== 'unidade' && (
              <button
                onClick={() => {
                  if (currentStep === 'servico') setCurrentStep('unidade')
                  if (currentStep === 'data') setCurrentStep('servico')
                  if (currentStep === 'confirmacao') setCurrentStep('data')
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Voltar"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentStep === 'unidade' && 'Escolha a Unidade'}
                {currentStep === 'servico' && 'Qual serviço você deseja?'}
                {currentStep === 'data' && 'Escolha o melhor horário'}
                {currentStep === 'confirmacao' && 'Revise seu agendamento'}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {currentStep === 'unidade' && 'Selecione a unidade mais próxima de você'}
                {currentStep === 'servico' && 'Nossos profissionais são especialistas'}
                {currentStep === 'data' && 'Horários disponíveis atualizados em tempo real'}
                {currentStep === 'confirmacao' && 'Confirme se está tudo correto'}
              </p>
            </div>
          </div>

          <div className="p-6 md:p-8 flex-1 bg-gray-50/50">
            {/* Step 1: Unidades */}
            {currentStep === 'unidade' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
                {unidades.map(unidade => (
                  <button
                    key={unidade.id}
                    onClick={() => {
                      setSelectedUnidade(unidade)
                      setCurrentStep('servico')
                    }}
                    className="group bg-white rounded-xl p-6 shadow-sm hover:shadow-md border border-gray-100 hover:border-indigo-200 text-left transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="w-12 h-12 rounded-full bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center mb-4 transition-colors">
                      <Building2 className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{unidade.nome}</h3>
                    <div className="flex items-start gap-2 text-gray-500 text-sm">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{unidade.endereco || 'Endereço não informado'}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Serviços */}
            {currentStep === 'servico' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                {servicos.map(servico => (
                  <button
                    key={servico.id}
                    onClick={() => {
                      setSelectedServico(servico)
                      setCurrentStep('data')
                    }}
                    className="flex items-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 hover:border-indigo-200 transition-all duration-200 group"
                  >
                    <div className="w-16 h-16 rounded-lg bg-gray-100 group-hover:bg-indigo-50 flex items-center justify-center mr-4 transition-colors shrink-0">
                      <Scissors className="w-7 h-7 text-gray-400 group-hover:text-indigo-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                        {servico.nome}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-1">{servico.descricao || 'Sem descrição'}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="inline-flex items-center text-sm font-medium text-gray-700 bg-gray-50 px-2 py-1 rounded">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {servico.duracaoMinutos} min
                        </span>
                        <span className="inline-flex items-center text-sm font-bold text-green-700 bg-green-50 px-2 py-1 rounded">
                          <DollarSign className="w-3.5 h-3.5 mr-1" />
                          R$ {servico.valor.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 ml-2" />
                  </button>
                ))}
              </div>
            )}

            {/* Step 3: Data e Hora */}
            {currentStep === 'data' && (
              <div className="animate-fadeIn max-w-4xl mx-auto">
                <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <Building2 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Unidade</p>
                      <p className="font-medium text-gray-900">{selectedUnidade?.nome}</p>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-gray-200 hidden sm:block"></div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <Scissors className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Serviço</p>
                      <p className="font-medium text-gray-900">{selectedServico?.nome}</p>
                    </div>
                  </div>
                </div>

                <DateSlotPicker
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  slots={availableSlots}
                  loading={loadingSlots}
                  selectedSlot={selectedSlot}
                  onSlotSelect={(slot) => {
                    setSelectedSlot(slot)
                    setCurrentStep('confirmacao')
                  }}
                />
              </div>
            )}

            {/* Step 4: Confirmação */}
            {currentStep === 'confirmacao' && selectedSlot && (
              <div className="max-w-md mx-auto animate-fadeIn">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-indigo-600 p-6 text-white text-center">
                    <h2 className="text-2xl font-bold mb-1">Quase lá!</h2>
                    <p className="text-indigo-100">Confirme os detalhes do seu agendamento</p>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Info Items */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                        <CalendarIcon className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Data e Hora</p>
                        <p className="font-bold text-gray-900 text-lg">
                          {format(new Date(selectedSlot.dataHoraInicio), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                        <Scissors className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Serviço</p>
                        <p className="font-bold text-gray-900">{selectedServico?.nome}</p>
                        <p className="text-sm text-gray-600">R$ {selectedServico?.valor.toFixed(2)} • {selectedServico?.duracaoMinutos} min</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Local</p>
                        <p className="font-bold text-gray-900">{selectedUnidade?.nome}</p>
                        <p className="text-sm text-gray-600">{selectedUnidade?.endereco}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Profissional</p>
                        <p className="font-bold text-gray-900">{selectedSlot.atendenteNome}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50 border-t border-gray-100">
                    <button
                      onClick={handleAgendar}
                      disabled={loading}
                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>Processing...</>
                      ) : (
                        <>Confirmar Agendamento <CheckCircle2 className="w-5 h-5" /></>
                      )}
                    </button>
                    <button
                      onClick={() => setCurrentStep('data')}
                      disabled={loading}
                      className="w-full mt-3 py-3 text-gray-600 font-medium hover:text-gray-900 transition-colors"
                    >
                      Escolher outro horário
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
