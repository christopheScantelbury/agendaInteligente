import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link2, Copy, Check, ExternalLink, Trash2, AlertCircle, Loader2, QrCode } from 'lucide-react'
import { linkPublicoService } from '../../services/linkPublicoService'
import { useNotification } from '../../contexts/NotificationContext'
import ConfigPageHeader from '../../components/configuracoes/ConfigPageHeader'
import ProximaEtapaCard from '../../components/configuracoes/ProximaEtapaCard'

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$/
const SLUG_MIN = 3
const SLUG_MAX = 60

function normalizar(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

function baseUrlPublica(): string {
  // Em produção usa a origem atual; em dev pode ser substituído por env
  return window.location.origin
}

export default function LinkPublicoConfig() {
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['configuracoes', 'link-publico'],
    queryFn: () => linkPublicoService.buscar(),
    retry: false,
  })

  // Log explícito pra ficar fácil debug no console se a query falhar
  useEffect(() => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[LinkPublicoConfig] erro ao buscar link-publico:', error)
    }
  }, [error])

  const [slugDraft, setSlugDraft] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [mostrarQR, setMostrarQR] = useState(false)
  const [salvou, setSalvou] = useState(false)

  useEffect(() => {
    if (data?.slug) setSlugDraft(data.slug)
  }, [data?.slug])

  const slugNormalizado = useMemo(() => normalizar(slugDraft), [slugDraft])
  const slugMudou = slugNormalizado !== (data?.slug ?? '')
  const formatoValido =
    slugNormalizado.length >= SLUG_MIN &&
    slugNormalizado.length <= SLUG_MAX &&
    SLUG_REGEX.test(slugNormalizado)

  const { data: disponibilidade, isFetching: checandoDisponibilidade } = useQuery({
    queryKey: ['link-publico', 'disponibilidade', slugNormalizado],
    queryFn: () => linkPublicoService.verificarDisponibilidade(slugNormalizado),
    enabled: !!slugNormalizado && formatoValido && slugMudou,
    staleTime: 10_000,
  })

  const urlAtual = data?.slug ? `${baseUrlPublica()}/e/${data.slug}` : null
  const urlPreview = slugNormalizado ? `${baseUrlPublica()}/e/${slugNormalizado}` : null

  const salvarMutation = useMutation({
    mutationFn: (slug: string) => linkPublicoService.atualizar(slug),
    onSuccess: (res) => {
      queryClient.setQueryData(['configuracoes', 'link-publico'], res)
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'gerente', 'checklist'] })
      setSalvou(true)
      showNotification('success', 'Link público atualizado!')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Não foi possível salvar. Tente outro link.'
      showNotification('error', msg)
    },
  })

  const removerMutation = useMutation({
    mutationFn: () => linkPublicoService.remover(),
    onSuccess: (res) => {
      queryClient.setQueryData(['configuracoes', 'link-publico'], res)
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'gerente', 'checklist'] })
      setSlugDraft('')
      showNotification('success', 'Link removido.')
    },
  })

  const copiar = async () => {
    if (!urlAtual) return
    try {
      await navigator.clipboard.writeText(urlAtual)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      showNotification('error', 'Não foi possível copiar')
    }
  }

  const podeSalvar =
    formatoValido && slugMudou && disponibilidade?.disponivel !== false && !salvarMutation.isPending

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <ConfigPageHeader />
      <header>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Link2 className="h-6 w-6 text-violet-600" />
          Link público da empresa
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Personalize a URL que seus clientes usam para agendar online. Compartilhe em redes
          sociais, WhatsApp ou QR code.
        </p>
      </header>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-red-900">Não foi possível carregar.</p>
            <p className="text-xs text-red-700 mt-1 break-words">
              {(error as any)?.response?.data?.message ?? (error as any)?.message ?? 'Erro desconhecido. Recarregue a página em alguns instantes.'}
            </p>
          </div>
        </div>
      ) : !data ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">
            Resposta vazia do servidor. Tente recarregar.
          </p>
        </div>
      ) : (
        <>
          {/* Link atual (se existe) */}
          {urlAtual && (
            <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5">
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-2">
                Seu link atual
              </p>
              <div className="flex items-center gap-2 bg-white rounded-lg border border-emerald-200 px-3 py-2.5">
                <code className="flex-1 text-sm text-slate-800 truncate font-mono">
                  {urlAtual}
                </code>
                <button
                  type="button"
                  onClick={copiar}
                  className="flex-shrink-0 p-2 rounded-lg hover:bg-emerald-100 text-emerald-700 transition"
                  aria-label="Copiar link"
                  title={copiado ? 'Copiado!' : 'Copiar'}
                >
                  {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
                <a
                  href={urlAtual}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-shrink-0 p-2 rounded-lg hover:bg-emerald-100 text-emerald-700 transition"
                  aria-label="Abrir link em nova aba"
                  title="Abrir"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setMostrarQR((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-900"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  {mostrarQR ? 'Ocultar' : 'Mostrar'} QR code
                </button>
                <button
                  type="button"
                  onClick={() => removerMutation.mutate()}
                  disabled={removerMutation.isPending}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover link
                </button>
              </div>
              {mostrarQR && (
                <div className="mt-4 flex justify-center bg-white p-4 rounded-xl">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(urlAtual)}`}
                    alt={`QR code para ${urlAtual}`}
                    width={200}
                    height={200}
                    loading="lazy"
                  />
                </div>
              )}
            </section>
          )}

          {/* Editor */}
          <section className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1">
              {urlAtual ? 'Alterar link' : 'Criar seu link personalizado'}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              3 a 60 caracteres. Letras minúsculas, números e hifens. Sem espaços.
            </p>

            <label
              htmlFor="slug-input"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Endereço público
            </label>
            <div className="flex items-stretch rounded-xl border border-slate-300 bg-white overflow-hidden focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition">
              <span className="flex items-center pl-3 pr-1 text-sm text-slate-400 select-none whitespace-nowrap">
                {baseUrlPublica().replace(/^https?:\/\//, '')}/e/
              </span>
              <input
                id="slug-input"
                type="text"
                value={slugDraft}
                onChange={(e) => setSlugDraft(e.target.value)}
                placeholder="minha-empresa"
                className="flex-1 min-w-0 px-1 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={SLUG_MAX}
              />
            </div>

            {/* Feedback de validação */}
            <div className="min-h-[20px] mt-2">
              {slugDraft && !formatoValido && (
                <p className="text-xs text-red-600">
                  Use 3 a 60 caracteres: letras minúsculas, números e hifens (não pode começar ou terminar com hifen).
                </p>
              )}
              {slugDraft && formatoValido && slugMudou && checandoDisponibilidade && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Verificando disponibilidade…
                </p>
              )}
              {slugDraft && formatoValido && slugMudou && !checandoDisponibilidade && disponibilidade && (
                disponibilidade.disponivel ? (
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Disponível! Preview: <code className="font-mono">{urlPreview}</code>
                  </p>
                ) : (
                  <p className="text-xs text-red-600">
                    {disponibilidade.motivo ?? 'Este link já está em uso.'}
                  </p>
                )
              )}
            </div>

            <button
              type="button"
              onClick={() => salvarMutation.mutate(slugNormalizado)}
              disabled={!podeSalvar}
              className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition shadow-sm"
            >
              {salvarMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {urlAtual ? 'Salvar alteração' : 'Criar link'}
            </button>
          </section>

          {/* Dica */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-800">💡 Dica</p>
            <p>
              Escolha um link curto, fácil de lembrar e que represente sua marca. Exemplo:
              <code className="mx-1 px-1.5 py-0.5 bg-white rounded font-mono text-slate-700">salao-bella</code>
              ou
              <code className="mx-1 px-1.5 py-0.5 bg-white rounded font-mono text-slate-700">clinica-renascer</code>.
            </p>
          </div>

          {salvou && <ProximaEtapaCard tarefaAtualId="publico" />}
        </>
      )}
    </div>
  )
}
