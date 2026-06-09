import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { recuperacaoSenhaService, TipoUsuario } from '../services/recuperacaoSenhaService'

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

interface RedefinirSenhaProps {
  tipo: TipoUsuario
  loginUrl: string
}

export default function RedefinirSenha({ tipo, loginUrl }: RedefinirSenhaProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [redefinido, setRedefinido] = useState(false)
  const [mostrar, setMostrar] = useState(false)

  if (!token) {
    return <TokenInvalido loginUrl={loginUrl} />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (novaSenha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres')
      return
    }
    if (novaSenha !== confirmar) {
      setErro('As senhas não coincidem')
      return
    }
    setLoading(true)
    try {
      await recuperacaoSenhaService.redefinir(tipo, { token, novaSenha })
      setRedefinido(true)
      setTimeout(() => navigate(loginUrl), 1500)
    } catch (error: any) {
      setErro(error.response?.data?.message || 'Link inválido ou expirado. Solicite um novo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Shell>
      {redefinido ? (
        <SuccessoRedefinicao loginUrl={loginUrl} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <h1 className="text-lg font-bold text-slate-800 text-center">Defina uma nova senha</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">
            Crie uma senha segura para sua conta.
          </p>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {erro}
            </div>
          )}

          <div>
            <label htmlFor="novaSenha" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Nova senha
            </label>
            <div className="relative">
              <input
                id="novaSenha"
                type={mostrar ? 'text' : 'password'}
                required
                minLength={6}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setMostrar((v) => !v)}
                aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmar" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Confirmar nova senha
            </label>
            <input
              id="confirmar"
              type={mostrar ? 'text' : 'password'}
              required
              minLength={6}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="Repita a senha"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-all shadow-md shadow-violet-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      )}
    </Shell>
  )
}

function SuccessoRedefinicao({ loginUrl }: { loginUrl: string }) {
  return (
    <div className="text-center space-y-4">
      <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
        <CheckCircle2 className="h-7 w-7 text-emerald-600" />
      </div>
      <h1 className="text-lg font-bold text-slate-800">Senha redefinida!</h1>
      <p className="text-sm text-slate-500">Você já pode entrar com sua nova senha.</p>
      <Link
        to={loginUrl}
        className="block w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-all shadow-md shadow-violet-200"
      >
        Ir para o login
      </Link>
    </div>
  )
}

function TokenInvalido({ loginUrl }: { loginUrl: string }) {
  return (
    <Shell>
      <div className="text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-amber-600" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">Link inválido</h1>
        <p className="text-sm text-slate-500">
          Não encontramos um token nesta URL. Solicite um novo link de recuperação.
        </p>
        <Link
          to={loginUrl}
          className="block w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-all shadow-md shadow-violet-200"
        >
          Voltar ao login
        </Link>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-slate-50 px-4"
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
          </div>
          {children}
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">© 2026 AgendaInteligente</p>
      </div>
    </div>
  )
}
