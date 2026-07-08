import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  addDays,
  differenceInMinutes,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  subDays,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays, TrendingUp, Activity } from 'lucide-react'
import { authService } from '../../services/authService'
import { atendenteService } from '../../services/atendenteService'
import { agendamentoService, Agendamento } from '../../services/agendamentoService'
import AcoesAgendamentoSheet from '../../components/profissional/AcoesAgendamentoSheet'
import OnboardingProfissional from '../../components/profissional/OnboardingProfissional'

function statusInfo(status?: string, dataHoraInicio?: string) {
  const agora = new Date()
  const inicio = dataHoraInicio ? parseISO(dataHoraInicio) : null
  const proximo = inicio && differenceInMinutes(inicio, agora) >= 0 && differenceInMinutes(inicio, agora) <= 30
  switch (status) {
    case 'CONFIRMADO':
      return { label: 'Cliente chegou', bar: 'bg-emerald-500', tag: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' }
    case 'EM_ANDAMENTO':
      return { label: 'Em andamento', bar: 'bg-blue-500', tag: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' }
    case 'PROCEDIMENTO_FIM':
    case 'CONCLUIDO':
    case 'FINALIZADO':
      return { label: 'Concluído', bar: 'bg-slate-400', tag: 'bg-slate-200 text-slate-700', dot: 'bg-slate-400' }
    case 'NO_SHOW':
      return { label: 'Não compareceu', bar: 'bg-red-500', tag: 'bg-red-100 text-red-800', dot: 'bg-red-500' }
    case 'CANCELADO':
      return { label: 'Cancelado', bar: 'bg-red-300', tag: 'bg-red-50 text-red-700', dot: 'bg-red-300' }
    default:
      if (proximo) {
        return { label: 'Próximo', bar: 'bg-violet-500', tag: 'bg-violet-100 text-violet-800', dot: 'bg-violet-500' }
      }
      return { label: 'Agendado', bar: 'bg-slate-300', tag: 'bg-slate-100 text-slate-700', dot: 'bg-slate-300' }
  }
}

function iniciaisCliente(nome?: string): string {
  if (!nome) return '?'
  const partes = nome.trim().split(/\s+/)
  if (partes.length === 1) return partes[0][0]?.toUpperCase() ?? '?'
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

export default function HojeProfissional() {
  const usuario = authService.getUsuario()
  const [searchParams, setSearchParams] = useSearchParams()
  const dataParam = searchParams.get('data')

  // Helpers para navegar entre datas mantendo URL como source of truth
  function irParaData(d: Date) {
    if (isSameDay(d, new Date())) {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ data: format(d, 'yyyy-MM-dd') }, { replace: true })
    }
  }
  const [dataSelecionada, setDataSelecionada] = useState<Date>(() => {
    if (dataParam) {
      const [y, m, d] = dataParam.split('-').map(Number)
      if (y && m && d) return startOfDay(new Date(y, m - 1, d))
    }
    return startOfDay(new Date())
  })
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null)
  const [agora, setAgora] = useState<Date>(() => new Date())

  // Reage a mudança do parâmetro "data" na URL (ex.: vindo da agenda 7 dias).
  // Quando não há param (ex.: clique na tab "Hoje" da BottomNav) volta pra hoje.
  useEffect(() => {
    if (dataParam) {
      const [y, m, d] = dataParam.split('-').map(Number)
      if (y && m && d) setDataSelecionada(startOfDay(new Date(y, m - 1, d)))
    } else {
      setDataSelecionada(startOfDay(new Date()))
    }
  }, [dataParam])

  // Buscar atendente do usuário logado (pode ser null se profissional não tem atendente vinculado)
  const { data: meuAtendente, isLoading: loadingAtendente, isFetched: atendenteFetched } = useQuery({
    queryKey: ['atendente', 'meu', usuario?.usuarioId],
    queryFn: () => atendenteService.buscarPorUsuarioId(usuario!.usuarioId),
    enabled: !!usuario?.usuarioId,
    retry: false,
  })

  // #162: agenda do profissional precisa ver agendamentos criados por outros
  // perfis em tempo quase real. Override do staleTime/refetchOnWindowFocus do
  // QueryClient global pra essa query especificamente.
  const { data: agendamentos = [], isLoading: loadingAgendamentos, error: errorAgendamentos } = useQuery({
    queryKey: ['agendamentos', 'todos'],
    queryFn: () => agendamentoService.listar(),
    enabled: !!meuAtendente,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  })

  const isLoading = loadingAtendente || (!!meuAtendente && loadingAgendamentos)
  const semAtendente = atendenteFetched && !meuAtendente

  // Filtrar por atendente logado e data selecionada
  const agendamentosDoDia = useMemo(() => {
    if (!meuAtendente) return []
    return agendamentos
      .filter((a) => a.atendente?.id === meuAtendente.id || a.atendenteId === meuAtendente.id)
      .filter((a) => isSameDay(parseISO(a.dataHoraInicio), dataSelecionada))
      .sort((a, b) => parseISO(a.dataHoraInicio).getTime() - parseISO(b.dataHoraInicio).getTime())
  }, [agendamentos, meuAtendente, dataSelecionada])

  // KPIs
  const kpis = useMemo(() => {
    const ativos = agendamentosDoDia.filter((a) => a.status !== 'CANCELADO' && a.status !== 'NO_SHOW')
    const faturamento = agendamentosDoDia
      .filter((a) => a.status === 'CONCLUIDO' || a.status === 'FINALIZADO' || a.status === 'PROCEDIMENTO_FIM')
      .reduce((acc, a) => acc + (a.valorFinal ?? a.valorTotal ?? 0), 0)
    return { qtd: ativos.length, faturamento }
  }, [agendamentosDoDia])

  // Atualiza "agora" a cada minuto pra reposicionar o separador "agora"
  useEffect(() => {
    const t = window.setInterval(() => setAgora(new Date()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  const mostrarSeparadorAgora = isSameDay(agora, dataSelecionada)

  // Calcula índice onde inserir o separador "agora" na lista (antes do primeiro futuro)
  const indiceAgora = useMemo(() => {
    if (!mostrarSeparadorAgora) return -1
    return agendamentosDoDia.findIndex((a) => parseISO(a.dataHoraInicio).getTime() > agora.getTime())
  }, [agendamentosDoDia, agora, mostrarSeparadorAgora])

  return (
    <div className="max-w-md mx-auto">
      <OnboardingProfissional />

      {/* Header */}
      <header data-tour="header-dia" className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => irParaData(subDays(dataSelecionada, 1))}
            aria-label="Dia anterior"
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 text-center">
            <p className="text-xs text-gray-500 capitalize">
              {format(dataSelecionada, 'EEEE', { locale: ptBR })}
            </p>
            <h1 className="text-lg font-bold text-slate-900 capitalize">
              {format(dataSelecionada, "dd 'de' MMMM", { locale: ptBR })}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => irParaData(addDays(dataSelecionada, 1))}
            aria-label="Próximo dia"
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 text-gray-600"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {!isSameDay(dataSelecionada, new Date()) && (
          <div className="text-center mb-2">
            <button
              type="button"
              onClick={() => irParaData(new Date())}
              className="text-xs font-semibold text-violet-600 hover:text-violet-700"
            >
              Voltar para hoje
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="bg-violet-50 rounded-xl p-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-violet-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Atendimentos</p>
              <p className="text-base font-bold text-slate-900">{kpis.qtd}</p>
            </div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Faturado</p>
              <p className="text-base font-bold text-slate-900">
                R$ {kpis.faturamento.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Lista de atendimentos do dia */}
      <div
        data-tour="timeline"
        className="overflow-y-auto pb-24"
        style={{ maxHeight: 'calc(100vh - 220px)' }}
      >
        {semAtendente ? (
          <SemAtendenteState />
        ) : errorAgendamentos ? (
          <ErrorState />
        ) : isLoading ? (
          <ListaSkeleton />
        ) : agendamentosDoDia.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="px-4 py-3 space-y-2">
            {agendamentosDoDia.map((agendamento, idx) => (
              <li key={agendamento.id}>
                {idx === indiceAgora && <SeparadorAgora agora={agora} />}
                <AgendamentoCard
                  agendamento={agendamento}
                  onClick={() => setAgendamentoSelecionado(agendamento)}
                />
              </li>
            ))}
            {mostrarSeparadorAgora && indiceAgora === -1 && agendamentosDoDia.length > 0 && (
              <li>
                <SeparadorAgora agora={agora} />
              </li>
            )}
          </ul>
        )}
      </div>

      <AcoesAgendamentoSheet
        agendamento={agendamentoSelecionado}
        onClose={() => setAgendamentoSelecionado(null)}
      />
    </div>
  )
}

function AgendamentoCard({
  agendamento,
  onClick,
}: {
  agendamento: Agendamento
  onClick: () => void
}) {
  const status = statusInfo(agendamento.status, agendamento.dataHoraInicio)
  const inicio = parseISO(agendamento.dataHoraInicio)
  const fim = agendamento.dataHoraFim ? parseISO(agendamento.dataHoraFim) : null
  const duracaoMin = fim ? Math.max(0, differenceInMinutes(fim, inicio)) : null
  const clienteNome = agendamento.cliente?.nome ?? 'Cliente'
  const servicos = agendamento.servicos
    ?.map((s: any) => s.nomeServico ?? s.servico?.nome ?? s.descricao)
    .filter(Boolean)
    .join(', ')

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-violet-300 active:scale-[0.99] transition overflow-hidden flex"
    >
      {/* Coluna de horário */}
      <div className="flex flex-col items-center justify-center bg-slate-50 px-3 py-3 w-16 flex-shrink-0 border-r border-gray-100">
        <span className="text-base font-bold text-slate-900 leading-tight">
          {format(inicio, 'HH:mm')}
        </span>
        {duracaoMin != null && duracaoMin > 0 && (
          <span className="text-[10px] text-gray-500 mt-0.5">{duracaoMin} min</span>
        )}
      </div>

      {/* Faixa de status */}
      <div className={`w-1 ${status.bar} flex-shrink-0`} />

      {/* Conteúdo */}
      <div className="flex-1 px-3 py-3 min-w-0 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {iniciaisCliente(clienteNome)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <p className="text-sm font-semibold text-slate-900 truncate">{clienteNome}</p>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${status.tag} whitespace-nowrap`}>
              {status.label}
            </span>
          </div>
          {servicos && <p className="text-xs text-gray-500 truncate">{servicos}</p>}
        </div>
      </div>
    </button>
  )
}

