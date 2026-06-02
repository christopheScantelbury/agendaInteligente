import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authService } from '../services/authService'
import { Events, identify, track } from '../lib/analytics'
import { Eye, EyeOff } from 'lucide-react'

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

export default function Login() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  useEffect(() => {
    if (searchParams.get('sessao') === 'expirada') {
      setErro('Sua sessão expirou. Faça login novamente para continuar.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const data = await authService.login({ email, senha })
      identify(data.usuarioId, { perfil: data.perfil, nome: data.nome })
      track(Events.LOGIN_SUCCESS, { perfil: data.perfil, tipo: 'usuario' })
      const perfil = (data.perfil ?? '').toUpperCase()
      // window.location.href força re-mount do App pra re-avaliar os guards
      // de rota (que são calculados no JSX, não a cada navegação)
      let destino = '/dashboard'
      if (perfil === 'CLIENTE') destino = '/cliente'
      else if (perfil === 'PROFISSIONAL') destino = '/profissional/hoje'
      else if (perfil === 'GERENTE' || perfil === 'ADMINISTRADOR') destino = '/gerente/dashboard'
      else if (perfil === 'ADMIN') destino = '/plataforma'
      window.location.href = destino
    } catch (error: any) {
      if (!error.response) {
        setErro('Serviço temporariamente indisponível. Tente novamente em instantes.')
      } else if (error.response.status === 401) {
        setErro('E-mail ou senha incorretos.')
      } else {
        setErro(error.response?.data?.message || 'Erro ao fazer login. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-slate-50 px-4"
      style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-100 rounded-full opacity-60 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-100 rounded-full opacity-40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <LogoMark size={40} />
              <span className="text-xl font-black text-slate-900 tracking-tight">
                Agenda<span className="text-violet-600">Inteligente</span>
              </span>
            </Link>
            <h1 className="text-lg font-bold text-slate-800">Bem-vindo de volta</h1>
            <p className="text-sm text-slate-500 mt-1">Acesse sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {erro && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {erro}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label htmlFor="senha" className="block text-sm font-semibold text-slate-700 mb-1.5">
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
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="text-right mt-1.5">
                <Link to="/recuperar-senha" className="text-xs font-semibold text-violet-600 hover:text-violet-700">
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
            <Link to="/cadastro" className="font-semibold text-violet-600 hover:text-violet-700">
              Cadastre-se grátis
            </Link>
          </p>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              É cliente?{' '}
              <Link
                to="/cliente/login"
                className="font-semibold text-violet-600 hover:text-violet-700"
              >
                Entre por aqui
              </Link>
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400 mt-4">
          © 2026 AgendaInteligente
        </p>
      </div>
    </div>
  )
}
