import { useEffect, useMemo, useRef, useState } from 'react'
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

const HORA_INICIO = 6
const HORA_FIM = 22
const ALTURA_HORA = 64 // px

interface CardPosicao {
  agendamento: Agendamento
  topPx: number
  alturaPx: number
}

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
  const [searchParams] = useSearchParams()
  const dataParam = searchParams.get('data')
  const [dataSelecionada, setDataSelecionada] = useState<Date>(() => {
    if (dataParam) {
      const [y, m, d] = dataParam.split('-').map(Number)
      if (y && m && d) return startOfDay(new Date(y, m - 1, d))
    }
    return startOfDay(new Date())
  })
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null)
  const timelineRef = useRef<HTMLDivElement | null>(null)
  const [nowOffset, setNowOffset] = useState<number | null>(null)

  // Reage a mudança do parâmetro "data" na URL (ex.: vindo da agenda 7 dias)
  useEffect(() => {
    if (dataParam) {
      const [y, m, d] = dataParam.split('-').map(Number)
      if (y && m && d) setDataSelecionada(startOfDay(new Date(y, m - 1, d)))
    }
  }, [dataParam])

  // Buscar atendente do usuário logado
  const { data: meuAtendente } = useQuery({
    queryKey: ['atendente', 'meu', usuario?.usuarioId],
    queryFn: () => atendenteService.buscarPorUsuarioId(usuario!.usuarioId),
    enabled: !!usuario?.usuarioId,
  })

  // Buscar todos os agendamentos
  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ['agendamentos', 'todos'],
    queryFn: () => agendamentoService.listar(),
    refetchInterval: 60_000,
  })

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

  // Posicionar cards na timeline
  const cards: CardPosicao[] = useMemo(() => {
    return agendamentosDoDia.map((a) => {
      const inicio = parseISO(a.dataHoraInicio)
      const fim = a.dataHoraFim ? parseISO(a.dataHoraFim) : new Date(inicio.getTime() + 60 * 60 * 1000)
      const minutosDoInicio = inicio.getHours() * 60 + inicio.getMinutes() - HORA_INICIO * 60
      const duracao = Math.max(15, differenceInMinutes(fim, inicio))
      return {
        agendamento: a,
        topPx: (minutosDoInicio / 60) * ALTURA_HORA,
        alturaPx: Math.max(40, (duracao / 60) * ALTURA_HORA - 4),
      }
    })
  }, [agendamentosDoDia])

  // Calcular posição da linha "agora" se estamos no dia selecionado
  useEffect(() => {
    function atualizarAgora() {
      const agora = new Date()
      if (!isSameDay(agora, dataSelecionada)) {
        setNowOffset(null)
        return
      }
      const minutos = agora.getHours() * 60 + agora.getMinutes() - HORA_INICIO * 60
      if (minutos < 0 || minutos > (HORA_FIM - HORA_INICIO) * 60) {
        setNowOffset(null)
        return
      }
      setNowOffset((minutos / 60) * ALTURA_HORA)
    }
    atualizarAgora()
    const t = window.setInterval(atualizarAgora, 60_000)
    return () => window.clearInterval(t)
  }, [dataSelecionada])

  // Auto-scroll pra linha "agora" ao carregar
  useEffect(() => {
    if (nowOffset != null && timelineRef.current) {
      timelineRef.current.scrollTo({ top: Math.max(0, nowOffset - 160), behavior: 'smooth' })
    }
  }, [nowOffset])

  const horas = Array.from({ length: HORA_FIM - HORA_INICIO + 1 }, (_, i) => HORA_INICIO + i)

  return (
    <div className="max-w-md mx-auto">
      <OnboardingProfissional />

      {/* Header */}
      <header data-tour="header-dia" className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setDataSelecionada((d) => subDays(d, 1))}
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
            onClick={() => setDataSelecionada((d) => addDays(d, 1))}
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
              onClick={() => setDataSelecionada(startOfDay(new Date()))}
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

      {/* Timeline */}
      <div
        ref={timelineRef}
        data-tour="timeline"
        className="relative overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 280px)' }}
      >
        {isLoading || !meuAtendente ? (
          <TimelineSkeleton />
        ) : agendamentosDoDia.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="relative px-4 py-2">
            {/* Linhas das horas */}
            <div className="absolute inset-0 px-4 py-2 pointer-events-none">
              {horas.map((h, idx) => (
                <div
                  key={h}
                  className="flex items-start"
                  style={{ position: 'absolute', top: idx * ALTURA_HORA, left: 16, right: 16 }}
                >
                  <span className="text-[10px] font-medium text-gray-400 -mt-1.5 w-10">
                    {String(h).padStart(2, '0')}:00
                  </span>
                  <div className="flex-1 border-t border-dashed border-gray-200 mt-0.5" />
                </div>
              ))}
            </div>

            {/* Linha agora */}
            {nowOffset != null && (
              <div
                className="absolute left-4 right-4 pointer-events-none z-10"
                style={{ top: nowOffset + 8 }}
              >
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-violet-600 rounded-full" />
                  <div className="flex-1 h-0.5 bg-violet-600" />
                </div>
              </div>
            )}

            {/* Container relativo para os cards */}
            <div
              className="relative ml-12"
              style={{ height: (HORA_FIM - HORA_INICIO + 1) * ALTURA_HORA }}
            >
              {cards.map(({ agendamento, topPx, alturaPx }) => (
                <AgendamentoCard
                  key={agendamento.id}
                  agendamento={agendamento}
                  topPx={topPx}
                  alturaPx={alturaPx}
                  onClick={() => setAgendamentoSelecionado(agendamento)}
                />
              ))}
            </div>
          </div>
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
  topPx,
  alturaPx,
  onClick,
}: {
  agendamento: Agendamento
  topPx: number
  alturaPx: number
  onClick: () => void
}) {
  const status = statusInfo(agendamento.status, agendamento.dataHoraInicio)
  const inicio = parseISO(agendamento.dataHoraInicio)
  const clienteNome = agendamento.cliente?.nome ?? 'Cliente'
  const servicos = agendamento.servicos
    ?.map((s: any) => s.servico?.nome ?? s.descricao)
    .filter(Boolean)
    .join(', ')

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ top: topPx, height: alturaPx }}
      className="absolute left-0 right-0 text-left bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-violet-300 transition overflow-hidden flex"
    >
      <div className={`w-1 ${status.bar}`} />
      <div className="flex-1 px-3 py-2 min-w-0 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {iniciaisCliente(clienteNome)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-bold text-slate-900">
              {format(inicio, 'HH:mm')}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${status.tag}`}>
              {status.label}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-900 truncate">{clienteNome}</p>
          {servicos && <p className="text-xs text-gray-500 truncate">{servicos}</p>}
        </div>
      </div>
    </button>
  )
}

function TimelineSkeleton() {
  return (
    <div className="px-4 py-4 space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
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
