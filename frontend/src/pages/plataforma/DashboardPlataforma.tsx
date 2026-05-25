import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  Calendar,
  FileText,
  Users,
  TrendingUp,
  Activity,
  AlertCircle,
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
      <div className="max-w-3xl mx-auto p-6">
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
    <div className="max-w-3xl mx-auto p-6">
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

      {/* Linha 2 — métricas de SaaS (placeholders) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <PlaceholderCard
          icon={TrendingUp}
          label="MRR (Receita mensal recorrente)"
          desc="Disponível quando integração com Stripe estiver ativa"
        />
        <PlaceholderCard
          icon={Activity}
          label="Churn 30d"
          desc="Disponível quando integração com Stripe estiver ativa"
        />
      </div>

      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-violet-900">
        <p className="font-semibold mb-1">Visão de plataforma</p>
        <p className="text-violet-700">
          Esta tela é exclusiva do administrador global e mostra apenas dados agregados.
          Para acessar dados operacionais de uma empresa específica, use a ação{' '}
          <strong>Assumir sessão</strong> (em breve) na listagem de empresas.
        </p>
      </div>
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: number
  sub?: string
  color: 'violet' | 'emerald' | 'blue' | 'orange'
  loading: boolean
}) {
  const colorBg: Record<typeof color, string> = {
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
  }
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorBg[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      {loading ? (
        <div className="h-7 w-16 bg-gray-100 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-black text-slate-900 leading-none">{value ?? 0}</p>
      )}
      <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function PlaceholderCard({
  icon: Icon,
  label,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  desc: string
}) {
  return (
    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-gray-400" />
        <p className="text-xs text-gray-600 font-medium">{label}</p>
      </div>
      <p className="text-xs text-gray-400">{desc}</p>
      <span className="inline-block mt-2 text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
        Em breve
      </span>
    </div>
  )
}
