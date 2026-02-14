import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiQuery, getApiErrorMessage } from '../hooks/useApiQuery'
import { agendamentoService, Agendamento } from '../services/agendamentoService'
import { clienteService, Cliente } from '../services/clienteService'
import { servicoService, Servico } from '../services/servicoService'
import { unidadeService } from '../services/unidadeService'
import { atendenteService } from '../services/atendenteService'
import { horarioDisponivelService } from '../services/horarioDisponivelService'
import { authService } from '../services/authService'
import { usuarioService } from '../services/usuarioService'
import CalendarView from '../components/CalendarView'
import TimelineView from '../components/TimelineView'
import CalendarMonth from '../components/CalendarMonth'
import { SlotInfo, View } from 'react-big-calendar'
import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Clock, Calendar, User, Building2, Search, X, CalendarDays, List, Pencil } from 'lucide-react'
import Modal from '../components/Modal'
import FormField from '../components/FormField'
import Button from '../components/Button'
import RecorrenciaConfig, { RecorrenciaConfig as RecorrenciaConfigType } from '../components/RecorrenciaConfig'
import { format, parseISO, addDays, startOfDay, isBefore, isAfter } from 'date-fns'
import { useNotification } from '../contexts/NotificationContext'
import { matchSearch } from '../utils/normalize'

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
  const { showNotification } = useNotification()
  const [searchParams] = useSearchParams()
  const [finalizarModal, setFinalizarModal] = useState<{ agendamento: Agendamento; valor: string } | null>(null)
  const [criarModal, setCriarModal] = useState<{ start: Date; end: Date } | null>(null)
  const [view, setView] = useState<View>('week')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline')

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
  const [buscaCliente, setBuscaCliente] = useState('')
  const [buscaServico, setBuscaServico] = useState('')
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false)
  const [mostrarModalServico, setMostrarModalServico] = useState(false)
  const [agendamentoDetalhes, setAgendamentoDetalhes] = useState<Agendamento | null>(null)
  const [editingAgendamento, setEditingAgendamento] = useState<Agendamento | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<Agendamento>>({})
  const [editServicosSelecionados, setEditServicosSelecionados] = useState<number[]>([])
  const [recorrenciaConfig, setRecorrenciaConfig] = useState<RecorrenciaConfigType>({
    recorrente: false,
  })

  const usuario = authService.getUsuario()
  const perfil = usuario?.perfil ?? ''
  const perfilNorm = perfil.toUpperCase()
  const isCliente = perfilNorm === 'CLIENTE'

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
    enabled: !isCliente,
  })

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: servicoService.listar,
  })

  const servicosFiltrados = useMemo(() => {
    if (!buscaServico.trim()) return servicos.filter((s) => s.ativo)
    return servicos.filter(
      (s) =>
        s.ativo &&
        (matchSearch(s.nome ?? '', buscaServico) ||
          matchSearch(s.descricao ?? '', buscaServico))
    )
  }, [servicos, buscaServico])

  const { data: meuPerfilCliente } = useQuery({
    queryKey: ['cliente-meu-perfil'],
    queryFn: clienteService.buscarMeuPerfil,
    enabled: isCliente,
  })

  const clientesParaSelecao = useMemo(() => {
    if (isCliente && meuPerfilCliente) return [meuPerfilCliente]
    return clientes
  }, [isCliente, meuPerfilCliente, clientes])

  // Buscar usuário completo para obter suas unidades (se não for admin)
  const { data: usuarioCompleto } = useQuery({
    queryKey: ['usuario', usuario?.usuarioId],
    queryFn: () => {
      if (!usuario?.usuarioId) return Promise.resolve(null)
      return usuarioService.buscarPorId(usuario.usuarioId)
    },
    enabled: !!usuario?.usuarioId && perfilNorm !== 'ADMIN',
  })

  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente.trim()) return clientesParaSelecao
    return clientesParaSelecao.filter(
      (c) =>
        matchSearch(c.nome, buscaCliente) ||
        (c.cpfCnpj && c.cpfCnpj.replace(/\D/g, '').includes(buscaCliente.replace(/\D/g, '')))
    )
  }, [clientesParaSelecao, buscaCliente])

  // Filtrar unidades baseado no perfil (backend filtra por perfil; retry limitado para evitar 5xx em loop)
  const { data: todasUnidades = [] } = useApiQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
  })

  const unidadesFiltradas = useMemo(() => {
    // O backend já filtra por empresa/unidade, então podemos usar todas as unidades retornadas
    // Mas mantemos o filtro no frontend como segurança adicional
    if (perfilNorm === 'ADMIN') {
      return todasUnidades
    }
    // Para GERENTE, usar todas as unidades retornadas pelo backend (já filtradas por empresa)
    if (perfilNorm === 'GERENTE') {
      // O backend já retorna apenas unidades da mesma empresa
      return todasUnidades
    }
    // Para PROFISSIONAL/ATENDENTE, usar unidadesIds do usuário completo
    if ((perfilNorm === 'PROFISSIONAL' || perfilNorm === 'ATENDENTE') && usuarioCompleto?.unidadesIds && usuarioCompleto.unidadesIds.length > 0) {
      return todasUnidades.filter(u => usuarioCompleto.unidadesIds?.includes(u.id!))
    }
    // Fallback: usar unidadeId se existir
    if ((perfilNorm === 'PROFISSIONAL' || perfilNorm === 'ATENDENTE') && usuario?.unidadeId) {
      return todasUnidades.filter(u => u.id === usuario.unidadeId)
    }
    // CLIENTE: apenas unidades do seu perfil (unidade principal ou adicionais)
    if (isCliente && meuPerfilCliente?.unidadesIds?.length) {
      return todasUnidades.filter(u => meuPerfilCliente.unidadesIds!.includes(u.id!))
    }
    if (isCliente && meuPerfilCliente?.unidades?.length) {
      const ids = meuPerfilCliente.unidades.map(u => u.id!).filter(Boolean)
      return todasUnidades.filter(u => ids.includes(u.id!))
    }
    return todasUnidades
  }, [todasUnidades, perfilNorm, isCliente, usuarioCompleto?.unidadesIds, usuario?.unidadeId, meuPerfilCliente])

  // Filtrar atendentes baseado na unidade, serviços selecionados e perfil
  const { data: todosAtendentes = [], refetch: refetchAtendentes } = useQuery({
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

  const atendentesFiltrados = useMemo(() => {
    if (perfilNorm === 'ADMIN' || perfilNorm === 'GERENTE') {
      return todosAtendentes
    }
    if ((perfilNorm === 'PROFISSIONAL' || perfilNorm === 'ATENDENTE') && usuario?.usuarioId) {
      // PROFISSIONAL só pode criar agendamentos para si mesmo
      return todosAtendentes.filter(a => a.usuarioId === usuario.usuarioId)
    }
    return todosAtendentes
  }, [todosAtendentes, perfilNorm, usuario?.usuarioId])

  // Auto-selecionar unidade e atendente para PROFISSIONAL
  useEffect(() => {
    if ((perfil === 'PROFISSIONAL' || perfil === 'ATENDENTE') && usuario?.unidadeId && unidadesFiltradas.length > 0) {
      setFormData(prev => ({
        ...prev,
        unidadeId: prev.unidadeId || usuario.unidadeId
      }))
    }
  }, [perfilNorm, usuario?.unidadeId, unidadesFiltradas])

  useEffect(() => {
    if ((perfil === 'PROFISSIONAL' || perfil === 'ATENDENTE') && atendentesFiltrados.length > 0) {
      const meuAtendente = atendentesFiltrados.find(a => a.usuarioId === usuario?.usuarioId)
      if (meuAtendente) {
        setFormData(prev => ({
          ...prev,
          atendenteId: prev.atendenteId || meuAtendente.id
        }))
      }
    }
  }, [perfilNorm, atendentesFiltrados, usuario?.usuarioId])

  // CLIENTE: pre-selecionar o próprio cliente ao abrir o modal de novo agendamento
  useEffect(() => {
    if (isCliente && criarModal && meuPerfilCliente?.id) {
      setFormData(prev => ({
        ...prev,
        clienteId: prev.clienteId || meuPerfilCliente.id
      }))
    }
  }, [isCliente, criarModal, meuPerfilCliente])

  const { data: horariosDisponiveis = [], isLoading: carregandoHorariosQuery } = useQuery({
    queryKey: [
      'horariosDisponiveis',
      formData.unidadeId,
      servicosSelecionados,
      formData.dataHoraInicio,
    ],
    queryFn: async () => {
      if (!formData.unidadeId || servicosSelecionados.length === 0 || !formData.dataHoraInicio) {
        return []
      }
      const dataSelecionada = parseISO(formData.dataHoraInicio)
      const dataInicio = format(startOfDay(dataSelecionada), 'yyyy-MM-dd')
      const dataFim = format(addDays(startOfDay(dataSelecionada), 1), 'yyyy-MM-dd')
      const servicoId = servicosSelecionados[0]
      const horarios = await horarioDisponivelService.buscarHorariosDisponiveis(
        formData.unidadeId!,
        servicoId,
        dataInicio,
        dataFim
      )
      const agora = new Date()
      return horarios.filter((horario) => {
        const inicio = parseISO(horario.dataHoraInicio)
        return isAfter(inicio, agora) && horario.disponivel !== false
      })
    },
    enabled: !!formData.unidadeId && servicosSelecionados.length > 0 && !!formData.dataHoraInicio,
  })

  const carregandoHorarios = carregandoHorariosQuery

  useEffect(() => {
    if (editingAgendamento) {
      const clienteId = editingAgendamento.clienteId ?? editingAgendamento.cliente?.id
      const unidadeId = editingAgendamento.unidadeId ?? editingAgendamento.unidade?.id
      const atendenteId = editingAgendamento.atendenteId ?? editingAgendamento.atendente?.id
      const servicosIds = editingAgendamento.servicos?.map((s) => s.servicoId) ?? []
      setEditFormData({
        clienteId,
        unidadeId,
        atendenteId,
        dataHoraInicio: editingAgendamento.dataHoraInicio?.includes('T')
          ? editingAgendamento.dataHoraInicio.slice(0, 16)
          : editingAgendamento.dataHoraInicio,
        observacoes: editingAgendamento.observacoes ?? '',
      })
      setEditServicosSelecionados(servicosIds)
    }
  }, [editingAgendamento])

  const { data: editHorariosDisponiveis = [] } = useQuery({
    queryKey: [
      'horariosDisponiveis',
      'edit',
      editFormData.unidadeId,
      editServicosSelecionados,
      editFormData.dataHoraInicio,
    ],
    queryFn: async () => {
      if (!editFormData.unidadeId || editServicosSelecionados.length === 0 || !editFormData.dataHoraInicio) return []
      const dataSelecionada = parseISO(editFormData.dataHoraInicio)
      const dataInicio = format(startOfDay(dataSelecionada), 'yyyy-MM-dd')
      const dataFim = format(addDays(startOfDay(dataSelecionada), 1), 'yyyy-MM-dd')
      const horarios = await horarioDisponivelService.buscarHorariosDisponiveis(
        editFormData.unidadeId,
        editServicosSelecionados[0],
        dataInicio,
        dataFim
      )
      const agora = new Date()
      return horarios.filter((h) => isAfter(parseISO(h.dataHoraInicio), agora) && h.disponivel !== false)
    },
    enabled: !!editingAgendamento && !!editFormData.unidadeId && editServicosSelecionados.length > 0 && !!editFormData.dataHoraInicio,
  })

  const { data: editAtendentes = [] } = useQuery({
    queryKey: ['atendentes', editFormData.unidadeId, editServicosSelecionados],
    queryFn: () => {
      if (!editFormData.unidadeId) return Promise.resolve([])
      if (editServicosSelecionados.length === 0) return atendenteService.listarPorUnidade(editFormData.unidadeId)
      return atendenteService.listarPorUnidadeEServicos(editFormData.unidadeId, editServicosSelecionados)
    },
    enabled: !!editingAgendamento && !!editFormData.unidadeId,
  })

  const editAtendentesComHorarios = useMemo(() => {
    if (editHorariosDisponiveis.length === 0) return editAtendentes
    const ids = new Set(editHorariosDisponiveis.map((h) => h.atendenteId))
    return editAtendentes.filter((a) => ids.has(a.id!))
  }, [editAtendentes, editHorariosDisponiveis])

  // Filtrar atendentes que têm horários disponíveis
  const atendentesComHorarios = useMemo(() => {
    if (horariosDisponiveis.length === 0) return atendentesFiltrados
    
    const atendentesIdsComHorarios = new Set(horariosDisponiveis.map(h => h.atendenteId))
    return atendentesFiltrados.filter(a => atendentesIdsComHorarios.has(a.id!))
  }, [atendentesFiltrados, horariosDisponiveis])

  const cancelarMutation = useMutation({
    mutationFn: (id: number) => agendamentoService.cancelar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['horariosDisponiveis'] })
      setAgendamentoDetalhes(null)
      showNotification('success', 'Agendamento cancelado com sucesso!')
    },
    onError: (error: unknown) => {
      showNotification('error', getApiErrorMessage(error, 'Erro ao cancelar agendamento'))
    },
  })

  const finalizarMutation = useMutation({
    mutationFn: ({ id, valorFinal }: { id: number; valorFinal: number }) =>
      agendamentoService.finalizar(id, valorFinal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      setFinalizarModal(null)
      setAgendamentoDetalhes(null)
      showNotification('success', 'Agendamento finalizado! A nota fiscal será emitida automaticamente.')
    },
    onError: (error: unknown) => {
      showNotification('error', getApiErrorMessage(error, 'Erro ao finalizar agendamento'))
    },
  })

  const createMutation = useMutation({
    mutationFn: agendamentoService.criar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['horariosDisponiveis'] })
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
      showNotification('success', 'Agendamento criado com sucesso!')
    },
    onError: (error: unknown) => {
      const msg = getApiErrorMessage(error, 'Erro ao criar agendamento. Verifique os dados e tente novamente.')
      showNotification('error', msg)
      if (import.meta.env.DEV) console.error('Erro ao criar agendamento:', error)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Agendamento }) =>
      agendamentoService.atualizar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['horariosDisponiveis'] })
      setEditingAgendamento(null)
      setAgendamentoDetalhes(null)
      showNotification('success', 'Agendamento atualizado com sucesso!')
    },
    onError: (error: unknown) => {
      showNotification('error', getApiErrorMessage(error, 'Erro ao atualizar agendamento'))
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
      setRecorrenciaConfig({ recorrente: false })
  }

  const handleSelectEvent = (eventOrAgendamento: CalendarEvent | Agendamento) => {
    // Se for um CalendarEvent (do CalendarView), pegar o resource
    // Se for um Agendamento (do TimelineView), usar diretamente
    if ('resource' in eventOrAgendamento) {
      setAgendamentoDetalhes(eventOrAgendamento.resource)
    } else {
      setAgendamentoDetalhes(eventOrAgendamento)
    }
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

      const payload: any = {
        clienteId: formData.clienteId,
        unidadeId: formData.unidadeId,
        atendenteId: formData.atendenteId,
        dataHoraInicio: dataHoraFormatada,
        observacoes: formData.observacoes,
        servicos: servicosParaEnvio,
      }

      // Adiciona configuração de recorrência se estiver habilitada
      if (recorrenciaConfig.recorrente) {
        // Validação para recorrência semanal
        if (recorrenciaConfig.tipoRecorrencia === 'SEMANAL' && 
            (!recorrenciaConfig.diasDaSemana || recorrenciaConfig.diasDaSemana.length === 0)) {
          showNotification('error', 'Selecione pelo menos um dia da semana para recorrência semanal')
          return
        }

        // Validação para término por data
        if (recorrenciaConfig.tipoTermino === 'DATA' && !recorrenciaConfig.dataTermino) {
          showNotification('error', 'Informe a data de término para a recorrência')
          return
        }

        // Validação para término por ocorrências
        if (recorrenciaConfig.tipoTermino === 'OCORRENCIAS' && 
            (!recorrenciaConfig.numeroOcorrencias || recorrenciaConfig.numeroOcorrencias < 1)) {
          showNotification('error', 'Informe o número de ocorrências (mínimo 1)')
          return
        }

        payload.recorrencia = {
          recorrente: true,
          tipoRecorrencia: recorrenciaConfig.tipoRecorrencia,
          diasDaSemana: recorrenciaConfig.diasDaSemana,
          tipoTermino: recorrenciaConfig.tipoTermino,
          dataTermino: recorrenciaConfig.dataTermino,
          numeroOcorrencias: recorrenciaConfig.numeroOcorrencias,
          intervalo: recorrenciaConfig.intervalo || 1,
        }
      }

      createMutation.mutate(payload)
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
    refetchAtendentes()
  }

  const handleSalvarEdicao = () => {
    if (!editingAgendamento?.id || !editFormData.clienteId || !editFormData.unidadeId || !editFormData.atendenteId || !editFormData.dataHoraInicio || editServicosSelecionados.length === 0) {
      showNotification('error', 'Preencha todos os campos obrigatórios')
      return
    }
    const dataHora = editFormData.dataHoraInicio.includes('T') ? editFormData.dataHoraInicio : `${editFormData.dataHoraInicio}:00`
    const servicosPayload = editServicosSelecionados.map((servicoId) => {
      const s = servicos.find((sv) => sv.id === servicoId)
      return { servicoId, quantidade: 1, valor: s?.valor ?? 0, descricao: s?.nome }
    })
    const payload: Agendamento = {
      clienteId: editFormData.clienteId,
      unidadeId: editFormData.unidadeId,
      atendenteId: editFormData.atendenteId,
      dataHoraInicio: dataHora,
      observacoes: editFormData.observacoes,
      servicos: servicosPayload,
    }
    updateMutation.mutate({ id: editingAgendamento.id, data: payload })
  }

  const handleDataHoraChange = (dataHora: string) => {
    setFormData({ ...formData, dataHoraInicio: dataHora, atendenteId: undefined })
  }

  // Validar se a data selecionada não está no passado
  const minDateTime = format(new Date(), "yyyy-MM-dd'T'HH:mm")

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden px-2 sm:px-0">
      <div className="w-full min-w-0 max-w-full overflow-x-hidden px-2 sm:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Agendamentos</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            {/* Toggle View Mode */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  viewMode === 'timeline'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Timeline</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  viewMode === 'calendar'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Calendário</span>
              </button>
            </div>
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
          }}
              variant="primary"
              className="flex items-center flex-1 sm:flex-initial"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="text-sm sm:text-base">Novo Agendamento</span>
            </Button>
          </div>
        </div>

        {/* View Mode: Timeline */}
        {viewMode === 'timeline' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6 min-w-0">
            {/* Calendário Mensal */}
            <div className="lg:col-span-1 min-w-0">
              <CalendarMonth
                selectedDate={selectedDate}
                onDateSelect={(date) => {
                  setSelectedDate(date)
                  setCurrentDate(date)
                }}
                agendamentos={agendamentos}
              />
            </div>

            {/* Timeline */}
            <div className="lg:col-span-2 min-w-0 overflow-hidden">
              <TimelineView
                agendamentos={agendamentos}
                selectedDate={selectedDate}
                onEventClick={handleSelectEvent}
                onSlotClick={(date) => {
                  const umaHoraDepois = new Date(date.getTime() + 3600000)
                  setCriarModal({ start: date, end: umaHoraDepois })
                  setFormData({
                    clienteId: undefined,
                    unidadeId: undefined,
                    atendenteId: undefined,
                    dataHoraInicio: format(date, "yyyy-MM-dd'T'HH:mm"),
                    observacoes: '',
                    servicos: [],
                  })
                  setServicosSelecionados([])
                }}
              />
            </div>
          </div>
        )}

        {/* View Mode: Calendar (Original) */}
        {viewMode === 'calendar' && (
          <>
            <div className="mb-4 sm:mb-6 min-w-0 overflow-hidden">
              <CalendarView
                agendamentos={agendamentos}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                view={view}
                onViewChange={setView}
                date={currentDate}
                onNavigate={(date) => {
                  setCurrentDate(date)
                  setSelectedDate(date)
                }}
                disabled={!!criarModal || !!finalizarModal}
              />
            </div>

            {/* Legenda */}
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6 min-w-0">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Legenda:</h3>
              <div className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-4">
                <div className="flex items-center shrink-0">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded mr-2 flex-shrink-0"></div>
                  <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Agendado</span>
                </div>
                <div className="flex items-center shrink-0">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded mr-2 flex-shrink-0"></div>
                  <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Concluído</span>
                </div>
                <div className="flex items-center shrink-0">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded mr-2 flex-shrink-0"></div>
                  <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Cancelado</span>
                </div>
              </div>
            </div>
          </>
        )}
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
            setRecorrenciaConfig({ recorrente: false })
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
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar cliente por nome ou CPF/CNPJ..."
                    value={buscaCliente}
                    onChange={(e) => setBuscaCliente(e.target.value)}
                    className="block w-full pl-10 pr-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  {buscaCliente && (
                    <button
                      type="button"
                      onClick={() => setBuscaCliente('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <select
                  required
                  value={formData.clienteId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, clienteId: parseInt(e.target.value) })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Selecione um cliente</option>
                  {clientesFiltrados.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome} - {cliente.cpfCnpj}
                    </option>
                  ))}
                </select>
                {clientesFiltrados.length === 0 && buscaCliente && perfil !== 'CLIENTE' && (
                  <div className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                    <span className="text-sm text-yellow-800">Cliente não encontrado</span>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setMostrarModalCliente(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Novo
                    </Button>
                  </div>
                )}
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
                  {unidadesFiltradas.map((unidade) => (
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
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar serviço por nome..."
                    value={buscaServico}
                    onChange={(e) => setBuscaServico(e.target.value)}
                    className="block w-full pl-10 pr-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  {buscaServico && (
                    <button
                      type="button"
                      onClick={() => setBuscaServico('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2 bg-gray-50">
                  {servicosFiltrados.length === 0 ? (
                    <div className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                      <span className="text-sm text-yellow-800">Serviço não encontrado</span>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => setMostrarModalServico(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Novo
                      </Button>
                    </div>
                  ) : (
                    servicosFiltrados.map((servico) => (
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
                    ))
                  )}
                </div>
                {servicosSelecionados.length === 0 && servicosFiltrados.length > 0 && (
                  <p className="mt-1 text-sm text-red-600">Selecione pelo menos um serviço</p>
                )}
                {servicosSelecionados.length > 0 && atendentesComHorarios.length === 0 && formData.unidadeId && (
                  <p className="mt-1 text-sm text-yellow-600">
                    Nenhum atendente disponível para os serviços selecionados nesta unidade
                  </p>
                )}
              </div>
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

            {/* Configuração de Recorrência */}
            <RecorrenciaConfig
              value={recorrenciaConfig}
              onChange={setRecorrenciaConfig}
            />

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
                  setRecorrenciaConfig({ recorrente: false })
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

      {/* Modal de Detalhes do Agendamento */}
      {agendamentoDetalhes && (
        <Modal
          isOpen={true}
          onClose={() => setAgendamentoDetalhes(null)}
          title="Detalhes do Agendamento"
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Cliente</p>
                  <p className="text-sm text-gray-900">{agendamentoDetalhes.cliente?.nome || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Data/Hora</p>
                  <p className="text-sm text-gray-900">
                    {format(parseISO(agendamentoDetalhes.dataHoraInicio), "dd/MM/yyyy 'às' HH:mm")}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Atendente</p>
                  <p className="text-sm text-gray-900">{agendamentoDetalhes.atendente?.nome || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    agendamentoDetalhes.status === 'CONFIRMADO' ? 'bg-green-100 text-green-800' :
                    agendamentoDetalhes.status === 'CANCELADO' ? 'bg-red-100 text-red-800' :
                    agendamentoDetalhes.status === 'FINALIZADO' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {agendamentoDetalhes.status || 'PENDENTE'}
                  </span>
                </div>
              </div>
            </div>
            {agendamentoDetalhes.servicos && agendamentoDetalhes.servicos.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Serviços</p>
                <ul className="list-disc list-inside space-y-1">
                  {agendamentoDetalhes.servicos.map((servico, index) => (
                    <li key={index} className="text-sm text-gray-900">
                      {servico.descricao || 'Serviço'} - R$ {servico.valor?.toFixed(2) || '0.00'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {agendamentoDetalhes.valorTotal && (
              <div>
                <p className="text-sm font-medium text-gray-700">Valor Total</p>
                <p className="text-lg font-bold text-gray-900">R$ {agendamentoDetalhes.valorTotal.toFixed(2)}</p>
              </div>
            )}
            {agendamentoDetalhes.observacoes && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Observações</p>
                <p className="text-sm text-gray-900">{agendamentoDetalhes.observacoes}</p>
              </div>
            )}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="flex gap-2">
                {(perfilNorm === 'ADMIN' || perfilNorm === 'GERENTE' || perfilNorm === 'PROFISSIONAL' || perfilNorm === 'ATENDENTE' || isCliente) && (
                  <>
                    {agendamentoDetalhes.status !== 'CANCELADO' && agendamentoDetalhes.status !== 'FINALIZADO' && agendamentoDetalhes.status !== 'CONCLUIDO' && (
                      <>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingAgendamento(agendamentoDetalhes)
                            setAgendamentoDetalhes(null)
                          }}
                          className="flex items-center gap-1"
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => {
                            if (window.confirm('Tem certeza que deseja cancelar este agendamento?')) {
                              cancelarMutation.mutate(agendamentoDetalhes.id!)
                            }
                          }}
                          disabled={cancelarMutation.isPending}
                          isLoading={cancelarMutation.isPending}
                        >
                          Cancelar
                        </Button>
                      </>
                    )}
                    {!isCliente && agendamentoDetalhes.status !== 'CONCLUIDO' && agendamentoDetalhes.status !== 'CANCELADO' && (
                      <Button
                        variant="success"
                        onClick={() => {
                          setFinalizarModal({ agendamento: agendamentoDetalhes, valor: agendamentoDetalhes.valorTotal?.toFixed(2) || '0' })
                          setAgendamentoDetalhes(null)
                        }}
                      >
                        Finalizar
                      </Button>
                    )}
                  </>
                )}
              </div>
              <Button variant="secondary" onClick={() => setAgendamentoDetalhes(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Editar Agendamento */}
      {editingAgendamento && (
        <Modal
          isOpen={true}
          onClose={() => setEditingAgendamento(null)}
          title="Editar Agendamento"
          size="lg"
        >
          <div className="space-y-4">
            <FormField label="Cliente" required>
              {isCliente ? (
                <p className="text-gray-700 py-2">
                  {editingAgendamento?.cliente?.nome ?? clientesParaSelecao.find(c => c.id === editFormData.clienteId)?.nome ?? 'Você'}
                </p>
              ) : (
                <select
                  value={editFormData.clienteId ?? ''}
                  onChange={(e) => setEditFormData({ ...editFormData, clienteId: parseInt(e.target.value) })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Selecione</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome} - {c.cpfCnpj}</option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField label="Unidade" required>
              <select
                value={editFormData.unidadeId ?? ''}
                onChange={(e) => {
                  const id = parseInt(e.target.value)
                  setEditFormData({ ...editFormData, unidadeId: id, atendenteId: undefined })
                }}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Selecione</option>
                {unidadesFiltradas.map((u) => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Serviços" required>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2 bg-gray-50">
                {servicos.filter((s) => s.ativo).map((servico) => (
                  <label key={servico.id} className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input
                      type="checkbox"
                      checked={editServicosSelecionados.includes(servico.id!)}
                      onChange={() => {
                        setEditServicosSelecionados((prev) =>
                          prev.includes(servico.id!)
                            ? prev.filter((id) => id !== servico.id)
                            : [...prev, servico.id!]
                        )
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{servico.nome} - R$ {servico.valor?.toFixed(2)}</span>
                  </label>
                ))}
              </div>
            </FormField>
            <FormField label="Data e Hora" required>
              <input
                type="datetime-local"
                value={editFormData.dataHoraInicio ?? ''}
                onChange={(e) => setEditFormData({ ...editFormData, dataHoraInicio: e.target.value })}
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>
            <FormField label="Atendente" required>
              <select
                value={editFormData.atendenteId ?? ''}
                onChange={(e) => setEditFormData({ ...editFormData, atendenteId: parseInt(e.target.value) })}
                disabled={editAtendentesComHorarios.length === 0}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Selecione</option>
                {editAtendentesComHorarios.map((a) => (
                  <option key={a.id} value={a.id}>{a.nomeUsuario}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Observações">
              <textarea
                value={editFormData.observacoes ?? ''}
                onChange={(e) => setEditFormData({ ...editFormData, observacoes: e.target.value })}
                rows={2}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </FormField>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="secondary" onClick={() => setEditingAgendamento(null)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSalvarEdicao}
                disabled={updateMutation.isPending || editAtendentesComHorarios.length === 0}
                isLoading={updateMutation.isPending}
              >
                Salvar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Criar Cliente */}
      {mostrarModalCliente && (
        <Modal
          isOpen={true}
          onClose={() => {
            setMostrarModalCliente(false)
            setBuscaCliente('')
          }}
          title="Novo Cliente"
          size="md"
        >
          <ClienteForm
            onClose={() => {
              setMostrarModalCliente(false)
              setBuscaCliente('')
            }}
            onSuccess={(cliente) => {
              setFormData({ ...formData, clienteId: cliente.id })
              setMostrarModalCliente(false)
              setBuscaCliente('')
            }}
          />
        </Modal>
      )}

      {/* Modal de Criar Serviço */}
      {mostrarModalServico && (
        <Modal
          isOpen={true}
          onClose={() => {
            setMostrarModalServico(false)
            setBuscaServico('')
          }}
          title="Novo Serviço"
          size="md"
        >
          <ServicoForm
            unidadeId={formData.unidadeId}
            onClose={() => {
              setMostrarModalServico(false)
              setBuscaServico('')
            }}
            onSuccess={(servico) => {
              setServicosSelecionados([...servicosSelecionados, servico.id])
              setMostrarModalServico(false)
              setBuscaServico('')
            }}
          />
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

function ClienteForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: (cliente: Cliente) => void }) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [formData, setFormData] = useState<Cliente>({
    nome: '',
    cpfCnpj: '',
    email: '',
    telefone: '',
  })

  const saveMutation = useMutation({
    mutationFn: clienteService.criar,
    onSuccess: (cliente) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      showNotification('success', 'Cliente criado com sucesso!')
      onSuccess(cliente)
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao criar cliente'
      showNotification('error', errorMessage)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nome" required>
        <input
          type="text"
          required
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </FormField>
      <FormField label="CPF/CNPJ" required>
        <input
          type="text"
          required
          value={formData.cpfCnpj}
          onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </FormField>
      <FormField label="Email">
        <input
          type="email"
          value={formData.email || ''}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </FormField>
      <FormField label="Telefone">
        <input
          type="text"
          value={formData.telefone || ''}
          onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </FormField>
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={saveMutation.isPending}>
          Salvar
        </Button>
      </div>
    </form>
  )
}

function ServicoForm({ 
  onClose, 
  onSuccess,
  unidadeId 
}: { 
  onClose: () => void
  onSuccess: (servico: Servico) => void
  unidadeId?: number
}) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const usuario = authService.getUsuario()
  
  const [formData, setFormData] = useState<Servico>({
    id: 0,
    nome: '',
    descricao: '',
    valor: 0,
    duracaoMinutos: 30,
    unidadeId: unidadeId || usuario?.unidadeId || 0,
    ativo: true,
  })

  const saveMutation = useMutation({
    mutationFn: servicoService.criar,
    onSuccess: (servico) => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] })
      showNotification('success', 'Serviço criado com sucesso!')
      onSuccess(servico)
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Erro ao criar serviço'
      showNotification('error', errorMessage)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validação: garantir que tem unidadeId
    if (!formData.unidadeId || formData.unidadeId === 0) {
      showNotification('error', 'Por favor, selecione uma unidade primeiro')
      return
    }
    
    saveMutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nome" required>
        <input
          type="text"
          required
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </FormField>
      <FormField label="Descrição">
        <textarea
          value={formData.descricao || ''}
          onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Valor (R$)" required>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={formData.valor}
            onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </FormField>
        <FormField label="Duração (minutos)" required>
          <input
            type="number"
            min="1"
            required
            value={formData.duracaoMinutos}
            onChange={(e) => setFormData({ ...formData, duracaoMinutos: parseInt(e.target.value) || 30 })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </FormField>
      </div>
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={saveMutation.isPending}>
          Salvar
        </Button>
      </div>
    </form>
  )
}
