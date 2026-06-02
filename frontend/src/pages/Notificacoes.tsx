import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Check,
  Sparkles,
  Copy,
  ClipboardCheck,
  Mail,
  MessageCircle,
  AlertTriangle,
  Lightbulb,
  Heart,
  Send,
  CheckCircle2,
  Archive,
  Eye,
  X,
} from 'lucide-react'
import {
  reclamacaoService,
  Reclamacao,
  StatusReclamacao,
  CategoriaReclamacao,
} from '../services/reclamacaoService'
import { authService } from '../services/authService'
import { unidadeService } from '../services/unidadeService'
import { perfilService } from '../services/perfilService'
import { podeEditar } from '../utils/permissions'
import Button from '../components/Button'
import { useNotification } from '../contexts/NotificationContext'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { iaService } from '../services/iaService'
import { getApiErrorMessage } from '../utils/apiError'

type Aba = 'pendentes' | 'lidas' | 'todas'

const CATEGORIA_META: Record<CategoriaReclamacao, { label: string; icon: React.ComponentType<{ className?: string }>; badge: string }> = {
  RECLAMACAO: { label: 'Reclamação', icon: AlertTriangle, badge: 'bg-red-50 text-red-700 border-red-200' },
  SUGESTAO: { label: 'Sugestão', icon: Lightbulb, badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  ELOGIO: { label: 'Elogio', icon: Heart, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

const STATUS_META: Record<StatusReclamacao, { label: string; badge: string }> = {
  RECEBIDA: { label: 'Recebida', badge: 'bg-slate-100 text-slate-700' },
  EM_ANALISE: { label: 'Em análise', badge: 'bg-blue-50 text-blue-700' },
  RESOLVIDA: { label: 'Resolvida', badge: 'bg-emerald-50 text-emerald-700' },
  ARQUIVADA: { label: 'Arquivada', badge: 'bg-slate-100 text-slate-500' },
}

const onlyDigits = (s?: string) => (s ?? '').replace(/\D/g, '')

export default function Notificacoes() {
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()
  const usuario = authService.getUsuario()
  const perfilNorm = (usuario?.perfil ?? '').toUpperCase().replace('-', '_')
  const isAdmin = perfilNorm === 'ADMIN' || perfilNorm === 'ADMINISTRADOR'
  const unidadeId = usuario?.unidadeId

  const [aba, setAba] = useState<Aba>('pendentes')
  const [filtroUnidade, setFiltroUnidade] = useState<number | undefined>(undefined)
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaReclamacao | 'TODAS'>('TODAS')

  const { data: perfil } = useQuery({
    queryKey: ['perfil', 'meu'],
    queryFn: () => perfilService.buscarMeuPerfil(),
    enabled: !!usuario,
  })
  const podeEditarNotificacoes = podeEditar(perfil, '/notificacoes')

  const { data: reclamacoes = [], isLoading } = useQuery<Reclamacao[]>({
    queryKey: ['reclamacoes', isAdmin ? 'todas' : 'unidade', unidadeId],
    queryFn: () => {
      if (isAdmin) return reclamacaoService.listarTodas()
      if (unidadeId) return reclamacaoService.listarPorUnidade(unidadeId)
      return Promise.resolve([])
    },
    enabled: isAdmin || !!unidadeId,
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: unidadeService.listarTodos,
    enabled: isAdmin,
  })

  const counts = useMemo(() => {
    const pendentes = reclamacoes.filter((r) => !r.lida).length
    const lidas = reclamacoes.filter((r) => r.lida).length
    return { pendentes, lidas, total: reclamacoes.length }
  }, [reclamacoes])

  const filtrados = useMemo(() => {
    let lista = reclamacoes
    if (aba === 'pendentes') lista = lista.filter((r) => !r.lida)
    else if (aba === 'lidas') lista = lista.filter((r) => r.lida)
    if (filtroUnidade) lista = lista.filter((r) => r.unidadeId === filtroUnidade)
    if (filtroCategoria !== 'TODAS') lista = lista.filter((r) => r.categoria === filtroCategoria)
    return lista.sort((a, b) => {
      const aDate = a.dataCriacao ? new Date(a.dataCriacao).getTime() : 0
      const bDate = b.dataCriacao ? new Date(b.dataCriacao).getTime() : 0
      return bDate - aDate
    })
  }, [reclamacoes, aba, filtroUnidade, filtroCategoria])

  const marcarComoLidaMutation = useMutation({
    mutationFn: reclamacaoService.marcarComoLida,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reclamacoes'] })
      showNotification('success', 'Marcada como lida')
    },
    onError: (e: any) => showNotification('error', getApiErrorMessage(e, 'Erro ao marcar como lida')),
  })

  const atualizarStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: StatusReclamacao }) =>
      reclamacaoService.atualizarStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reclamacoes'] })
      showNotification('success', 'Status atualizado')
    },
    onError: (e: any) => showNotification('error', getApiErrorMessage(e, 'Erro ao atualizar status')),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  const podeFiltrarUnidades = isAdmin && unidades.length > 1

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
          <Bell className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mensagens recebidas</h1>
          <p className="text-sm text-slate-500">
            {counts.pendentes > 0
              ? `${counts.pendentes} pendente${counts.pendentes > 1 ? 's' : ''} de leitura`
              : 'Nenhuma mensagem pendente'}
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200 w-full sm:w-auto">
        {(['pendentes', 'lidas', 'todas'] as Aba[]).map((tab) => {
          const ativo = aba === tab
          const count = tab === 'pendentes' ? counts.pendentes : tab === 'lidas' ? counts.lidas : counts.total
          const label =
            tab === 'pendentes' ? 'Pendentes' : tab === 'lidas' ? 'Lidas' : 'Todas'
          return (
            <button
              key={tab}
              onClick={() => setAba(tab)}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition ${
                ativo ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ativo ? 'bg-violet-100 text-violet-700' : 'bg-slate-200 text-slate-600'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Filtros secundários */}
      {(podeFiltrarUnidades || true) && (
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value as any)}
            className="text-sm rounded-xl border border-slate-200 bg-white px-3 py-1.5 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
          >
            <option value="TODAS">Todas as categorias</option>
            <option value="RECLAMACAO">Reclamação</option>
            <option value="SUGESTAO">Sugestão</option>
            <option value="ELOGIO">Elogio</option>
          </select>
          {podeFiltrarUnidades && (
            <select
              value={filtroUnidade ?? ''}
              onChange={(e) =>
                setFiltroUnidade(e.target.value ? Number(e.target.value) : undefined)
              }
              className="text-sm rounded-xl border border-slate-200 bg-white px-3 py-1.5 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
            >
              <option value="">Todas as unidades</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          )}
          {(filtroCategoria !== 'TODAS' || filtroUnidade) && (
            <button
              onClick={() => {
                setFiltroCategoria('TODAS')
                setFiltroUnidade(undefined)
              }}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-violet-600 hover:text-violet-800"
            >
              <X className="h-3 w-3" />
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
            <Bell className="h-5 w-5" />
          </div>
          <p className="text-sm text-slate-600">
            {aba === 'pendentes'
              ? 'Nenhuma mensagem pendente. Mande seu time tomar um café.'
              : aba === 'lidas'
                ? 'Você ainda não marcou nenhuma como lida.'
                : 'Nenhuma mensagem por aqui.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtrados.map((r) => (
            <ReclamacaoCard
              key={r.id}
              reclamacao={r}
              unidades={unidades}
              podeEditar={podeEditarNotificacoes}
              onMarcarComoLida={() => r.id && marcarComoLidaMutation.mutate(r.id)}
              onAtualizarStatus={(status) => r.id && atualizarStatusMutation.mutate({ id: r.id, status })}
              loading={marcarComoLidaMutation.isPending || atualizarStatusMutation.isPending}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function ReclamacaoCard({
  reclamacao,
  unidades,
  podeEditar,
  onMarcarComoLida,
  onAtualizarStatus,
  loading,
}: {
  reclamacao: Reclamacao
  unidades: any[]
  podeEditar: boolean
  onMarcarComoLida: () => void
  onAtualizarStatus: (status: StatusReclamacao) => void
  loading: boolean
}) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const [respostaIa, setRespostaIa] = useState(reclamacao.resposta ?? '')
  const [loadingIa, setLoadingIa] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [mostrarResponder, setMostrarResponder] = useState(false)
  const [respostaInput, setRespostaInput] = useState(reclamacao.resposta ?? '')

  const unidade = unidades.find((u) => u.id === reclamacao.unidadeId)
  const categoria = reclamacao.categoria ?? 'RECLAMACAO'
  const status = reclamacao.status ?? 'RECEBIDA'
  const catMeta = CATEGORIA_META[categoria]
  const statusMeta = STATUS_META[status]
  const CatIcon = catMeta.icon

  const temContato = !!(reclamacao.emailReclamante || reclamacao.telefoneReclamante)
  const dataFmt = reclamacao.dataCriacao
    ? format(new Date(reclamacao.dataCriacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : ''

  const responderMutation = useMutation({
    mutationFn: () => reclamacaoService.responder(reclamacao.id!, respostaInput),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reclamacoes'] })
      showNotification('success', 'Resposta registrada')
      setMostrarResponder(false)
    },
    onError: (e: any) => showNotification('error', getApiErrorMessage(e, 'Erro ao salvar resposta')),
  })

  const handleSugerirResposta = async () => {
    if (!reclamacao.mensagem) return
    setLoadingIa(true)
    try {
      const resposta = await iaService.sugerirRespostaReclamacao(reclamacao.mensagem)
      setRespostaIa(resposta)
      setRespostaInput(resposta)
      setMostrarResponder(true)
    } finally {
      setLoadingIa(false)
    }
  }

  const handleCopiar = () => {
    navigator.clipboard.writeText(respostaIa)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const isLida = !!reclamacao.lida
  const emailHref = reclamacao.emailReclamante
    ? `mailto:${reclamacao.emailReclamante}?subject=Resposta%20à%20sua%20mensagem&body=${encodeURIComponent(respostaInput || respostaIa || 'Olá, ')}`
    : null
  const whatsHref = reclamacao.telefoneReclamante
    ? `https://wa.me/55${onlyDigits(reclamacao.telefoneReclamante)}?text=${encodeURIComponent(respostaInput || respostaIa || 'Olá, ')}`
    : null

  return (
    <li className={`bg-white rounded-2xl overflow-hidden border ${isLida ? 'border-slate-200 opacity-90' : 'border-slate-200 shadow-sm'}`}>
      <div className="flex">
        {/* Barra colorida pela categoria */}
        <div
          className={`w-1.5 flex-shrink-0 ${
            categoria === 'RECLAMACAO' ? 'bg-red-500' : categoria === 'SUGESTAO' ? 'bg-amber-400' : 'bg-emerald-500'
          }`}
          aria-hidden
        />

        <div className="flex-1 min-w-0 p-4 sm:p-5">
          {/* Linha de badges */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${catMeta.badge}`}>
              <CatIcon className="h-3 w-3" />
              {catMeta.label}
            </span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusMeta.badge}`}>
              {statusMeta.label}
            </span>
            {unidade && (
              <span className="inline-flex items-center rounded-full bg-violet-50 text-violet-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                {unidade.nome}
              </span>
            )}
            {!isLida && (
              <span className="inline-flex h-2 w-2 rounded-full bg-violet-600" title="Não lida" />
            )}
          </div>

          {/* Mensagem */}
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{reclamacao.mensagem}</p>

          {/* Contato do reclamante */}
          {(reclamacao.nomeReclamante || temContato) && (
            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
              {reclamacao.nomeReclamante && (
                <p className="text-slate-700">
                  <span className="text-slate-500">De:</span>{' '}
                  <span className="font-semibold">{reclamacao.nomeReclamante}</span>
                </p>
              )}
              {reclamacao.emailReclamante && (
                <p className="text-slate-700">
                  <span className="text-slate-500">Email:</span>{' '}
                  <a href={`mailto:${reclamacao.emailReclamante}`} className="text-violet-700 hover:text-violet-900">
                    {reclamacao.emailReclamante}
                  </a>
                </p>
              )}
              {reclamacao.telefoneReclamante && (
                <p className="text-slate-700">
                  <span className="text-slate-500">Telefone:</span>{' '}
                  <span className="font-mono">{reclamacao.telefoneReclamante}</span>
                </p>
              )}
            </div>
          )}

          {/* Resposta já registrada */}
          {reclamacao.resposta && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Resposta registrada
                {reclamacao.respondidaPor && (
                  <span className="text-emerald-600 font-normal">· {reclamacao.respondidaPor}</span>
                )}
              </p>
              <p className="text-sm text-emerald-900 whitespace-pre-wrap">{reclamacao.resposta}</p>
            </div>
          )}

          {/* Resposta IA (sugestão) */}
          {respostaIa && !reclamacao.resposta && (
            <div className="mt-3 p-3 bg-violet-50 border border-violet-200 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-violet-700 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Sugestão da IA
                </span>
                <button
                  onClick={handleCopiar}
                  className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1"
                >
                  {copiado ? <ClipboardCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiado ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <textarea
                value={respostaIa}
                onChange={(e) => setRespostaIa(e.target.value)}
                className="w-full text-sm text-slate-700 bg-transparent border-none outline-none resize-none"
                rows={4}
              />
            </div>
          )}

          {/* Form de resposta */}
          {mostrarResponder && podeEditar && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="block text-xs font-semibold text-slate-600">Sua resposta</label>
              <textarea
                value={respostaInput}
                onChange={(e) => setRespostaInput(e.target.value)}
                rows={4}
                placeholder="Escreva a resposta que será registrada no histórico."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setMostrarResponder(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => responderMutation.mutate()}
                  disabled={!respostaInput.trim() || responderMutation.isPending}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300 transition"
                >
                  <Check className="h-3.5 w-3.5" />
                  {responderMutation.isPending ? 'Salvando...' : 'Registrar resposta'}
                </button>
              </div>
            </div>
          )}

          {/* Rodapé com data e ações */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-xs text-slate-500">
              Recebida em {dataFmt}
              {isLida && reclamacao.dataLeitura && (
                <span className="text-emerald-700 ml-2">
                  · Lida em {format(new Date(reclamacao.dataLeitura), 'dd/MM HH:mm', { locale: ptBR })}
                </span>
              )}
            </div>

            {podeEditar && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {!reclamacao.resposta && (
                  <button
                    onClick={handleSugerirResposta}
                    disabled={loadingIa}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-xl text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition disabled:opacity-60"
                  >
                    <Sparkles className="h-3 w-3" />
                    {loadingIa ? '...' : 'IA'}
                  </button>
                )}
                {!reclamacao.resposta && (
                  <button
                    onClick={() => {
                      setRespostaInput(reclamacao.resposta ?? respostaIa ?? '')
                      setMostrarResponder(true)
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
                  >
                    <Send className="h-3 w-3" />
                    Responder
                  </button>
                )}
                {emailHref && (
                  <a
                    href={emailHref}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 transition"
                    title="Abrir email"
                  >
                    <Mail className="h-3 w-3" />
                    Email
                  </a>
                )}
                {whatsHref && (
                  <a
                    href={whatsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition"
                    title="Abrir WhatsApp"
                  >
                    <MessageCircle className="h-3 w-3" />
                    WhatsApp
                  </a>
                )}
                {!isLida && (
                  <Button variant="secondary" size="sm" onClick={onMarcarComoLida} isLoading={loading}>
                    <Eye className="h-3 w-3" />
                    Marcar lida
                  </Button>
                )}
                {status !== 'RESOLVIDA' && (
                  <button
                    onClick={() => onAtualizarStatus('RESOLVIDA')}
                    disabled={loading}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Resolvida
                  </button>
                )}
                {status !== 'ARQUIVADA' && (
                  <button
                    onClick={() => onAtualizarStatus('ARQUIVADA')}
                    disabled={loading}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-xl text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition"
                  >
                    <Archive className="h-3 w-3" />
                    Arquivar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}
