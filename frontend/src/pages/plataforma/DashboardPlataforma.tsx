import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Building2,
  Calendar,
  FileText,
  Users,
  TrendingUp,
  Activity,
  AlertCircle,
  Tags,
  LayoutDashboard,
  Eye,
  // History,  // re-importar quando feature de Auditoria voltar (10/06/2026)
  ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { plataformaService } from '../../services/plataformaService'

export default function DashboardPlataforma() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['plataforma', 'metricas'],
    queryFn: () => plataformaService.metricas(),
    refetchInterval: 60_000,
  })

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Não foi possível carregar as métricas</p>
            <p className="text-xs text-red-700 mt-1">Verifique se você tem perfil ADMIN global.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Plataforma</h1>
        <p className="text-sm text-gray-500 mt-1">
          Visão geral · {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </header>

      {/* Linha 1 — métricas principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard
          icon={Building2}
          label="Empresas ativas"
          value={data?.empresasAtivas}
          sub={data ? `${data.totalEmpresas} total` : undefined}
          color="violet"
          loading={isLoading}
        />
        <KpiCard
          icon={Users}
          label="Usuários ativos"
          value={data?.usuariosAtivos}
          color="emerald"
          loading={isLoading}
        />
        <KpiCard
          icon={Calendar}
          label="Agendamentos no mês"
          value={data?.agendamentosMes}
          sub={data ? `${data.totalAgendamentos} total` : undefined}
          color="blue"
          loading={isLoading}
        />
        <KpiCard
          icon={FileText}
          label="NFS-e no mês"
          value={data?.nfseMes}
          sub={data ? `${data.totalNfse} total` : undefined}
          color="orange"
          loading={isLoading}
        />
      </div>

      {/* Linha 2 — métricas de SaaS (calculadas direto do banco). */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <KpiCard
          icon={TrendingUp}
          label="MRR (Receita mensal recorrente)"
          value={data?.mrr ?? 0}
          sub={`Soma de R$ dos planos pagos ativos (Trial não conta)`}
          color="emerald"
          loading={isLoading}
          formatAsCurrency
        />
        <KpiCard
          icon={Activity}
          label="Churn últimos 30 dias"
          value={data?.churn ?? 0}
          sub={data?.inativadas30d != null
            ? `${data.inativadas30d} empresa${data.inativadas30d !== 1 ? 's' : ''} inativada${data.inativadas30d !== 1 ? 's' : ''} no período`
            : 'Empresas inativadas / base ativa'}
          color="orange"
          loading={isLoading}
          formatAsPercent
        />
      </div>

      {/* Quick-links das telas de plataforma.
          Auditoria foi escondida em 10/06/2026 — feature pausada pra economia de
          memória do servidor (toggle backend `app.audit.enabled=false`). Pra
          religar, descomentar a linha + setar a env var no Railway. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <QuickLink to="/plataforma/empresas" icon={Eye} titulo="Empresas" desc="Listar, assumir sessão" />
        {/* <QuickLink to="/plataforma/auditoria" icon={History} titulo="Auditoria" desc="Log de eventos da plataforma" /> */}
        <QuickLink to="/plataforma/planos" icon={Tags} titulo="Planos" desc="Editar preço, limites e descrição" />
        <QuickLink to="/plataforma/landing" icon={LayoutDashboard} titulo="Landing Page" desc="Hero, stats, destaques, comparativo" />
      </div>

      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-violet-900">
        <p className="font-semibold mb-1">Visão de plataforma</p>
        <p className="text-violet-700">
          Esta tela é exclusiva do administrador global e mostra apenas dados agregados.
          Para acessar dados operacionais de uma empresa específica, use a ação{' '}
          <strong>Assumir sessão</strong> na listagem de empresas.
        </p>
      </div>
    </div>
  )
}

function QuickLink({ to, icon: Icon, titulo, desc }: {
  to: string
  icon: typeof Building2
  titulo: string
  desc: string
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-violet-300 hover:shadow-sm transition group"
    >
      <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-200 transition">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{titulo}</p>
        <p className="text-xs text-slate-500 truncate">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-violet-500 transition" />
    </Link>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  loading,
  formatAsCurrency = false,
  formatAsPercent = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: number
  sub?: string
  color: 'violet' | 'emerald' | 'blue' | 'orange'
  loading: boolean
  formatAsCurrency?: boolean
  formatAsPercent?: boolean
}) {
  const colorBg: Record<typeof color, string> = {
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
  }
  const display = (() => {
    const v = value ?? 0
    if (formatAsCurrency) return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    if (formatAsPercent) return `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
    return v
  })()
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorBg[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      {loading ? (
        <div className="h-7 w-20 bg-gray-100 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-black text-slate-900 leading-none">{display}</p>
      )}
      <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

