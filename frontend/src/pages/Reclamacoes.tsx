import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  MessageSquare,
  Send,
  Heart,
  Lightbulb,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  User,
  Mail,
  Phone,
  ChevronLeft,
} from 'lucide-react'
import { reclamacaoService, Reclamacao, CategoriaReclamacao } from '../services/reclamacaoService'
import { unidadeService } from '../services/unidadeService'
import { authService } from '../services/authService'
import { clientePublicoService } from '../services/clientePublicoService'
import { useNotification } from '../contexts/NotificationContext'
import { maskPhone, maskEmail } from '../utils/masks'

const CATEGORIAS: Array<{
  value: CategoriaReclamacao
  label: string
  icon: React.ComponentType<{ className?: string }>
  badgeClass: string
  description: string
}> = [
  {
    value: 'RECLAMACAO',
    label: 'Reclamação',
    icon: AlertTriangle,
    badgeClass: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    description: 'Algo não funcionou bem',
  },
  {
    value: 'SUGESTAO',
    label: 'Sugestão',
    icon: Lightbulb,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    description: 'Como podemos melhorar',
  },
  {
    value: 'ELOGIO',
    label: 'Elogio',
    icon: Heart,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    description: 'Algo que adorou',
  },
]

const INPUT_BASE =
  'mt-1 block w-full rounded-xl bg-white px-3 py-2.5 text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 transition'
const INPUT_OK = `${INPUT_BASE} border border-slate-200 focus:border-violet-400 focus:ring-violet-100`
const INPUT_ERR = `${INPUT_BASE} border border-red-300 focus:border-red-400 focus:ring-red-100`
const cls = (field: string, errors: Record<string, string>) =>
  errors[field] ? INPUT_ERR : INPUT_OK

function FieldError({ field, errors }: { field: string; errors: Record<string, string> }) {
  if (!errors[field]) return null
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      <span>{errors[field]}</span>
    </p>
  )
}

/**
 * Form público (sem login) pra enviar reclamação/sugestão/elogio.
 *
 * Comportamento:
 * - Anônimo (sem login): só pergunta a mensagem + categoria. Não tenta carregar
 *   unidades (endpoint exige auth). Campos de contato opcionais.
 * - Logado como CLIENTE: pré-preenche nome + email + telefone do cliente, e
 *   lista as unidades disponíveis pra escolha.
 * - Param ?unidadeId=X pré-seleciona a unidade (vindo do PWA cliente).
 */
