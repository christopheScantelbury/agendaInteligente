import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import { relatorioService } from '../services/relatorioService'
import { unidadeService } from '../services/unidadeService'
import { authService } from '../services/authService'
import { BarChart2, TrendingUp, Users, Award } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const COLORS = ['#7c3aed', '#a78bfa', '#c4b5fd', '#ddd6fe', '#6d28d9', '#8b5cf6']
const moneyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const formatMes = (mes: string) => {
  try {
    const [ano, m] = mes.split('-')
    return format(new Date(Number(ano), Number(m) - 1, 1), 'MMM/yy', { locale: ptBR })
  } catch {
    return mes
  }
}

export default function Relatorios() {
  const usuario = authService.getUsuario()
  const [meses, setMeses] = useState(6)

  const perfilNorm = (usuario?.perfil ?? '').toUpperCase().replace('-', '_')
  const isAdmin = perfilNorm === 'ADMIN' || perfilNorm === 'ADMINISTRADOR'
  const [selectedUnidadeId, setSelectedUnidadeId] = useState<number | undefined>(
    isAdmin ? undefined : usuario?.unidadeId ?? undefined
  )

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
    enabled: isAdmin,
  })

  const params = { meses, unidadeId: selectedUnidadeId }

  const { data: faturamento = [], isLoading: loadingFat } = useQuery({
    queryKey: ['relatorio-faturamento', params],
    queryFn: () => relatorioService.faturamentoMensal(meses, selectedUnidadeId),
  })

  const { data: topServicos = [], isLoading: loadingTop } = useQuery({
    queryKey: ['relatorio-top-servicos', params],
    queryFn: () => relatorioService.topServicos(meses, selectedUnidadeId),
  })

  const { data: taxaRetorno = [], isLoading: loadingRetorno } = useQuery({
    queryKey: ['relatorio-retorno', params],
    queryFn: () => relatorioService.taxaRetorno(meses, selectedUnidadeId),
  })

  const totalFaturamento = faturamento.reduce((s, r) => s + Number(r.faturamento), 0)
  const totalAgendamentos = faturamento.reduce((s, r) => s + r.totalAgendamentos, 0)
  const ultimaTaxaRetorno = taxaRetorno[taxaRetorno.length - 1]?.taxaRetorno ?? 0

  const faturamentoChart = faturamento.map(r => ({
    mes: formatMes(r.mes),
    faturamento: Number(r.faturamento),
    agendamentos: r.totalAgendamentos,
  }))

  const retornoChart = taxaRetorno.map(r => ({
    mes: formatMes(r.mes),
    taxa: Number(r.taxaRetorno.toFixed(1)),
    clientes: r.clientesUnicos,
    retorno: r.clientesRetorno,
  }))

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-100 rounded-full">
            <BarChart2 className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
            <p className="text-sm text-gray-500">Análise de desempenho do negócio</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <select
              value={selectedUnidadeId ?? ''}
              onChange={e => setSelectedUnidadeId(e.target.value ? Number(e.target.value) : undefined)}
              className="text-sm rounded-xl border border-gray-200 px-3 py-2 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
            >
              <option value="">Todas as unidades</option>
              {unidades.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          )}
          <select
            value={meses}
            onChange={e => setMeses(Number(e.target.value))}
            className="text-sm rounded-xl border border-gray-200 px-3 py-2 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
          >
            <option value={3}>Últimos 3 meses</option>
            <option value={6}>Últimos 6 meses</option>
            <option value={12}>Últimos 12 meses</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-1">
            <TrendingUp className="h-5 w-5 text-violet-500" />
            <span className="text-sm font-medium text-gray-500">Faturamento total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{moneyFmt.format(totalFaturamento)}</p>
          <p className="text-xs text-gray-400 mt-1">últimos {meses} meses</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-1">
            <BarChart2 className="h-5 w-5 text-violet-500" />
            <span className="text-sm font-medium text-gray-500">Agendamentos concluídos</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalAgendamentos}</p>
          <p className="text-xs text-gray-400 mt-1">últimos {meses} meses</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-1">
            <Users className="h-5 w-5 text-violet-500" />
            <span className="text-sm font-medium text-gray-500">Taxa de retorno</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{ultimaTaxaRetorno.toFixed(1)}%</p>
          <p className="text-xs text-gray-400 mt-1">clientes que voltam</p>
        </div>
      </div>

      {/* Faturamento Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-violet-500" /> Faturamento Mensal
        </h2>
        {loadingFat ? (
          <div className="h-56 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
          </div>
        ) : faturamentoChart.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Nenhum dado disponível</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={faturamentoChart} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => moneyFmt.format(v)} tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={(value: unknown) => moneyFmt.format(Number(value))} labelStyle={{ fontWeight: 600 }} />
              <Bar dataKey="faturamento" fill="#7c3aed" radius={[6, 6, 0, 0]} name="Faturamento" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom Row: Top Serviços + Taxa Retorno */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Serviços Pie */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="h-4 w-4 text-violet-500" /> Top Serviços
          </h2>
          {loadingTop ? (
            <div className="h-56 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            </div>
          ) : topServicos.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Nenhum dado disponível</p>
          ) : (
            <div className="flex flex-col gap-3">
              {topServicos.slice(0, 6).map((s, i) => {
                const pct = topServicos[0]?.totalRealizados > 0
                  ? (s.totalRealizados / topServicos[0].totalRealizados) * 100
                  : 0
                return (
                  <div key={s.servicoNome}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 truncate max-w-[60%]">{s.servicoNome}</span>
                      <span className="text-xs text-gray-500">{s.totalRealizados}x · {moneyFmt.format(Number(s.receitaTotal))}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Taxa de Retorno Line */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-500" /> Taxa de Retorno de Clientes
          </h2>
          {loadingRetorno ? (
            <div className="h-56 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            </div>
          ) : retornoChart.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Nenhum dado disponível</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={retornoChart} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => `${v}%`} domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: unknown) => `${Number(v)}%`} labelStyle={{ fontWeight: 600 }} />
                <Line type="monotone" dataKey="taxa" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4, fill: '#7c3aed' }} name="Taxa de retorno" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
