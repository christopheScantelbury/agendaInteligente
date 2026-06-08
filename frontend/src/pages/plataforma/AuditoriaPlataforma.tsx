import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertCircle, Download, Eye, Filter, ShieldCheck } from 'lucide-react'
import { plataformaService, AuditLogEntry, AuditLogFiltros } from '../../services/plataformaService'

function badgeColor(tipoAcao: string): string {
  if (tipoAcao.includes('LOGIN')) return 'bg-emerald-100 text-emerald-800'
  if (tipoAcao.includes('LOGOUT')) return 'bg-slate-100 text-slate-700'
  if (tipoAcao.includes('IMPERSONATE') || tipoAcao.includes('ASSUMIR')) return 'bg-violet-100 text-violet-800'
  if (tipoAcao.includes('DELETE') || tipoAcao.includes('EXCLUIR')) return 'bg-red-100 text-red-800'
  if (tipoAcao.includes('CREATE') || tipoAcao.includes('CRIAR')) return 'bg-blue-100 text-blue-800'
  return 'bg-gray-100 text-gray-700'
}

function exportCsv(entries: AuditLogEntry[]) {
  const header = ['timestamp', 'tipo_acao', 'autor_email', 'autor_perfil', 'entidade', 'entidade_id', 'descricao', 'ip', 'empresa_id']
  const rows = entries.map((e) => [
    e.timestamp,
    e.tipoAcao,
    e.autorEmail ?? '',
    e.autorPerfil ?? '',
    e.entidade ?? '',
    e.entidadeId?.toString() ?? '',
    (e.descricao ?? '').replace(/[\r\n,"]/g, ' '),
    e.ip ?? '',
    e.empresaId?.toString() ?? '',
  ])
  const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-log-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`
  document.body.appendChild(a)
  a.dispatchEvent(new MouseEvent('click'))
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function AuditoriaPlataforma() {
  const [filtros, setFiltros] = useState<AuditLogFiltros>({ size: 50, page: 0 })
  const [detalhe, setDetalhe] = useState<AuditLogEntry | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['plataforma', 'audit-log', filtros],
    queryFn: () => plataformaService.auditLog(filtros),
  })

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Não foi possível carregar a auditoria</p>
            <p className="text-xs text-red-700 mt-1">Verifique se você tem perfil ADMIN global.</p>
          </div>
        </div>
      </div>
    )
  }

  const entries = data?.content ?? []

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-violet-600" />
            Auditoria
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isLoading
              ? 'Carregando...'
              : `${data?.totalElements ?? 0} registros · página ${(data?.number ?? 0) + 1} de ${data?.totalPages ?? 1}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => exportCsv(entries)}
          disabled={entries.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </header>

      <section className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex flex-col sm:flex-row gap-2 items-stretch">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 px-2">
          <Filter className="h-3.5 w-3.5" />
          Filtros:
        </div>
        <input
          type="text"
          placeholder="Tipo de ação (ex: LOGIN_SUCCESS)"
          value={filtros.tipoAcao ?? ''}
          onChange={(e) => setFiltros({ ...filtros, tipoAcao: e.target.value || undefined, page: 0 })}
          className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <input
          type="date"
          value={filtros.de?.slice(0, 10) ?? ''}
          onChange={(e) => setFiltros({ ...filtros, de: e.target.value ? `${e.target.value}T00:00:00` : undefined, page: 0 })}
          className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <input
          type="date"
          value={filtros.ate?.slice(0, 10) ?? ''}
          onChange={(e) => setFiltros({ ...filtros, ate: e.target.value ? `${e.target.value}T23:59:59` : undefined, page: 0 })}
          className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </section>

      {/* Mobile: cards */}
      <div className="block sm:hidden space-y-2 mb-4">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="h-12 bg-gray-100 animate-pulse rounded" />
            </div>
          ))
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Nenhum registro encontrado.
          </div>
        ) : entries.map((e) => (
          <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-sm transition">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${badgeColor(e.tipoAcao)}`}>
                {e.tipoAcao}
              </span>
              <button
                type="button"
                onClick={() => setDetalhe(e)}
                aria-label="Ver detalhes"
                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 shrink-0"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Quando</span>
                <span className="text-slate-900">
                  {format(parseISO(e.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Autor</span>
                <span className="text-slate-900 truncate text-right">
                  {e.autorEmail ?? '—'}
                  {e.autorPerfil && <span className="text-slate-500"> · {e.autorPerfil}</span>}
                </span>
              </div>
              {e.entidade && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Entidade</span>
                  <span className="text-slate-900">{e.entidade}{e.entidadeId ? ` #${e.entidadeId}` : ''}</span>
                </div>
              )}
              {e.ip && (
                <div className="flex justify-between">
                  <span className="text-slate-500">IP</span>
                  <span className="text-slate-900 font-mono">{e.ip}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-3 py-3">
                  Quando
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-3 py-3">
                  Ação
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-3 py-3 hidden md:table-cell">
                  Autor
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-3 py-3 hidden lg:table-cell">
                  Entidade
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-3 py-3 hidden lg:table-cell">
                  IP
                </th>
                <th className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider px-3 py-3">
                  Detalhes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-3 py-3">
                      <div className="h-5 bg-gray-100 animate-pulse rounded" />
                    </td>
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                      {format(parseISO(e.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${badgeColor(e.tipoAcao)}`}>
                        {e.tipoAcao}
                      </span>
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      <p className="text-sm font-medium text-slate-900 truncate">{e.autorEmail ?? '—'}</p>
                      <p className="text-xs text-gray-500">{e.autorPerfil ?? ''}</p>
                    </td>
                    <td className="px-3 py-2 hidden lg:table-cell text-xs text-gray-600">
                      {e.entidade ? `${e.entidade}${e.entidadeId ? ` #${e.entidadeId}` : ''}` : '—'}
                    </td>
                    <td className="px-3 py-2 hidden lg:table-cell text-xs text-gray-500 font-mono">
                      {e.ip ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setDetalhe(e)}
                        aria-label="Ver detalhes"
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex justify-between items-center mt-3 text-sm">
          <button
            type="button"
            disabled={data.number === 0}
            onClick={() => setFiltros({ ...filtros, page: Math.max(0, (filtros.page ?? 0) - 1) })}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-gray-500">
            Página {data.number + 1} de {data.totalPages}
          </span>
          <button
            type="button"
            disabled={data.number >= data.totalPages - 1}
            onClick={() => setFiltros({ ...filtros, page: (filtros.page ?? 0) + 1 })}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}

      {detalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDetalhe(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-3">Detalhes</h3>
            <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(detalhe, null, 2)}
            </pre>
            <button
              type="button"
              onClick={() => setDetalhe(null)}
              className="mt-3 w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