export default function Reclamacoes() {
  const { showNotification } = useNotification()
  const navigate = useNavigate()
  const location = useLocation()

  const params = new URLSearchParams(location.search)
  const unidadeIdParam = params.get('unidadeId')

  // PRIORIZA cliente PWA (clienteToken). Se não tem clienteToken mas tem admin token,
  // ignora o admin — não faz sentido pré-preencher reclamação como "Profissional Salao"
  // quando o usuário veio do botão "Enviar feedback" do app cliente.
  const clientePWA = clientePublicoService.getCliente?.()
  const isAutenticadoComoCliente = !!clientePWA
  const isAutenticado = isAutenticadoComoCliente
    || !!authService.getToken?.()
    || !!authService.getUsuario?.()

  const [form, setForm] = useState<Reclamacao>({
    mensagem: '',
    categoria: 'RECLAMACAO',
    unidadeId: unidadeIdParam ? Number(unidadeIdParam) : undefined,
    nomeReclamante: '',
    emailReclamante: '',
    telefoneReclamante: '',
  })

  const [enviado, setEnviado] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Pré-preenche dados do cliente logado quando disponível.
  // Prioridade: clienteToken (PWA) > authService usuário (admin/profissional)
  useEffect(() => {
    if (!isAutenticado) return
    if (clientePWA) {
      setForm((prev) => ({
        ...prev,
        nomeReclamante: prev.nomeReclamante || (clientePWA as any).nome || '',
        emailReclamante: prev.emailReclamante || (clientePWA as any).email || '',
      }))
      return
    }
    const usuario = authService.getUsuario()
    if (!usuario) return
    setForm((prev) => ({
      ...prev,
      nomeReclamante: prev.nomeReclamante || (usuario as any).nome || '',
      emailReclamante: prev.emailReclamante || (usuario as any).email || '',
      unidadeId: prev.unidadeId ?? (usuario as any).unidadeId,
    }))
  }, [isAutenticado, clientePWA])

  // Carrega unidades só quando autenticado (endpoint exige auth)
  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades', 'ativas'],
    queryFn: unidadeService.listar,
    enabled: isAutenticado,
  })

  const clearFieldError = (field: string) =>
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const { [field]: _, ...rest } = prev
      return rest
    })

  const criarMutation = useMutation({
    mutationFn: reclamacaoService.criar,
    onSuccess: () => {
      setEnviado(true)
    },
    onError: (error: any) => {
      const data = error?.response?.data
      const backendErrors = (data?.errors ?? {}) as Record<string, string | string[]>
      const flatErrors: Record<string, string> = {}
      Object.entries(backendErrors).forEach(([k, v]) => {
        flatErrors[k] = Array.isArray(v) ? String(v[0] ?? '') : String(v ?? '')
      })
      if (Object.keys(flatErrors).length > 0) {
        setFieldErrors(flatErrors)
        showNotification('error', Object.values(flatErrors)[0] || 'Confira os campos.')
      } else {
        showNotification('error', data?.message || 'Erro ao enviar mensagem')
      }
    },
  })

  const validar = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    if (!form.mensagem || form.mensagem.trim().length < 5) {
      errs.mensagem = 'Conte um pouco mais (mínimo 5 caracteres)'
    }
    if (form.emailReclamante && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailReclamante)) {
      errs.emailReclamante = 'Email inválido'
    }
    const telDigits = (form.telefoneReclamante ?? '').replace(/\D/g, '')
    if (telDigits && (telDigits.length < 10 || telDigits.length > 11)) {
      errs.telefoneReclamante = 'Telefone deve ter 10 ou 11 dígitos com DDD'
    }
    return errs
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validar()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      showNotification('error', Object.values(errs)[0])
      return
    }
    setFieldErrors({})
    criarMutation.mutate({
      ...form,
      telefoneReclamante: form.telefoneReclamante?.replace(/\D/g, '') || undefined,
    })
  }

  // Estado de sucesso (após envio)
  if (enviado) {
    const categoria = CATEGORIAS.find((c) => c.value === form.categoria) ?? CATEGORIAS[0]
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Mensagem enviada!</h1>
          <p className="text-sm text-slate-600">
            Obrigado pelo {categoria.label.toLowerCase()}. A equipe vai analisar e{' '}
            {form.emailReclamante || form.telefoneReclamante ? (
              <>responder pelo contato que você deixou.</>
            ) : (
              <>tomar as ações necessárias.</>
            )}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-2 mt-6">
            <button
              onClick={() => {
                setForm({
                  mensagem: '',
                  categoria: 'RECLAMACAO',
                  unidadeId: undefined,
                  nomeReclamante: isAutenticado ? form.nomeReclamante : '',
                  emailReclamante: isAutenticado ? form.emailReclamante : '',
                  telefoneReclamante: '',
                })
                setEnviado(false)
              }}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
            >
              Enviar outra
            </button>
            <button
              onClick={() => navigate(isAutenticado ? '/cliente/perfil' : '/')}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 shadow-sm shadow-violet-200 transition"
            >
              {isAutenticado ? 'Voltar para meu perfil' : 'Voltar'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Voltar quando logado */}
      {isAutenticado && (
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-violet-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </button>
      )}

      {/* Header */}
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
          <MessageSquare className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fale com a gente</h1>
          <p className="text-sm text-slate-500">
            {isAutenticado
              ? 'Reclamação, sugestão ou elogio. Sua mensagem chega na equipe.'
              : 'Sua mensagem é confidencial. Identifique-se só se quiser receber resposta.'}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Categoria — chips grandes */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            O que você quer dizer?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {CATEGORIAS.map((c) => {
              const ativo = form.categoria === c.value
              const Icon = c.icon
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm({ ...form, categoria: c.value })}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 text-xs font-semibold transition ${
                    ativo
                      ? c.badgeClass + ' ring-2 ring-offset-1 ring-violet-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{c.label}</span>
                  <span className="text-[10px] text-slate-500 font-normal leading-tight">
                    {c.description}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Mensagem */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Sua mensagem <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.mensagem}
              onChange={(e) => {
                setForm({ ...form, mensagem: e.target.value })
                clearFieldError('mensagem')
              }}
              rows={6}
              placeholder="Conte com detalhes pra gente entender o que aconteceu."
              maxLength={4000}
              className={`${cls('mensagem', fieldErrors)} resize-none`}
            />
            <div className="flex items-center justify-between mt-1">
              <FieldError field="mensagem" errors={fieldErrors} />
              <span className="text-[11px] text-slate-400 ml-auto">
                {(form.mensagem ?? '').length}/4000
              </span>
            </div>
          </div>

          {isAutenticado && unidades.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Unidade</label>
              <select
                value={form.unidadeId ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    unidadeId: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className={cls('unidadeId', fieldErrors)}
              >
                <option value="">Não escolher</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        {/* Contato opcional */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Seu contato (opcional)
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Deixe contato pra receber uma resposta. Pular pra enviar anônima.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <User className="h-3 w-3" />
              Nome
            </label>
            <input
              type="text"
              value={form.nomeReclamante ?? ''}
              onChange={(e) => {
                setForm({ ...form, nomeReclamante: e.target.value })
                clearFieldError('nomeReclamante')
              }}
              placeholder="Como te chamamos"
              maxLength={150}
              className={cls('nomeReclamante', fieldErrors)}
            />
            <FieldError field="nomeReclamante" errors={fieldErrors} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Email
              </label>
              <input
                type="email"
                value={form.emailReclamante ?? ''}
                onChange={(e) => {
                  setForm({ ...form, emailReclamante: maskEmail(e.target.value) })
                  clearFieldError('emailReclamante')
                }}
                placeholder="seu@email.com"
                maxLength={255}
                className={cls('emailReclamante', fieldErrors)}
              />
              <FieldError field="emailReclamante" errors={fieldErrors} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Telefone / WhatsApp
              </label>
              <input
                type="tel"
                value={form.telefoneReclamante ?? ''}
                onChange={(e) => {
                  setForm({ ...form, telefoneReclamante: maskPhone(e.target.value) })
                  clearFieldError('telefoneReclamante')
                }}
                placeholder="(00) 00000-0000"
                maxLength={15}
                className={cls('telefoneReclamante', fieldErrors)}
              />
              <FieldError field="telefoneReclamante" errors={fieldErrors} />
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={criarMutation.isPending}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 shadow-sm shadow-violet-200 disabled:bg-slate-300 transition"
        >
          <Send className="h-4 w-4" />
          {criarMutation.isPending ? 'Enviando...' : 'Enviar mensagem'}
        </button>
      </form>
    </div>
  )
}
