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
  const [customDias, setCustomDias] = useState('')
  const [quickModalId, setQuickModalId] = useState<number | null>(null)

  const isCustom = !PRAZO_OPTIONS.some((o) => o.value === diasLimite)

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: servicoService.listar,
  })

  const { data: retornos = [], isLoading, isFetching } = useQuery({
    queryKey: ['clientes-retornos', unidadeId, servicoId, diasLimite],
    queryFn: () => clienteService.buscarRetornos(unidadeId!, servicoId!, diasLimite),
    enabled: !!unidadeId && !!servicoId && diasLimite > 0,
  })

  function getDiasBadge(dias: number) {
    if (dias < 0) return 'bg-red-50 text-red-700 border border-red-200'
    if (dias <= 7) return 'bg-amber-50 text-amber-700 border border-amber-200'
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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
          <label className="block text-slate-500 text-xs mb-1 font-medium">Serviço</label>
          <select
            value={servicoId ?? ''}
            onChange={(e) => setServicoId(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          >
            <option value="">Selecione um serviço...</option>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-slate-500 text-xs mb-1 font-medium">Prazo de retorno</label>
            <select
              value={isCustom ? 'custom' : diasLimite}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setCustomDias('')
                  setDiasLimite(-1)
                } else {
                  setDiasLimite(Number(e.target.value))
                  setCustomDias('')
                }
              }}
              className="bg-white text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            >
              {PRAZO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
              <option value="custom">Personalizado</option>
            </select>
          </div>
          {isCustom && (
            <div>
              <label className="block text-slate-500 text-xs mb-1 font-medium">Dias</label>
              <input
                type="number"
                min={1}
                max={730}
                value={customDias}
                onChange={(e) => {
                  setCustomDias(e.target.value)
                  const n = parseInt(e.target.value, 10)
                  if (n > 0) setDiasLimite(n)
                }}
                placeholder="ex: 45"
                className="w-24 bg-white text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {!servicoId ? (
        <div className="text-center py-12 text-slate-400">
          Selecione um serviço para ver os retornos previstos.
        </div>
      ) : isLoading || isFetching ? (
        <div className="text-center py-8 text-slate-400">Carregando...</div>
      ) : retornos.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          Nenhum retorno previsto para os filtros selecionados.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold">Nome</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold">Retorno</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold">Dias p/ retorno</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold hidden sm:table-cell">Último atend.</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold hidden md:table-cell">Nº atend.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {retornos.map((r) => (
                  <tr key={r.clienteId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        className="text-violet-700 hover:text-violet-900 font-medium text-left"
                        onClick={() => setQuickModalId(r.clienteId)}
                      >
                        {r.clienteNome}
                      </button>
                      {r.clienteTelefone && (
                        <div className="text-slate-400 text-xs">{r.clienteTelefone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(r.dataRetorno)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getDiasBadge(r.diasParaRetorno)}`}>
                        {getDiasLabel(r.diasParaRetorno)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                      {formatDate(r.ultimoAtendimento)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                      {r.totalAtendimentos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-sm text-slate-500">
            {retornos.length} cliente{retornos.length !== 1 ? 's' : ''} — ordenado por urgência
          </div>
        </div>
      )}

      <ClienteQuickModal clienteId={quickModalId} onClose={() => setQuickModalId(null)} />
    </div>
  )
}
