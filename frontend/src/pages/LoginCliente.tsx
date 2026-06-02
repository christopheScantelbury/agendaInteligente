import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { clientePublicoService } from '../services/clientePublicoService'
import { Events, identify, track } from '../lib/analytics'

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

export default function LoginCliente() {
  const [searchParams] = useSearchParams()
  const [emailOuCpf, setEmailOuCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  useEffect(() => {
    if (searchParams.get('sessao') === 'expirada') {
      setErro('Sua sessão expirou. Faça login novamente para continuar.')
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const data = await clientePublicoService.login({ emailOuCpf, senha })
      identify(`cliente_${data.clienteId}`, { perfil: 'CLIENTE', nome: data.nome })
      track(Events.LOGIN_SUCCESS, { perfil: 'CLIENTE', tipo: 'cliente' })
      // Force re-mount do App pra re-avaliar guards (mesmo motivo do Login admin)
      window.location.href = '/cliente'
    } catch (error: any) {
      setErro(error.response?.data?.message || 'E-mail/CPF ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

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
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <div className="flex flex-col items-center mb-8">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <LogoMark size={40} />
              <span className="text-xl font-black text-slate-900 tracking-tight">
                Agenda<span className="text-violet-600">Inteligente</span>
              </span>
            </Link>
            <h1 className="text-lg font-bold text-slate-800">Bem-vindo!</h1>
            <p className="text-sm text-slate-500 mt-1">
              Marque seu horário em poucos toques
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {erro && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {erro}
              </div>
            )}

            <div>
              <label
                htmlFor="emailOuCpf"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                E-mail ou CPF
              </label>
              <input
                id="emailOuCpf"
                type="text"
                required
                value={emailOuCpf}
                onChange={(e) => setEmailOuCpf(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label
                htmlFor="senha"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="text-right mt-1.5">
                <Link
                  to="/cliente/recuperar-senha"
                  className="text-xs font-semibold text-violet-600 hover:text-violet-700"
                >
                  Esqueci minha senha
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-all shadow-md shadow-violet-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Não tem conta?{' '}
            <Link
              to="/cliente/cadastro"
              className="font-semibold text-violet-600 hover:text-violet-700"
            >
              Cadastre-se grátis
            </Link>
          </p>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-slate-400">ou</span>
            </div>
          </div>

          <Link
            to="/cliente/agendar?guest=1"
            className="block w-full py-2.5 px-4 rounded-xl border-2 border-violet-200 hover:border-violet-400 text-violet-700 text-sm font-semibold text-center transition"
          >
            Agendar sem criar conta
          </Link>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              É atendente ou gerente?{' '}
              <Link
                to="/login"
                className="font-semibold text-violet-600 hover:text-violet-700"
              >
                Entre por aqui
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">© 2026 AgendaInteligente</p>
      </div>
    </div>
  )
}
