import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiQuery, getApiErrorMessage } from '../hooks/useApiQuery'
import { agendamentoService, Agendamento } from '../services/agendamentoService'
import { clienteService, Cliente } from '../services/clienteService'
import { servicoService, Servico } from '../services/servicoService'
import { unidadeService } from '../services/unidadeService'
import { atendenteService } from '../services/atendenteService'
import { horarioDisponivelService } from '../services/horarioDisponivelService'
import { pagamentoService } from '../services/pagamentoService'
import { authService } from '../services/authService'
import { usuarioService } from '../services/usuarioService'
import { perfilService } from '../services/perfilService'
import { podeEditar } from '../utils/permissions'
import CalendarView from '../components/CalendarView'
import TimelineView from '../components/TimelineView'
import CalendarMonth from '../components/CalendarMonth'
import TimeWheelInput from '../components/TimeWheelInput'
import { SlotInfo, View } from 'react-big-calendar'
import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Building2, Search, X, CalendarDays, Clock, List, Pencil, ChevronDown, ChevronUp, ChevronRight, UserRound, Trash2, BriefcaseBusiness, MessageCircle, Tag, HandCoins, Check, Info } from 'lucide-react'
import Modal from '../components/Modal'
import FormField from '../components/FormField'
import Button from '../components/Button'
import RecorrenciaConfig, { RecorrenciaConfig as RecorrenciaConfigType } from '../components/RecorrenciaConfig'
import { format, parseISO, addDays, startOfDay, isBefore, isAfter } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNotification } from '../contexts/NotificationContext'
import { matchSearch } from '../utils/normalize'
import { maskPhone } from '../utils/masks'

interface CalendarEvent {
  id?: number
  title: string
  start: Date
  end: Date
  resource: Agendamento
  status?: string
}

type FormaPagamentoSinal = 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO'

interface ConfirmarModalState {
  agendamentoId: number
  comSinal: boolean
  valorSinal: string
  formaPagamento: FormaPagamentoSinal
  dataPagamento: string
  touchedValorSinal: boolean
}

interface AjustePagamentoModalState {
  agendamentoId: number
  valor: string
  formaPagamento: FormaPagamentoSinal
  dataPagamento: string
}

interface ServicoFinalizacaoLinha {
  key: string
  profissional: string
  descricao: string
  valor: number
}

const inputBaseClass =
  'block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100'

const inputWithIconClass =
  'block w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100'

const lineInputClass =
  'block w-full border-0 border-b border-slate-300 bg-transparent px-0 pb-1.5 pt-1 text-sm text-slate-900 transition focus:border-violet-500 focus:outline-none focus:ring-0'

const headerDateInputClass = `${lineInputClass} mt-0.5`
const headerTimeInputClass = lineInputClass

