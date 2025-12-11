import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agendamentoService, Agendamento } from '../services/agendamentoService'
import { clienteService } from '../services/clienteService'
import { servicoService } from '../services/servicoService'
import { unidadeService } from '../services/unidadeService'
import { atendenteService } from '../services/atendenteService'
import CalendarView from '../components/CalendarView'
import { SlotInfo, View } from 'react-big-calendar'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import Modal from '../components/Modal'
import FormField from '../components/FormField'
import Button from '../components/Button'
import { format } from 'date-fns'

interface CalendarEvent {
  id?: number
  title: string
  start: Date
  end: Date
  resource: Agendamento
  status?: string
}

export default function Agendamentos() {
  const queryClient = useQueryClient()
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

  // Verifica se há parâmetro de data na URL (vindo da Home)
  useEffect(() => {
    const startParam = searchParams.get('start')
    if (startParam) {
      try {
        const startDate = new Date(startParam)
        if (!isNaN(startDate.getTime())) {
          setCurrentDate(startDate)
          setCriarModal({
            start: startDate,
            end: new Date(startDate.getTime() + 60 * 60 * 1000), // 1 hora depois
          })
          setFormData((prev) => ({
            ...prev,
            dataHoraInicio: format(startDate, "yyyy-MM-dd'T'HH:mm"),
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

  const { data: atendentes = [], refetch: refetchAtendentes } = useQuery({
    queryKey: ['atendentes', formData.unidadeId],
    queryFn: () =>
      formData.unidadeId
        ? atendenteService.listarPorUnidade(formData.unidadeId!)
        : Promise.resolve([]),
    enabled: !!formData.unidadeId,
  })

  const finalizarMutation = useMutation({
    mutationFn: ({ id, valorFinal }: { id: number; valorFinal: number }) =>
      agendamentoService.finalizar(id, valorFinal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      setFinalizarModal(null)
      alert('Agendamento finalizado! A nota fiscal será emitida automaticamente.')
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
    },
  })

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    const start = slotInfo.start
    const end = slotInfo.end || new Date(start.getTime() + 60 * 60 * 1000) // 1 hora padrão

    setCriarModal({ start, end })
    setFormData({
      ...formData,
      dataHoraInicio: format(start, "yyyy-MM-dd'T'HH:mm"),
    })
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    // Pode abrir modal de detalhes ou edição
    console.log('Evento selecionado:', event)
  }


  const confirmarFinalizar = () => {
    if (!finalizarModal) return
    const valor = parseFloat(finalizarModal.valor.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) {
      alert('Por favor, informe um valor válido')
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

      createMutation.mutate({
        clienteId: formData.clienteId,
        unidadeId: formData.unidadeId,
        atendenteId: formData.atendenteId,
        dataHoraInicio: formData.dataHoraInicio,
        observacoes: formData.observacoes,
        servicos: servicosParaEnvio,
      } as Agendamento)
    } else {
      alert('Por favor, preencha todos os campos obrigatórios')
    }
  }

  const handleServicoToggle = (servicoId: number) => {
    setServicosSelecionados((prev) => {
      if (prev.includes(servicoId)) {
        return prev.filter((id) => id !== servicoId)
      } else {
        return [...prev, servicoId]
      }
    })
  }

  const handleUnidadeChange = (unidadeId: number) => {
    setFormData({ ...formData, unidadeId, atendenteId: undefined })
    refetchAtendentes()
  }

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Agendamentos</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setCriarModal({ start: new Date(), end: new Date(Date.now() + 3600000) })}
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
          }}
          title="Novo Agendamento"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-md mb-4">
              <p className="text-sm text-gray-700">
                <strong>Horário selecionado:</strong>{' '}
                {format(criarModal.start, "dd/MM/yyyy 'às' HH:mm")} até{' '}
                {format(criarModal.end, 'HH:mm')}
              </p>
            </div>

            <FormField label="Cliente" required>
              <select
                required
                value={formData.clienteId || ''}
                onChange={(e) =>
                  setFormData({ ...formData, clienteId: parseInt(e.target.value) })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Selecione um cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome} - {cliente.cpfCnpj}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Unidade" required>
              <select
                required
                value={formData.unidadeId || ''}
                onChange={(e) => handleUnidadeChange(parseInt(e.target.value))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Selecione uma unidade</option>
                {unidades.map((unidade) => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.nome}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Atendente" required>
              <select
                required
                value={formData.atendenteId || ''}
                onChange={(e) =>
                  setFormData({ ...formData, atendenteId: parseInt(e.target.value) })
                }
                disabled={!formData.unidadeId}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Selecione um atendente</option>
                {atendentes.map((atendente) => (
                  <option key={atendente.id} value={atendente.id}>
                    {atendente.nomeUsuario}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label={`Serviços ${servicosSelecionados.length > 0 ? `(${servicosSelecionados.length} selecionado${servicosSelecionados.length > 1 ? 's' : ''})` : ''}`}
              required
            >
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
                {servicos
                  .filter((s) => s.ativo)
                  .map((servico) => (
                    <label
                      key={servico.id}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={servicosSelecionados.includes(servico.id)}
                        onChange={() => handleServicoToggle(servico.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex-1">
                        <span className="font-medium">{servico.nome}</span>
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
            </FormField>

            <FormField label="Data e Hora de Início" required>
              <input
                type="datetime-local"
                required
                value={formData.dataHoraInicio}
                onChange={(e) => setFormData({ ...formData, dataHoraInicio: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>

            <FormField label="Observações">
              <textarea
                value={formData.observacoes || ''}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>

            <div className="flex justify-end space-x-2 pt-4">
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
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleCriarAgendamento}
                disabled={createMutation.isPending}
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
