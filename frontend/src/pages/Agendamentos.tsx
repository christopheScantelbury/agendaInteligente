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
import { perfilService } from '../services/perfilService'
import { podeEditar } from '../utils/permissions'
import CalendarView from '../components/CalendarView'
import TimelineView from '../components/TimelineView'
import CalendarMonth from '../components/CalendarMonth'
import { SlotInfo, View } from 'react-big-calendar'
import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Building2, Search, X, CalendarDays, Calendar, Clock, List, Pencil, ChevronDown, ChevronUp, UserRound, Trash2 } from 'lucide-react'
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

const inputBaseClass =
  'block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100'

const inputWithIconClass =
  'block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100'

const lineInputClass =
  'block w-full border-0 border-b border-slate-300 bg-transparent px-0 pb-1.5 pt-1 text-sm text-slate-900 transition focus:border-violet-500 focus:outline-none focus:ring-0'

const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})


export default function Agendamentos() {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [searchParams] = useSearchParams()
  const [finalizarModal, setFinalizarModal] = useState<{ agendamento: Agendamento; valor: string } | null>(null)
  const [criarModal, setCriarModal] = useState<{ start: Date; end: Date } | null>(null)
  const [view, setView] = useState<View>('week')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('calendar')

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
  const [clienteFieldActive, setClienteFieldActive] = useState(false)
  const [servicoFieldActive, setServicoFieldActive] = useState(false)
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false)
  const [mostrarModalServico, setMostrarModalServico] = useState(false)
  const [agendamentoDetalhes, setAgendamentoDetalhes] = useState<Agendamento | null>(null)
  const [editingAgendamento, setEditingAgendamento] = useState<Agendamento | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<Agendamento>>({})
  const [editServicosSelecionados, setEditServicosSelecionados] = useState<number[]>([])
  const [editBuscaCliente, setEditBuscaCliente] = useState('')
  const [editBuscaServico, setEditBuscaServico] = useState('')
  const [editClienteFieldActive, setEditClienteFieldActive] = useState(false)
  const [editServicoFieldActive, setEditServicoFieldActive] = useState(false)
  const [editProfissionalNomeSelecionado, setEditProfissionalNomeSelecionado] = useState('')
  const [showAdvancedCreateFields, setShowAdvancedCreateFields] = useState(false)
  const [recorrenciaConfig, setRecorrenciaConfig] = useState<RecorrenciaConfigType>({
    recorrente: false,
  })

  const usuario = authService.getUsuario()
  const perfil = usuario?.perfil ?? ''
  const perfilNorm = perfil.toUpperCase()
  const isAdmin = perfilNorm === 'ADMIN' || perfilNorm === 'ADMINISTRADOR'
  const isCliente = perfilNorm === 'CLIENTE'

  const { data: perfilPermissoes } = useQuery({
    queryKey: ['perfil', 'meu'],
    queryFn: () => perfilService.buscarMeuPerfil(),
    enabled: !!usuario,
  })
  const podeEditarAgendamentos = isCliente || podeEditar(perfilPermissoes, '/agendamentos')
  const podeEditarServicos = podeEditar(perfilPermissoes, '/servicos')

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

  const servicosSelecionadosDetalhes = useMemo(
    () => servicos.filter((servico) => servicosSelecionados.includes(servico.id!)),
    [servicos, servicosSelecionados]
  )

  const editServicosSelecionadosDetalhes = useMemo(
    () => servicos.filter((servico) => editServicosSelecionados.includes(servico.id!)),
    [servicos, editServicosSelecionados]
  )

  const valorEstimadoCriacao = useMemo(
    () => servicosSelecionadosDetalhes.reduce((total, servico) => total + (servico.valor || 0), 0),
    [servicosSelecionadosDetalhes]
  )

  const duracaoEstimadaCriacao = useMemo(
    () => servicosSelecionadosDetalhes.reduce((total, servico) => total + (servico.duracaoMinutos || 0), 0),
    [servicosSelecionadosDetalhes]
  )

  const valorEstimadoEdicao = useMemo(
    () => editServicosSelecionadosDetalhes.reduce((total, servico) => total + (servico.valor || 0), 0),
    [editServicosSelecionadosDetalhes]
  )

  const duracaoEstimadaEdicao = useMemo(
    () => editServicosSelecionadosDetalhes.reduce((total, servico) => total + (servico.duracaoMinutos || 0), 0),
    [editServicosSelecionadosDetalhes]
  )

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

  const editClientesFiltrados = useMemo(() => {
    if (!editBuscaCliente.trim()) return clientesParaSelecao
    return clientesParaSelecao.filter(
      (c) =>
        matchSearch(c.nome, editBuscaCliente) ||
        (c.cpfCnpj && c.cpfCnpj.replace(/\D/g, '').includes(editBuscaCliente.replace(/\D/g, '')))
    )
  }, [clientesParaSelecao, editBuscaCliente])

  const editServicosFiltrados = useMemo(() => {
    if (!editBuscaServico.trim()) return servicos.filter((s) => s.ativo)
    return servicos.filter(
      (s) =>
        s.ativo &&
        (matchSearch(s.nome ?? '', editBuscaServico) ||
          matchSearch(s.descricao ?? '', editBuscaServico))
    )
  }, [servicos, editBuscaServico])

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

  const unidadeUnicaModal = useMemo(() => {
    const isAtendenteOuProfissional = perfilNorm === 'ATENDENTE' || perfilNorm === 'PROFISSIONAL'
    const podeOcultarUnidade = isAdmin || perfilNorm === 'GERENTE' || isAtendenteOuProfissional
    if (!podeOcultarUnidade || unidadesFiltradas.length !== 1) return undefined
    return unidadesFiltradas[0]
  }, [isAdmin, perfilNorm, unidadesFiltradas])

  const editUnidadeIdAtiva = editFormData.unidadeId ?? unidadeUnicaModal?.id

  // Listar profissionais da unidade (studio)
  const { data: todosAtendentes = [], refetch: refetchAtendentes } = useQuery({
    queryKey: ['atendentes', formData.unidadeId],
    queryFn: () => {
      if (!formData.unidadeId) return Promise.resolve([])
      return atendenteService.listarPorUnidade(formData.unidadeId)
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

  // CLIENTE: pre-selecionar cliente e unidade ao abrir o modal; permitir trocar só unidade se tiver mais de uma
  const primeiraUnidadeCliente = useMemo(() => {
    if (!meuPerfilCliente || !isCliente) return undefined
    if (meuPerfilCliente.unidadesIds?.length) return meuPerfilCliente.unidadesIds[0]
    if (meuPerfilCliente.unidades?.length && meuPerfilCliente.unidades[0]?.id) return meuPerfilCliente.unidades[0].id
    return undefined
  }, [meuPerfilCliente, isCliente])

  useEffect(() => {
    if (isCliente && criarModal && meuPerfilCliente?.id) {
      setFormData(prev => ({
        ...prev,
        clienteId: prev.clienteId ?? meuPerfilCliente.id,
        unidadeId: prev.unidadeId ?? primeiraUnidadeCliente ?? prev.unidadeId,
        dataHoraInicio: prev.dataHoraInicio || (criarModal ? format(criarModal.start, "yyyy-MM-dd'T'HH:mm") : prev.dataHoraInicio),
      }))
    }
  }, [isCliente, criarModal, meuPerfilCliente, primeiraUnidadeCliente])

  useEffect(() => {
    if (!criarModal || !unidadeUnicaModal?.id) return
    setFormData((prev) => ({
      ...prev,
      unidadeId: unidadeUnicaModal.id,
    }))
  }, [criarModal, unidadeUnicaModal])

  const { data: horariosDisponiveis = [] } = useQuery({
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

  useEffect(() => {
    if (!editingAgendamento) {
      setEditBuscaCliente('')
      setEditBuscaServico('')
      setEditClienteFieldActive(false)
      setEditServicoFieldActive(false)
      setEditProfissionalNomeSelecionado('')
      return
    }

    const clienteId =
      editingAgendamento.clienteId ??
      editingAgendamento.cliente?.id ??
      editingAgendamento.cliente?.clienteId
    const unidadeId =
      editingAgendamento.unidadeId ??
      editingAgendamento.unidade?.id ??
      editingAgendamento.unidade?.unidadeId
    const atendenteId =
      editingAgendamento.atendenteId ??
      editingAgendamento.atendente?.id ??
      editingAgendamento.atendente?.atendenteId
    const servicosIds =
      editingAgendamento.servicos
        ?.map((s) => s.servicoId ?? (s as unknown as { servico?: { id?: number } }).servico?.id)
        .filter((id): id is number => typeof id === 'number') ?? []

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
    setEditBuscaCliente(editingAgendamento.cliente?.nome ?? '')
    setEditBuscaServico('')
    setEditClienteFieldActive(false)
    setEditServicoFieldActive(false)
    setEditProfissionalNomeSelecionado(
      editingAgendamento.atendente?.nomeUsuario ??
        editingAgendamento.atendente?.nome ??
        ''
    )
  }, [editingAgendamento])

  useEffect(() => {
    if (!editingAgendamento || !unidadeUnicaModal?.id) return
    setEditFormData((prev) => ({
      ...prev,
      unidadeId: prev.unidadeId ?? unidadeUnicaModal.id,
    }))
  }, [editingAgendamento, unidadeUnicaModal])

  useEffect(() => {
    if (!editingAgendamento || !editFormData.clienteId) return
    if (editBuscaCliente.trim()) return
    const clienteSelecionado = clientesParaSelecao.find((c) => c.id === editFormData.clienteId)
    if (clienteSelecionado?.nome) {
      setEditBuscaCliente(clienteSelecionado.nome)
    }
  }, [editingAgendamento, editFormData.clienteId, editBuscaCliente, clientesParaSelecao])

  const { data: editHorariosDisponiveis = [] } = useQuery({
    queryKey: [
      'horariosDisponiveis',
      'edit',
      editUnidadeIdAtiva,
      editServicosSelecionados,
      editFormData.dataHoraInicio,
    ],
    queryFn: async () => {
      if (!editUnidadeIdAtiva || editServicosSelecionados.length === 0 || !editFormData.dataHoraInicio) return []
      const dataSelecionada = parseISO(editFormData.dataHoraInicio)
      const dataInicio = format(startOfDay(dataSelecionada), 'yyyy-MM-dd')
      const dataFim = format(addDays(startOfDay(dataSelecionada), 1), 'yyyy-MM-dd')
      const horarios = await horarioDisponivelService.buscarHorariosDisponiveis(
        editUnidadeIdAtiva,
        editServicosSelecionados[0],
        dataInicio,
        dataFim
      )
      const agora = new Date()
      return horarios.filter((h) => isAfter(parseISO(h.dataHoraInicio), agora) && h.disponivel !== false)
    },
    enabled: !!editingAgendamento && !!editUnidadeIdAtiva && editServicosSelecionados.length > 0 && !!editFormData.dataHoraInicio,
  })

  const { data: editAtendentes = [] } = useQuery({
    queryKey: ['atendentes', editUnidadeIdAtiva, editServicosSelecionados],
    queryFn: () => {
      if (!editUnidadeIdAtiva) return Promise.resolve([])
      if (editServicosSelecionados.length === 0) return atendenteService.listarPorUnidade(editUnidadeIdAtiva)
      return atendenteService.listarPorUnidadeEServicos(editUnidadeIdAtiva, editServicosSelecionados)
    },
    enabled: !!editingAgendamento && !!editUnidadeIdAtiva,
  })

  const editAtendentesFiltrados = useMemo(() => {
    if (perfilNorm === 'ADMIN' || perfilNorm === 'GERENTE') {
      return editAtendentes
    }
    if ((perfilNorm === 'PROFISSIONAL' || perfilNorm === 'ATENDENTE') && usuario?.usuarioId) {
      return editAtendentes.filter((a) => a.usuarioId === usuario.usuarioId)
    }
    return editAtendentes
  }, [editAtendentes, perfilNorm, usuario?.usuarioId])

  const editAtendentesComHorarios = useMemo(() => {
    if (editHorariosDisponiveis.length === 0) return editAtendentesFiltrados
    const ids = new Set(editHorariosDisponiveis.map((h) => h.atendenteId))
    return editAtendentesFiltrados.filter((a) => ids.has(a.id!))
  }, [editAtendentesFiltrados, editHorariosDisponiveis])

  const editProfissionaisDisponiveis = useMemo(
    () => editAtendentesComHorarios.filter((a) => (a.perfilUsuario ?? '').toUpperCase() === 'PROFISSIONAL'),
    [editAtendentesComHorarios]
  )

  const editProfissionalSelecionado = useMemo(
    () => editProfissionaisDisponiveis.find((a) => a.id === editFormData.atendenteId),
    [editProfissionaisDisponiveis, editFormData.atendenteId]
  )

  const editProfissionalSelecionadoNome =
    editProfissionalSelecionado?.nomeUsuario ?? editProfissionalNomeSelecionado

  // Filtrar atendentes que têm horários disponíveis
  const atendentesComHorarios = useMemo(() => {
    if (horariosDisponiveis.length === 0) return atendentesFiltrados
    
    const atendentesIdsComHorarios = new Set(horariosDisponiveis.map(h => h.atendenteId))
    return atendentesFiltrados.filter(a => atendentesIdsComHorarios.has(a.id!))
  }, [atendentesFiltrados, horariosDisponiveis])

  const profissionaisDisponiveis = useMemo(
    () => atendentesComHorarios.filter((a) => (a.perfilUsuario ?? '').toUpperCase() === 'PROFISSIONAL'),
    [atendentesComHorarios]
  )

  const profissionalSelecionado = useMemo(
    () => profissionaisDisponiveis.find((a) => a.id === formData.atendenteId),
    [profissionaisDisponiveis, formData.atendenteId]
  )

  useEffect(() => {
    if (!formData.atendenteId) return
    const selecionadoEhProfissional = profissionaisDisponiveis.some((a) => a.id === formData.atendenteId)
    if (!selecionadoEhProfissional) {
      setFormData((prev) => ({ ...prev, atendenteId: undefined }))
    }
  }, [formData.atendenteId, profissionaisDisponiveis])

  useEffect(() => {
    if (!editFormData.atendenteId) {
      setEditProfissionalNomeSelecionado('')
      return
    }
    const profissionalDisponivel = editProfissionaisDisponiveis.find((a) => a.id === editFormData.atendenteId)
    if (profissionalDisponivel?.nomeUsuario) {
      setEditProfissionalNomeSelecionado(profissionalDisponivel.nomeUsuario)
    }
  }, [editFormData.atendenteId, editProfissionaisDisponiveis])

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

  const excluirMutation = useMutation({
    mutationFn: (id: number) => agendamentoService.excluir(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['horariosDisponiveis'] })
      setAgendamentoDetalhes(null)
      setEditingAgendamento(null)
      showNotification('success', 'Agendamento excluído com sucesso!')
    },
    onError: (error: unknown) => {
      showNotification('error', getApiErrorMessage(error, 'Erro ao excluir agendamento'))
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
      resetCreateModal()
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
    if (!podeEditarAgendamentos) return
    const start = slotInfo.start
    const end = slotInfo.end || new Date(start.getTime() + 60 * 60 * 1000) // 1 hora padrão

    setCriarModal({ start, end })
    setFormData({
      clienteId: undefined,
      unidadeId: undefined,
      atendenteId: undefined,
      dataHoraInicio: format(start, "yyyy-MM-dd'T'HH:mm"),
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

  const resetCreateModal = () => {
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
    setBuscaCliente('')
    setBuscaServico('')
    setClienteFieldActive(false)
    setServicoFieldActive(false)
    setShowAdvancedCreateFields(false)
    setRecorrenciaConfig({ recorrente: false })
  }

  const handleCriarAgendamento = () => {
    let clienteIdParaCriar = formData.clienteId
    const unidadeIdParaCriar = formData.unidadeId ?? unidadeUnicaModal?.id

    // Se digitou cliente sem clicar na lista, tenta resolver por correspondência exata
    if (!clienteIdParaCriar && !isCliente && buscaCliente.trim()) {
      const termo = buscaCliente.trim().toLowerCase()
      const termoNumerico = buscaCliente.replace(/\D/g, '')
      const candidatos = clientesParaSelecao.filter((cliente) => {
        if (!cliente.id) return false
        const nomeExato = (cliente.nome ?? '').trim().toLowerCase() === termo
        const docExato = termoNumerico.length > 0 && (cliente.cpfCnpj ?? '').replace(/\D/g, '') === termoNumerico
        return nomeExato || docExato
      })
      if (candidatos.length === 1 && candidatos[0].id) {
        clienteIdParaCriar = candidatos[0].id
        setFormData((prev) => ({ ...prev, clienteId: candidatos[0].id }))
      }
    }

    const camposFaltantes: string[] = []
    if (!clienteIdParaCriar) camposFaltantes.push('cliente')
    if (servicosSelecionados.length === 0) camposFaltantes.push('serviço')
    if (!unidadeIdParaCriar) camposFaltantes.push('unidade')
    if (!formData.atendenteId) camposFaltantes.push('profissional')
    if (!formData.dataHoraInicio) camposFaltantes.push('data e hora')

    if (camposFaltantes.length > 0) {
      showNotification('error', `Preencha os campos obrigatórios: ${camposFaltantes.join(', ')}.`)
      return
    }

    const dataSelecionada = parseISO(formData.dataHoraInicio!)

    // Validar se o atendente tem horário disponível no horário selecionado
    const horarioValido = horariosDisponiveis.some((h) => {
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
    const dataHoraFormatada = formData.dataHoraInicio!.includes('T')
      ? formData.dataHoraInicio!
      : `${formData.dataHoraInicio}:00`

    const payload: any = {
      clienteId: clienteIdParaCriar,
      unidadeId: unidadeIdParaCriar,
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

  const handleEditServicoToggle = (servicoId: number) => {
    setEditServicosSelecionados((prev) => {
      const novo = prev.includes(servicoId)
        ? prev.filter((id) => id !== servicoId)
        : [...prev, servicoId]
      return novo
    })
  }

  const handleSalvarEdicao = () => {
    const unidadeIdParaEdicao = editUnidadeIdAtiva
    if (!editingAgendamento?.id || !editFormData.clienteId || !unidadeIdParaEdicao || !editFormData.atendenteId || !editFormData.dataHoraInicio || editServicosSelecionados.length === 0) {
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
      unidadeId: unidadeIdParaEdicao,
      atendenteId: editFormData.atendenteId,
      dataHoraInicio: dataHora,
      observacoes: editFormData.observacoes,
      servicos: servicosPayload,
    }
    updateMutation.mutate({ id: editingAgendamento.id, data: payload })
  }

  const dataHoraCriacao = useMemo(() => {
    if (formData.dataHoraInicio) {
      const parsed = parseISO(formData.dataHoraInicio)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed
      }
    }
    return criarModal?.start ?? new Date()
  }, [formData.dataHoraInicio, criarModal])

  const handleDataCriacaoChange = (novaData: string) => {
    if (!novaData) return
    const horaAtual = format(dataHoraCriacao, 'HH:mm')
    setFormData((prev) => ({
      ...prev,
      dataHoraInicio: `${novaData}T${horaAtual}`,
      atendenteId: undefined,
    }))
  }

  const handleHoraCriacaoChange = (novaHora: string) => {
    if (!novaHora) return
    const dataAtual = format(dataHoraCriacao, 'yyyy-MM-dd')
    setFormData((prev) => ({
      ...prev,
      dataHoraInicio: `${dataAtual}T${novaHora}`,
      atendenteId: undefined,
    }))
  }

  const dataHoraEdicao = useMemo(() => {
    if (editFormData.dataHoraInicio) {
      const parsed = parseISO(editFormData.dataHoraInicio)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed
      }
    }
    if (editingAgendamento?.dataHoraInicio) {
      const parsedOriginal = parseISO(editingAgendamento.dataHoraInicio)
      if (!Number.isNaN(parsedOriginal.getTime())) {
        return parsedOriginal
      }
    }
    return new Date()
  }, [editFormData.dataHoraInicio, editingAgendamento])

  const handleDataEdicaoChange = (novaData: string) => {
    if (!novaData) return
    const horaAtual = format(dataHoraEdicao, 'HH:mm')
    setEditFormData((prev) => ({
      ...prev,
      dataHoraInicio: `${novaData}T${horaAtual}`,
      atendenteId: undefined,
    }))
  }

  const handleHoraEdicaoChange = (novaHora: string) => {
    if (!novaHora) return
    const dataAtual = format(dataHoraEdicao, 'yyyy-MM-dd')
    setEditFormData((prev) => ({
      ...prev,
      dataHoraInicio: `${dataAtual}T${novaHora}`,
      atendenteId: undefined,
    }))
  }

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden px-2 sm:px-0">
      <div className="space-y-6">
        <div className="rounded-[28px] border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3 shadow-sm sm:p-4 lg:p-5">
          <div className="mb-4 flex flex-col gap-3 px-1 sm:px-2 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
              {viewMode === 'timeline' ? 'Visão diária em linha do tempo' : 'Visão de calendário'}
            </h2>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <div className="inline-flex rounded-2xl border border-slate-200/80 bg-white/85 p-1 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.45)] backdrop-blur">
                <button
                  onClick={() => setViewMode('timeline')}
                  type="button"
                  title="Linha do tempo"
                  aria-label="Linha do tempo"
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ${
                    viewMode === 'timeline'
                      ? 'bg-slate-900 text-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.9)]'
                      : 'text-slate-500 hover:bg-slate-100/90 hover:text-slate-900'
                  }`}
                >
                  <List className="h-7 w-7" strokeWidth={2.4} />
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  type="button"
                  title="Calendário"
                  aria-label="Calendário"
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ${
                    viewMode === 'calendar'
                      ? 'bg-slate-900 text-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.9)]'
                      : 'text-slate-500 hover:bg-slate-100/90 hover:text-slate-900'
                  }`}
                >
                  <CalendarDays className="h-7 w-7" strokeWidth={2.4} />
                </button>
              </div>
              {podeEditarAgendamentos && (
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
                  title="Novo agendamento"
                  aria-label="Novo agendamento"
                  className="h-12 w-full rounded-2xl border border-blue-400/20 bg-gradient-to-r from-blue-600 to-cyan-500 px-0 text-sm font-semibold shadow-[0_14px_34px_-20px_rgba(37,99,235,0.9)] hover:from-blue-700 hover:to-cyan-600 sm:h-10 sm:w-10"
                >
                  <Plus className="h-8 w-8" strokeWidth={2.6} />
                </Button>
              )}
            </div>
          </div>

          {viewMode === 'timeline' && (
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div className="min-w-0">
                <CalendarMonth
                  selectedDate={selectedDate}
                  onDateSelect={(date) => {
                    setSelectedDate(date)
                    setCurrentDate(date)
                  }}
                  agendamentos={agendamentos}
                />
              </div>

              <div className="min-w-0 overflow-hidden">
                <TimelineView
                  agendamentos={agendamentos}
                  selectedDate={selectedDate}
                  onEventClick={handleSelectEvent}
                  onSlotClick={podeEditarAgendamentos ? (date) => {
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
                  } : undefined}
                />
              </div>
            </div>
          )}

          {viewMode === 'calendar' && (
            <div className="space-y-4">
              <div className="min-w-0 overflow-hidden">
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

              <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Legenda da agenda</h3>
                <div className="mt-3 flex flex-wrap gap-3 sm:gap-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-sm text-slate-700">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    Agendado
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-slate-700">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    Finalizado
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-sm text-slate-700">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    Cancelado
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Criar Agendamento */}
      {criarModal && (
        <Modal
          isOpen={true}
          onClose={resetCreateModal}
          title="Novo Agendamento"
          size="md"
        >
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Data</label>
                    <div className="relative mt-1">
                      <input
                        type="date"
                        value={format(dataHoraCriacao, 'yyyy-MM-dd')}
                        onChange={(e) => handleDataCriacaoChange(e.target.value)}
                        className={`${lineInputClass} pr-8`}
                      />
                      <Calendar className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Hora Início</label>
                    <div className="relative mt-1">
                      <input
                        type="time"
                        value={format(dataHoraCriacao, 'HH:mm')}
                        onChange={(e) => handleHoraCriacaoChange(e.target.value)}
                        className={`${lineInputClass} pr-8`}
                      />
                      <Clock className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4 px-4 py-4 sm:px-5">
                {!unidadeUnicaModal && (
                  <FormField label="Unidade" required>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <select
                        required
                        value={formData.unidadeId || ''}
                        onChange={(e) => handleUnidadeChange(parseInt(e.target.value))}
                        disabled={isCliente && unidadesFiltradas.length <= 1}
                        className={`${inputWithIconClass} disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-500`}
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
                )}

                <FormField
                  label="Profissional"
                  required
                  hint={
                    formData.unidadeId && servicosSelecionados.length > 0 && profissionaisDisponiveis.length === 0
                      ? 'Nenhum profissional disponível para os filtros atuais.'
                      : undefined
                  }
                >
                  <div className="space-y-2">
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <select
                        required
                        value={formData.atendenteId ?? ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            atendenteId: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        disabled={!formData.unidadeId || profissionaisDisponiveis.length === 0}
                        className={`${inputWithIconClass} appearance-none pr-11 ${!formData.unidadeId || profissionaisDisponiveis.length === 0 ? 'cursor-not-allowed bg-slate-50 text-slate-500' : ''}`}
                      >
                        <option value="">Selecione um profissional</option>
                        {profissionaisDisponiveis.map((profissional) => (
                          <option key={profissional.id} value={profissional.id}>
                            {profissional.nomeUsuario}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    {profissionalSelecionado?.nomeUsuario && (
                      <div className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                        Selecionado: {profissionalSelecionado.nomeUsuario}
                      </div>
                    )}
                  </div>
                </FormField>

                <FormField label="Cliente" required>
                  {isCliente && meuPerfilCliente ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
                      Você: <strong>{meuPerfilCliente.nome}</strong>
                      {meuPerfilCliente.cpfCnpj && ` - ${meuPerfilCliente.cpfCnpj}`}
                    </div>
                  ) : (
                    <div
                      className="space-y-2"
                      onFocusCapture={() => setClienteFieldActive(true)}
                      onBlurCapture={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                          setClienteFieldActive(false)
                        }
                      }}
                    >
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Digite para buscar..."
                          value={buscaCliente}
                          onFocus={() => setClienteFieldActive(true)}
                          onChange={(e) => {
                            setClienteFieldActive(true)
                            setBuscaCliente(e.target.value)
                            setFormData((prev) => ({ ...prev, clienteId: undefined }))
                          }}
                          className={inputWithIconClass}
                        />
                        {buscaCliente && (
                          <button
                            type="button"
                            onClick={() => {
                              setClienteFieldActive(true)
                              setBuscaCliente('')
                              setFormData((prev) => ({ ...prev, clienteId: undefined }))
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {clienteFieldActive && !buscaCliente.trim() && (
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                          <Button
                            type="button"
                            variant="success"
                            size="sm"
                            onClick={() => setMostrarModalCliente(true)}
                            className="w-full rounded-lg py-2.5 font-semibold uppercase tracking-wide"
                          >
                            Adicionar cliente
                          </Button>
                        </div>
                      )}

                      {clienteFieldActive && buscaCliente.trim() && clientesFiltrados.length > 0 && (
                        <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                          <div className="space-y-1 p-2">
                            {clientesFiltrados.map((cliente) => (
                              <button
                                key={cliente.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  if (!cliente.id) return
                                  setFormData((prev) => ({ ...prev, clienteId: cliente.id }))
                                  setBuscaCliente(cliente.nome)
                                  setClienteFieldActive(false)
                                }}
                                className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                  formData.clienteId === cliente.id
                                    ? 'bg-violet-50 ring-1 ring-violet-200'
                                    : 'hover:bg-slate-50'
                                }`}
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-medium text-slate-900">
                                    {cliente.nome}
                                  </span>
                                  <span className="block truncate text-xs text-slate-500">
                                    {cliente.cpfCnpj}
                                  </span>
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {clienteFieldActive && clientesFiltrados.length === 0 && buscaCliente.trim() && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                          Cliente não encontrado.
                        </div>
                      )}
                    </div>
                  )}
                </FormField>

                <FormField
                  label={`Serviços${servicosSelecionados.length > 0 ? ` (${servicosSelecionados.length})` : ''}`}
                  required
                  hint={
                    servicosSelecionados.length > 0 && profissionaisDisponiveis.length === 0 && formData.unidadeId
                      ? 'Nenhum profissional disponível para os serviços selecionados.'
                      : undefined
                  }
                >
                  <div
                    className="space-y-2"
                    onFocusCapture={() => setServicoFieldActive(true)}
                    onBlurCapture={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                        setServicoFieldActive(false)
                      }
                    }}
                  >
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Digite para buscar..."
                        value={buscaServico}
                        onChange={(e) => setBuscaServico(e.target.value)}
                        className={inputWithIconClass}
                      />
                      {buscaServico && (
                        <button
                          type="button"
                          onClick={() => setBuscaServico('')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {servicosSelecionadosDetalhes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {servicosSelecionadosDetalhes.map((servico) => (
                          <button
                            key={servico.id}
                            type="button"
                            onClick={() => handleServicoToggle(servico.id!)}
                            className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
                          >
                            <span>{servico.nome}</span>
                            <X className="h-3.5 w-3.5" />
                          </button>
                        ))}
                      </div>
                    )}

                    {servicoFieldActive && !buscaServico.trim() && podeEditarServicos && (
                      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <Button
                          type="button"
                          variant="success"
                          size="sm"
                          onClick={() => setMostrarModalServico(true)}
                          className="w-full rounded-lg py-2.5 font-semibold uppercase tracking-wide"
                        >
                          Adicionar serviço
                        </Button>
                      </div>
                    )}

                    {buscaServico.trim() && (
                      <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                        {servicosFiltrados.length === 0 ? (
                          <div className="p-2">
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                              Serviço não encontrado.
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1 p-2">
                            {servicosFiltrados.map((servico) => (
                              <button
                                key={servico.id}
                                type="button"
                                onClick={() => {
                                  handleServicoToggle(servico.id)
                                  setBuscaServico('')
                                }}
                                className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                  servicosSelecionados.includes(servico.id)
                                    ? 'bg-violet-50 ring-1 ring-violet-200'
                                    : 'hover:bg-slate-50'
                                }`}
                              >
                                <span className="flex-1">
                                  <span className="block text-sm font-medium text-slate-900">{servico.nome}</span>
                                  <span className="block text-xs text-slate-500">
                                    {moneyFormatter.format(servico.valor)} • {servico.duracaoMinutos} min
                                  </span>
                                </span>
                                <span className={`text-xs font-medium ${servicosSelecionados.includes(servico.id) ? 'text-violet-700' : 'text-slate-400'}`}>
                                  {servicosSelecionados.includes(servico.id) ? 'Selecionado' : 'Selecionar'}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                      <div className="text-sm text-slate-600">
                        Duração: <span className="font-semibold text-slate-900">{duracaoEstimadaCriacao > 0 ? `${duracaoEstimadaCriacao} min` : '0 min'}</span>
                      </div>
                      <div className="text-sm text-slate-600">
                        Total: <span className="font-semibold text-slate-900">{moneyFormatter.format(valorEstimadoCriacao)}</span>
                      </div>
                    </div>

                    {servicosSelecionados.length === 0 && servicosFiltrados.length > 0 && (
                      <p className="text-sm text-rose-600">Selecione pelo menos um serviço.</p>
                    )}
                  </div>
                </FormField>

                <button
                  type="button"
                  onClick={() => setShowAdvancedCreateFields((prev) => !prev)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-violet-700 transition hover:text-violet-800"
                >
                  {showAdvancedCreateFields ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Mais opções
                </button>

                {showAdvancedCreateFields && (
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <FormField label="Observações">
                      <textarea
                        value={formData.observacoes || ''}
                        onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                        rows={3}
                        className={`${inputBaseClass} min-h-[88px] resize-none`}
                        placeholder="Observações adicionais sobre o agendamento"
                      />
                    </FormField>

                    <RecorrenciaConfig
                      value={recorrenciaConfig}
                      onChange={setRecorrenciaConfig}
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <Button
                  variant="secondary"
                  onClick={resetCreateModal}
                  className="rounded-xl px-4 py-2"
                >
                  Fechar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCriarAgendamento}
                  disabled={createMutation.isPending || profissionaisDisponiveis.length === 0}
                  isLoading={createMutation.isPending}
                  className="rounded-xl bg-violet-600 px-5 py-2 hover:bg-violet-700"
                >
                  Salvar
                </Button>
              </div>
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
                {podeEditarAgendamentos && (perfilNorm === 'ADMIN' || perfilNorm === 'GERENTE' || perfilNorm === 'PROFISSIONAL' || perfilNorm === 'ATENDENTE' || isCliente) && (
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
                    {agendamentoDetalhes.id && (
                      <Button
                        variant="danger"
                        onClick={() => {
                          if (window.confirm('Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.')) {
                            excluirMutation.mutate(agendamentoDetalhes.id!)
                          }
                        }}
                        disabled={excluirMutation.isPending}
                        isLoading={excluirMutation.isPending}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
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
          size="md"
        >
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Data</label>
                    <div className="relative mt-1">
                      <input
                        type="date"
                        value={format(dataHoraEdicao, 'yyyy-MM-dd')}
                        onChange={(e) => handleDataEdicaoChange(e.target.value)}
                        className={`${lineInputClass} pr-8`}
                      />
                      <Calendar className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Hora Início</label>
                    <div className="relative mt-1">
                      <input
                        type="time"
                        value={format(dataHoraEdicao, 'HH:mm')}
                        onChange={(e) => handleHoraEdicaoChange(e.target.value)}
                        className={`${lineInputClass} pr-8`}
                      />
                      <Clock className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 px-4 py-4 sm:px-5">
                {!unidadeUnicaModal && (
                  <FormField label="Unidade" required>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <select
                        value={editFormData.unidadeId ?? ''}
                        onChange={(e) => {
                          const id = e.target.value ? parseInt(e.target.value, 10) : undefined
                          setEditFormData((prev) => ({
                            ...prev,
                            unidadeId: id,
                            atendenteId: undefined,
                          }))
                        }}
                        disabled={isCliente && unidadesFiltradas.length <= 1}
                        className={`${inputWithIconClass} appearance-none pr-11 disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-500`}
                      >
                        <option value="">Selecione uma unidade</option>
                        {unidadesFiltradas.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nome}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </FormField>
                )}

                <FormField
                  label="Profissional"
                  required
                  hint={
                    editUnidadeIdAtiva && editServicosSelecionados.length > 0 && editProfissionaisDisponiveis.length === 0
                      ? 'Nenhum profissional disponível para os filtros atuais.'
                      : undefined
                  }
                >
                  <div className="space-y-2">
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <select
                        value={editFormData.atendenteId ?? ''}
                        onChange={(e) => {
                          const atendenteId = e.target.value ? parseInt(e.target.value, 10) : undefined
                          const profissionalSelecionadoLista = editProfissionaisDisponiveis.find((a) => a.id === atendenteId)
                          setEditProfissionalNomeSelecionado((prevNome) => {
                            if (!atendenteId) return ''
                            return (profissionalSelecionadoLista?.nomeUsuario ?? prevNome) || 'Profissional selecionado'
                          })
                          setEditFormData((prev) => ({
                            ...prev,
                            atendenteId,
                          }))
                        }}
                        disabled={!editUnidadeIdAtiva || (editProfissionaisDisponiveis.length === 0 && !editFormData.atendenteId)}
                        className={`${inputWithIconClass} appearance-none pr-11 ${!editUnidadeIdAtiva || (editProfissionaisDisponiveis.length === 0 && !editFormData.atendenteId) ? 'cursor-not-allowed bg-slate-50 text-slate-500' : ''}`}
                      >
                        <option value="">Selecione um profissional</option>
                        {!!editFormData.atendenteId &&
                          !editProfissionaisDisponiveis.some((a) => a.id === editFormData.atendenteId) && (
                            <option value={editFormData.atendenteId}>
                              {editProfissionalSelecionadoNome || 'Profissional selecionado'}
                            </option>
                          )}
                        {editProfissionaisDisponiveis.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nomeUsuario}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    {editProfissionalSelecionadoNome && (
                      <div className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                        Selecionado: {editProfissionalSelecionadoNome}
                      </div>
                    )}
                  </div>
                </FormField>

                <FormField label="Cliente" required>
                  {isCliente ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
                      Você: <strong>{editingAgendamento?.cliente?.nome ?? clientesParaSelecao.find((c) => c.id === editFormData.clienteId)?.nome ?? 'Você'}</strong>
                    </div>
                  ) : (
                    <div
                      className="space-y-2"
                      onFocusCapture={() => setEditClienteFieldActive(true)}
                      onBlurCapture={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                          setEditClienteFieldActive(false)
                        }
                      }}
                    >
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Digite para buscar..."
                          value={editBuscaCliente}
                          onFocus={() => setEditClienteFieldActive(true)}
                          onChange={(e) => {
                            setEditClienteFieldActive(true)
                            setEditBuscaCliente(e.target.value)
                            setEditFormData((prev) => ({ ...prev, clienteId: undefined }))
                          }}
                          className={inputWithIconClass}
                        />
                        {editBuscaCliente && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditClienteFieldActive(true)
                              setEditBuscaCliente('')
                              setEditFormData((prev) => ({ ...prev, clienteId: undefined }))
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {editClienteFieldActive && !editBuscaCliente.trim() && (
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                          <Button
                            type="button"
                            variant="success"
                            size="sm"
                            onClick={() => setMostrarModalCliente(true)}
                            className="w-full rounded-lg py-2.5 font-semibold uppercase tracking-wide"
                          >
                            Adicionar cliente
                          </Button>
                        </div>
                      )}

                      {editClienteFieldActive && editBuscaCliente.trim() && editClientesFiltrados.length > 0 && (
                        <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                          <div className="space-y-1 p-2">
                            {editClientesFiltrados.map((cliente) => (
                              <button
                                key={cliente.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  if (!cliente.id) return
                                  setEditFormData((prev) => ({ ...prev, clienteId: cliente.id }))
                                  setEditBuscaCliente(cliente.nome)
                                  setEditClienteFieldActive(false)
                                }}
                                className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                  editFormData.clienteId === cliente.id
                                    ? 'bg-violet-50 ring-1 ring-violet-200'
                                    : 'hover:bg-slate-50'
                                }`}
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-medium text-slate-900">
                                    {cliente.nome}
                                  </span>
                                  <span className="block truncate text-xs text-slate-500">
                                    {cliente.cpfCnpj}
                                  </span>
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {editClienteFieldActive && editBuscaCliente.trim() && editClientesFiltrados.length === 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                          Cliente não encontrado.
                        </div>
                      )}
                    </div>
                  )}
                </FormField>

                <FormField
                  label={`Serviços${editServicosSelecionados.length > 0 ? ` (${editServicosSelecionados.length})` : ''}`}
                  required
                  hint={
                    editServicosSelecionados.length > 0 && editProfissionaisDisponiveis.length === 0 && !!editUnidadeIdAtiva
                      ? 'Nenhum profissional disponível para os serviços selecionados.'
                      : undefined
                  }
                >
                  <div
                    className="space-y-2"
                    onFocusCapture={() => setEditServicoFieldActive(true)}
                    onBlurCapture={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                        setEditServicoFieldActive(false)
                      }
                    }}
                  >
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Digite para buscar..."
                        value={editBuscaServico}
                        onChange={(e) => setEditBuscaServico(e.target.value)}
                        className={inputWithIconClass}
                      />
                      {editBuscaServico && (
                        <button
                          type="button"
                          onClick={() => setEditBuscaServico('')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {editServicosSelecionadosDetalhes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {editServicosSelecionadosDetalhes.map((servico) => (
                          <button
                            key={servico.id}
                            type="button"
                            onClick={() => {
                              if (!servico.id) return
                              handleEditServicoToggle(servico.id)
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
                          >
                            <span>{servico.nome}</span>
                            <X className="h-3.5 w-3.5" />
                          </button>
                        ))}
                      </div>
                    )}

                    {editServicoFieldActive && !editBuscaServico.trim() && podeEditarServicos && (
                      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <Button
                          type="button"
                          variant="success"
                          size="sm"
                          onClick={() => setMostrarModalServico(true)}
                          className="w-full rounded-lg py-2.5 font-semibold uppercase tracking-wide"
                        >
                          Adicionar serviço
                        </Button>
                      </div>
                    )}

                    {editBuscaServico.trim() && (
                      <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                        {editServicosFiltrados.length === 0 ? (
                          <div className="p-2">
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                              Serviço não encontrado.
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1 p-2">
                            {editServicosFiltrados.map((servico) => (
                              <button
                                key={servico.id}
                                type="button"
                                onClick={() => {
                                  handleEditServicoToggle(servico.id)
                                  setEditBuscaServico('')
                                }}
                                className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                  editServicosSelecionados.includes(servico.id)
                                    ? 'bg-violet-50 ring-1 ring-violet-200'
                                    : 'hover:bg-slate-50'
                                }`}
                              >
                                <span className="flex-1">
                                  <span className="block text-sm font-medium text-slate-900">{servico.nome}</span>
                                  <span className="block text-xs text-slate-500">
                                    {moneyFormatter.format(servico.valor)} • {servico.duracaoMinutos} min
                                  </span>
                                </span>
                                <span className={`text-xs font-medium ${editServicosSelecionados.includes(servico.id) ? 'text-violet-700' : 'text-slate-400'}`}>
                                  {editServicosSelecionados.includes(servico.id) ? 'Selecionado' : 'Selecionar'}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                      <div className="text-sm text-slate-600">
                        Duração: <span className="font-semibold text-slate-900">{duracaoEstimadaEdicao > 0 ? `${duracaoEstimadaEdicao} min` : '0 min'}</span>
                      </div>
                      <div className="text-sm text-slate-600">
                        Total: <span className="font-semibold text-slate-900">{moneyFormatter.format(valorEstimadoEdicao)}</span>
                      </div>
                    </div>

                    {editServicosSelecionados.length === 0 && editServicosFiltrados.length > 0 && (
                      <p className="text-sm text-rose-600">Selecione pelo menos um serviço.</p>
                    )}
                  </div>
                </FormField>

                <FormField label="Observações">
                  <textarea
                    value={editFormData.observacoes ?? ''}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, observacoes: e.target.value }))}
                    rows={3}
                    className={`${inputBaseClass} min-h-[88px] resize-none`}
                    placeholder="Observações adicionais sobre o agendamento"
                  />
                </FormField>
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <Button
                  variant="secondary"
                  onClick={() => setEditingAgendamento(null)}
                  className="rounded-xl px-4 py-2"
                >
                  Fechar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSalvarEdicao}
                  disabled={updateMutation.isPending}
                  isLoading={updateMutation.isPending}
                  className="rounded-xl bg-violet-600 px-5 py-2 hover:bg-violet-700"
                >
                  Salvar
                </Button>
              </div>
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
