import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { clientePublicoService, ClienteCadastroRequest } from '../services/clientePublicoService'
import { useNotification } from '../contexts/NotificationContext'

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

function formatarTelefone(valor: string): string {
  const num = valor.replace(/\D/g, '').slice(0, 11)
  if (num.length <= 10) return num.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  return num.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
}

function formatarCpfCnpj(valor: string): string {
  const num = valor.replace(/\D/g, '').slice(0, 14)
  if (num.length <= 11) {
    return num
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return num
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export default function CadastroCliente() {
  const navigate = useNavigate()
  const { showNotification } = useNotification()

  const [nome, setNome] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres')
      return
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem')
      return
    }

    setLoading(true)
    const dados: ClienteCadastroRequest = {
      nome,
      cpfCnpj: cpfCnpj.replace(/\D/g, ''),
      dataNascimento,
      email,
      telefone: telefone.replace(/\D/g, ''),
      senha,
    }

    try {
      await clientePublicoService.cadastrar(dados)
      // Login automático após cadastro
      try {
        await clientePublicoService.login({ emailOuCpf: email, senha })
        showNotification('success', 'Conta criada! Vamos agendar.')
        navigate('/cliente/agendar')
      } catch {
        showNotification('success', 'Conta criada com sucesso! Faça login para continuar.')
        navigate('/cliente/login')
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Erro ao criar conta. Tente novamente.'
      setErro(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8"
      style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-100 rounded-full opacity-60 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-100 rounded-full opacity-40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8">
          <div className="flex flex-col items-center mb-6">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <LogoMark size={40} />
              <span className="text-xl font-black text-slate-900 tracking-tight">
                Agenda<span className="text-violet-600">Inteligente</span>
              </span>
            </Link>
            <h1 className="text-lg font-bold text-slate-800">Crie sua conta</h1>
            <p className="text-sm text-slate-500 mt-1">É rápido — leva menos de 1 minuto</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {erro && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {erro}
              </div>
            )}

            <Field id="nome" label="Nome completo" required>
              <input
                id="nome"
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Como devemos te chamar"
                className={inputStyle}
              />
            </Field>

            <Field id="cpfCnpj" label="CPF" required>
              <input
                id="cpfCnpj"
                type="text"
                required
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(formatarCpfCnpj(e.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                className={inputStyle}
              />
            </Field>

            <Field id="dataNascimento" label="Data de nascimento" required>
              <input
                id="dataNascimento"
                type="date"
                required
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className={inputStyle}
              />
            </Field>

            <Field id="email" label="E-mail" required>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className={inputStyle}
              />
            </Field>

            <Field id="telefone" label="Telefone (WhatsApp)" required>
              <input
                id="telefone"
                type="tel"
                required
                value={telefone}
                onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                placeholder="(00) 00000-0000"
                inputMode="numeric"
                className={inputStyle}
              />
            </Field>

            <Field id="senha" label="Senha" required hint="Mínimo 6 caracteres">
              <input
                id="senha"
                type="password"
                required
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className={inputStyle}
              />
            </Field>

            <Field id="confirmarSenha" label="Confirmar senha" required>
              <input
                id="confirmarSenha"
                type="password"
                required
                minLength={6}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita a senha"
                className={inputStyle}
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-all shadow-md shadow-violet-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Já tem conta?{' '}
            <Link to="/cliente/login" className="font-semibold text-violet-600 hover:text-violet-700">
              Entrar
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">© 2026 AgendaInteligente</p>
      </div>
    </div>
  )
}

const inputStyle =
  'w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition'

function Field({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}
