import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Events, track } from '../../lib/analytics'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Receipt,
  AlertCircle,
  XCircle,
} from 'lucide-react'
import { dashboardGerenteService, KpisGerente } from '../../services/dashboardGerenteService'
import GraficoFaturamento from '../../components/gerente/GraficoFaturamento'
import EquipeTempoReal from '../../components/gerente/EquipeTempoReal'
import ProximosAgendamentos from '../../components/gerente/ProximosAgendamentos'
import ChecklistPrimeirosPassos from '../../components/gerente/ChecklistPrimeirosPassos'
import OnboardingGerente from '../../components/gerente/OnboardingGerente'
import { authService } from '../../services/authService'

function formatBRL(valor: number | null | undefined): string {
  if (valor == null) return '—'
  return `R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function DashboardGerente() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'gerente', 'kpis'],
    queryFn: () => dashboardGerenteService.kpis(),
    refetchInterval: 60_000,
  })

  useEffect(() => {
    track(Events.GERENTE_DASHBOARD_ABERTO)
  }, [])

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Não foi possível carregar o dashboard</p>
            <p className="text-xs text-red-700 mt-1">Tente novamente em instantes.</p>
          </div>
        </div>
      </div>
    )
  }

  // Onboarding aparece apenas para GERENTE/ADMINISTRADOR
  const mostrarOnboarding = ['GERENTE', 'ADMINISTRADOR'].includes(
    (authService.getUsuario()?.perfil ?? '').toUpperCase()
  )

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      {mostrarOnboarding && <OnboardingGerente />}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1 capitalize">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </header>

      {/* Checklist de primeiros passos */}
      <ChecklistPrimeirosPassos />

      {/* Linha 1 — 4 KPIs principais */}
      <div data-tour="kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiFaturamento data={data} loading={isLoading} />
        <KpiOcupacao data={data} loading={isLoading} />
        <KpiTicket data={data} loading={isLoading} />
        <KpiCancelamento data={data} loading={isLoading} />
      </div>

      {/* Linha 2 — gráfico de faturamento */}
      <GraficoFaturamento />

      {/* Linha 3 — equipe em tempo real */}
      <EquipeTempoReal />

      {/* Linha 4 — próximos agendamentos */}
      <ProximosAgendamentos />
    </div>
  )
}

function KpiFaturamento({ data, loading }: { data?: KpisGerente; loading: boolean }) {
  const variacao = data?.variacaoPercentual
  const subiu = (variacao ?? 0) > 0
  return (
    <KpiCard
      icon={DollarSign}
      color="emerald"
      label="Faturamento (mês)"
      value={loading ? '—' : formatBRL(data?.faturamentoMes ?? 0)}
      sub={
        loading
          ? undefined
          : variacao == null
            ? 'Sem dados do mês anterior'
            : `${subiu ? '+' : ''}${variacao}% vs mês anterior`
      }
      subIcon={variacao == null ? null : subiu ? TrendingUp : TrendingDown}
      subColor={variacao == null ? 'gray' : subiu ? 'emerald' : 'red'}
    />
  )
}

function KpiOcupacao({ data, loading }: { data?: KpisGerente; loading: boolean }) {
  return (
    <KpiCard
      icon={Users}
      color="violet"
      label="Ocupação média"
      value={loading ? '—' : `${data?.ocupacaoMedia ?? 0}%`}
      sub={loading ? undefined : `${data?.profissionaisAtivos ?? 0} ${data?.profissionaisAtivos === 1 ? 'profissional ativo' : 'profissionais ativos'}`}
    />
  )
}

function KpiTicket({ data, loading }: { data?: KpisGerente; loading: boolean }) {
  return (
    <KpiCard
      icon={Receipt}
      color="blue"
      label="Ticket médio"
      value={loading ? '—' : formatBRL(data?.ticketMedio ?? 0)}
      sub={loading ? undefined : `${data?.atendimentosConcluidos ?? 0} atendimentos concluídos`}
    />
  )
}

function KpiCancelamento({ data, loading }: { data?: KpisGerente; loading: boolean }) {
  const taxa = data?.taxaCancelamento ?? 0
  const alta = taxa > 15
  return (
    <KpiCard
      icon={XCircle}
      color={alta ? 'red' : 'orange'}
      label="Cancelamento + no-show"
      value={loading ? '—' : `${taxa}%`}
      sub={loading ? undefined : `de ${data?.totalAtendimentos ?? 0} atendimentos no mês`}
    />
  )
}

function KpiCard({
  icon: Icon,
  color,
  label,
  value,
  sub,
  subIcon: SubIcon,
  subColor,
}: {
  icon: React.ComponentType<{ className?: string }>
  color: 'emerald' | 'violet' | 'blue' | 'red' | 'orange'
  label: string
  value: string
  sub?: string
  subIcon?: React.ComponentType<{ className?: string }> | null
  subColor?: 'emerald' | 'red' | 'gray'
}) {
  const colorBg: Record<typeof color, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
  }
  const subColorClass: Record<NonNullable<typeof subColor>, string> = {
    emerald: 'text-emerald-700',
    red: 'text-red-700',
    gray: 'text-gray-400',
  }
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorBg[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-lg sm:text-xl font-black text-slate-900 leading-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
      {sub && (
        <p className={`text-xs mt-1 flex items-center gap-1 ${subColorClass[subColor ?? 'gray']}`}>
          {SubIcon && <SubIcon className="h-3 w-3" />}
          {sub}
        </p>
      )}
    </div>
  )
}
