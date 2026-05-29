import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { clienteService } from '../../../services/clienteService'
import { authService } from '../../../services/authService'
import ClienteQuickModal from '../../../components/clientes/ClienteQuickModal'

const DIAS_OPTIONS = [
  { value: 15, label: '15 dias' },
  { value: 30, label: '30 dias' },
  { value: 60, label: '60 dias' },
  { value: 90, label: '90 dias' },
]

const MIN_ATENDIMENTOS_OPTIONS = [
  { value: 1, label: '1+' },
  { value: 2, label: '2+' },
  { value: 3, label: '3+' },
  { value: 5, label: '5+' },
]

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR')
}

export default function ClienteSumidos() {
  const usuario = authService.getUsuario()
  const unidadeId = usuario?.unidadeId

  const [diasSemRetorno, setDiasSemRetorno] = useState(15)
  const [minAtendimentos, setMinAtendimentos] = useState(1)
  const [quickModalId, setQuickModalId] = useState<number | null>(null)

  const { data: sumidos = [], isLoading, isFetching } = useQuery({
    queryKey: ['clientes-sumidos', unidadeId, diasSemRetorno, minAtendimentos],
    queryFn: () => clienteService.buscarSumidos(unidadeId!, diasSemRetorno, minAtendimentos),
    enabled: !!unidadeId,
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div>
          <label className="block text-slate-500 text-xs mb-1 font-medium">Último atendimento há</label>
          <select
            value={diasSemRetorno}
            onChange={(e) => setDiasSemRetorno(Number(e.target.value))}
            className="bg-white text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          >
            {DIAS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-slate-500 text-xs mb-1 font-medium">Mínimo de atendimentos</label>
          <select
            value={minAtendimentos}
            onChange={(e) => setMinAtendimentos(Number(e.target.value))}
            className="bg-white text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          >
            {MIN_ATENDIMENTOS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Counter */}
      {!isLoading && !isFetching && sumidos.length > 0 && (
        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-lg text-sm">
          <span className="font-bold text-base">{sumidos.length}</span>
          <span>cliente{sumidos.length !== 1 ? 's' : ''} sumido{sumidos.length !== 1 ? 's' : ''} há {diasSemRetorno}+ dias</span>
        </div>
      )}

      {/* Cards */}
      {isLoading || isFetching ? (
        <div className="text-center py-8 text-slate-400">Carregando...</div>
      ) : sumidos.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center text-sm text-slate-600">
          Nenhum cliente sumido com os filtros selecionados.
        </div>
      ) : (
        <ul className="space-y-2">
          {sumidos.map((s) => {
            const inicial = (s.clienteNome || '?').charAt(0).toUpperCase()
            return (
              <li
                key={s.clienteId}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-sm transition"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setQuickModalId(s.clienteId)}
                    className="h-10 w-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-sm font-bold flex-shrink-0 hover:bg-orange-200 transition"
                  >
                    {inicial}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setQuickModalId(s.clienteId)}
                        className="text-sm font-semibold text-slate-900 truncate hover:text-violet-700 text-left"
                      >
                        {s.clienteNome}
                      </button>
                      <span className="inline-flex items-center rounded-full bg-orange-50 text-orange-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                        há {s.diasSemRetorno}d
                      </span>
                    </div>
                    {s.clienteTelefone && (
                      <p className="text-xs text-slate-500 mt-0.5">{s.clienteTelefone}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Último: <span className="font-semibold text-slate-700">{formatDate(s.ultimoAtendimento)}</span>
                      {' · '}{s.totalAtendimentos} atend.
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ClienteQuickModal clienteId={quickModalId} onClose={() => setQuickModalId(null)} />
    </div>
  )
}
