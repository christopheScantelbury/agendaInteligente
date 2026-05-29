import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Eye, EyeOff, Loader2, AlertCircle, Check, Plus, Trash2, Building2 } from 'lucide-react'
import api from '../services/api'
import { useNotification } from '../contexts/NotificationContext'

interface UnidadeOpcao {
  id: number
  nome: string
}

interface ConviteInfo {
  token: string
  maxUnidades: number
  dataExpiracaoLink: string
  dataExpiracaoAcesso: string
  valido: boolean
  mensagemErro: string | null
  /** "ATENDENTE" (convite de gerente/administrador) ou "GERENTE" (admin global). */
  tipoDestinatario?: 'ATENDENTE' | 'GERENTE'
  empresaNome?: string | null
  unidadesDisponiveis?: UnidadeOpcao[]
}

interface UnidadeForm {
  nome: string
}

interface FormState {
  nome: string
  email: string
  senha: string
  confirmarSenha: string
  // Fluxo GERENTE (admin global)
  nomeEmpresa: string
  unidades: UnidadeForm[]
  // Fluxo ATENDENTE
  cpf: string
  telefone: string
  unidadesIds: number[]
}

function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="9" fill="#7C3AED" />
      <rect x="6" y="6" width="20" height="20" rx="3" fill="white" />
      <rect x="10" y="4" width="4" height="5" rx="1.5" fill="#DDD6FE" />
      <rect x="18" y="4" width="4" height="5" rx="1.5" fill="#DDD6FE" />
      <line x1="10" y1="16" x2="22" y2="16" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="19.5" x2="18" y2="19.5" stroke="#C4B5FD" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="22" cy="22" r="4" fill="#10B981" />
      <path d="M20.5 22l1 1 2.5-2.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function CadastroPorConvite() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erros, setErros] = useState<string[]>([])

  const [form, setForm] = useState<FormState>({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    nomeEmpresa: '',
    unidades: [{ nome: '' }],
    cpf: '',
    telefone: '',
    unidadesIds: [],
  })

  const { data: info, isLoading, error: loadError } = useQuery({
    queryKey: ['convite-acesso', token],
    queryFn: async () => {
      const { data } = await api.get<ConviteInfo>(`/publico/convites/acesso/${token}`)
      return data
    },
    enabled: !!token,
    retry: false,
  })

  const finalizarMutation = useMutation({
    mutationFn: async (payload: any) => {
      // Rota muda conforme o tipo do convite
      const path = info?.tipoDestinatario === 'ATENDENTE'
        ? `/publico/convites/acesso/${token}/finalizar-atendente`
        : `/publico/convites/acesso/${token}/finalizar`
      await api.post(path, payload)
    },
    onSuccess: () => {
      showNotification('success', 'Conta criada! Faça login com seu email e senha.')
      setTimeout(() => navigate('/login?cadastro=ok'), 1200)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Não foi possível concluir o cadastro.'
      showNotification('error', msg)
    },
  })

  const isAtendente = info?.tipoDestinatario === 'ATENDENTE'

  // Ao receber info válida, garante que unidades respeita maxUnidades
  useEffect(() => {
    if (!info?.valido) return
    if (form.unidades.length > info.maxUnidades) {
      setForm((p) => ({ ...p, unidades: p.unidades.slice(0, info.maxUnidades) }))
    }
  }, [info, form.unidades.length])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const erros: string[] = []
    if (!form.nome.trim() || form.nome.trim().length < 2) erros.push('Informe seu nome completo.')
    if (!form.email.trim() || !form.email.includes('@')) erros.push('Email inválido.')
    if (form.senha.length < 6) erros.push('Senha precisa ter no mínimo 6 caracteres.')
    if (form.senha !== form.confirmarSenha) erros.push('As senhas não coincidem.')

    if (isAtendente) {
      const cpfLimpo = form.cpf.replace(/\D/g, '')
      if (cpfLimpo.length !== 11) erros.push('CPF inválido (11 dígitos).')
      if (form.unidadesIds.length === 0) erros.push('Selecione pelo menos uma unidade.')
    } else {
      if (!form.nomeEmpresa.trim() || form.nomeEmpresa.trim().length < 2) erros.push('Informe o nome da empresa.')
      const unidadesValidas = form.unidades.filter((u) => u.nome.trim().length >= 2)
      if (unidadesValidas.length === 0) erros.push('Informe pelo menos uma unidade.')
    }

    if (erros.length) {
      setErros(erros)
      return
    }
    setErros([])

    if (isAtendente) {
      finalizarMutation.mutate({
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        senha: form.senha,
        cpf: form.cpf.replace(/\D/g, ''),
        telefone: form.telefone.trim() || null,
        unidadesIds: form.unidadesIds,
      })
    } else {
      const unidadesValidas = form.unidades.filter((u) => u.nome.trim().length >= 2)
      finalizarMutation.mutate({
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        senha: form.senha,
        nomeEmpresa: form.nomeEmpresa.trim(),
        unidades: unidadesValidas.map((u) => ({ nome: u.nome.trim() })),
      })
    }
  }

  const toggleUnidadeId = (id: number) => {
    setForm((p) => ({
      ...p,
      unidadesIds: p.unidadesIds.includes(id)
        ? p.unidadesIds.filter((x) => x !== id)
        : [...p.unidadesIds, id],
    }))
  }

  const adicionarUnidade = () => {
    if (info && form.unidades.length >= info.maxUnidades) return
    setForm((p) => ({ ...p, unidades: [...p.unidades, { nome: '' }] }))
  }

  const removerUnidade = (idx: number) => {
    if (form.unidades.length === 1) return
    setForm((p) => ({ ...p, unidades: p.unidades.filter((_, i) => i !== idx) }))
  }

  const setUnidadeNome = (idx: number, nome: string) => {
    setForm((p) => ({
      ...p,
      unidades: p.unidades.map((u, i) => (i === idx ? { nome } : u)),
    }))
  }

  // Render
  if (!token) {
    return <TelaErro titulo="Link inválido" descricao="Este link não contém um token de convite." />
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-sm">Validando convite…</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <TelaErro
        titulo="Não foi possível validar o convite"
        descricao={(loadError as any)?.response?.data?.message ?? 'O link pode ter expirado ou já ter sido usado.'}
      />
    )
  }

  if (info && !info.valido) {
    return (
      <TelaErro
        titulo="Convite inválido"
        descricao={info.mensagemErro ?? 'Este convite expirou ou já foi utilizado. Peça um novo link ao administrador.'}
      />
    )
  }

  return (
    <div
      className="min-h-screen bg-slate-50 px-4 py-8"
      style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-100 rounded-full opacity-60 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-100 rounded-full opacity-40 blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark size={40} />
            <span className="text-xl font-black text-slate-900 tracking-tight">
              Agenda<span className="text-violet-600">Inteligente</span>
            </span>
          </Link>
        </div>

        {/* Hero */}
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 sm:p-5 mb-6">
          <p className="text-sm font-semibold text-violet-900">
            🎉 Você foi convidado para a equipe!
          </p>
          <p className="text-xs text-violet-700 mt-1">
            {isAtendente
              ? <>Complete o cadastro abaixo para acessar como <strong>profissional</strong>
                  {info?.empresaNome ? <> da <strong>{info.empresaNome}</strong></> : null}.
                </>
              : <>Complete o cadastro abaixo para acessar o sistema. Você poderá criar até{' '}
                  <strong>{info?.maxUnidades ?? 1}</strong> unidade{(info?.maxUnidades ?? 1) > 1 ? 's' : ''}.
                </>
            }
          </p>
        </div>

        {/* Card de cadastro */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Criar sua conta</h1>
          <p className="text-sm text-slate-500 mb-5">
            {isAtendente
              ? 'Preencha seus dados para acessar a agenda como profissional.'
              : 'Você será cadastrado como gerente da empresa que vai criar abaixo.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Dados pessoais */}
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                Seus dados
              </h2>

              <div className="space-y-3">
                <div>
                  <label htmlFor="nome" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nome completo
                  </label>
                  <input
                    id="nome"
                    type="text"
                    required
                    value={form.nome}
                    onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                    placeholder="Maria Souza"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="maria@empresa.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="senha" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Senha
                    </label>
                    <div className="relative">
                      <input
                        id="senha"
                        type={mostrarSenha ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={form.senha}
                        onChange={(e) => setForm((p) => ({ ...p, senha: e.target.value }))}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarSenha((v) => !v)}
                        aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="confirmarSenha" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Confirmar senha
                    </label>
                    <input
                      id="confirmarSenha"
                      type={mostrarSenha ? 'text' : 'password'}
                      required
                      value={form.confirmarSenha}
                      onChange={(e) => setForm((p) => ({ ...p, confirmarSenha: e.target.value }))}
                      placeholder="Repita a senha"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </section>

            {isAtendente ? (
              /* ─── Fluxo ATENDENTE: CPF, telefone, escolher unidades existentes ─── */
              <section className="pt-4 border-t border-slate-100">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                  Onde você vai atuar
                </h2>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="cpf" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        CPF
                      </label>
                      <input
                        id="cpf"
                        type="text"
                        required
                        value={form.cpf}
                        onChange={(e) => setForm((p) => ({ ...p, cpf: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                        placeholder="00000000000"
                        inputMode="numeric"
                        maxLength={11}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="telefone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Telefone <span className="text-slate-400 font-normal">(opcional)</span>
                      </label>
                      <input
                        id="telefone"
                        type="text"
                        value={form.telefone}
                        onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))}
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Unidades em que você atende
                    </label>
                    {info?.unidadesDisponiveis && info.unidadesDisponiveis.length > 0 ? (
                      <ul className="space-y-1.5">
                        {info.unidadesDisponiveis.map((u) => {
                          const checked = form.unidadesIds.includes(u.id)
                          return (
                            <li key={u.id}>
                              <label
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition ${
                                  checked
                                    ? 'border-violet-400 bg-violet-50'
                                    : 'border-slate-200 bg-slate-50 hover:bg-white'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleUnidadeId(u.id)}
                                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                                />
                                <Building2 className="h-4 w-4 text-violet-600 flex-shrink-0" />
                                <span className="text-sm text-slate-800 font-medium">{u.nome}</span>
                              </label>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        Nenhuma unidade ativa encontrada. Peça ao convidador para cadastrar
                        ao menos uma unidade e gerar um novo link.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            ) : (
              /* ─── Fluxo GERENTE (admin global): cria empresa nova ─── */
              <section className="pt-4 border-t border-slate-100">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                  Sua empresa
                </h2>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="nomeEmpresa" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nome da empresa
                    </label>
                    <input
                      id="nomeEmpresa"
                      type="text"
                      required
                      value={form.nomeEmpresa}
                      onChange={(e) => setForm((p) => ({ ...p, nomeEmpresa: e.target.value }))}
                      placeholder="Salão da Maria"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Unidades
                      <span className="ml-2 text-[10px] text-slate-500 font-normal">
                        ({form.unidades.length}/{info?.maxUnidades ?? 1})
                      </span>
                    </label>
                    <div className="space-y-2">
                      {form.unidades.map((u, idx) => (
                        <div key={idx} className="flex gap-2">
                          <div className="flex-1 relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                              type="text"
                              value={u.nome}
                              onChange={(e) => setUnidadeNome(idx, e.target.value)}
                              placeholder={`Nome da unidade ${idx + 1}`}
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            />
                          </div>
                          {form.unidades.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removerUnidade(idx)}
                              className="px-3 rounded-xl bg-white border border-slate-200 text-red-500 hover:bg-red-50 transition"
                              aria-label="Remover unidade"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {info && form.unidades.length < info.maxUnidades && (
                        <button
                          type="button"
                          onClick={adicionarUnidade}
                          className="text-xs font-semibold text-violet-700 hover:text-violet-900 inline-flex items-center gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Adicionar mais uma unidade
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Erros */}
            {erros.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <ul className="text-xs text-red-700 space-y-0.5">
                  {erros.map((e) => (
                    <li key={e}>• {e}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={finalizarMutation.isPending}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold transition-all shadow-md shadow-violet-200 mt-3"
            >
              {finalizarMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {finalizarMutation.isPending ? 'Criando conta…' : 'Criar conta e acessar'}
            </button>

            <p className="text-center text-xs text-slate-400 mt-2">
              Ao criar a conta, você concorda com os termos do serviço.
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">© 2026 AgendaInteligente</p>
      </div>
    </div>
  )
}

function TelaErro({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">{titulo}</h1>
        <p className="text-sm text-slate-600 mb-6">{descricao}</p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700 text-sm font-semibold"
        >
          Ir para a tela de login
        </Link>
      </div>
    </div>
  )
}
