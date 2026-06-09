import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
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

interface RecuperarSenhaProps {
  tipo: TipoUsuario
  voltarPara: string
  labelCampo: string
  placeholderCampo: string
}

export default function RecuperarSenha({
  tipo,
  voltarPara,
  labelCampo,
  placeholderCampo,
}: RecuperarSenhaProps) {
  const navigate = useNavigate()
  const [valor, setValor] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await recuperacaoSenhaService.solicitar(tipo, { emailOuCpf: valor })
    } catch (error: any) {
      // BUG-02 (#105): erro 404 ("não encontrado") vaza existência de conta.
      // Tratamos como sucesso silencioso — só erros não-404 viram feedback.
      const status = error.response?.status
      if (status && status !== 404 && status !== 400) {
        setErro('Não foi possível enviar o link agora. Tente novamente em instantes.')
        setLoading(false)
        return
      }
    } finally {
      setLoading(false)
    }
    setEnviado(true)
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
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8">
          <div className="flex flex-col items-center mb-6">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <LogoMark size={40} />
              <span className="text-xl font-black text-slate-900 tracking-tight">
                Agenda<span className="text-violet-600">Inteligente</span>
              </span>
            </Link>
            <h1 className="text-lg font-bold text-slate-800">Recuperar senha</h1>
            <p className="text-sm text-slate-500 mt-1 text-center">
              Informe seu {labelCampo.toLowerCase()} e enviaremos um link para você redefinir.
            </p>
          </div>

          {enviado ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <p className="text-sm text-slate-700">
                Se essa conta existir, enviamos um e-mail com instruções para redefinir a senha.
                <br />
                <span className="text-slate-500">Confira sua caixa de entrada e spam.</span>
              </p>
              <button
                type="button"
                onClick={() => navigate(voltarPara)}
                className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-all shadow-md shadow-violet-200"
              >
                Voltar para o login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {erro && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {erro}
                </div>
              )}

              <div>
                <label htmlFor="valor" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {labelCampo}
                </label>
                <input
                  id="valor"
                  type="text"
                  required
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder={placeholderCampo}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-all shadow-md shadow-violet-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>

              <p className="text-center text-sm text-slate-500 mt-2">
                <Link to={voltarPara} className="font-semibold text-violet-600 hover:text-violet-700">
                  Voltar para o login
                </Link>
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">© 2026 AgendaInteligente</p>
      </div>
    </div>
  )
}
