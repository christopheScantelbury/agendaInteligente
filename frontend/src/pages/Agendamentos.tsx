import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agendamentoService, Agendamento } from '../services/agendamentoService'
import { clienteService } from '../services/clienteService'
import { servicoService } from '../services/servicoService'
import { unidadeService } from '../services/unidadeService'
import { atendenteService } from '../services/atendenteService'
import { horarioDisponivelService } from '../services/horarioDisponivelService'
import CalendarView from '../components/CalendarView'
import { SlotInfo, View } from 'react-big-calendar'
import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Clock, Calendar, User, Building2 } from 'lucide-react'
import Modal from '../components/Modal'
import FormField from '../components/FormField'
import Button from '../components/Button'
import { format, parseISO, addDays, startOfDay, isBefore, isAfter } from 'date-fns'
import { useNotification } from '../contexts/NotificationContext'

interface CalendarEvent {
  id?: number
  title: string
  start: Date
  end: Date
  resource: Agendamento
  status?: string
}

interface HorarioDisponivel {
  id?: number
  atendenteId: number
  atendenteNome?: string
  dataHoraInicio: string
  dataHoraFim: string
}

export default function Agendamentos() {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [searchParams] = useSearchParams()
  const [finalizarModal, setFinalizarModal] = useState<{ agendamento: Agendamento; valor: string } | null>(null)
  const [criarModal, setCriarModal] = useState<{ start: Date; end: Date } | null>(null)
  const [view, setView] = useState<View>('week')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  // Form data para criar agendamento
  const [formData, setFormData] = useState<Partial<Agendamento>>({
    clienteId: undefined,
    unidadeId: undefined,
    atendenteId: undefined,
    dataHoraInicio: '',
    observacoes: '',
    servicos: [],
  })
  const [servicosSelecionados, setServicosSelecionados] = useState<number[]>([])
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<HorarioDisponivel[]>([])
  const [carregandoHorarios, setCarregandoHorarios] = useState(false)

  // Verifica se há parâmetro de data na URL (vindo da Home)
  useEffect(() => {
    const startParam = searchParams.get('start')
    if (startParam) {
      try {
        const startDate = new Date(startParam)
        if (!isNaN(startDate.getTime())) {
          // Garantir que a data não está no passado
          const agora = new Date()
          const dataSelecionada = startDate < agora ? agora : startDate
          
          setCurrentDate(dataSelecionada)
          setCriarModal({
            start: dataSelecionada,
            end: new Date(dataSelecionada.getTime() + 60 * 60 * 1000), // 1 hora depois
          })
          setFormData((prev) => ({
            ...prev,
            dataHoraInicio: format(dataSelecionada, "yyyy-MM-dd'T'HH:mm"),
          }))
          // Remove o parâmetro da URL
          window.history.replaceState({}, '', '/agendamentos')
        }
      } catch (e) {
        console.error('Erro ao processar parâmetro de data:', e)
      }
    }
  }, [searchParams])

  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: agendamentoService.listar,
  })

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: clienteService.listar,
  })

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: servicoService.listar,
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
  })

  // Filtrar atendentes baseado na unidade e serviços selecionados
  const { data: atendentes = [], refetch: refetchAtendentes } = useQuery({
    queryKey: ['atendentes', formData.unidadeId, servicosSelecionados],
    queryFn: () => {
      if (!formData.unidadeId) return Promise.resolve([])
      if (servicosSelecionados.length === 0) {
        return atendenteService.listarPorUnidade(formData.unidadeId!)
      }
      return atendenteService.listarPorUnidadeEServicos(formData.unidadeId!, servicosSelecionados)
    },
    enabled: !!formData.unidadeId,
  })

  // Buscar horários disponíveis quando unidade, serviços e data estiverem selecionados
  useEffect(() => {
    const buscarHorarios = async () => {
      if (!formData.unidadeId || servicosSelecionados.length === 0 || !formData.dataHoraInicio) {
        setHorariosDisponiveis([])
        return
      }

      setCarregandoHorarios(true)
      try {
        const dataSelecionada = parseISO(formData.dataHoraInicio)
        const dataInicio = format(startOfDay(dataSelecionada), 'yyyy-MM-dd')
        const dataFim = format(addDays(startOfDay(dataSelecionada), 1), 'yyyy-MM-dd')

        // Buscar horários para o primeiro serviço (podemos melhorar isso depois para múltiplos serviços)
        const servicoId = servicosSelecionados[0]
        const horarios = await horarioDisponivelService.buscarHorariosDisponiveis(
          formData.unidadeId!,
          servicoId,
          dataInicio,
          dataFim
        )

        // Filtrar apenas horários que não estão no passado e estão disponíveis
        const agora = new Date()
        const horariosValidos = horarios.filter(horario => {
          const inicio = parseISO(horario.dataHoraInicio)
          return isAfter(inicio, agora) && horario.disponivel !== false
        })

        setHorariosDisponiveis(horariosValidos)
      } catch (error: any) {
        console.error('Erro ao buscar horários:', error)
        setHorariosDisponiveis([])
      } finally {
        setCarregandoHorarios(false)
      }
    }

    buscarHorarios()
  }, [formData.unidadeId, servicosSelecionados, formData.dataHoraInicio])

  // Filtrar atendentes que têm horários disponíveis
  const atendentesComHorarios = useMemo(() => {
    if (horariosDisponiveis.length === 0) return atendentes
    
    const atendentesIdsComHorarios = new Set(horariosDisponiveis.map(h => h.atendenteId))
    return atendentes.filter(a => atendentesIdsComHorarios.has(a.id!))
  }, [atendentes, horariosDisponiveis])

  const finalizarMutation = useMutation({
    mutationFn: ({ id, valorFinal }: { id: number; valorFinal: number }) =>
      agendamentoService.finalizar(id, valorFinal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      setFinalizarModal(null)
      showNotification('success', 'Agendamento finalizado! A nota fiscal será emitida automaticamente.')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao finalizar agendamento'
      showNotification('error', errorMessage)
    },
  })

  const createMutation = useMutation({
    mutationFn: agendamentoService.criar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      setCriarModal(null)
      setFormData({
        clienteId: undefined,
        unidadeId: undefined,
        atendenteId: undefined,
        dataHoraInicio: '',
        observacoes: '',
        servicos: [],
      })
      setServicosSelecionados([])
      setHorariosDisponiveis([])
      showNotification('success', 'Agendamento criado com sucesso!')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.dataHoraInicio ||
                          error.response?.data?.errors?.dataHoraInicio?.[0] ||
                          'Erro ao criar agendamento. Verifique os dados e tente novamente.'
      showNotification('error', errorMessage)
      console.error('Erro ao criar agendamento:', error)
    },
  })

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    const start = slotInfo.start
    const end = slotInfo.end || new Date(start.getTime() + 60 * 60 * 1000) // 1 hora padrão

    // Garantir que a data não está no passado
    const agora = new Date()
    const dataSelecionada = start < agora ? agora : start

    setCriarModal({ start: dataSelecionada, end })
    setFormData({
      clienteId: undefined,
      unidadeId: undefined,
      atendenteId: undefined,
      dataHoraInicio: format(dataSelecionada, "yyyy-MM-dd'T'HH:mm"),
      observacoes: '',
      servicos: [],
    })
    setServicosSelecionados([])
    setHorariosDisponiveis([])
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    // Pode abrir modal de detalhes ou edição
    console.log('Evento selecionado:', event)
  }

  const confirmarFinalizar = () => {
    if (!finalizarModal) return
    const valor = parseFloat(finalizarModal.valor.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) {
      showNotification('error', 'Por favor, informe um valor válido')
      return
    }
    finalizarMutation.mutate({ id: finalizarModal.agendamento.id!, valorFinal: valor })
  }

  const handleCriarAgendamento = () => {
    if (
      formData.clienteId &&
      servicosSelecionados.length > 0 &&
      formData.unidadeId &&
      formData.atendenteId &&
      formData.dataHoraInicio
    ) {
      // Validar se a data não está no passado
      const dataSelecionada = parseISO(formData.dataHoraInicio)
      const agora = new Date()
      
      if (isBefore(dataSelecionada, agora)) {
        showNotification('error', 'A data/hora selecionada não pode ser no passado. Por favor, selecione uma data futura.')
        return
      }

      // Validar se o atendente tem horário disponível no horário selecionado
      const horarioValido = horariosDisponiveis.some(h => {
        const inicio = parseISO(h.dataHoraInicio)
        const fim = parseISO(h.dataHoraFim)
        return h.atendenteId === formData.atendenteId && 
               (isBefore(inicio, dataSelecionada) || inicio.getTime() === dataSelecionada.getTime()) &&
               isAfter(fim, dataSelecionada)
      })

      if (!horarioValido && horariosDisponiveis.length > 0) {
        showNotification('error', 'O atendente selecionado não tem horário disponível neste horário. Por favor, selecione um horário válido.')
        return
      }

      const servicosParaEnvio: Array<{
        servicoId: number
        quantidade: number
        valor: number
        descricao?: string
      }> = servicosSelecionados.map((servicoId: number) => {
        const servicoEncontrado = servicos.find((s) => s.id === servicoId)
        return {
          servicoId,
          quantidade: 1,
          valor: servicoEncontrado?.valor || 0,
          descricao: servicoEncontrado?.descricao || servicoEncontrado?.nome,
        }
      })

      // Garantir que a data está no formato correto (ISO string)
      const dataHoraFormatada = formData.dataHoraInicio.includes('T') 
        ? formData.dataHoraInicio 
        : `${formData.dataHoraInicio}:00`

      createMutation.mutate({
        clienteId: formData.clienteId,
        unidadeId: formData.unidadeId,
        atendenteId: formData.atendenteId,
        dataHoraInicio: dataHoraFormatada,
        observacoes: formData.observacoes,
        servicos: servicosParaEnvio,
      } as Agendamento)
    } else {
      showNotification('error', 'Por favor, preencha todos os campos obrigatórios')
    }
  }

  const handleServicoToggle = (servicoId: number) => {
    setServicosSelecionados((prev) => {
      const novo = prev.includes(servicoId)
        ? prev.filter((id) => id !== servicoId)
        : [...prev, servicoId]
      
      // Limpar atendente se não houver mais atendentes válidos
      if (novo.length > 0 && formData.atendenteId) {
        // Verificar se o atendente atual ainda é válido será feito pelo useEffect
      } else if (novo.length === 0) {
        setFormData(prev => ({ ...prev, atendenteId: undefined }))
      }
      
      return novo
    })
  }

  const handleUnidadeChange = (unidadeId: number) => {
    setFormData({ ...formData, unidadeId, atendenteId: undefined })
    setHorariosDisponiveis([])
    refetchAtendentes()
  }

  const handleDataHoraChange = (dataHora: string) => {
    setFormData({ ...formData, dataHoraInicio: dataHora, atendenteId: undefined })
    setHorariosDisponiveis([])
  }

  // Validar se a data selecionada não está no passado
  const minDateTime = format(new Date(), "yyyy-MM-dd'T'HH:mm")

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Agendamentos</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              const agora = new Date()
              const umaHoraDepois = new Date(agora.getTime() + 3600000)
              setCriarModal({ start: agora, end: umaHoraDepois })
              setFormData({
                clienteId: undefined,
                unidadeId: undefined,
                atendenteId: undefined,
                dataHoraInicio: format(agora, "yyyy-MM-dd'T'HH:mm"),
                observacoes: '',
                servicos: [],
              })
              setServicosSelecionados([])
              setHorariosDisponiveis([])
            }}
            variant="primary"
            className="flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo Agendamento
          </Button>
        </div>
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
          disabled={!!criarModal || !!finalizarModal}
        />
      </div>

      {/* Legenda */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
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

      {/* Modal de Criar Agendamento */}
      {criarModal && (
        <Modal
          isOpen={true}
          onClose={() => {
            setCriarModal(null)
            setFormData({
              clienteId: undefined,
              unidadeId: undefined,
              atendenteId: undefined,
              dataHoraInicio: '',
              observacoes: '',
              servicos: [],
            })
            setServicosSelecionados([])
            setHorariosDisponiveis([])
          }}
          title="Novo Agendamento"
          size="lg"
        >
          <div className="space-y-6">
            {/* Informação do horário selecionado */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Calendar className="h-5 w-5" />
                <span className="font-semibold">Horário Selecionado:</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                {format(criarModal.start, "dd/MM/yyyy 'às' HH:mm")} até{' '}
                {format(criarModal.end, 'HH:mm')}
              </p>
            </div>

            {/* Cliente */}
            <FormField label="Cliente" required>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  required
                  value={formData.clienteId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, clienteId: parseInt(e.target.value) })
                  }
                  className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome} - {cliente.cpfCnpj}
                    </option>
                  ))}
                </select>
              </div>
            </FormField>

            {/* Unidade */}
            <FormField label="Unidade" required>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  required
                  value={formData.unidadeId || ''}
                  onChange={(e) => handleUnidadeChange(parseInt(e.target.value))}
                  className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Selecione uma unidade</option>
                  {unidades.map((unidade) => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </option>
                  ))}
                </select>
              </div>
            </FormField>

            {/* Serviços */}
            <FormField
              label={`Serviços ${servicosSelecionados.length > 0 ? `(${servicosSelecionados.length} selecionado${servicosSelecionados.length > 1 ? 's' : ''})` : ''}`}
              required
            >
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2 bg-gray-50">
                {servicos
                  .filter((s) => s.ativo)
                  .map((servico) => (
                    <label
                      key={servico.id}
                      className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={servicosSelecionados.includes(servico.id)}
                        onChange={() => handleServicoToggle(servico.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex-1">
                        <span className="font-medium text-gray-900">{servico.nome}</span>
                        <span className="text-gray-600 ml-2">
                          - R$ {servico.valor.toFixed(2)} ({servico.duracaoMinutos} min)
                        </span>
                      </span>
                    </label>
                  ))}
              </div>
              {servicosSelecionados.length === 0 && (
                <p className="mt-1 text-sm text-red-600">Selecione pelo menos um serviço</p>
              )}
              {servicosSelecionados.length > 0 && atendentesComHorarios.length === 0 && formData.unidadeId && (
                <p className="mt-1 text-sm text-yellow-600">
                  Nenhum atendente disponível para os serviços selecionados nesta unidade
                </p>
              )}
            </FormField>

            {/* Data e Hora */}
            <FormField label="Data e Hora de Início" required>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="datetime-local"
                  required
                  min={minDateTime}
                  value={formData.dataHoraInicio}
                  onChange={(e) => handleDataHoraChange(e.target.value)}
                  className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              {formData.dataHoraInicio && (
                <p className="mt-1 text-xs text-gray-500">
                  {format(parseISO(formData.dataHoraInicio), "dd/MM/yyyy 'às' HH:mm")}
                </p>
              )}
            </FormField>

            {/* Atendente */}
            <FormField label="Atendente" required>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  required
                  value={formData.atendenteId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, atendenteId: parseInt(e.target.value) })
                  }
                  disabled={!formData.unidadeId || servicosSelecionados.length === 0 || atendentesComHorarios.length === 0}
                  className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!formData.unidadeId
                      ? 'Selecione primeiro uma unidade'
                      : servicosSelecionados.length === 0
                      ? 'Selecione primeiro os serviços'
                      : atendentesComHorarios.length === 0
                      ? 'Nenhum atendente disponível para os serviços selecionados'
                      : 'Selecione um atendente'}
                  </option>
                  {atendentesComHorarios.map((atendente) => (
                    <option key={atendente.id} value={atendente.id}>
                      {atendente.nomeUsuario}
                    </option>
                  ))}
                </select>
              </div>
              {carregandoHorarios && (
                <p className="mt-1 text-xs text-gray-500">Buscando horários disponíveis...</p>
              )}
              {!carregandoHorarios && horariosDisponiveis.length > 0 && (
                <p className="mt-1 text-xs text-green-600">
                  {horariosDisponiveis.length} horário(s) disponível(is) encontrado(s)
                </p>
              )}
            </FormField>

            {/* Observações */}
            <FormField label="Observações">
              <textarea
                value={formData.observacoes || ''}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Observações adicionais sobre o agendamento..."
              />
            </FormField>

            {/* Botões */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => {
                  setCriarModal(null)
                  setFormData({
                    clienteId: undefined,
                    unidadeId: undefined,
                    atendenteId: undefined,
                    dataHoraInicio: '',
                    observacoes: '',
                    servicos: [],
                  })
                  setServicosSelecionados([])
                  setHorariosDisponiveis([])
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleCriarAgendamento}
                disabled={createMutation.isPending || atendentesComHorarios.length === 0}
                isLoading={createMutation.isPending}
              >
                Criar Agendamento
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Finalizar Agendamento */}
      {finalizarModal && (
        <Modal
          isOpen={true}
          onClose={() => setFinalizarModal(null)}
          title="Finalizar Agendamento"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600 mb-1">
                Cliente: <strong>{finalizarModal.agendamento.cliente?.nome}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-1">
                Serviço:{' '}
                <strong>
                  {finalizarModal.agendamento.servicos
                    ?.map((s) => s.descricao || 'Serviço')
                    .join(', ') || 'Serviço não informado'}
                </strong>
              </p>
              <p className="text-sm text-gray-600">
                Valor sugerido:{' '}
                <strong>R$ {finalizarModal.agendamento.valorTotal?.toFixed(2)}</strong>
              </p>
            </div>

            <FormField label="Valor Final (R$)" required>
              <input
                type="text"
                value={finalizarModal.valor}
                onChange={(e) =>
                  setFinalizarModal({ ...finalizarModal, valor: e.target.value })
                }
                placeholder="0,00"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="secondary" onClick={() => setFinalizarModal(null)}>
                Cancelar
              </Button>
              <Button
                variant="success"
                onClick={confirmarFinalizar}
                disabled={finalizarMutation.isPending}
                isLoading={finalizarMutation.isPending}
              >
                Finalizar e Emitir NFS-e
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
