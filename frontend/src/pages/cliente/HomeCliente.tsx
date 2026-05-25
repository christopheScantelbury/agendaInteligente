import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, ChevronDown, ChevronUp, Calendar, MapPin, User, Clock, Sparkles } from 'lucide-react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { clientePublicoService } from '../../services/clientePublicoService'
import OnboardingCliente from '../../components/cliente/OnboardingCliente'

const STATUS_INATIVO = new Set(['CANCELADO', 'CONCLUIDO', 'FINALIZADO', 'NO_SHOW'])

interface ServicoUsado {
  id: number
  nome: string
  valor?: number
  count: number
}

function statusLabel(status: string) {
  switch (status) {
    case 'AGENDADO': return 'Agendado'
    case 'CONFIRMADO': return 'Confirmado'
    case 'EM_ANDAMENTO': return 'Em andamento'
    case 'CANCELADO': return 'Cancelado'
    case 'NO_SHOW': return 'Não compareceu'
    case 'CONCLUIDO':
    case 'FINALIZADO': return 'Concluído'
    default: return status
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'CONFIRMADO':
    case 'EM_ANDAMENTO': return 'bg-blue-100 text-blue-800'
    case 'CANCELADO': return 'bg-red-100 text-red-800'
    case 'NO_SHOW': return 'bg-orange-100 text-orange-800'
    case 'CONCLUIDO':
    case 'FINALIZADO': return 'bg-green-100 text-green-800'
    default: return 'bg-gray-100 text-gray-700'
  }
}

