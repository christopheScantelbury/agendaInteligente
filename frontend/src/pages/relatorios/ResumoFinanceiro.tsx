import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Download } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { relatorioService } from '../../services/relatorioService'
import { authService } from '../../services/authService'
import FormField from '../../components/FormField'
import Button from '../../components/Button'
import { baixarArquivo } from '../../utils/downloadFile'
import { useChartReady } from '../../hooks/useChartReady'
import IntegerInput from '../../components/forms/IntegerInput'

const formatMoeda = (v: number) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const formatDia = (s: string) =>
  new Date(s + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

function inicioDoMes() {
  const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
function fimDoMes() {
  const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
}

export default function ResumoFinanceiro() {
  const navigate = useNavigate()
  const usuario = authService.getUsuario()
  const perfil = (usuario?.perfil ?? '').toUpperCase()
  if (perfil !== 'ADMIN' && perfil !== 'ADMINISTRADOR' && perfil !== 'GERENTE') {
    setTimeout(() => navigate('/'), 0)
    return <div className="p-8 text-center text-sm text-gray-500">Acesso negado.</div>
  }

  const [aba, setAba] = useState<'DASHBOARD' | 'DIARIO' | 'AGREGADO'>('DASHBOARD')
  const [ano, setAno] = useState(new Date().getFullYear())
  const [inicio, setInicio] = useState(inicioDoMes())
  const [fim, setFim] = useState(fimDoMes())
  const { containerRef: chartRef, ready: chartReady } = useChartReady<HTMLDivElement>()

  const { data: dashboard } = useQuery({
    queryKey: ['relatorio-financeiro-dashboard', ano],
    queryFn: () => relatorioService.financeiroDashboard(ano),
    enabled: aba === 'DASHBOARD',
  })

  const { data: fluxo = [] } = useQuery({
    queryKey: ['relatorio-fluxo-diario', inicio, fim],
    queryFn: () => relatorioService.fluxoDiario(inicio, fim),
    enabled: aba === 'DIARIO' || aba === 'AGREGADO',
  })

  const chartReceitaDespesa = useMemo(() => {
    if (!dashboard) return []
    return dashboard.receitaPorMes.map((r, i) => ({
      mes: r.mes.slice(5),
      Receita: Number(r.valor),
      Despesa: Number(dashboard.despesaPorMes[i]?.valor ?? 0),
    }))
  }, [dashboard])

  const totaisAgregado = useMemo(() => {
    const ent = fluxo.reduce((s, f) => s + Number(f.entradas), 0)
    const sai = fluxo.reduce((s, f) => s + Number(f.saidas), 0)
    return { entradas: ent, saidas: sai, saldo: ent - sai }
  }, [fluxo])

  const exportFluxoCSV = () => {
    if (!fluxo.length) return
    const header = ['Dia', 'Entradas', 'Saidas', 'Saldo dia', 'Saldo acumulado']
    const linhas = fluxo.map((f) => [
      f.dia,
      String(f.entradas).replace('.', ','),
      String(f.saidas).replace('.', ','),
      String(f.saldoDia).replace('.', ','),
      String(f.saldoAcumulado).replace('.', ','),
    ])
    const csv = [header, ...linhas].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    baixarArquivo(csv, `fluxo-caixa-${inicio}-a-${fim}.csv`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resumo Financeiro</h1>
          <p className="text-sm text-gray-500">Visão de caixa, fluxo e evolução mensal</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link to="/relatorios" className="text-violet-600 hover:text-violet-800">← Relatórios</Link>
          <Link to="/relatorios/performance" className="text-violet-600 hover:text-violet-800">Performance</Link>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          <TabBtn ativo={aba === 'DASHBOARD'} onClick={() => setAba('DASHBOARD')}>Dashboard</TabBtn>
          <TabBtn ativo={aba === 'DIARIO'} onClick={() => setAba('DIARIO')}>Fluxo de Caixa Diário</TabBtn>
          <TabBtn ativo={aba === 'AGREGADO'} onClick={() => setAba('AGREGADO')}>Fluxo de Caixa</TabBtn>
        </nav>
      </div>

      {aba === 'DASHBOARD' && (
        <>
          <div className="flex items-end gap-3">
            <FormField label="Ano">
              <IntegerInput value={ano} onChange={(v) => setAno(v ?? new Date().getFullYear())} min={2000} max={2100}
                className="mt-1 block w-28 rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500" />
            </FormField>
          </div>

          {dashboard && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ResumoCard titulo="Receita total" valor={formatMoeda(dashboard.receitaTotal)} cor="text-green-700" />
                <ResumoCard titulo="Despesa total" valor={formatMoeda(dashboard.despesaTotal)} cor="text-red-700" />
                <ResumoCard titulo="Lucro" valor={formatMoeda(dashboard.lucroTotal)}
                  cor={dashboard.lucroTotal >= 0 ? 'text-violet-700' : 'text-red-700'} />
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Receita por forma de pagamento</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {Object.entries(dashboard.receitaPorFormaPagamento).length === 0 ? (
                    <div className="col-span-full text-sm text-gray-500">Sem dados no período.</div>
                  ) : Object.entries(dashboard.receitaPorFormaPagamento).map(([forma, valor]) => (
                    <div key={forma} className="bg-violet-50 border border-violet-100 rounded p-2">
                      <div className="text-xs text-gray-600">{forma.replace(/_/g, ' ')}</div>
                      <div className="text-sm font-bold text-violet-800">{formatMoeda(Number(valor))}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Receita × Despesa por mês</h3>
                <div ref={chartRef} style={{ width: '100%', height: 300 }}>
                  {chartReady && (
                    <ResponsiveContainer width="100%" height="100%" debounce={50}>
                      <BarChart data={chartReceitaDespesa}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" />
                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v) => formatMoeda(Number(v))} />
                        <Legend />
                        <Bar dataKey="Receita" fill="#10B981" />
                        <Bar dataKey="Despesa" fill="#EF4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ResumoCard titulo="Melhor mês" valor={dashboard.melhorMes ? `${dashboard.melhorMes} (${formatMoeda(dashboard.melhorMesValor)})` : '—'} cor="text-green-700" small />
                <ResumoCard titulo="Pior mês" valor={dashboard.piorMes ? `${dashboard.piorMes} (${formatMoeda(dashboard.piorMesValor)})` : '—'} cor="text-red-700" small />
                <ResumoCard titulo="Ganho médio mensal" valor={formatMoeda(dashboard.ganhoMedioMensal)} cor="text-violet-700" small />
              </div>
            </>
          )}
        </>
      )}

      {(aba === 'DIARIO' || aba === 'AGREGADO') && (
        <>
          <div className="flex flex-wrap gap-2 items-end bg-white p-3 rounded-lg shadow-sm">
            <FormField label="Início">
              <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)}
                className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500" />
            </FormField>
            <FormField label="Fim">
              <input type="date" value={fim} onChange={(e) => setFim(e.target.value)}
                className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500" />
            </FormField>
            <Button type="button" variant="secondary" onClick={exportFluxoCSV}>
              <Download className="h-4 w-4 mr-1" /> Exportar CSV
            </Button>
          </div>

          {aba === 'AGREGADO' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ResumoCard titulo="Entradas" valor={formatMoeda(totaisAgregado.entradas)} cor="text-green-700" />
              <ResumoCard titulo="Saídas" valor={formatMoeda(totaisAgregado.saidas)} cor="text-red-700" />
              <ResumoCard titulo="Saldo" valor={formatMoeda(totaisAgregado.saldo)}
                cor={totaisAgregado.saldo >= 0 ? 'text-violet-700' : 'text-red-700'} />
            </div>
          )}

          {aba === 'DIARIO' && (
            <>
              {/* Mobile: cards */}
              <div className="block sm:hidden space-y-2">
                {fluxo.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-500">Sem dados no período</div>
                ) : fluxo.map((f) => (
                  <div key={f.dia} className="rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-sm transition">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-slate-900">{formatDia(f.dia)}</div>
                      <div className={`text-sm font-bold ${f.saldoDia >= 0 ? 'text-slate-900' : 'text-red-700'}`}>
                        {formatMoeda(f.saldoDia)}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Entradas</span>
                        <span className="font-semibold text-green-700">{formatMoeda(f.entradas)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Saídas</span>
                        <span className="font-semibold text-red-700">{formatMoeda(f.saidas)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 pt-1 mt-1">
                        <span className="text-slate-500">Saldo acumulado</span>
                        <span className={`font-semibold ${f.saldoAcumulado >= 0 ? 'text-violet-700' : 'text-red-700'}`}>
                          {formatMoeda(f.saldoAcumulado)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: tabela */}
              <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <Th>Dia</Th>
                      <Th className="text-right">Entradas</Th>
                      <Th className="text-right">Saídas</Th>
                      <Th className="text-right">Saldo do dia</Th>
                      <Th className="text-right">Saldo acumulado</Th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {fluxo.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">Sem dados no período</td></tr>
                    ) : fluxo.map((f) => (
                      <tr key={f.dia} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">{formatDia(f.dia)}</td>
                        <td className="px-4 py-2 text-sm text-right text-green-700">{formatMoeda(f.entradas)}</td>
                        <td className="px-4 py-2 text-sm text-right text-red-700">{formatMoeda(f.saidas)}</td>
                        <td className={`px-4 py-2 text-sm text-right font-semibold ${f.saldoDia >= 0 ? 'text-gray-900' : 'text-red-700'}`}>
                          {formatMoeda(f.saldoDia)}
                        </td>
                        <td className={`px-4 py-2 text-sm text-right ${f.saldoAcumulado >= 0 ? 'text-violet-700' : 'text-red-700'}`}>
                          {formatMoeda(f.saldoAcumulado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function TabBtn({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`pb-2 px-1 text-sm font-medium border-b-2 ${
        ativo ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-600 hover:text-gray-900'
      }`}>{children}</button>
  )
}

function ResumoCard({ titulo, valor, cor, small = false }: { titulo: string; valor: string; cor: string; small?: boolean }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{titulo}</div>
      <div className={`${small ? 'text-sm' : 'text-2xl'} font-bold mt-1 ${cor}`}>{valor}</div>
    </div>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  )
}
