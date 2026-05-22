import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { clienteService } from '../../../services/clienteService'
import { servicoService } from '../../../services/servicoService'
import { authService } from '../../../services/authService'
import ClienteQuickModal from '../../../components/clientes/ClienteQuickModal'

const PRAZO_OPTIONS = [
  { value: 15, label: '15 dias' },
  { value: 21, label: '21 dias' },
  { value: 30, label: '30 dias' },
  { value: 60, label: '2 meses' },
  { value: 90, label: '3 meses' },
  { value: 180, label: '6 meses' },
]

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR')
}

export default function ClienteRetornos() {
  const usuario = authService.getUsuario()
  const unidadeId = usuario?.unidadeId

  const [servicoId, setServicoId] = useState<number | null>(null)
  const [diasLimite, setDiasLimite] = useState(30)
  const [quickModalId, setQuickModalId] = useState<number | null>(null)

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: servicoService.listar,
  })

  const { data: retornos = [], isLoading, isFetching } = useQuery({
    queryKey: ['clientes-retornos', unidadeId, servicoId, diasLimite],
    queryFn: () => clienteService.buscarRetornos(unidadeId!, servicoId!, diasLimite),
    enabled: !!unidadeId && !!servicoId,
  })

  function getDiasBadge(dias: number) {
    if (dias < 0) return 'bg-red-900/60 text-red-400'
    if (dias <= 7) return 'bg-yellow-900/60 text-yellow-400'
    return 'bg-green-900/60 text-green-400'
  }

  function getDiasLabel(dias: number) {
    if (dias < 0) return `${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? 's' : ''} atrás`
    if (dias === 0) return 'Hoje'
    return `em ${dias} dia${dias !== 1 ? 's' : ''}`
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-gray-400 text-xs mb-1">Serviço</label>
          <select
            value={servicoId ?? ''}
            onChange={(e) => setServicoId(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-gray-700 text-gray-200 border border-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Selecione um serviço...</option>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Prazo de retorno</label>
          <select
            value={diasLimite}
            onChange={(e) => setDiasLimite(Number(e.target.value))}
            className="bg-gray-700 text-gray-200 border border-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PRAZO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {!servicoId ? (
        <div className="text-center py-12 text-gray-400">
          Selecione um serviço para ver os retornos previstos.
        </div>
      ) : isLoading || isFetching ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : retornos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          Nenhum retorno previsto para os filtros selecionados.
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Nome</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Retorno</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Dias p/ retorno</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium hidden sm:table-cell">Último atend.</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">Nº atend.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {retornos.map((r) => (
                  <tr key={r.clienteId} className="hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        className="text-blue-400 hover:text-blue-300 font-medium text-left"
                        onClick={() => setQuickModalId(r.clienteId)}
                      >
                        {r.clienteNome}
                      </button>
                      {r.clienteTelefone && (
                        <div className="text-gray-500 text-xs">{r.clienteTelefone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{formatDate(r.dataRetorno)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getDiasBadge(r.diasParaRetorno)}`}>
                        {getDiasLabel(r.diasParaRetorno)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 hidden sm:table-cell">
                      {formatDate(r.ultimoAtendimento)}
                    </td>
                    <td className="px-4 py-3 text-gray-300 hidden md:table-cell">
                      {r.totalAtendimentos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-gray-700 text-sm text-gray-400">
            {retornos.length} cliente{retornos.length !== 1 ? 's' : ''} — ordenado por urgência
          </div>
        </div>
      )}

      <ClienteQuickModal clienteId={quickModalId} onClose={() => setQuickModalId(null)} />
    </div>
  )
}
