import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  HelpCircle,
  MessageCircle,
  RefreshCw,
  Search,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { faqsPorRota, SUPORTE_WHATSAPP } from '../config/faqs'
import {
  resetarOnboarding as resetCliente,
  iniciarTourCliente,
} from './cliente/OnboardingCliente'
import {
  resetarOnboardingProfissional as resetProfissional,
  iniciarTourProfissional,
} from './profissional/OnboardingProfissional'
import {
  resetarOnboardingGerente as resetGerente,
  iniciarTourGerente,
} from './gerente/OnboardingGerente'

/**
 * FAB de ajuda contextual — camada 4 do onboarding.
 * Aparece em todas as telas autenticadas (admin/gerente/profissional + cliente perfil).
 */
export default function HelpFab() {
  const location = useLocation()
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set())

  const contexto = faqsPorRota(location.pathname)

  // Fecha ao trocar de rota
  useEffect(() => {
    setAberto(false)
    setExpandidos(new Set())
    setBusca('')
  }, [location.pathname])

  // ESC fecha
  useEffect(() => {
    if (!aberto) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [aberto])

  function toggleExpand(idx: number) {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function refazerTour() {
    setAberto(false)
    if (contexto.tourId === 'cliente') {
      resetCliente()
      navigate('/cliente')
      setTimeout(iniciarTourCliente, 300)
    } else if (contexto.tourId === 'profissional') {
      resetProfissional()
      navigate('/profissional/hoje')
      setTimeout(iniciarTourProfissional, 300)
    } else if (contexto.tourId === 'gerente') {
      resetGerente()
      navigate('/gerente/dashboard')
      setTimeout(iniciarTourGerente, 300)
    }
  }

  const termo = busca.trim().toLowerCase()
  const faqsFiltradas = termo
    ? contexto.faqs.filter(
        (f) =>
          f.pergunta.toLowerCase().includes(termo) || f.resposta.toLowerCase().includes(termo)
      )
    : contexto.faqs.slice(0, 3) // Top 3 por padrão

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Abrir ajuda"
        className="
          fixed bottom-20 right-4 sm:bottom-4 z-30
          w-12 h-12 rounded-full
          bg-violet-600 hover:bg-violet-700
          text-white shadow-lg shadow-violet-200
          flex items-center justify-center
          transition-transform hover:scale-105
        "
      >
        <HelpCircle className="h-6 w-6" />
      </button>

      {aberto && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-end sm:pr-6">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setAberto(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-titulo"
            className="
              relative w-full sm:max-w-sm bg-white
              rounded-t-2xl sm:rounded-2xl shadow-2xl
              animate-slideUp sm:animate-fadeIn
              pb-[env(safe-area-inset-bottom)]
              max-h-[80vh] flex flex-col
            "
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-violet-600" />
                <h2 id="help-titulo" className="text-base font-bold text-slate-900">
                  {contexto.titulo ?? 'Ajuda'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="p-1.5 -mr-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar na ajuda"
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {faqsFiltradas.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  Nenhuma resposta encontrada. Tente outras palavras ou fale com o suporte.
                </p>
              ) : (
                <>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {termo ? 'Resultados' : 'Perguntas frequentes'}
                  </p>
                  <ul className="space-y-1.5">
                    {faqsFiltradas.map((faq, i) => {
                      const expandido = expandidos.has(i)
                      return (
                        <li key={i} className="border border-gray-100 rounded-lg">
                          <button
                            type="button"
                            onClick={() => toggleExpand(i)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-gray-50 rounded-lg"
                          >
                            <span className="text-sm font-medium text-slate-900 flex-1">
                              {faq.pergunta}
                            </span>
                            {expandido ? (
                              <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            )}
                          </button>
                          {expandido && (
                            <div className="px-3 pb-3 text-sm text-gray-600 leading-relaxed">
                              {faq.resposta}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </div>

            <div className="border-t border-gray-100 p-3 space-y-2">
              <a
                href={SUPORTE_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm font-semibold">Falar com suporte</span>
              </a>
              {contexto.tourId && (
                <button
                  type="button"
                  onClick={refazerTour}
                  className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 transition"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-sm font-semibold">Refazer tour desta tela</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
