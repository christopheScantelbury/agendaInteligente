import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Building2, Search, UserCog, AlertCircle, X } from 'lucide-react'
import { plataformaService, EmpresaPlataforma } from '../../services/plataformaService'
import { useNotification } from '../../contexts/NotificationContext'
import { iniciarImpersonacao } from '../../lib/impersonation'

type FiltroStatus = 'TODAS' | 'ATIVA' | 'INATIVA'

export default function EmpresasPlataforma() {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('TODAS')
  const [confirmacao, setConfirmacao] = useState<EmpresaPlataforma | null>(null)
  const [motivo, setMotivo] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleAssumir() {
    if (!confirmacao) return
    if (motivo.trim().length < 5) {
      showNotification('error', 'Informe um motivo (mínimo 5 caracteres)')
      return
    }
    setCarregando(true)
    try {
      await iniciarImpersonacao(confirmacao.id, motivo.trim())
      showNotification('success', `Você está como ${confirmacao.nome}. Sessão expira em 15 min.`)
      setConfirmacao(null)
      setMotivo('')
      navigate('/')
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || 'Erro ao assumir sessão')
    } finally {
      setCarregando(false)
    }
  }

  const { data: empresas = [], isLoading, error } = useQuery({
    queryKey: ['plataforma', 'empresas'],
    queryFn: () => plataformaService.listarEmpresas(),
  })

  const empresasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return empresas
      .filter((e) => filtroStatus === 'TODAS' || e.status === filtroStatus)
      .filter((e) => {
        if (!termo) return true
        return [e.nome, e.razaoSocial, e.cnpj, e.email]
          .some((s) => s?.toLowerCase().includes(termo))
      })
  }, [empresas, busca, filtroStatus])

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Não foi possível carregar empresas</p>
            <p className="text-xs text-red-700 mt-1">Verifique se você tem perfil ADMIN global.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Empresas da plataforma</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isLoading ? 'Carregando...' : `${empresasFiltradas.length} de ${empresas.length} empresas`}
        </p>
      </header>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, razão social, CNPJ ou email"
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1">
          {(['TODAS', 'ATIVA', 'INATIVA'] as FiltroStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFiltroStatus(s)}
              className={`
                px-3 py-2 rounded-lg text-xs font-semibold transition
                ${filtroStatus === s
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
              `}
            >
              {s === 'TODAS' ? 'Todas' : s === 'ATIVA' ? 'Ativas' : 'Inativas'}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: cards */}
      <div className="block sm:hidden space-y-2 mb-4">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="h-12 bg-gray-100 animate-pulse rounded" />
            </div>
          ))
        ) : empresasFiltradas.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Nenhuma empresa encontrada com esses filtros.
          </div>
        ) : empresasFiltradas.map((e) => {
          const ativa = e.status === 'ATIVA'
          return (
            <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-sm transition">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-violet-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{e.nome}</p>
                    <p className="text-xs text-slate-500 truncate">{e.cnpj || e.email || '—'}</p>
                  </div>
                </div>
                <span
                  className={`shrink-0 inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    ativa ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {ativa ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Plano</span>
                  <span className="text-slate-900">{e.plano ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cadastro</span>
                  <span className="text-slate-900">
                    {e.dataCadastro ? format(parseISO(e.dataCadastro), "dd/MM/yyyy", { locale: ptBR }) : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Última atividade</span>
                  <span className="text-slate-900 truncate ml-2">
                    {e.ultimaAtividade ? formatDistanceToNow(parseISO(e.ultimaAtividade), { locale: ptBR, addSuffix: true }) : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Agendamentos (mês)</span>
                  <span className="font-semibold text-slate-900">{e.agendamentosMes}</span>
                </div>
              </div>
              <div className="flex justify-end mt-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmacao(e)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg"
                >
                  <UserCog className="h-3.5 w-3.5" />
                  Assumir sessão
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-3">
                  Empresa
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                  Plano
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                  Cadastro
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                  Última atividade
                </th>
                <th className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                  Agendamentos (mês)
                </th>
                <th className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-3">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-6 bg-gray-100 animate-pulse rounded" />
                    </td>
                  </tr>
                ))
              ) : empresasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    Nenhuma empresa encontrada com esses filtros.
                  </td>
                </tr>
              ) : (
                empresasFiltradas.map((e) => (
                  <EmpresaRow
                    key={e.id}
                    empresa={e}
                    onAssumirSessao={() => setConfirmacao(e)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !carregando && setConfirmacao(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-amber-700" />
                <h3 className="text-base font-bold text-amber-900">Assumir sessão</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmacao(null)}
                disabled={carregando}
                aria-label="Fechar"
                className="p-1 rounded-full text-amber-700 hover:bg-amber-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-slate-700">
                Você vai operar como <strong>{confirmacao.nome}</strong> por <strong>15 minutos</strong>.
                Toda ação será registrada na auditoria.
              </p>
              <div>
                <label htmlFor="motivo" className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo (obrigatório)
                </label>
                <textarea
                  id="motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  placeholder="Ex: Suporte ao chamado #1234 — cliente relatou erro ao emitir NFS-e"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmacao(null)}
                disabled={carregando}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAssumir}
                disabled={carregando || motivo.trim().length < 5}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold disabled:opacity-50"
              >
                {carregando ? 'Assumindo...' : 'Confirmar e assumir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EmpresaRow({
  empresa,
  onAssumirSessao,
}: {
  empresa: EmpresaPlataforma
  onAssumirSessao: () => void
}) {
  const ativa = empresa.status === 'ATIVA'
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-4 w-4 text-violet-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate">{empresa.nome}</p>
            <p className="text-xs text-gray-500 truncate">
              {empresa.cnpj || empresa.email || '—'}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
          {empresa.plano ?? '—'}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
            ativa ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {empresa.status === 'ATIVA' ? 'Ativa' : 'Inativa'}
        </span>
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-600">
        {empresa.dataCadastro
          ? format(parseISO(empresa.dataCadastro), "dd/MM/yyyy", { locale: ptBR })
          : '—'}
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-600">
        {empresa.ultimaAtividade
          ? formatDistanceToNow(parseISO(empresa.ultimaAtividade), { locale: ptBR, addSuffix: true })
          : '—'}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-right text-sm font-semibold text-slate-900">
        {empresa.agendamentosMes}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={onAssumirSessao}
          aria-label="Assumir sessão"
          title="Em breve — depende de #94"
          className="
            inline-flex items-center gap-1 px-2.5 py-1.5
            text-xs font-semibold text-violet-700
            bg-violet-50 hover:bg-violet-100 rounded-lg
            disabled:opacity-50
          "
        >
          <UserCog className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Assumir</span>
        </button>
      </td>
    </tr>
  )
}