function formatDataHora(dataHora: string) {
  return format(parseISO(dataHora), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
}

function nomeAtendente(agendamento: any): string | null {
  return agendamento.atendente?.usuario?.nome ?? agendamento.atendente?.nome ?? null
}

function servicosDoAgendamento(agendamento: any): { id: number; nome: string; valor?: number }[] {
  return (agendamento.servicos ?? [])
    .map((s: any) => {
      const svc = s.servico
      if (!svc) return null
      return { id: svc.id, nome: svc.nome, valor: svc.valor }
    })
    .filter(Boolean) as { id: number; nome: string; valor?: number }[]
}

export default function HomeCliente() {
  const cliente = clientePublicoService.getCliente()
  const primeiroNome = cliente?.nome?.split(' ')[0] ?? 'cliente'
  const [historicoAberto, setHistoricoAberto] = useState(false)

  const { data: agendamentosAtivos = [], isLoading: loadingAtivos } = useQuery({
    queryKey: ['cliente', 'meus-agendamentos'],
    queryFn: () => clientePublicoService.meusAgendamentos(),
  })

  const { data: cancelamentos = [] } = useQuery({
    queryKey: ['cliente', 'meus-cancelamentos'],
    queryFn: () => clientePublicoService.meusCancelamentos(),
  })

  const agora = useMemo(() => new Date(), [])

  const proximoHorario = useMemo(() => {
    return [...agendamentosAtivos]
      .filter((a) => {
        const dh = parseISO(a.dataHoraInicio)
        return dh > agora && !STATUS_INATIVO.has(a.status)
      })
      .sort((a, b) => parseISO(a.dataHoraInicio).getTime() - parseISO(b.dataHoraInicio).getTime())[0]
  }, [agendamentosAtivos, agora])

  const historico = useMemo(() => {
    return [...agendamentosAtivos, ...cancelamentos]
      .filter((a) => {
        const dh = parseISO(a.dataHoraInicio)
        return dh <= agora || STATUS_INATIVO.has(a.status)
      })
      .sort((a, b) => parseISO(b.dataHoraInicio).getTime() - parseISO(a.dataHoraInicio).getTime())
  }, [agendamentosAtivos, cancelamentos, agora])

  const favoritos: ServicoUsado[] = useMemo(() => {
    const contagem = new Map<number, ServicoUsado>()
    ;[...agendamentosAtivos, ...cancelamentos].forEach((a) => {
      servicosDoAgendamento(a).forEach((s) => {
        const atual = contagem.get(s.id)
        if (atual) {
          atual.count += 1
        } else {
          contagem.set(s.id, { ...s, count: 1 })
        }
      })
    })
    return [...contagem.values()].sort((a, b) => b.count - a.count).slice(0, 5)
  }, [agendamentosAtivos, cancelamentos])

  return (
    <div className="px-4 py-6 space-y-6 max-w-md mx-auto">
      <OnboardingCliente />

      {/* Saudação */}
      <header>
        <p className="text-sm text-gray-500">Olá,</p>
        <h1 className="text-2xl font-bold text-slate-900">{primeiroNome}</h1>
      </header>

      {/* Bloco 1 — Próximo horário */}
      <section aria-labelledby="proximo-titulo" data-tour="proximo-horario">
        <h2 id="proximo-titulo" className="text-sm font-semibold text-gray-700 mb-2">
          Próximo horário
        </h2>
        {loadingAtivos ? (
          <div className="rounded-2xl bg-gray-100 animate-pulse h-32" />
        ) : proximoHorario ? (
          <ProximoHorarioCard agendamento={proximoHorario} />
        ) : (
          <ProximoHorarioVazio />
        )}
      </section>

      {/* Bloco 2 — CTA principal */}
      <section>
        <Link
          to="/cliente/agendar"
          data-tour="cta-marcar"
          className="
            flex items-center justify-center gap-2 w-full
            bg-violet-600 hover:bg-violet-700 active:bg-violet-800
            text-white font-semibold text-base
            rounded-2xl py-4 shadow-sm
            transition-colors
            min-h-[56px]
          "
        >
          <Plus className="h-5 w-5" />
          Marcar novo horário
        </Link>
      </section>

      {/* Bloco 3 — Favoritos */}
      {favoritos.length > 0 && (
        <section aria-labelledby="favoritos-titulo" data-tour="favoritos">
          <h2 id="favoritos-titulo" className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-violet-500" /> Seus serviços favoritos
          </h2>
          <ul className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 snap-x">
            {favoritos.map((s) => (
              <li key={s.id} className="flex-shrink-0 w-40 snap-start">
                <Link
                  to="/cliente/agendar"
                  className="
                    block bg-white border border-gray-200 rounded-xl p-3 h-full
                    hover:border-violet-300 hover:shadow-sm transition
                  "
                >
                  <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center mb-2">
                    <Sparkles className="h-8 w-8 text-violet-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 truncate">{s.nome}</p>
                  {s.valor != null && (
                    <p className="text-xs text-gray-500">R$ {Number(s.valor).toFixed(2)}</p>
                  )}
                  <p className="text-xs text-violet-600 mt-1">Agendar de novo</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Bloco 4 — Histórico */}
      {historico.length > 0 && (
        <section aria-labelledby="historico-titulo">
          <button
            type="button"
            onClick={() => setHistoricoAberto((v) => !v)}
            aria-expanded={historicoAberto}
            className="flex items-center justify-between w-full text-left mb-2"
          >
            <h2 id="historico-titulo" className="text-sm font-semibold text-gray-700">
              Histórico ({historico.length})
            </h2>
            {historicoAberto ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          {historicoAberto && (
            <ul className="space-y-2">
              {historico.slice(0, 5).map((a) => (
                <li key={a.id} className="bg-white border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">
                      {format(parseISO(a.dataHoraInicio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColor(a.status)}`}>
                      {statusLabel(a.status)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-900 font-medium">
                    {servicosDoAgendamento(a).map((s) => s.nome).join(', ') || 'Atendimento'}
                  </p>
                  {a.valorTotal != null && (
                    <p className="text-xs text-gray-500 mt-1">
                      R$ {Number(a.valorTotal).toFixed(2)}
                    </p>
                  )}
                </li>
              ))}
              {historico.length > 5 && (
                <li className="text-center">
                  <Link to="/cliente/meus-agendamentos" className="text-sm text-violet-600 hover:underline">
                    Ver tudo ({historico.length})
                  </Link>
                </li>
              )}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

function ProximoHorarioCard({ agendamento }: { agendamento: any }) {
  const dh = parseISO(agendamento.dataHoraInicio)
  const distancia = formatDistanceToNow(dh, { locale: ptBR, addSuffix: false })
  const servicos = servicosDoAgendamento(agendamento)
  const atendente = nomeAtendente(agendamento)
  const unidade = agendamento.unidade?.nome

  return (
    <article className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-700 text-white p-5 shadow-sm">
      <div className="flex items-center gap-1.5 text-violet-100 text-xs font-medium mb-1">
        <Clock className="h-3.5 w-3.5" />
        em {distancia}
      </div>
      <h3 className="text-lg font-bold leading-tight">
        {servicos.length > 0 ? servicos.map((s) => s.nome).join(', ') : 'Atendimento'}
      </h3>
      <p className="text-sm text-violet-100 mt-0.5">{formatDataHora(agendamento.dataHoraInicio)}</p>

      <dl className="mt-4 space-y-1 text-sm text-violet-50">
        {atendente && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 opacity-70" aria-hidden />
            <dt className="sr-only">Profissional</dt>
            <dd>{atendente}</dd>
          </div>
        )}
        {unidade && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 opacity-70" aria-hidden />
            <dt className="sr-only">Unidade</dt>
            <dd>{unidade}</dd>
          </div>
        )}
      </dl>

      <div className="flex gap-2 mt-4">
        <Link
          to="/cliente/meus-agendamentos"
          className="
            flex-1 text-center text-sm font-medium
            bg-white/15 hover:bg-white/25 text-white
            rounded-lg py-2.5 transition-colors
          "
        >
          Reagendar
        </Link>
        <Link
          to="/cliente/meus-agendamentos"
          className="
            flex-1 text-center text-sm font-medium
            bg-white/15 hover:bg-white/25 text-white
            rounded-lg py-2.5 transition-colors
          "
        >
          Cancelar
        </Link>
      </div>
    </article>
  )
}

function ProximoHorarioVazio() {
  return (
    <article className="rounded-2xl bg-white border border-gray-200 p-5 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center mb-3">
        <Calendar className="h-6 w-6 text-violet-500" aria-hidden />
      </div>
      <p className="text-sm text-gray-600">
        Você ainda não tem horários marcados.
      </p>
      <p className="text-xs text-gray-400 mt-1">Use o botão abaixo para agendar.</p>
    </article>
  )
}
