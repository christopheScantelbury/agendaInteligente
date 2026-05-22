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
          <label className="block text-gray-400 text-xs mb-1">Último atendimento há</label>
          <select
            value={diasSemRetorno}
            onChange={(e) => setDiasSemRetorno(Number(e.target.value))}
            className="bg-gray-700 text-gray-200 border border-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {DIAS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Mínimo de atendimentos</label>
          <select
            value={minAtendimentos}
            onChange={(e) => setMinAtendimentos(Number(e.target.value))}
            className="bg-gray-700 text-gray-200 border border-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {MIN_ATENDIMENTOS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Counter */}
      {!isLoading && !isFetching && sumidos.length > 0 && (
        <div className="inline-flex items-center gap-2 bg-orange-900/30 border border-orange-800/50 text-orange-400 px-3 py-1.5 rounded-md text-sm">
          <span className="font-bold text-base">{sumidos.length}</span>
          <span>cliente{sumidos.length !== 1 ? 's' : ''} sumido{sumidos.length !== 1 ? 's' : ''} há {diasSemRetorno}+ dias</span>
        </div>
      )}

      {/* Table */}
      {isLoading || isFetching ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : sumidos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          Nenhum cliente sumido com os filtros selecionados.
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Nome</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Último atendimento</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium hidden sm:table-cell">Nº atend.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sumidos.map((s) => (
                  <tr key={s.clienteId} className="hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        className="text-blue-400 hover:text-blue-300 font-medium text-left"
                        onClick={() => setQuickModalId(s.clienteId)}
                      >
                        {s.clienteNome}
                      </button>
                      {s.clienteTelefone && (
                        <div className="text-gray-500 text-xs">{s.clienteTelefone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      <div>{formatDate(s.ultimoAtendimento)}</div>
                      <div className="text-orange-400 text-xs">
                        há {s.diasSemRetorno} dia{s.diasSemRetorno !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300 hidden sm:table-cell">
                      {s.totalAtendimentos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ClienteQuickModal clienteId={quickModalId} onClose={() => setQuickModalId(null)} />
    </div>
  )
}