function SeparadorAgora({ agora }: { agora: Date }) {
  return (
    <div className="flex items-center gap-2 my-2 px-1">
      <div className="w-2 h-2 bg-violet-600 rounded-full" />
      <div className="flex-1 h-px bg-violet-200" />
      <span className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider">
        Agora · {format(agora, 'HH:mm')}
      </span>
    </div>
  )
}

function ListaSkeleton() {
  return (
    <div className="px-4 py-4 space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="px-4 py-12 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-violet-50 flex items-center justify-center mb-3">
        <CalendarDays className="h-7 w-7 text-violet-500" />
      </div>
      <p className="text-sm text-gray-600">Sem atendimentos para esse dia.</p>
      <p className="text-xs text-gray-400 mt-1">Bom momento para descansar ou organizar sua agenda.</p>
    </div>
  )
}

function SemAtendenteState() {
  return (
    <div className="px-4 py-12 text-center max-w-md mx-auto">
      <div className="mx-auto w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-3">
        <CalendarDays className="h-7 w-7 text-amber-600" />
      </div>
      <p className="text-sm font-semibold text-slate-900">Conta não vinculada como atendente</p>
      <p className="text-xs text-gray-500 mt-2">
        Sua conta tem perfil PROFISSIONAL mas ainda não foi vinculada a uma unidade como atendente.
        Peça ao administrador para finalizar seu cadastro em <span className="font-mono text-gray-700">Profissionais → Editar → Vincular conta</span>.
      </p>
    </div>
  )
}

function ErrorState() {
  return (
    <div className="px-4 py-12 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3">
        <CalendarDays className="h-7 w-7 text-red-500" />
      </div>
      <p className="text-sm text-slate-900">Não foi possível carregar a agenda.</p>
      <p className="text-xs text-gray-500 mt-1">Tente recarregar a página em instantes.</p>
    </div>
  )
}
