import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useChartReady } from '../../hooks/useChartReady'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { dashboardGerenteService } from '../../services/dashboardGerenteService'

type Periodo = 7 | 30 | 90 | 365

const OPCOES: { id: Periodo; label: string }[] = [
  { id: 7, label: '7d' },
  { id: 30, label: '30d' },
  { id: 90, label: '90d' },
  { id: 365, label: '1 ano' },
]

function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function GraficoFaturamento() {
  const [periodo, setPeriodo] = useState<Periodo>(30)
  // Hook compartilhado — aguarda container ser medido antes de renderizar Recharts.
  // Evita warning "The width(0) and height(0) of chart should be greater than 0".
  const { containerRef, ready: chartReady } = useChartReady<HTMLDivElement>()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'gerente', 'faturamento-diario', periodo],
    queryFn: () => dashboardGerenteService.faturamentoDiario(periodo),
  })

  // Mescla as duas séries por índice (mesmo i = ponto comparável)
  const serieGrafico = useMemo(() => {
    if (!data) return []
    const len = Math.max(data.atual.length, data.anterior.length)
    return Array.from({ length: len }, (_, i) => ({
      data: data.atual[i]?.data ?? '',
      atual: Number(data.atual[i]?.valor ?? 0),
      anterior: Number(data.anterior[i]?.valor ?? 0),
    }))
  }, [data])

  const totalAtual = useMemo(
    () => serieGrafico.reduce((acc, p) => acc + p.atual, 0),
    [serieGrafico]
  )
  const totalAnterior = useMemo(
    () => serieGrafico.reduce((acc, p) => acc + p.anterior, 0),
    [serieGrafico]
  )

  return (
    <div data-tour="grafico-faturamento" className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">Faturamento</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {periodo === 7 && 'Últimos 7 dias'}
            {periodo === 30 && 'Últimos 30 dias'}
            {periodo === 90 && 'Últimos 90 dias'}
            {periodo === 365 && 'Últimos 12 meses'}
          </p>
          {!isLoading && (
            <p className="text-lg font-bold text-slate-900 mt-1">
              {formatBRL(totalAtual)}{' '}
              <span className="text-xs font-medium text-gray-400">
                · anterior {formatBRL(totalAnterior)}
              </span>
            </p>
          )}
        </div>
        <div className="flex gap-1">
          {OPCOES.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setPeriodo(o.id)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold transition
                ${periodo === o.id
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
              `}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="h-56 sm:h-72 w-full">
        {isLoading || !chartReady ? (
          <div className="w-full h-full bg-gray-100 rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <LineChart data={serieGrafico} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="data"
                tick={{ fontSize: 10, fill: '#64748B' }}
                tickFormatter={(d) => (d ? format(parseISO(d), 'dd/MM', { locale: ptBR }) : '')}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748B' }}
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toString()
                }
              />
              <Tooltip
                formatter={(v, name) => [formatBRL(Number(v ?? 0)), name === 'atual' ? 'Atual' : 'Anterior']}
                labelFormatter={(d) =>
                  d ? format(parseISO(d as string), "dd 'de' MMM", { locale: ptBR }) : ''
                }
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend
                formatter={(v) => (v === 'atual' ? 'Atual' : 'Anterior')}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="anterior"
                stroke="#94A3B8"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="atual"
                stroke="#7C3AED"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