const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const parseCurrencyInput = (value: string): number => {
  if (!value) return 0
  const normalized = value
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

const formatCurrencyFromDigits = (value: string): string => {
  const digits = value.replace(/\D/g, '')
  const amount = Number(digits || '0') / 100
  return moneyFormatter.format(amount).replace(/\u00A0/g, ' ')
}

const normalizeFormaPagamento = (value?: string): FormaPagamentoSinal => {
  if (value === 'PIX' || value === 'DINHEIRO' || value === 'CARTAO_CREDITO' || value === 'CARTAO_DEBITO') {
    return value
  }
  return 'PIX'
}

const getAgendamentoStatusLabel = (
  status?: string,
  profissionalNome?: string,
  procedimentoNome?: string
): string => {
  switch (status) {
    case 'AGENDADO':
      return 'Agendado'
    case 'CONFIRMADO':
      return 'Confirmado'
    case 'EM_ANDAMENTO':
      if (procedimentoNome && profissionalNome) {
        return `Realizando procedimento de ${procedimentoNome} por ${profissionalNome}`
      }
      if (procedimentoNome) {
        return `Realizando procedimento de ${procedimentoNome} por profissional não informado`
      }
      if (profissionalNome) {
        return `Realizando procedimento de serviço não informado por ${profissionalNome}`
      }
      return 'Realizando procedimento de serviço não informado por profissional não informado'
    case 'PROCEDIMENTO_FIM':
      return profissionalNome
        ? `Procedimento finalizado por ${profissionalNome}`
        : 'Procedimento finalizado por profissional não informado'
    case 'EM_ATENDIMENTO_SINCRONIZADO':
      return profissionalNome
        ? `Em atendimento por ${profissionalNome}`
        : 'Em atendimento'
    case 'AGUARDANDO_PROXIMO_PROCEDIMENTO':
      return 'Aguardando Iniciar procedimento'
    case 'CONCLUIDO':
    case 'FINALIZADO':
      return 'Finalizado'
    case 'CANCELADO':
      return 'Cancelado'
    case 'NO_SHOW':
      return 'Não compareceu'
    default:
      return status || 'Pendente'
  }
}

const getAgendamentoStatusBadgeClass = (status?: string): string => {
  switch (status) {
    case 'AGENDADO':
      return 'bg-slate-900 text-white'
    case 'CONFIRMADO':
    case 'EM_ATENDIMENTO_SINCRONIZADO':
    case 'AGUARDANDO_PROXIMO_PROCEDIMENTO':
    case 'EM_ANDAMENTO':
    case 'PROCEDIMENTO_FIM':
      return 'bg-blue-100 text-blue-800'
    case 'CANCELADO':
      return 'bg-red-100 text-red-800'
    case 'CONCLUIDO':
    case 'FINALIZADO':
      return 'bg-green-100 text-green-800'
    case 'NO_SHOW':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-yellow-100 text-yellow-800'
  }
}

const getDetalhesModalPanelBorderClass = (status?: string): string => {
  switch (status) {
    case 'AGENDADO':
      return 'border-2 border-black'
    case 'CONFIRMADO':
    case 'EM_ANDAMENTO':
    case 'PROCEDIMENTO_FIM':
      return 'border-2 border-blue-500'
    case 'CONCLUIDO':
    case 'FINALIZADO':
      return 'border-2 border-emerald-500'
    default:
      return 'border border-slate-200'
  }
}

const isAgendamentoEncerrado = (status?: string): boolean =>
  status === 'CANCELADO' ||
  status === 'CONCLUIDO' ||
  status === 'FINALIZADO' ||
  status === 'NO_SHOW'

const getTimelineCompletedSteps = (status?: string, usarEtapaProcedimento: boolean = true): 1 | 2 | 3 | 4 => {
  if (!usarEtapaProcedimento) {
    switch (status) {
      case 'CONFIRMADO':
      case 'EM_ANDAMENTO':
      case 'PROCEDIMENTO_FIM':
        return 2
      case 'CONCLUIDO':
      case 'FINALIZADO':
        return 3
      default:
        return 1
    }
  }

  switch (status) {
    case 'CONFIRMADO':
      return 2
    case 'EM_ANDAMENTO':
    case 'PROCEDIMENTO_FIM':
      return 3
    case 'CONCLUIDO':
    case 'FINALIZADO':
      return 4
    default:
      return 1
  }
}

const capitalize = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value

const formatarDataDetalhe = (date: Date): string => {
  const diaSemana = capitalize(format(date, 'EEEE', { locale: ptBR }).replace('-feira', ''))
  const dia = format(date, 'dd')
  const mes = capitalize(format(date, 'MMMM', { locale: ptBR }))
  const ano = format(date, 'yyyy')
  return `${diaSemana}, ${dia} de ${mes} de ${ano}`
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={className}
    fill="currentColor"
  >
    <path d="M19.05 4.91A9.816 9.816 0 0 0 12.05 2C6.62 2 2.2 6.42 2.2 11.85c0 1.73.45 3.42 1.3 4.91L2 22l5.39-1.42a9.78 9.78 0 0 0 4.67 1.19h.01c5.43 0 9.85-4.42 9.85-9.85 0-2.63-1.03-5.1-2.87-7.01Zm-7 15.19h-.01a8.15 8.15 0 0 1-4.15-1.13l-.3-.18-3.2.84.86-3.12-.2-.32a8.11 8.11 0 0 1-1.25-4.33c0-4.5 3.66-8.16 8.17-8.16 2.18 0 4.23.85 5.77 2.39a8.09 8.09 0 0 1 2.38 5.77c0 4.5-3.67 8.16-8.17 8.16Zm4.47-6.1c-.25-.13-1.47-.73-1.7-.82-.23-.08-.4-.13-.56.13-.17.25-.65.82-.8.98-.14.17-.3.19-.56.06-.25-.13-1.08-.4-2.05-1.28-.76-.67-1.27-1.5-1.42-1.76-.15-.25-.02-.39.11-.51.12-.12.25-.3.38-.45.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.48-.4-.41-.56-.42h-.48c-.17 0-.45.06-.69.32-.23.25-.9.88-.9 2.15s.92 2.5 1.05 2.67c.13.17 1.8 2.75 4.37 3.86.61.27 1.09.43 1.46.55.62.2 1.19.17 1.64.1.5-.08 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.3Z" />
  </svg>
)


export default function Agendamentos() {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [searchParams] = useSearchParams()
  const [finalizarModal, setFinalizarModal] = useState<{
    agendamento: Agendamento
    formaPagamento: FormaPagamentoSinal
  } | null>(null)
  const [criarModal, setCriarModal] = useState<{ start: Date; end: Date } | null>(null)
  const [view, setView] = useState<View>('week')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('calendar')
  const [filtroProfissionalId, setFiltroProfissionalId] = useState<number | null>(null)

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
  const [nomeInicialNovoCliente, setNomeInicialNovoCliente] = useState('')
  const [nomeInicialNovoServico, setNomeInicialNovoServico] = useState('')
  const [origemModalCliente, setOrigemModalCliente] = useState<'create' | 'edit'>('create')
  const [origemModalServico, setOrigemModalServico] = useState<'create' | 'edit'>('create')
  const [agendamentoDetalhes, setAgendamentoDetalhes] = useState<Agendamento | null>(null)
  const [excluirAgendamentoModal, setExcluirAgendamentoModal] = useState<{
    agendamentoId: number
    valorSinal: number
  } | null>(null)
  const [editarObservacaoModal, setEditarObservacaoModal] = useState<{ agendamentoId: number; texto: string } | null>(null)
  const [cancelarAgendamentoModal, setCancelarAgendamentoModal] = useState<{
    agendamentoId: number
    texto: string
    devolveuSinal: boolean
  } | null>(null)
  const [noShowModal, setNoShowModal] = useState<{ agendamentoId: number } | null>(null)
  const [salvandoObservacaoCancelamento, setSalvandoObservacaoCancelamento] = useState(false)
  const [confirmarModal, setConfirmarModal] = useState<ConfirmarModalState | null>(null)
  const [ajustePagamentoModal, setAjustePagamentoModal] = useState<AjustePagamentoModalState | null>(null)
  const [editingAgendamento, setEditingAgendamento] = useState<Agendamento | null>(null)
  const [reabrirDetalhesPosEdicao, setReabrirDetalhesPosEdicao] = useState(false)
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
  const exibirFiltroProfissional = perfilNorm === 'GERENTE'

  const abrirModalCliente = (origem: 'create' | 'edit', nomeInicial = '') => {
    setOrigemModalCliente(origem)
    setNomeInicialNovoCliente(nomeInicial.trim())
    setMostrarModalCliente(true)
  }

  const abrirModalServico = (origem: 'create' | 'edit', nomeInicial = '') => {
    setOrigemModalServico(origem)
    setNomeInicialNovoServico(nomeInicial.trim())
    setMostrarModalServico(true)
  }

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

  const { data: profissionaisFiltroCalendario = [] } = useQuery({
    queryKey: ['atendentes', 'ativos', 'filtro-calendario'],
    queryFn: atendenteService.listar,
    enabled: exibirFiltroProfissional,
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

  const agendamentoConfirmacao = useMemo(() => {
    if (!confirmarModal) return null
    if (agendamentoDetalhes?.id === confirmarModal.agendamentoId) return agendamentoDetalhes
    return agendamentos.find((item) => item.id === confirmarModal.agendamentoId) || null
  }, [confirmarModal, agendamentoDetalhes, agendamentos])

  const valorServicoConfirmacao = agendamentoConfirmacao?.valorTotal || 0
  const valorSinalConfirmacao = confirmarModal?.comSinal ? parseCurrencyInput(confirmarModal.valorSinal) : 0
  const valorRestanteConfirmacao = Math.max(valorServicoConfirmacao - valorSinalConfirmacao, 0)
  const valorSinalInvalido = !!confirmarModal?.comSinal && confirmarModal.touchedValorSinal && valorSinalConfirmacao < 1
  const agendamentoAjustePagamento = useMemo(() => {
    if (!ajustePagamentoModal) return null
    if (agendamentoDetalhes?.id === ajustePagamentoModal.agendamentoId) return agendamentoDetalhes
    return agendamentos.find((item) => item.id === ajustePagamentoModal.agendamentoId) || null
  }, [ajustePagamentoModal, agendamentoDetalhes, agendamentos])
  const valorInformadoPagamento = ajustePagamentoModal ? parseCurrencyInput(ajustePagamentoModal.valor) : 0
  const totalPagoAtualAjuste = Number(agendamentoAjustePagamento?.valorFinal ?? 0)
  const totalServicoAjuste = Number(agendamentoAjustePagamento?.valorTotal ?? 0)
  const totalAposAjuste = ajustePagamentoModal ? valorInformadoPagamento : totalPagoAtualAjuste
  const agendamentoCancelamento = useMemo(() => {
    if (!cancelarAgendamentoModal) return null
    if (agendamentoDetalhes?.id === cancelarAgendamentoModal.agendamentoId) return agendamentoDetalhes
    return agendamentos.find((item) => item.id === cancelarAgendamentoModal.agendamentoId) || null
  }, [cancelarAgendamentoModal, agendamentoDetalhes, agendamentos])
  const statusDetalhesNorm = (agendamentoDetalhes?.status || '').toUpperCase()
  const { data: pagamentoConfirmacao, isLoading: isLoadingPagamentoConfirmacao } = useQuery({
    queryKey: ['pagamento', 'agendamento', agendamentoDetalhes?.id],
    queryFn: () => pagamentoService.buscarPorAgendamento(agendamentoDetalhes!.id!),
    enabled:
      !!agendamentoDetalhes?.id &&
      (statusDetalhesNorm === 'CONFIRMADO' ||
        statusDetalhesNorm === 'EM_ANDAMENTO' ||
        statusDetalhesNorm === 'PROCEDIMENTO_FIM') &&
      !isCliente,
  })
  const confirmadoComSinalLocal = statusDetalhesNorm === 'CONFIRMADO' && Number(agendamentoDetalhes?.valorFinal ?? 0) > 0
  const agendamentoNoShow = useMemo(() => {
    if (!noShowModal) return null
    if (agendamentoDetalhes?.id === noShowModal.agendamentoId) return agendamentoDetalhes
    return agendamentos.find((item) => item.id === noShowModal.agendamentoId) || null
  }, [noShowModal, agendamentoDetalhes, agendamentos])
  const valorSinalNoShow = Number(agendamentoNoShow?.valorFinal ?? pagamentoConfirmacao?.valor ?? 0)
  const noShowComSinal = valorSinalNoShow > 0
  const agendamentosFinalizacaoGrupo = useMemo(() => {
    if (!finalizarModal?.agendamento) return []

    const base = finalizarModal.agendamento
    const clienteIdBase = base.clienteId ?? base.cliente?.id
    const unidadeIdBase = base.unidadeId ?? base.unidade?.id
    if (!clienteIdBase || !unidadeIdBase || !base.dataHoraInicio) {
      return [base]
    }

    const dataBase = parseISO(base.dataHoraInicio)
    if (Number.isNaN(dataBase.getTime())) {
      return [base]
    }
    const diaBase = format(dataBase, 'yyyy-MM-dd')

    const grupo = agendamentos.filter((item) => {
      const statusItem = (item.status || '').toUpperCase()
      if (statusItem === 'CANCELADO' || statusItem === 'NO_SHOW') return false

      const clienteIdItem = item.clienteId ?? item.cliente?.id
      const unidadeIdItem = item.unidadeId ?? item.unidade?.id
      if (Number(clienteIdItem) !== Number(clienteIdBase)) return false
      if (Number(unidadeIdItem) !== Number(unidadeIdBase)) return false
      if (!item.dataHoraInicio) return false

      const dataItem = parseISO(item.dataHoraInicio)
      if (Number.isNaN(dataItem.getTime())) return false
      return format(dataItem, 'yyyy-MM-dd') === diaBase
    })

    const porId = new Map<number, Agendamento>()
    grupo.forEach((item) => {
      if (item.id) porId.set(item.id, item)
    })
    if (base.id) porId.set(base.id, { ...base, ...porId.get(base.id) })

    return Array.from(porId.values()).sort((a, b) => {
      const dataA = a.dataHoraInicio ? parseISO(a.dataHoraInicio).getTime() : Number.MAX_SAFE_INTEGER
      const dataB = b.dataHoraInicio ? parseISO(b.dataHoraInicio).getTime() : Number.MAX_SAFE_INTEGER
      if (dataA !== dataB) return dataA - dataB
      return (a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER)
    })
  }, [finalizarModal, agendamentos])
  const servicosFinalizacaoLinhas = useMemo<ServicoFinalizacaoLinha[]>(() => {
    return agendamentosFinalizacaoGrupo.flatMap((agendamento) => {
      const profissional =
        agendamento.atendente?.nomeUsuario ||
        agendamento.atendente?.nome ||
        'Profissional'

      const servicos = agendamento.servicos || []
      if (servicos.length === 0) {
        return [{
          key: `agendamento-${agendamento.id ?? 'sem-id'}-0`,
          profissional,
          descricao: 'Serviço não informado',
          valor: Number(agendamento.valorTotal ?? 0),
        }]
      }

      return servicos.map((servico, index) => {
        const valorServico = Number(
          servico.valorTotal ??
          (servico.valor != null ? servico.valor * (servico.quantidade ?? 1) : 0)
        )
        return {
          key: `agendamento-${agendamento.id ?? 'sem-id'}-${index}`,
          profissional,
          descricao: servico.descricao || 'Serviço',
          valor: Number.isFinite(valorServico) ? valorServico : 0,
        }
      })
    })
  }, [agendamentosFinalizacaoGrupo])
  const totalServicosFinalizacao = useMemo(
    () => agendamentosFinalizacaoGrupo.reduce((total, item) => total + Number(item.valorTotal ?? 0), 0),
    [agendamentosFinalizacaoGrupo]
  )
  const totalPagoFinalizacao = useMemo(
    () => agendamentosFinalizacaoGrupo.reduce((total, item) => total + Number(item.valorFinal ?? 0), 0),
    [agendamentosFinalizacaoGrupo]
  )
  const valorRestanteFinalizacao = useMemo(
    () => Math.max(totalServicosFinalizacao - totalPagoFinalizacao, 0),
    [totalServicosFinalizacao, totalPagoFinalizacao]
  )
  const quantidadeAgendamentosNoDia = useMemo(() => {
    if (!agendamentoDetalhes?.dataHoraInicio || !agendamentoDetalhes?.id) return 0

    const clienteIdAtual = agendamentoDetalhes.clienteId ?? agendamentoDetalhes.cliente?.id
    const unidadeIdAtual = agendamentoDetalhes.unidadeId ?? agendamentoDetalhes.unidade?.id
    if (!clienteIdAtual || !unidadeIdAtual) return 0

    const dataAtual = parseISO(agendamentoDetalhes.dataHoraInicio)
    if (Number.isNaN(dataAtual.getTime())) return 0
    const diaAtual = format(dataAtual, 'yyyy-MM-dd')

    return agendamentos.filter((item) => {
      if (!item.id) return false
      const statusItem = (item.status || '').toUpperCase()
      if (statusItem === 'CANCELADO' || statusItem === 'NO_SHOW') return false

      const clienteIdItem = item.clienteId ?? item.cliente?.id
      const unidadeIdItem = item.unidadeId ?? item.unidade?.id
      if (Number(clienteIdItem) !== Number(clienteIdAtual)) return false
      if (Number(unidadeIdItem) !== Number(unidadeIdAtual)) return false
      if (!item.dataHoraInicio) return false

      const dataItem = parseISO(item.dataHoraInicio)
      if (Number.isNaN(dataItem.getTime())) return false
      return format(dataItem, 'yyyy-MM-dd') === diaAtual
    }).length
  }, [agendamentoDetalhes, agendamentos])
  const usarEtapaProcedimento = quantidadeAgendamentosNoDia >= 2
  const atendimentoConflitante = useMemo(() => {
    if (!usarEtapaProcedimento) return null

    if (
      !agendamentoDetalhes?.id ||
      (statusDetalhesNorm !== 'CONFIRMADO' && statusDetalhesNorm !== 'PROCEDIMENTO_FIM')
    ) {
      return null
    }

    const clienteIdAtual = agendamentoDetalhes.clienteId ?? agendamentoDetalhes.cliente?.id
    const unidadeIdAtual = agendamentoDetalhes.unidadeId ?? agendamentoDetalhes.unidade?.id
    if (!clienteIdAtual || !unidadeIdAtual || !agendamentoDetalhes.dataHoraInicio) return null

    const dataAtual = parseISO(agendamentoDetalhes.dataHoraInicio)
    if (Number.isNaN(dataAtual.getTime())) return null
    const diaAtual = format(dataAtual, 'yyyy-MM-dd')

    const emAndamentoNoGrupo = agendamentos.filter((item) => {
        if (!item.id || item.id === agendamentoDetalhes.id) return false
        if ((item.status || '').toUpperCase() !== 'EM_ANDAMENTO') return false

        const clienteIdItem = item.clienteId ?? item.cliente?.id
        const unidadeIdItem = item.unidadeId ?? item.unidade?.id
        if (Number(clienteIdItem) !== Number(clienteIdAtual)) return false
        if (Number(unidadeIdItem) !== Number(unidadeIdAtual)) return false
        if (!item.dataHoraInicio) return false

        const dataItem = parseISO(item.dataHoraInicio)
        if (Number.isNaN(dataItem.getTime())) return false
        return format(dataItem, 'yyyy-MM-dd') === diaAtual
      })

    emAndamentoNoGrupo.sort((a, b) => {
      const dataA = a.dataHoraInicio ? parseISO(a.dataHoraInicio).getTime() : Number.MAX_SAFE_INTEGER
      const dataB = b.dataHoraInicio ? parseISO(b.dataHoraInicio).getTime() : Number.MAX_SAFE_INTEGER
      if (dataA !== dataB) return dataA - dataB
      return (a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER)
    })

    return emAndamentoNoGrupo[0] || null
  }, [usarEtapaProcedimento, agendamentoDetalhes, agendamentos, statusDetalhesNorm])
  const bloqueadoPorOutroAtendimento = !!atendimentoConflitante
  const nomeProfissionalConflitante =
    atendimentoConflitante?.atendente?.nomeUsuario ||
    atendimentoConflitante?.atendente?.nome ||
    'outro profissional'
  const grupoConfirmadoTemSinal = useMemo(() => {
    if (!agendamentoDetalhes?.dataHoraInicio) return false

    const clienteIdAtual = agendamentoDetalhes.clienteId ?? agendamentoDetalhes.cliente?.id
    const unidadeIdAtual = agendamentoDetalhes.unidadeId ?? agendamentoDetalhes.unidade?.id
    if (!clienteIdAtual || !unidadeIdAtual) return false

    const dataAtual = parseISO(agendamentoDetalhes.dataHoraInicio)
    if (Number.isNaN(dataAtual.getTime())) return false
    const diaAtual = format(dataAtual, 'yyyy-MM-dd')

    const sinalNoGrupo = agendamentos.some((item) => {
      const statusItem = (item.status || '').toUpperCase()
      if (statusItem !== 'CONFIRMADO') return false

      const clienteIdItem = item.clienteId ?? item.cliente?.id
      const unidadeIdItem = item.unidadeId ?? item.unidade?.id
      if (Number(clienteIdItem) !== Number(clienteIdAtual)) return false
      if (Number(unidadeIdItem) !== Number(unidadeIdAtual)) return false
      if (!item.dataHoraInicio) return false

      const dataItem = parseISO(item.dataHoraInicio)
      if (Number.isNaN(dataItem.getTime())) return false
      if (format(dataItem, 'yyyy-MM-dd') !== diaAtual) return false

      return Number(item.valorFinal ?? 0) > 0
    })

    return sinalNoGrupo || Number(pagamentoConfirmacao?.valor ?? 0) > 0
  }, [agendamentoDetalhes, agendamentos, pagamentoConfirmacao?.valor])
  const existeProcedimentoPendenteNoGrupo = useMemo(() => {
    if (!usarEtapaProcedimento) return false
    if (!agendamentoDetalhes?.dataHoraInicio || !agendamentoDetalhes?.id) return false

    const clienteIdAtual = agendamentoDetalhes.clienteId ?? agendamentoDetalhes.cliente?.id
    const unidadeIdAtual = agendamentoDetalhes.unidadeId ?? agendamentoDetalhes.unidade?.id
    if (!clienteIdAtual || !unidadeIdAtual) return false

    const dataAtual = parseISO(agendamentoDetalhes.dataHoraInicio)
    if (Number.isNaN(dataAtual.getTime())) return false
    const diaAtual = format(dataAtual, 'yyyy-MM-dd')

    return agendamentos.some((item) => {
      if (!item.id || item.id === agendamentoDetalhes.id) return false

      const clienteIdItem = item.clienteId ?? item.cliente?.id
      const unidadeIdItem = item.unidadeId ?? item.unidade?.id
      if (Number(clienteIdItem) !== Number(clienteIdAtual)) return false
      if (Number(unidadeIdItem) !== Number(unidadeIdAtual)) return false
      if (!item.dataHoraInicio) return false

      const dataItem = parseISO(item.dataHoraInicio)
      if (Number.isNaN(dataItem.getTime())) return false
      if (format(dataItem, 'yyyy-MM-dd') !== diaAtual) return false

      const statusItem = (item.status || '').toUpperCase()
      return statusItem === 'AGENDADO' || statusItem === 'CONFIRMADO' || statusItem === 'EM_ANDAMENTO'
    })
  }, [usarEtapaProcedimento, agendamentoDetalhes, agendamentos])
  const existeProcedimentoFinalizadoNoGrupo = useMemo(() => {
    if (!usarEtapaProcedimento) return false
    if (!agendamentoDetalhes?.dataHoraInicio || !agendamentoDetalhes?.id) return false

    const clienteIdAtual = agendamentoDetalhes.clienteId ?? agendamentoDetalhes.cliente?.id
    const unidadeIdAtual = agendamentoDetalhes.unidadeId ?? agendamentoDetalhes.unidade?.id
    if (!clienteIdAtual || !unidadeIdAtual) return false

    const dataAtual = parseISO(agendamentoDetalhes.dataHoraInicio)
    if (Number.isNaN(dataAtual.getTime())) return false
    const diaAtual = format(dataAtual, 'yyyy-MM-dd')

    return agendamentos.some((item) => {
      if (!item.id || item.id === agendamentoDetalhes.id) return false

      const clienteIdItem = item.clienteId ?? item.cliente?.id
      const unidadeIdItem = item.unidadeId ?? item.unidade?.id
      if (Number(clienteIdItem) !== Number(clienteIdAtual)) return false
      if (Number(unidadeIdItem) !== Number(unidadeIdAtual)) return false
      if (!item.dataHoraInicio) return false

      const dataItem = parseISO(item.dataHoraInicio)
      if (Number.isNaN(dataItem.getTime())) return false
      if (format(dataItem, 'yyyy-MM-dd') !== diaAtual) return false

      const statusItem = (item.status || '').toUpperCase()
      return statusItem === 'PROCEDIMENTO_FIM' || statusItem === 'CONCLUIDO' || statusItem === 'FINALIZADO'
    })
  }, [usarEtapaProcedimento, agendamentoDetalhes, agendamentos])
  const statusExibicaoDetalhes = useMemo(() => {
    if (!agendamentoDetalhes) return undefined
    if (!usarEtapaProcedimento) return agendamentoDetalhes.status
    if (statusDetalhesNorm === 'PROCEDIMENTO_FIM') {
      if (bloqueadoPorOutroAtendimento) return 'EM_ATENDIMENTO_SINCRONIZADO'
      return agendamentoDetalhes.status
    }
    if (statusDetalhesNorm !== 'CONFIRMADO') return agendamentoDetalhes.status
    if (bloqueadoPorOutroAtendimento) return 'EM_ATENDIMENTO_SINCRONIZADO'
    if (existeProcedimentoFinalizadoNoGrupo) return 'AGUARDANDO_PROXIMO_PROCEDIMENTO'
    return agendamentoDetalhes.status
  }, [usarEtapaProcedimento, agendamentoDetalhes, statusDetalhesNorm, bloqueadoPorOutroAtendimento, existeProcedimentoFinalizadoNoGrupo])
  const podeExibirFinalizarAtendimento = usarEtapaProcedimento
    ? statusDetalhesNorm === 'PROCEDIMENTO_FIM' && !existeProcedimentoPendenteNoGrupo
    : statusDetalhesNorm === 'CONFIRMADO'
  const podeVoltarParaAgendado =
    statusDetalhesNorm === 'CONFIRMADO' &&
    !grupoConfirmadoTemSinal &&
    (!isLoadingPagamentoConfirmacao || !confirmadoComSinalLocal)
  const timelineCompletedSteps = getTimelineCompletedSteps(agendamentoDetalhes?.status, usarEtapaProcedimento)
  const etapa3Concluida =
    statusDetalhesNorm === 'PROCEDIMENTO_FIM' ||
    statusDetalhesNorm === 'CONCLUIDO' ||
    statusDetalhesNorm === 'FINALIZADO'
  const etapa3Ativa = statusDetalhesNorm === 'EM_ANDAMENTO' || bloqueadoPorOutroAtendimento
  const timelineStep3Label = 'Procedimento'
  const timelineProgressClass =
    usarEtapaProcedimento
      ? (
          timelineCompletedSteps === 1
            ? 'w-0'
            : timelineCompletedSteps === 2
              ? 'w-1/3'
              : timelineCompletedSteps === 3
                ? 'w-2/3'
                : 'w-full'
        )
      : (
          timelineCompletedSteps === 1
            ? 'w-0'
            : timelineCompletedSteps === 2
              ? 'w-1/2'
              : 'w-full'
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

  const profissionaisParaFiltro = useMemo(() => {
    if (!exibirFiltroProfissional) return []
    return profissionaisFiltroCalendario
      .filter((atendente) => {
        const perfilUsuario = (atendente.perfilUsuario ?? '').toUpperCase()
        return (perfilUsuario === 'PROFISSIONAL' || perfilUsuario === 'ATENDENTE') && typeof atendente.id === 'number'
      })
      .sort((a, b) => (a.nomeUsuario ?? '').localeCompare(b.nomeUsuario ?? '', 'pt-BR'))
  }, [profissionaisFiltroCalendario, exibirFiltroProfissional])

  const valorFiltroProfissionalSelect = useMemo(() => {
    if (typeof filtroProfissionalId === 'number') return String(filtroProfissionalId)
    const primeiroProfissionalId = profissionaisParaFiltro[0]?.id
    return typeof primeiroProfissionalId === 'number' ? String(primeiroProfissionalId) : ''
  }, [filtroProfissionalId, profissionaisParaFiltro])

  useEffect(() => {
    if (profissionaisParaFiltro.length === 0) {
      setFiltroProfissionalId(null)
      return
    }

    const existe = profissionaisParaFiltro.some((profissional) => profissional.id === filtroProfissionalId)
    if (!existe) {
      const primeiroProfissionalId = profissionaisParaFiltro[0]?.id
      if (typeof primeiroProfissionalId === 'number') {
        setFiltroProfissionalId(primeiroProfissionalId)
      }
    }
  }, [filtroProfissionalId, profissionaisParaFiltro])

  const agendamentosFiltrados = useMemo(() => {
    if (typeof filtroProfissionalId !== 'number') return agendamentos
    return agendamentos.filter((agendamento) => {
      const atendenteId =
        agendamento.atendenteId ??
        agendamento.atendente?.id ??
        agendamento.atendente?.atendenteId
      return Number(atendenteId) === filtroProfissionalId
    })
  }, [agendamentos, filtroProfissionalId])

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

  useEffect(() => {
    if (!criarModal || !exibirFiltroProfissional || typeof filtroProfissionalId !== 'number') return

    const profissionalSelecionadoFiltro = profissionaisParaFiltro.find(
      (profissional) => profissional.id === filtroProfissionalId
    )

    if (!profissionalSelecionadoFiltro) return

    setFormData((prev) => {
      const unidadeIdPadrao = prev.unidadeId ?? profissionalSelecionadoFiltro.unidadeId
      const atendenteIdPadrao = prev.atendenteId ?? profissionalSelecionadoFiltro.id

      if (prev.unidadeId === unidadeIdPadrao && prev.atendenteId === atendenteIdPadrao) {
        return prev
      }

      return {
        ...prev,
        unidadeId: unidadeIdPadrao,
        atendenteId: atendenteIdPadrao,
      }
    })
  }, [criarModal, exibirFiltroProfissional, filtroProfissionalId, profissionaisParaFiltro])

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
      setCancelarAgendamentoModal(null)
      setSalvandoObservacaoCancelamento(false)
      setAgendamentoDetalhes(null)
      showNotification('success', 'Agendamento cancelado com sucesso!', 2000)
    },
    onError: (error: unknown) => {
      setSalvandoObservacaoCancelamento(false)
      showNotification('error', getApiErrorMessage(error, 'Erro ao cancelar agendamento'))
    },
  })

  const excluirMutation = useMutation({
    mutationFn: (id: number) => agendamentoService.excluir(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['horariosDisponiveis'] })
      setExcluirAgendamentoModal(null)
      setAgendamentoDetalhes(null)
      setEditingAgendamento(null)
      showNotification('success', 'Agendamento excluído com sucesso!')
    },
    onError: (error: unknown) => {
      showNotification('error', getApiErrorMessage(error, 'Erro ao excluir agendamento'))
    },
  })

  const finalizarMutation = useMutation({
    mutationFn: async ({
      agendamentosParaFinalizar,
      formaPagamento,
    }: {
      agendamentosParaFinalizar: Agendamento[]
      formaPagamento: FormaPagamentoSinal
    }) => {
      const agendamentosAtualizados: Agendamento[] = []

      for (const agendamento of agendamentosParaFinalizar) {
        if (!agendamento.id) continue

        const agendamentoAtual = await agendamentoService.buscarPorId(agendamento.id)
        const statusAtual = (agendamentoAtual.status || '').toUpperCase()

        if (statusAtual === 'CONCLUIDO' || statusAtual === 'FINALIZADO') {
          agendamentosAtualizados.push(agendamentoAtual)
          continue
        }

        const valorRestante = calcularValorRestante(agendamentoAtual)
        const valorPagoAtual = Number(agendamentoAtual.valorFinal ?? 0)

        if (valorRestante <= 0 && valorPagoAtual <= 0) {
          continue
        }

        try {
          const atualizado = await agendamentoService.finalizar(agendamento.id, {
            valorFinal: valorRestante,
            tipoPagamento: formaPagamento,
          })
          agendamentosAtualizados.push(atualizado)
        } catch (error: unknown) {
          const mensagemErro = getApiErrorMessage(error, '').toLowerCase()
          if (mensagemErro.includes('já está concluído')) {
            const recarregado = await agendamentoService.buscarPorId(agendamento.id)
            agendamentosAtualizados.push(recarregado)
            continue
          }
          throw error
        }
      }

      return agendamentosAtualizados
    },
    onSuccess: async (agendamentosAtualizados) => {
      await queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      await queryClient.refetchQueries({ queryKey: ['agendamentos'], type: 'active' })
      setFinalizarModal(null)

      const atualizadosPorId = new Map(
        agendamentosAtualizados
          .filter((agendamento) => typeof agendamento.id === 'number')
          .map((agendamento) => [agendamento.id as number, agendamento])
      )

      setAgendamentoDetalhes((prev) => {
        if (!prev?.id) return prev
        const atualizado = atualizadosPorId.get(prev.id)
        if (!atualizado) return prev
        return { ...prev, ...atualizado }
      })

      if (agendamentosAtualizados.length > 1) {
        showNotification('success', 'Atendimentos finalizados com sucesso! As NFS-e serão emitidas automaticamente.', 2000)
      } else {
        showNotification('success', 'Agendamento finalizado! A nota fiscal será emitida automaticamente.', 2000)
      }
    },
    onError: (error: unknown) => {
      showNotification('error', getApiErrorMessage(error, 'Erro ao finalizar agendamento'))
    },
  })

  const noShowMutation = useMutation({
    mutationFn: async (agendamentoId: number) => {
      const agendamentoAtual =
        agendamentoDetalhes?.id === agendamentoId
          ? agendamentoDetalhes
          : agendamentos.find((item) => item.id === agendamentoId)
      const valorSinal = Number(agendamentoAtual?.valorFinal ?? pagamentoConfirmacao?.valor ?? 0)
      const possuiSinal = valorSinal > 0

      await agendamentoService.atualizarStatus(agendamentoId, 'NO_SHOW')
      if (possuiSinal) {
        await agendamentoService.emitirNotaFiscal(agendamentoId)
      }

      return { possuiSinal, valorSinal }
    },
    onSuccess: ({ possuiSinal, valorSinal }) => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['horariosDisponiveis'] })
      queryClient.invalidateQueries({ queryKey: ['pagamento', 'agendamento'] })
      setNoShowModal(null)
      setAgendamentoDetalhes(null)
      if (possuiSinal) {
        showNotification(
          'success',
          `Agendamento marcado como não comparecimento. Nota em emissão no valor de ${moneyFormatter.format(valorSinal)}.`,
          2000
        )
      } else {
        showNotification('success', 'Agendamento marcado como não comparecimento.', 2000)
      }
    },
    onError: (error: unknown) => {
      showNotification('error', getApiErrorMessage(error, 'Erro ao marcar não comparecimento'))
    },
  })

  const confirmarMutation = useMutation({
    mutationFn: async (params: {
      agendamentoId: number
      comSinal: boolean
      valorSinal: number
      formaPagamento: FormaPagamentoSinal
      dataPagamento: string
    }) => {
      if (params.comSinal && params.valorSinal > 0) {
        await pagamentoService.registrarPorAgendamento(params.agendamentoId, {
          tipoPagamento: params.formaPagamento,
          valor: params.valorSinal,
          dataPagamento: params.dataPagamento,
        })
      }

      return agendamentoService.atualizarStatus(params.agendamentoId, 'CONFIRMADO')
    },
    onSuccess: (agendamentoAtualizado) => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['horariosDisponiveis'] })
      setConfirmarModal(null)
      setAgendamentoDetalhes((prev) => {
        if (!prev || !agendamentoAtualizado?.id || prev.id !== agendamentoAtualizado.id) return prev
        return { ...prev, ...agendamentoAtualizado }
      })
      showNotification('success', 'Status sincronizado para confirmado.', 2000)
    },
    onError: (error: unknown) => {
      showNotification('error', getApiErrorMessage(error, 'Erro ao confirmar agendamento'))
    },
  })

  const ajustarPagamentoMutation = useMutation({
    mutationFn: async (params: {
      agendamentoId: number
      removerValor: boolean
      valorAjuste: number
      formaPagamento: FormaPagamentoSinal
      dataPagamento: string
      novoTotalPago: number
    }) => {
      await pagamentoService.ajustarPorAgendamento(
        params.agendamentoId,
        {
          tipoPagamento: params.formaPagamento,
          valorAjuste: params.valorAjuste,
          dataPagamento: params.dataPagamento,
        },
        params.removerValor
      )
      return params
    },
    onSuccess: (params) => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['pagamento', 'agendamento', params.agendamentoId] })
      setAjustePagamentoModal(null)
      setAgendamentoDetalhes((prev) => {
        if (!prev || prev.id !== params.agendamentoId) return prev
        return {
          ...prev,
          valorFinal: params.novoTotalPago > 0 ? params.novoTotalPago : undefined,
        }
      })
      showNotification('success', 'Total pago ajustado com sucesso.')
    },
    onError: (error: unknown) => {
      showNotification('error', getApiErrorMessage(error, 'Erro ao ajustar total pago'))
    },
  })

  const voltarParaAgendadoMutation = useMutation({
    mutationFn: (id: number) => agendamentoService.atualizarStatus(id, 'AGENDADO'),
    onSuccess: (agendamentoAtualizado) => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['horariosDisponiveis'] })
      setAgendamentoDetalhes((prev) => {
        if (!prev || !agendamentoAtualizado?.id || prev.id !== agendamentoAtualizado.id) return prev
        return { ...prev, ...agendamentoAtualizado }
      })
      showNotification('success', 'Status sincronizado para agendado.', 2000)
    },
    onError: (error: unknown) => {
      showNotification('error', getApiErrorMessage(error, 'Erro ao voltar status para agendado'))
    },
  })

  const iniciarProcedimentoMutation = useMutation({
    mutationFn: (id: number) => agendamentoService.atualizarStatus(id, 'EM_ANDAMENTO'),
    onSuccess: async (agendamentoAtualizado) => {
      await queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      await queryClient.refetchQueries({ queryKey: ['agendamentos'], type: 'active' })
      await queryClient.invalidateQueries({ queryKey: ['horariosDisponiveis'] })
      setAgendamentoDetalhes((prev) => {
        if (!prev || !agendamentoAtualizado?.id || prev.id !== agendamentoAtualizado.id) return prev
        return { ...prev, ...agendamentoAtualizado }
      })
      showNotification('success', 'Procedimento iniciado com sucesso.', 2000)
    },
    onError: (error: unknown) => {
      showNotification('error', getApiErrorMessage(error, 'Erro ao iniciar procedimento'))
    },
  })

  const finalizarProcedimentoMutation = useMutation({
    mutationFn: (id: number) => agendamentoService.atualizarStatus(id, 'PROCEDIMENTO_FIM'),
    onSuccess: async (agendamentoAtualizado) => {
      await queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      await queryClient.refetchQueries({ queryKey: ['agendamentos'], type: 'active' })
      await queryClient.invalidateQueries({ queryKey: ['horariosDisponiveis'] })
      setAgendamentoDetalhes((prev) => {
        if (!prev || !agendamentoAtualizado?.id || prev.id !== agendamentoAtualizado.id) return prev
        return { ...prev, ...agendamentoAtualizado }
      })
      showNotification('success', 'Procedimento finalizado com sucesso.', 2000)
    },
    onError: (error: unknown) => {
      showNotification('error', getApiErrorMessage(error, 'Erro ao finalizar procedimento'))
    },
  })

  const createMutation = useMutation({
    mutationFn: agendamentoService.criar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['horariosDisponiveis'] })
      resetCreateModal()
      showNotification('success', 'Agendamento criado com sucesso!', 2000)
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
    onSuccess: (agendamentoAtualizado) => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['horariosDisponiveis'] })
      setEditingAgendamento(null)
      if (reabrirDetalhesPosEdicao) {
        setAgendamentoDetalhes(agendamentoAtualizado)
        setReabrirDetalhesPosEdicao(false)
      } else {
        setAgendamentoDetalhes(null)
      }
      showNotification('success', 'Agendamento atualizado com sucesso!')
    },
    onError: (error: unknown) => {
      showNotification('error', getApiErrorMessage(error, 'Erro ao atualizar agendamento'))
    },
  })

  const atualizarObservacaoMutation = useMutation({
    mutationFn: ({ id, observacoes }: { id: number; observacoes: string }) =>
      agendamentoService.atualizarObservacao(id, observacoes),
    onSuccess: (agendamentoAtualizado) => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['horariosDisponiveis'] })
      setEditarObservacaoModal(null)
      setAgendamentoDetalhes((prev) => {
        if (!prev || !agendamentoAtualizado?.id || prev.id !== agendamentoAtualizado.id) return prev
        return { ...prev, observacoes: agendamentoAtualizado.observacoes }
      })
      showNotification('success', 'Observação atualizada com sucesso!')
    },
    onError: (error: unknown) => {
      showNotification('error', getApiErrorMessage(error, 'Erro ao atualizar observação'))
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

  const abrirModalConfirmacao = (agendamento: Agendamento) => {
    if (!agendamento.id) return
    setConfirmarModal({
      agendamentoId: agendamento.id,
      comSinal: true,
      valorSinal: moneyFormatter.format(0).replace(/\u00A0/g, ' '),
      formaPagamento: 'PIX',
      dataPagamento: format(new Date(), 'yyyy-MM-dd'),
      touchedValorSinal: false,
    })
  }

  const abrirModalAjustePagamento = (agendamento: Agendamento) => {
    if (!agendamento.id) return
    const tipoPagamentoInicial = normalizeFormaPagamento(pagamentoConfirmacao?.tipoPagamento)
    const dataPagamentoAtual =
      pagamentoConfirmacao?.dataPagamento && pagamentoConfirmacao.dataPagamento.length >= 10
        ? pagamentoConfirmacao.dataPagamento.slice(0, 10)
        : format(new Date(), 'yyyy-MM-dd')
    const valorAtualPago = Number(agendamento.valorFinal ?? 0)
    setAjustePagamentoModal({
      agendamentoId: agendamento.id,
      valor: moneyFormatter.format(valorAtualPago).replace(/\u00A0/g, ' '),
      formaPagamento: tipoPagamentoInicial,
      dataPagamento: dataPagamentoAtual,
    })
  }

  const abrirWhatsAppCliente = (agendamento: Agendamento) => {
    const telefoneRaw = String(agendamento.cliente?.telefone || '')
    const telefoneNumerico = telefoneRaw.replace(/\D/g, '')

    if (!telefoneNumerico) {
      showNotification('error', 'Cliente sem telefone cadastrado.')
      return
    }

    const telefoneComPais =
      telefoneNumerico.length <= 11 && !telefoneNumerico.startsWith('55')
        ? `55${telefoneNumerico}`
        : telefoneNumerico

    const url = `https://wa.me/${telefoneComPais}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const confirmarAgendamento = () => {
    if (!confirmarModal) return
    if (confirmarModal.comSinal && valorSinalConfirmacao < 1) {
      setConfirmarModal((prev) => (prev ? { ...prev, touchedValorSinal: true } : prev))
      showNotification('error', 'Pagamento mínimo é R$ 1,00')
      return
    }
    confirmarMutation.mutate({
      agendamentoId: confirmarModal.agendamentoId,
      comSinal: confirmarModal.comSinal,
      valorSinal: valorSinalConfirmacao,
      formaPagamento: confirmarModal.formaPagamento,
      dataPagamento: confirmarModal.dataPagamento,
    })
  }

  const calcularValorRestante = (agendamento: Agendamento): number => {
    const valorTotal = agendamento.valorTotal || 0
    const valorPago = agendamento.valorFinal || 0
    return Math.max(valorTotal - valorPago, 0)
  }

  const confirmarFinalizar = () => {
    if (!finalizarModal) return

    const agendamentosParaFinalizar = agendamentosFinalizacaoGrupo.filter((agendamento) => {
      if (!agendamento.id) return false
      const status = (agendamento.status || '').toUpperCase()
      return status !== 'CANCELADO' && status !== 'NO_SHOW'
    })

    if (agendamentosParaFinalizar.length === 0) {
      showNotification('error', 'Não há agendamentos pendentes para finalizar.')
      return
    }

    finalizarMutation.mutate({
      agendamentosParaFinalizar,
      formaPagamento: finalizarModal.formaPagamento,
    })
  }

  const salvarObservacao = () => {
    if (!editarObservacaoModal) return
    atualizarObservacaoMutation.mutate({
      id: editarObservacaoModal.agendamentoId,
      observacoes: editarObservacaoModal.texto,
    })
  }

  const confirmarCancelamentoComObservacao = async () => {
    if (!cancelarAgendamentoModal) return

    const observacaoCancelamento = cancelarAgendamentoModal.texto.trim()
    const agendamentoId = cancelarAgendamentoModal.agendamentoId
    const devolveuSinal = cancelarAgendamentoModal.devolveuSinal
    const valorSinalAtual = Number(
      (agendamentoCancelamento?.id === agendamentoId ? agendamentoCancelamento?.valorFinal : undefined) ??
      (agendamentoDetalhes?.id === agendamentoId ? agendamentoDetalhes?.valorFinal : undefined) ??
      pagamentoConfirmacao?.valor ??
      0
    )

    setSalvandoObservacaoCancelamento(true)
    try {
      if (devolveuSinal && valorSinalAtual > 0) {
        const tipoPagamento = normalizeFormaPagamento(pagamentoConfirmacao?.tipoPagamento)
        const dataPagamento =
          pagamentoConfirmacao?.dataPagamento && pagamentoConfirmacao.dataPagamento.length >= 10
            ? pagamentoConfirmacao.dataPagamento.slice(0, 10)
            : format(new Date(), 'yyyy-MM-dd')

        await pagamentoService.ajustarPorAgendamento(
          agendamentoId,
          {
            tipoPagamento,
            valorAjuste: valorSinalAtual,
            dataPagamento,
          },
          true
        )
        queryClient.invalidateQueries({ queryKey: ['pagamento', 'agendamento', agendamentoId] })
      }

      const observacaoAtual = agendamentoDetalhes?.id === agendamentoId
        ? agendamentoDetalhes.observacoes?.trim() || ''
        : ''
      const linhasCancelamento: string[] = []
      if (observacaoCancelamento) linhasCancelamento.push(`Cancelamento: ${observacaoCancelamento}`)
      linhasCancelamento.push(`Devolução do sinal: ${devolveuSinal ? 'Sim' : 'Não'}`)
      const blocoCancelamento = linhasCancelamento.join('\n')
      const novaObservacao = observacaoAtual
        ? `${observacaoAtual}\n${blocoCancelamento}`
        : blocoCancelamento

      await agendamentoService.atualizarObservacao(agendamentoId, novaObservacao)
    } catch (error: unknown) {
      setSalvandoObservacaoCancelamento(false)
      showNotification('error', getApiErrorMessage(error, 'Erro ao salvar dados do cancelamento'))
      return
    }

    cancelarMutation.mutate(agendamentoId)
  }

  const confirmarAjustePagamento = () => {
    if (!ajustePagamentoModal || !agendamentoAjustePagamento?.id) return

    const totalPagoAtualCents = Math.round(totalPagoAtualAjuste * 100)
    const totalServicoCents = Math.round(totalServicoAjuste * 100)
    const totalAposAjusteCents = Math.round(Math.max(totalAposAjuste, 0) * 100)

    if (totalAposAjusteCents > totalServicoCents) {
      const restante = Math.max((totalServicoCents - totalPagoAtualCents) / 100, 0)
      showNotification('error', `Valor excede o restante do agendamento: ${moneyFormatter.format(restante)}.`)
      return
    }

    if (totalAposAjusteCents < 0) {
      showNotification('error', 'Valor inválido.')
      return
    }

    const removerValor = totalAposAjusteCents < totalPagoAtualCents
    const valorAjuste = Math.abs(totalAposAjusteCents - totalPagoAtualCents) / 100
    const novoTotalPago = totalAposAjusteCents / 100

    ajustarPagamentoMutation.mutate({
      agendamentoId: agendamentoAjustePagamento.id,
      removerValor,
      valorAjuste,
      formaPagamento: ajustePagamentoModal.formaPagamento,
      dataPagamento: ajustePagamentoModal.dataPagamento,
      novoTotalPago,
    })
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
    }))
  }

  const handleHoraCriacaoChange = (novaHora: string) => {
    if (!novaHora) return
    const dataAtual = format(dataHoraCriacao, 'yyyy-MM-dd')
    setFormData((prev) => ({
      ...prev,
      dataHoraInicio: `${dataAtual}T${novaHora}`,
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
    }))
  }

  const handleHoraEdicaoChange = (novaHora: string) => {
    if (!novaHora) return
    const dataAtual = format(dataHoraEdicao, 'yyyy-MM-dd')
    setEditFormData((prev) => ({
      ...prev,
      dataHoraInicio: `${dataAtual}T${novaHora}`,
    }))
  }

  const abrirPickerNativo = (input: HTMLInputElement) => {
    const picker = input as HTMLInputElement & { showPicker?: () => void }
    if (typeof picker.showPicker === 'function') {
      try {
        picker.showPicker()
      } catch {
        // Alguns navegadores podem bloquear a chamada; nesses casos mantém o comportamento nativo.
      }
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden px-2 sm:px-0">
      <div className="space-y-3">
        <div className="rounded-[28px] border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-2 shadow-sm sm:p-2.5 lg:p-3">
          <div className="mb-1.5 flex flex-col gap-1.5 px-1 sm:px-1.5 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {viewMode === 'timeline' ? 'Visão diária em linha do tempo' : 'Visão de calendário'}
            </h2>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              {exibirFiltroProfissional && (
                <div className="relative min-w-[190px] sm:min-w-[220px]">
                  <select
                    value={valorFiltroProfissionalSelect}
                    onChange={(e) => {
                      const idSelecionado = Number(e.target.value)
                      if (!Number.isNaN(idSelecionado)) {
                        setFiltroProfissionalId(idSelecionado)
                      }
                    }}
                    className="h-9 w-full appearance-none rounded-xl border border-slate-200 bg-white py-1.5 pl-3 pr-9 text-sm text-slate-700 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                    disabled={profissionaisParaFiltro.length === 0}
                  >
                    {profissionaisParaFiltro.length === 0 && (
                      <option value="">Sem profissionais</option>
                    )}
                    {profissionaisParaFiltro.map((profissional) => (
                      <option key={profissional.id} value={profissional.id}>
                        {profissional.nomeUsuario || `Profissional #${profissional.id}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              )}
              <div className="inline-flex rounded-2xl border border-slate-200/80 bg-white/85 p-1 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.45)] backdrop-blur">
                <button
                  onClick={() => setViewMode('timeline')}
                  type="button"
                  title="Linha do tempo"
                  aria-label="Linha do tempo"
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ${
                    viewMode === 'timeline'
                      ? 'bg-slate-900 text-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.9)]'
                      : 'text-slate-500 hover:bg-slate-100/90 hover:text-slate-900'
                  }`}
                >
                  <List className="h-5 w-5" strokeWidth={2.3} />
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  type="button"
                  title="Calendário"
                  aria-label="Calendário"
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ${
                    viewMode === 'calendar'
                      ? 'bg-slate-900 text-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.9)]'
                      : 'text-slate-500 hover:bg-slate-100/90 hover:text-slate-900'
                  }`}
                >
                  <CalendarDays className="h-5 w-5" strokeWidth={2.3} />
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
                  className="h-11 w-full rounded-2xl border border-blue-400/20 bg-gradient-to-r from-blue-600 to-cyan-500 px-0 text-sm font-semibold shadow-[0_14px_34px_-20px_rgba(37,99,235,0.9)] hover:from-blue-700 hover:to-cyan-600 sm:h-9 sm:w-9"
                >
                  <Plus className="h-6 w-6" strokeWidth={2.5} />
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
                  agendamentos={agendamentosFiltrados}
                />
              </div>

              <div className="min-w-0 overflow-hidden">
                <TimelineView
                  agendamentos={agendamentosFiltrados}
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
                  agendamentos={agendamentosFiltrados}
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
                    <div className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                    Agendado
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm text-slate-700">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    Confirmado
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-slate-700">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    Finalizado
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-sm text-slate-700">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    Cancelado
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-sm text-slate-700">
                    <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                    Nao compareceu
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
                    <input
                      type="date"
                      value={format(dataHoraCriacao, 'yyyy-MM-dd')}
                      onChange={(e) => handleDataCriacaoChange(e.target.value)}
                      onClick={(e) => abrirPickerNativo(e.currentTarget)}
                      className={headerDateInputClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Hora Início</label>
                    <TimeWheelInput
                      value={format(dataHoraCriacao, 'HH:mm')}
                      onChange={handleHoraCriacaoChange}
                      className={headerTimeInputClass}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-3.5 px-4 py-4 sm:px-5">
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
                        const currentTarget = e.currentTarget
                        requestAnimationFrame(() => {
                          if (!currentTarget.contains(document.activeElement)) {
                            setClienteFieldActive(false)
                          }
                        })
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
                            onMouseDown={(e) => {
                              e.preventDefault()
                              abrirModalCliente('create')
                            }}
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
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="px-0.5 text-sm text-amber-800">Cliente não encontrado.</p>
                          <Button
                            type="button"
                            variant="success"
                            size="sm"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              abrirModalCliente('create', buscaCliente)
                            }}
                            className="mt-2 w-full rounded-lg py-2.5 font-semibold uppercase tracking-wide"
                          >
                            Adicionar cliente
                          </Button>
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
                      const currentTarget = e.currentTarget
                      requestAnimationFrame(() => {
                        if (!currentTarget.contains(document.activeElement)) {
                          setServicoFieldActive(false)
                        }
                      })
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
                          onMouseDown={(e) => {
                            e.preventDefault()
                            abrirModalServico('create')
                          }}
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
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                              <p className="px-0.5 text-sm text-amber-800">Serviço não encontrado.</p>
                              {podeEditarServicos && (
                                <Button
                                  type="button"
                                  variant="success"
                                  size="sm"
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    abrirModalServico('create', buscaServico)
                                  }}
                                  className="mt-2 w-full rounded-lg py-2.5 font-semibold uppercase tracking-wide"
                                >
                                  Adicionar serviço
                                </Button>
                              )}
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
                  className="rounded-xl bg-blue-600 px-5 py-2 hover:bg-blue-700"
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
          onClose={() => {
            setAgendamentoDetalhes(null)
            setExcluirAgendamentoModal(null)
            setEditarObservacaoModal(null)
            setCancelarAgendamentoModal(null)
          }}
          title="Detalhes do Agendamento"
          size="md"
          showCloseButton={false}
          panelClassName={getDetalhesModalPanelBorderClass(agendamentoDetalhes.status)}
          headerClassName="px-5 py-1.5 sm:px-6 sm:py-2"
          bodyClassName="overflow-y-auto px-6 pt-6 pb-0"
          headerContent={
            <div className="flex w-full items-center justify-center gap-4">
              {podeEditarAgendamentos && (perfilNorm === 'ADMIN' || perfilNorm === 'GERENTE' || perfilNorm === 'PROFISSIONAL' || perfilNorm === 'ATENDENTE' || isCliente) && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirWhatsAppCliente(agendamentoDetalhes)}
                    className="flex min-w-[78px] flex-col items-center justify-center gap-0.5 rounded-xl bg-transparent px-2 py-1.5 text-sm font-semibold leading-none !text-emerald-600 shadow-none transition hover:-translate-y-0.5 hover:bg-emerald-50 hover:!text-emerald-700"
                  >
                    <span className="flex h-6 w-6 items-center justify-center">
                      <WhatsAppIcon className="h-5 w-5" />
                    </span>
                    <span className="leading-none">WhatsApp</span>
                  </Button>
                  {!isAgendamentoEncerrado(agendamentoDetalhes.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReabrirDetalhesPosEdicao(true)
                        setEditingAgendamento(agendamentoDetalhes)
                        setAgendamentoDetalhes(null)
                      }}
                      className="flex min-w-[78px] flex-col items-center justify-center gap-0.5 rounded-xl bg-transparent px-2 py-1.5 text-sm font-semibold leading-none !text-blue-600 shadow-none transition hover:-translate-y-0.5 hover:bg-blue-50 hover:!text-blue-700"
                    >
                      <span className="flex h-6 w-6 items-center justify-center">
                        <Pencil className="h-5 w-5" />
                      </span>
                      <span className="leading-none">Editar</span>
                    </Button>
                  )}
                  {agendamentoDetalhes.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const valorSinal = Number(
                          agendamentoDetalhes.valorFinal ?? pagamentoConfirmacao?.valor ?? 0
                        )
                        setExcluirAgendamentoModal({
                          agendamentoId: agendamentoDetalhes.id!,
                          valorSinal,
                        })
                      }}
                      disabled={excluirMutation.isPending}
                      isLoading={excluirMutation.isPending}
                      className="flex min-w-[78px] flex-col items-center justify-center gap-0.5 rounded-xl bg-transparent px-2 py-1.5 text-sm font-semibold leading-none !text-rose-600 shadow-none transition hover:-translate-y-0.5 hover:bg-rose-50 hover:!text-rose-700"
                    >
                      <span className="flex h-6 w-6 items-center justify-center">
                        <Trash2 className="h-5 w-5" />
                      </span>
                      <span className="leading-none">Deletar</span>
                    </Button>
                  )}
                </>
              )}
            </div>
          }
        >
          <div className="space-y-0">
            <div className="-mx-6 -mt-3 bg-white px-6 pt-0.5 pb-0.5">
              <div className="relative">
                <div className="absolute left-6 right-6 top-3.5 h-0.5 rounded-full bg-slate-200" />
                <div className={`absolute left-6 top-3.5 h-0.5 rounded-full bg-blue-600 transition-all ${timelineProgressClass}`} />

                <div className={`relative grid ${usarEtapaProcedimento ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  <div className="flex flex-col items-center text-center">
                    <div className={`z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-sm ${
                      timelineCompletedSteps >= 1
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      {timelineCompletedSteps >= 1 ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-sm font-semibold">1</span>
                      )}
                    </div>
                    <span className={`mt-0.5 text-sm font-medium ${
                      timelineCompletedSteps >= 1 ? 'text-slate-700' : 'text-slate-500'
                    }`}>Agendado</span>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className={`z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-sm ${
                      timelineCompletedSteps >= 2
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      {timelineCompletedSteps >= 2 ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-sm font-semibold">2</span>
                      )}
                    </div>
                    <span className={`mt-0.5 text-sm font-medium ${
                      timelineCompletedSteps >= 2 ? 'text-slate-700' : 'text-slate-500'
                    }`}>Confirmado</span>
                  </div>

                  {usarEtapaProcedimento && (
                    <div className="flex flex-col items-center text-center">
                      <div className={`z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-sm ${
                        etapa3Concluida
                          ? 'bg-emerald-500 text-white'
                          : etapa3Ativa
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                      }`}>
                        {etapa3Concluida ? (
                          <Check className="h-4 w-4" />
                        ) : etapa3Ativa ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <span className="text-sm font-semibold">3</span>
                        )}
                      </div>
                      <span className={`mt-0.5 text-sm font-medium ${
                        etapa3Concluida || etapa3Ativa ? 'text-slate-700' : 'text-slate-500'
                      }`}>{timelineStep3Label}</span>
                    </div>
                  )}

                  <div className="flex flex-col items-center text-center">
                    <div className={`z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-sm ${
                      timelineCompletedSteps >= (usarEtapaProcedimento ? 4 : 3)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      {timelineCompletedSteps >= (usarEtapaProcedimento ? 4 : 3) ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-sm font-semibold">{usarEtapaProcedimento ? '4' : '3'}</span>
                      )}
                    </div>
                    <span className={`mt-0.5 text-sm font-medium ${
                      timelineCompletedSteps >= (usarEtapaProcedimento ? 4 : 3) ? 'text-slate-700' : 'text-slate-500'
                    }`}>Finalizado</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50 shadow-sm">
              <div className="space-y-4 px-4 py-4 sm:px-5">
                {(() => {
                  const inicio = parseISO(agendamentoDetalhes.dataHoraInicio)
                  const fimCalculado = agendamentoDetalhes.dataHoraFim
                    ? parseISO(agendamentoDetalhes.dataHoraFim)
                    : new Date(inicio.getTime() + 30 * 60 * 1000)
                  const fim = Number.isNaN(fimCalculado.getTime())
                    ? new Date(inicio.getTime() + 30 * 60 * 1000)
                    : fimCalculado
                  const horario = `${format(inicio, 'HH:mm')} - ${format(fim, 'HH:mm')}`
                  const telefoneClienteRaw = agendamentoDetalhes.cliente?.telefone || ''
                  const telefoneCliente = telefoneClienteRaw
                    ? maskPhone(String(telefoneClienteRaw))
                    : agendamentoDetalhes.cliente?.cpfCnpj || ''
                  const procedimentos = (agendamentoDetalhes.servicos || [])
                    .map((servico) => servico.descricao?.trim())
                    .filter((descricao): descricao is string => Boolean(descricao))
                  const observacao = agendamentoDetalhes.observacoes?.trim() || '-'
                  const totalPago = agendamentoDetalhes.valorFinal || 0
                  const totalAgendamento = agendamentoDetalhes.valorTotal || 0
                  const totalDevendo = Math.max(totalAgendamento - totalPago, 0)
                  const totalPagoClicavel = !isCliente && (agendamentoDetalhes.status || '').toUpperCase() === 'CONFIRMADO'
                  const mostrarSetaTotalPago = totalPagoClicavel

                  return (
                    <>
                      <div className="flex items-center gap-4 rounded-lg px-2 py-2">
                        <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-blue-600 text-white">
                          <Clock className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm leading-snug font-semibold text-slate-800">{horario}</p>
                          <p className="mt-1 text-xs text-slate-700">{formatarDataDetalhe(inicio)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 rounded-lg px-2 py-2">
                        <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-blue-600 text-white">
                          <UserRound className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm leading-snug font-semibold text-slate-800">
                            {agendamentoDetalhes.cliente?.nome || 'Cliente não informado'}
                          </p>
                          {telefoneCliente && (
                            <p className="mt-1 text-xs font-medium text-blue-700">{telefoneCliente}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 rounded-lg px-2 py-2">
                        <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-blue-600 text-white">
                          <BriefcaseBusiness className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          {procedimentos.length > 0 ? (
                            <p className="text-sm leading-snug font-semibold text-slate-800">
                              {procedimentos.join(', ')}
                            </p>
                          ) : (
                            <p className="text-sm leading-snug font-semibold text-slate-800">Serviço não informado</p>
                          )}
                          <p className="mt-1 text-xs text-slate-700">{moneyFormatter.format(agendamentoDetalhes.valorTotal || 0)}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!agendamentoDetalhes.id) return
                          setEditarObservacaoModal({
                            agendamentoId: agendamentoDetalhes.id,
                            texto: agendamentoDetalhes.observacoes ?? '',
                          })
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition ${
                          agendamentoDetalhes.id
                            ? 'hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200'
                            : 'cursor-default'
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-4">
                          <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-blue-600 text-white">
                            <MessageCircle className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800">Observação</p>
                            <p className="mt-0.5 truncate text-sm text-slate-700">{observacao}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 flex-none text-blue-700" />
                      </button>

                      <div className="flex items-center justify-between rounded-lg px-2 py-2">
                        <div className="min-w-0 flex items-center gap-4">
                          <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-blue-600 text-white">
                            <Tag className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800">Status</p>
                            <span className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getAgendamentoStatusBadgeClass(statusExibicaoDetalhes)}`}>
                              {getAgendamentoStatusLabel(
                                statusExibicaoDetalhes,
                                statusExibicaoDetalhes === 'EM_ATENDIMENTO_SINCRONIZADO'
                                  ? nomeProfissionalConflitante
                                  : (agendamentoDetalhes.atendente?.nomeUsuario || agendamentoDetalhes.atendente?.nome),
                                procedimentos.length > 0 ? procedimentos.join(', ') : undefined
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {totalPagoClicavel ? (
                        <button
                          type="button"
                          onClick={() => abrirModalAjustePagamento(agendamentoDetalhes)}
                          className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                          <div className="min-w-0 flex items-center gap-4">
                            <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-blue-600 text-white">
                              <HandCoins className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800">Total Pago</p>
                              <p className="mt-0.5 text-sm text-slate-700">
                                {moneyFormatter.format(totalPago)} (Devendo: {moneyFormatter.format(totalDevendo)})
                              </p>
                            </div>
                          </div>
                          {mostrarSetaTotalPago && (
                            <ChevronRight className="h-5 w-5 flex-none text-blue-700" />
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center justify-between rounded-lg px-2 py-2">
                          <div className="min-w-0 flex items-center gap-4">
                            <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-blue-600 text-white">
                              <HandCoins className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800">Total Pago</p>
                              <p className="mt-0.5 text-sm text-slate-700">
                                {moneyFormatter.format(totalPago)} (Devendo: {moneyFormatter.format(totalDevendo)})
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>

              <div className="border-t border-slate-200 px-4 py-3 sm:px-5">
                <div className="space-y-2">
                  {podeEditarAgendamentos &&
                    (perfilNorm === 'ADMIN' ||
                      perfilNorm === 'GERENTE' ||
                      perfilNorm === 'PROFISSIONAL' ||
                      perfilNorm === 'ATENDENTE' ||
                      isCliente) && (
                      <>
                        {!isCliente && usarEtapaProcedimento && statusDetalhesNorm === 'CONFIRMADO' && (
                          <div className="flex justify-center">
                            {bloqueadoPorOutroAtendimento ? (
                              <Button
                                variant="secondary"
                                disabled
                                className="h-10 w-full whitespace-nowrap rounded-xl border border-blue-200 bg-blue-50 px-5 text-sm text-blue-700 sm:w-[260px]"
                              >
                                Em atendimento
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                onClick={() => {
                                  if (!agendamentoDetalhes.id) return
                                  iniciarProcedimentoMutation.mutate(agendamentoDetalhes.id)
                                }}
                                disabled={iniciarProcedimentoMutation.isPending}
                                isLoading={iniciarProcedimentoMutation.isPending}
                                className="h-10 w-full whitespace-nowrap rounded-xl px-5 text-sm sm:w-[260px]"
                              >
                                Iniciar procedimento
                              </Button>
                            )}
                          </div>
                        )}
                        {!isCliente && usarEtapaProcedimento && statusDetalhesNorm === 'CONFIRMADO' && bloqueadoPorOutroAtendimento && (
                          <p className="-mt-0.5 text-center text-xs font-medium text-blue-700">
                            Em atendimento por {nomeProfissionalConflitante}
                          </p>
                        )}
                        {!isCliente && usarEtapaProcedimento && statusDetalhesNorm === 'CONFIRMADO' && (
                          <div className="my-1 w-full border-t border-slate-200" />
                        )}

                        <div className="flex flex-nowrap items-center justify-center gap-2">
                      {!isAgendamentoEncerrado(agendamentoDetalhes.status) && (
                        <>
                          {!isCliente && statusDetalhesNorm === 'AGENDADO' && (
                            <Button
                              variant="primary"
                              onClick={() => {
                                abrirModalConfirmacao(agendamentoDetalhes)
                              }}
                              className="h-10 min-w-[96px] whitespace-nowrap rounded-xl bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                            >
                              Confirmar
                            </Button>
                          )}
                          {!isCliente &&
                            statusDetalhesNorm === 'CONFIRMADO' &&
                            !bloqueadoPorOutroAtendimento &&
                            !existeProcedimentoFinalizadoNoGrupo && (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                if (!agendamentoDetalhes.id) return
                                setNoShowModal({ agendamentoId: agendamentoDetalhes.id })
                              }}
                              disabled={noShowMutation.isPending}
                              isLoading={noShowMutation.isPending}
                              className="h-10 min-w-[122px] whitespace-nowrap rounded-xl bg-orange-500 px-3 text-sm font-medium text-white hover:bg-orange-600"
                            >
                              Não compareceu
                            </Button>
                          )}
                          {statusDetalhesNorm !== 'EM_ANDAMENTO' && statusDetalhesNorm !== 'PROCEDIMENTO_FIM' && !bloqueadoPorOutroAtendimento && (
                            <Button
                              variant="danger"
                              onClick={() => {
                                if (!agendamentoDetalhes.id) return
                                setCancelarAgendamentoModal({
                                  agendamentoId: agendamentoDetalhes.id,
                                  texto: '',
                                  devolveuSinal: false,
                                })
                              }}
                              disabled={cancelarMutation.isPending || salvandoObservacaoCancelamento}
                              isLoading={cancelarMutation.isPending || salvandoObservacaoCancelamento}
                              className="h-10 min-w-[96px] whitespace-nowrap rounded-xl bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700"
                            >
                              Cancelar
                            </Button>
                          )}
                          {!isCliente &&
                            podeVoltarParaAgendado &&
                            !bloqueadoPorOutroAtendimento &&
                            !existeProcedimentoFinalizadoNoGrupo && (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                if (!agendamentoDetalhes.id) return
                                voltarParaAgendadoMutation.mutate(agendamentoDetalhes.id)
                              }}
                              disabled={voltarParaAgendadoMutation.isPending}
                              isLoading={voltarParaAgendadoMutation.isPending}
                              className="h-10 min-w-[96px] whitespace-nowrap rounded-xl bg-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-300"
                            >
                              Voltar
                            </Button>
                          )}
                        </>
                      )}
                      {!isCliente && usarEtapaProcedimento && statusDetalhesNorm === 'EM_ANDAMENTO' && (
                        <Button
                          variant="primary"
                          onClick={() => {
                            if (!agendamentoDetalhes.id) return
                            finalizarProcedimentoMutation.mutate(agendamentoDetalhes.id)
                          }}
                          disabled={finalizarProcedimentoMutation.isPending}
                          isLoading={finalizarProcedimentoMutation.isPending}
                          className="h-10 min-w-[140px] whitespace-nowrap rounded-xl bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          Finalizar procedimento
                        </Button>
                      )}
                      {!isCliente && podeExibirFinalizarAtendimento && (
                        <Button
                          variant="success"
                          onClick={() => {
                            setFinalizarModal({
                              agendamento: agendamentoDetalhes,
                              formaPagamento: normalizeFormaPagamento(pagamentoConfirmacao?.tipoPagamento),
                            })
                          }}
                          className="h-10 min-w-[106px] whitespace-nowrap rounded-xl bg-green-600 px-3 text-sm font-medium text-white hover:bg-green-700"
                        >
                          Finalizar
                        </Button>
                      )}
                      {!isCliente && usarEtapaProcedimento && statusDetalhesNorm === 'PROCEDIMENTO_FIM' && existeProcedimentoPendenteNoGrupo && (
                        <p className="w-full text-center text-xs font-medium text-slate-500">
                          Aguardando finalização dos outros procedimentos para liberar o atendimento.
                        </p>
                      )}
                        </div>
                      </>
                    )}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {editarObservacaoModal && (
        <Modal
          isOpen={true}
          onClose={() => setEditarObservacaoModal(null)}
          title="Editar Observação"
          size="sm"
        >
          <div className="space-y-4">
            <FormField label="Observação">
              <textarea
                value={editarObservacaoModal.texto}
                onChange={(e) =>
                  setEditarObservacaoModal((prev) =>
                    prev
                      ? { ...prev, texto: e.target.value.slice(0, 500) }
                      : prev
                  )
                }
                rows={3}
                className={`${inputBaseClass} min-h-[96px] resize-none`}
                placeholder="Digite uma observação para este agendamento"
              />
            </FormField>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Essa observação ficará vinculada ao agendamento.</span>
              <span>{editarObservacaoModal.texto.length}/500</span>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-end">
              <Button
                variant="secondary"
                onClick={() => setEditarObservacaoModal(null)}
                className="rounded-xl px-4 py-2"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={salvarObservacao}
                disabled={atualizarObservacaoMutation.isPending}
                isLoading={atualizarObservacaoMutation.isPending}
                className="rounded-xl px-5 py-2"
              >
                Salvar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {cancelarAgendamentoModal && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (cancelarMutation.isPending || salvandoObservacaoCancelamento) return
            setCancelarAgendamentoModal(null)
          }}
          title="Cancelar Agendamento"
          size="sm"
        >
          <div className="space-y-4">
            <FormField label="Observação do cancelamento">
              <textarea
                value={cancelarAgendamentoModal.texto}
                onChange={(e) =>
                  setCancelarAgendamentoModal((prev) =>
                    prev ? { ...prev, texto: e.target.value.slice(0, 500) } : prev
                  )
                }
                rows={2}
                className={`${inputBaseClass} min-h-[72px] resize-none`}
                placeholder="Ex.: Cliente desmarcou por indisponibilidade"
              />
            </FormField>

            <label className="flex items-start gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <input
                type="checkbox"
                checked={cancelarAgendamentoModal.devolveuSinal}
                onChange={(e) =>
                  setCancelarAgendamentoModal((prev) =>
                    prev ? { ...prev, devolveuSinal: e.target.checked } : prev
                  )
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-800">Devolução do sinal?</p>
                <p className="text-xs text-slate-500">
                  {Number(agendamentoCancelamento?.valorFinal ?? pagamentoConfirmacao?.valor ?? 0) > 0
                    ? `Sinal atual: ${moneyFormatter.format(
                        Number(agendamentoCancelamento?.valorFinal ?? pagamentoConfirmacao?.valor ?? 0)
                      )}.`
                    : 'Este agendamento não possui sinal registrado.'}
                </p>
              </div>
            </label>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Campo opcional. A observação ficará salva no agendamento.</span>
              <span>{cancelarAgendamentoModal.texto.length}/500</span>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-end">
              <Button
                variant="secondary"
                onClick={() => setCancelarAgendamentoModal(null)}
                disabled={cancelarMutation.isPending || salvandoObservacaoCancelamento}
                className="rounded-xl px-4 py-2"
              >
                Voltar
              </Button>
              <Button
                variant="primary"
                onClick={confirmarCancelamentoComObservacao}
                disabled={cancelarMutation.isPending || salvandoObservacaoCancelamento}
                isLoading={cancelarMutation.isPending || salvandoObservacaoCancelamento}
                className="rounded-xl px-5 py-2"
              >
                Salvar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {noShowModal && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (noShowMutation.isPending) return
            setNoShowModal(null)
          }}
          title="Não compareceu"
          headerClassName="!px-4 !py-3"
          headerContent={<h3 className="text-lg font-semibold text-slate-900">Não compareceu</h3>}
          size="sm"
        >
          <div className="-m-6">
            <div className="space-y-2.5 px-4 py-3">
              <p className="text-sm leading-5 text-slate-700">
                {noShowComSinal ? (
                  <>
                    Agendamento com sinal. Ao salvar, você vai emitir nota no valor de{' '}
                    <span className="font-semibold text-slate-900">{moneyFormatter.format(valorSinalNoShow)}</span>.
                  </>
                ) : (
                  'Agendamento sem sinal e não vai emitir nota.'
                )}
              </p>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setNoShowModal(null)}
                  disabled={noShowMutation.isPending}
                  className="h-9 rounded-xl px-3 text-sm"
                >
                  Fechar
                </Button>
                <Button
                  variant="primary"
                  onClick={() => noShowMutation.mutate(noShowModal.agendamentoId)}
                  disabled={noShowMutation.isPending}
                  isLoading={noShowMutation.isPending}
                  className="h-9 rounded-xl px-3 text-sm"
                >
                  {noShowComSinal ? 'Salvar e Emitir NFS-e' : 'Salvar'}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {excluirAgendamentoModal && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (excluirMutation.isPending) return
            setExcluirAgendamentoModal(null)
          }}
          title="Excluir Agendamento"
          size="sm"
        >
          <div className="-m-6">
            <div className="space-y-2.5 px-4 py-3">
              {excluirAgendamentoModal.valorSinal > 0 ? (
                <p className="text-sm leading-5 text-slate-700">
                  Este agendamento possui sinal pago de{' '}
                  <span className="font-semibold text-slate-900">
                    {moneyFormatter.format(excluirAgendamentoModal.valorSinal)}
                  </span>{' '}
                  e não pode ser deletado.
                </p>
              ) : (
                <p className="text-sm leading-5 text-slate-700">
                  Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setExcluirAgendamentoModal(null)}
                  disabled={excluirMutation.isPending}
                  className="h-9 rounded-xl px-3 text-sm"
                >
                  Fechar
                </Button>
                {excluirAgendamentoModal.valorSinal <= 0 && (
                  <Button
                    variant="danger"
                    onClick={() => excluirMutation.mutate(excluirAgendamentoModal.agendamentoId)}
                    disabled={excluirMutation.isPending}
                    isLoading={excluirMutation.isPending}
                    className="h-9 rounded-xl px-3 text-sm"
                  >
                    Deletar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Editar Agendamento */}
      {editingAgendamento && (
        <Modal
          isOpen={true}
          onClose={() => {
            setEditingAgendamento(null)
            setReabrirDetalhesPosEdicao(false)
          }}
          title="Editar Agendamento"
          size="md"
        >
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Data</label>
                    <input
                      type="date"
                      value={format(dataHoraEdicao, 'yyyy-MM-dd')}
                      onChange={(e) => handleDataEdicaoChange(e.target.value)}
                      onClick={(e) => abrirPickerNativo(e.currentTarget)}
                      className={headerDateInputClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Hora Início</label>
                    <TimeWheelInput
                      value={format(dataHoraEdicao, 'HH:mm')}
                      onChange={handleHoraEdicaoChange}
                      className={headerTimeInputClass}
                    />
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
                        const currentTarget = e.currentTarget
                        requestAnimationFrame(() => {
                          if (!currentTarget.contains(document.activeElement)) {
                            setEditClienteFieldActive(false)
                          }
                        })
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
                            onMouseDown={(e) => {
                              e.preventDefault()
                              abrirModalCliente('edit')
                            }}
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
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="px-0.5 text-sm text-amber-800">Cliente não encontrado.</p>
                          <Button
                            type="button"
                            variant="success"
                            size="sm"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              abrirModalCliente('edit', editBuscaCliente)
                            }}
                            className="mt-2 w-full rounded-lg py-2.5 font-semibold uppercase tracking-wide"
                          >
                            Adicionar cliente
                          </Button>
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
                      const currentTarget = e.currentTarget
                      requestAnimationFrame(() => {
                        if (!currentTarget.contains(document.activeElement)) {
                          setEditServicoFieldActive(false)
                        }
                      })
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
                          onMouseDown={(e) => {
                            e.preventDefault()
                            abrirModalServico('edit')
                          }}
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
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                              <p className="px-0.5 text-sm text-amber-800">Serviço não encontrado.</p>
                              {podeEditarServicos && (
                                <Button
                                  type="button"
                                  variant="success"
                                  size="sm"
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    abrirModalServico('edit', editBuscaServico)
                                  }}
                                  className="mt-2 w-full rounded-lg py-2.5 font-semibold uppercase tracking-wide"
                                >
                                  Adicionar serviço
                                </Button>
                              )}
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
                  onClick={() => {
                    setEditingAgendamento(null)
                    setReabrirDetalhesPosEdicao(false)
                  }}
                  className="rounded-xl px-4 py-2"
                >
                  Fechar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSalvarEdicao}
                  disabled={updateMutation.isPending}
                  isLoading={updateMutation.isPending}
                  className="rounded-xl bg-blue-600 px-5 py-2 hover:bg-blue-700"
                >
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Ajuste de Total Pago */}
      {ajustePagamentoModal && (
        <Modal
          isOpen={true}
          onClose={() => setAjustePagamentoModal(null)}
          title="Histórico de pagamento"
          size="sm"
        >
          <div className="-m-6 flex flex-col">
            <div className="space-y-2.5 px-4 py-3">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-900">Data do pagamento do Sinal</label>
                <input
                  type="date"
                  value={ajustePagamentoModal.dataPagamento}
                  onChange={(e) =>
                    setAjustePagamentoModal((prev) =>
                      prev ? { ...prev, dataPagamento: e.target.value } : prev
                    )
                  }
                  className="block w-full border-0 border-b border-slate-300 bg-transparent px-0 pb-1.5 pt-1 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-0"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-900">Forma de pagamento</label>
                <select
                  value={ajustePagamentoModal.formaPagamento}
                  onChange={(e) =>
                    setAjustePagamentoModal((prev) =>
                      prev ? { ...prev, formaPagamento: e.target.value as FormaPagamentoSinal } : prev
                    )
                  }
                  className="block w-full border-0 border-b border-slate-300 bg-transparent px-0 pb-1.5 pt-1 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-0"
                >
                  <option value="PIX">Pix</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="CARTAO_CREDITO">Cartão de Credito</option>
                  <option value="CARTAO_DEBITO">Cartão de Debito</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-900">Valor</label>
                <input
                  type="text"
                  value={ajustePagamentoModal.valor}
                  onChange={(e) =>
                    setAjustePagamentoModal((prev) =>
                      prev
                        ? {
                            ...prev,
                            valor: formatCurrencyFromDigits(e.target.value),
                          }
                        : prev
                    )
                  }
                  className="block w-full border-0 border-b border-slate-300 bg-transparent px-0 pb-1.5 pt-1 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-0"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">Resumo</p>
                <div className="mt-1.5 grid grid-cols-1 gap-1 sm:grid-cols-[1fr_auto] sm:items-start">
                  <p className="text-sm text-slate-800">Atual: {moneyFormatter.format(totalPagoAtualAjuste)}</p>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-slate-700">
                      Após ajuste: <span className="text-sm font-semibold text-slate-900">{moneyFormatter.format(Math.max(totalAposAjuste, 0))}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-slate-700">
                      Devendo: <span className="text-sm font-semibold text-slate-900">{moneyFormatter.format(Math.max(totalServicoAjuste - Math.max(totalAposAjuste, 0), 0))}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-2.5">
              <Button
                variant="secondary"
                onClick={() => setAjustePagamentoModal(null)}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={confirmarAjustePagamento}
                disabled={ajustarPagamentoMutation.isPending}
                isLoading={ajustarPagamentoMutation.isPending}
                className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-sm font-semibold hover:bg-blue-700"
              >
                Salvar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Confirmar Agendamento */}
      {confirmarModal && (
        <Modal
          isOpen={true}
          onClose={() => setConfirmarModal(null)}
          title="Confirmar Agendamento"
          size="sm"
        >
          <div className="-m-6 flex flex-col">
            <div className="space-y-2.5 px-4 py-3">
              <div>
                <p className="text-base font-semibold text-slate-900">Como deseja confirmar este agendamento?</p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setConfirmarModal((prev) => (prev ? { ...prev, comSinal: false, touchedValorSinal: false } : prev))}
                  className="grid w-full grid-cols-[1.25rem_1fr] items-start gap-2.5 text-left"
                >
                  <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${!confirmarModal.comSinal ? 'border-blue-600' : 'border-slate-300'}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${!confirmarModal.comSinal ? 'bg-blue-600' : 'bg-transparent'}`} />
                  </span>
                  <span className="text-sm leading-5 font-medium text-slate-900">Sem sinal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmarModal((prev) => (prev ? { ...prev, comSinal: true } : prev))}
                  className="grid w-full grid-cols-[1.25rem_1fr] items-start gap-2.5 text-left"
                >
                  <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${confirmarModal.comSinal ? 'border-blue-600' : 'border-slate-300'}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${confirmarModal.comSinal ? 'bg-blue-600' : 'bg-transparent'}`} />
                  </span>
                  <span className="text-sm leading-5 font-medium text-slate-900">
                    Com sinal <span className="font-normal text-slate-600">(sinal de agendamento)</span>
                  </span>
                </button>
              </div>

              {!confirmarModal.comSinal ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-blue-600 text-white">
                      <Info className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-sm text-blue-900">O cliente pagará no dia do atendimento.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-900">Data do pagamento</label>
                    <input
                      type="date"
                      value={confirmarModal.dataPagamento}
                      onChange={(e) =>
                        setConfirmarModal((prev) =>
                          prev ? { ...prev, dataPagamento: e.target.value } : prev
                        )
                      }
                      className="block w-full border-0 border-b border-slate-300 bg-transparent px-0 pb-1.5 pt-1 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-0"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-900">Forma de pagamento</label>
                    <select
                      value={confirmarModal.formaPagamento}
                      onChange={(e) =>
                        setConfirmarModal((prev) =>
                          prev ? { ...prev, formaPagamento: e.target.value as FormaPagamentoSinal } : prev
                        )
                      }
                      className="block w-full border-0 border-b border-slate-300 bg-transparent px-0 pb-1.5 pt-1 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-0"
                    >
                      <option value="PIX">Pix</option>
                      <option value="DINHEIRO">Dinheiro</option>
                      <option value="CARTAO_CREDITO">Cartão de Credito</option>
                      <option value="CARTAO_DEBITO">Cartão de Debito</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-900">Valor do sinal</label>
                    <input
                      type="text"
                      value={confirmarModal.valorSinal}
                      onChange={(e) =>
                        setConfirmarModal((prev) =>
                          prev
                            ? {
                                ...prev,
                                valorSinal: formatCurrencyFromDigits(e.target.value),
                                touchedValorSinal: true,
                              }
                            : prev
                        )
                      }
                      onBlur={() =>
                        setConfirmarModal((prev) =>
                          prev ? { ...prev, touchedValorSinal: true } : prev
                        )
                      }
                      className={`block w-full border-0 border-b bg-transparent px-0 pb-1.5 pt-1 text-sm text-slate-900 transition focus:outline-none focus:ring-0 ${
                        valorSinalInvalido
                          ? 'border-red-300 focus:border-red-400'
                          : 'border-slate-300 focus:border-blue-500'
                      }`}
                    />
                    {valorSinalInvalido && (
                      <p className="text-sm text-red-600">Pagamento mínimo é R$ 1,00</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">Resumo</p>
                    <div className="mt-1.5 grid grid-cols-1 gap-1 sm:grid-cols-[1fr_auto] sm:items-start">
                      <p className="text-sm text-slate-800">Serviço: {moneyFormatter.format(valorServicoConfirmacao)}</p>
                      <div className="text-left sm:text-right">
                        <p className="text-sm text-slate-700">
                          Sinal: <span className="text-sm font-semibold text-slate-900">{moneyFormatter.format(valorSinalConfirmacao)}</span>
                        </p>
                        <p className="mt-0.5 text-sm text-slate-700">
                          Restante: <span className="text-sm font-semibold text-slate-900">{moneyFormatter.format(valorRestanteConfirmacao)}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                </>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-2.5">
              <Button
                variant="secondary"
                onClick={() => setConfirmarModal(null)}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={confirmarAgendamento}
                disabled={confirmarMutation.isPending}
                isLoading={confirmarMutation.isPending}
                className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-sm font-semibold hover:bg-blue-700"
              >
                Confirmar
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
            setNomeInicialNovoCliente('')
            if (origemModalCliente === 'edit') {
              setEditBuscaCliente('')
            } else {
              setBuscaCliente('')
            }
          }}
          title="Novo Cliente"
          size="md"
        >
          <ClienteForm
            initialNome={nomeInicialNovoCliente}
            unidadeId={formData.unidadeId ?? unidadeUnicaModal?.id}
            onClose={() => {
              setMostrarModalCliente(false)
              setNomeInicialNovoCliente('')
              if (origemModalCliente === 'edit') {
                setEditBuscaCliente('')
              } else {
                setBuscaCliente('')
              }
            }}
            onSuccess={(cliente) => {
              if (origemModalCliente === 'edit') {
                setEditFormData((prev) => ({ ...prev, clienteId: cliente.id }))
                setEditBuscaCliente(cliente.nome)
                setEditClienteFieldActive(false)
              } else {
                setFormData((prev) => ({ ...prev, clienteId: cliente.id }))
                setBuscaCliente(cliente.nome)
                setClienteFieldActive(false)
              }
              setNomeInicialNovoCliente('')
              setMostrarModalCliente(false)
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
            setNomeInicialNovoServico('')
            if (origemModalServico === 'edit') {
              setEditBuscaServico('')
            } else {
              setBuscaServico('')
            }
          }}
          title="Novo Serviço"
          size="md"
        >
          <ServicoForm
            initialNome={nomeInicialNovoServico}
            unidadeId={formData.unidadeId ?? unidadeUnicaModal?.id}
            onClose={() => {
              setMostrarModalServico(false)
              setNomeInicialNovoServico('')
              if (origemModalServico === 'edit') {
                setEditBuscaServico('')
              } else {
                setBuscaServico('')
              }
            }}
            onSuccess={(servico) => {
              if (origemModalServico === 'edit') {
                setEditServicosSelecionados((prev) =>
                  prev.includes(servico.id) ? prev : [...prev, servico.id]
                )
                setEditBuscaServico('')
                setEditServicoFieldActive(false)
              } else {
                setServicosSelecionados((prev) =>
                  prev.includes(servico.id) ? prev : [...prev, servico.id]
                )
                setBuscaServico('')
                setServicoFieldActive(false)
              }
              setNomeInicialNovoServico('')
              setMostrarModalServico(false)
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
          size="sm"
        >
          <div className="-m-6 flex flex-col">
            <div className="space-y-2.5 px-4 py-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm text-slate-800">
                  Cliente: <span className="font-semibold text-slate-900">{finalizarModal.agendamento.cliente?.nome}</span>
                </p>
                <div className="mt-2">
                  <p className="text-sm text-slate-900">Serviços realizados:</p>
                  <div className="mt-1.5 space-y-1">
                    {servicosFinalizacaoLinhas.map((linha) => (
                      <div key={linha.key} className="flex items-center justify-between gap-3 text-sm text-slate-800">
                        <p className="min-w-0 truncate">
                          • {linha.descricao}
                        </p>
                        <span className="shrink-0 font-medium text-slate-900">
                          {moneyFormatter.format(linha.valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-800">
                  Sinal pago:{' '}
                  <span className="font-semibold text-slate-900">
                    {moneyFormatter.format(totalPagoFinalizacao)}
                  </span>
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2">
                  <span className="text-sm text-slate-600">Valor restante a pagar</span>
                  <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                    {moneyFormatter.format(valorRestanteFinalizacao)}
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-900">Forma de pagamento</label>
                <select
                  value={finalizarModal.formaPagamento}
                  onChange={(e) =>
                    setFinalizarModal({
                      ...finalizarModal,
                      formaPagamento: e.target.value as FormaPagamentoSinal,
                    })
                  }
                  className="block w-full border-0 border-b border-slate-300 bg-transparent px-0 pb-1.5 pt-1 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-0"
                >
                  <option value="PIX">Pix</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="CARTAO_CREDITO">Cartão de Credito</option>
                  <option value="CARTAO_DEBITO">Cartão de Debito</option>
                </select>
              </div>

              <p className="text-xs text-slate-500">
                Você está finalizando o atendimento e registrando o pagamento restante.
              </p>

            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-2.5">
              <Button
                variant="secondary"
                onClick={() => setFinalizarModal(null)}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <Button
                variant="success"
                onClick={confirmarFinalizar}
                disabled={finalizarMutation.isPending}
                isLoading={finalizarMutation.isPending}
                className="rounded-xl px-3.5 py-1.5 text-sm font-semibold"
              >
                Finalizar atendimento e emitir NFS-e
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function ClienteForm({
  onClose,
  onSuccess,
  unidadeId,
  initialNome = '',
}: {
  onClose: () => void
  onSuccess: (cliente: Cliente) => void
  unidadeId?: number
  initialNome?: string
}) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [formData, setFormData] = useState<Cliente>({
    nome: initialNome,
    cpfCnpj: '',
    email: '',
    telefone: '',
    dataNascimento: '',
    unidadeId,
  })
  const [telefoneSecundario, setTelefoneSecundario] = useState('')
  const [telefoneInternacional, setTelefoneInternacional] = useState('')
  const [mostrarMaisCampos, setMostrarMaisCampos] = useState(false)

  useEffect(() => {
    if (!unidadeId) return
    setFormData((prev) => ({ ...prev, unidadeId }))
  }, [unidadeId])

  useEffect(() => {
    setFormData((prev) => ({ ...prev, nome: initialNome }))
  }, [initialNome])

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

  const inputClassName =
    'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.unidadeId) {
      showNotification('error', 'Selecione uma unidade no agendamento antes de cadastrar o cliente.')
      return
    }
    const telefonePrincipal = (formData.telefone || '').trim()
    const telefone2 = telefoneSecundario.trim()
    const telefoneIntl = telefoneInternacional.trim()
    const telefoneComposto = [telefonePrincipal, telefone2, telefoneIntl]
      .filter(Boolean)
      .join(' / ')

    saveMutation.mutate({
      ...formData,
      telefone: telefoneComposto || formData.telefone,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="-m-6 flex max-h-[78vh] flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-8 py-6">
        <FormField label="Nome" required>
          <input
            type="text"
            required
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className={inputClassName}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Telefone 1">
            <input
              type="text"
              value={formData.telefone || ''}
              onChange={(e) =>
                setFormData({ ...formData, telefone: maskPhone(e.target.value) })
              }
              className={inputClassName}
            />
          </FormField>
          <FormField label="Telefone 2">
            <input
              type="text"
              value={telefoneSecundario}
              onChange={(e) => setTelefoneSecundario(maskPhone(e.target.value))}
              className={inputClassName}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Data de nascimento">
            <div className="relative">
              <input
                type="date"
                value={formData.dataNascimento || ''}
                onChange={(e) =>
                  setFormData({ ...formData, dataNascimento: e.target.value })
                }
                className={`${inputClassName} pr-10`}
              />
              <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            </div>
          </FormField>

          <FormField label="CPF CNPJ">
            <input
              type="text"
              value={formData.cpfCnpj}
              onChange={(e) =>
                setFormData({ ...formData, cpfCnpj: e.target.value })
              }
              className={inputClassName}
            />
          </FormField>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setMostrarMaisCampos((prev) => !prev)}
            className="text-sm font-medium text-blue-600 underline underline-offset-2 transition hover:text-blue-700"
          >
            {mostrarMaisCampos ? 'Menos campos' : 'Mais campos'}
          </button>
        </div>

        {mostrarMaisCampos && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Email">
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className={inputClassName}
              />
            </FormField>

            <FormField label="Telefone Internacional">
              <input
                type="text"
                value={telefoneInternacional}
                onChange={(e) => setTelefoneInternacional(e.target.value)}
                className={inputClassName}
              />
            </FormField>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-200 px-8 py-5">
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
  unidadeId,
  initialNome = '',
}: { 
  onClose: () => void
  onSuccess: (servico: Servico) => void
  unidadeId?: number
  initialNome?: string
}) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const usuario = authService.getUsuario()
  
  const [formData, setFormData] = useState<Servico>({
    id: 0,
    nome: initialNome,
    descricao: '',
    valor: 0,
    duracaoMinutos: 30,
    unidadeId: unidadeId || usuario?.unidadeId || 0,
    ativo: true,
  })

  useEffect(() => {
    if (!unidadeId) return
    setFormData((prev) => ({ ...prev, unidadeId }))
  }, [unidadeId])

  useEffect(() => {
    setFormData((prev) => ({ ...prev, nome: initialNome }))
  }, [initialNome])

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
      showNotification('error', 'Selecione uma unidade no agendamento antes de cadastrar o serviço.')
      return
    }

    saveMutation.mutate(formData)
  }

  const inputClassName =
    'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200'

  return (
    <form onSubmit={handleSubmit} className="-m-6 flex max-h-[78vh] flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-8 py-6">
        <FormField label="Nome" required>
          <input
            type="text"
            required
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className={inputClassName}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Valor (R$)" required>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
              className={inputClassName}
            />
          </FormField>

          <FormField label="Duração (minutos)" required>
            <input
              type="number"
              min="1"
              required
              value={formData.duracaoMinutos}
              onChange={(e) => setFormData({ ...formData, duracaoMinutos: parseInt(e.target.value) || 30 })}
              className={inputClassName}
            />
          </FormField>
        </div>

      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 px-8 py-5">
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
