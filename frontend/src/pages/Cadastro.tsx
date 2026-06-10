import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { authService } from '../services/authService'

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

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition'

const labelClass = 'block text-sm font-semibold text-slate-700 mb-1.5'

export default function Cadastro() {
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [areaAtuacao, setAreaAtuacao] = useState('')
  const [quantidadeUnidades, setQuantidadeUnidades] = useState(1)
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (senha.length < 6) { setErro('A senha deve ter no mínimo 6 caracteres'); return }
    if (!Number.isFinite(quantidadeUnidades) || quantidadeUnidades < 1) { setErro('Informe uma quantidade de unidades válida'); return }
    setLoading(true)
    try {
      await authService.cadastrar({ nome, email, areaAtuacao, quantidadeUnidades, telefone: telefone.trim() || undefined, senha })
      navigate('/login')
    } catch (error: any) {
      setErro(error.response?.data?.message || 'Erro ao realizar cadastro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8 sm:py-12"
      style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-100 rounded-full opacity-60 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-100 rounded-full opacity-40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8">
          <div className="flex flex-col items-center mb-7">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <LogoMark size={40} />
              <span className="text-xl font-black text-slate-900 tracking-tight">
                Agenda<span className="text-violet-600">Inteligente</span>
              </span>
            </Link>
            <h1 className="text-lg font-bold text-slate-800">Criar conta grátis</h1>
            <p className="text-sm text-slate-500 mt-1">14 dias grátis · sem cartão de crédito</p>
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Nome</label>
              <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>E-mail</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Área de atuação</label>
              <input type="text" required value={areaAtuacao} onChange={(e) => setAreaAtuacao(e.target.value)} placeholder="Ex.: Clínica odontológica" className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Unidades</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={Number.isNaN(quantidadeUnidades) ? '' : String(quantidadeUnidades)}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '')
                    setQuantidadeUnidades(cleaned === '' ? NaN : Math.max(1, Number(cleaned)))
                  }}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Telefone</label>
                <input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Senha</label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'} required
                  value={senha} onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={`${inputClass} pr-11`}
                />
                <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition">
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-all shadow-md shadow-violet-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Criando conta...' : 'Criar conta grátis →'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Já tem conta?{' '}
            <Link to="/login" className="font-semibold text-violet-600 hover:text-violet-700">
              Fazer login
            </Link>
          </p>
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">
          © 2026 AgendaInteligente
        </p>
      </div>
    </div>
  )
}
