import { useEffect, useState } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { Sparkles, X } from 'lucide-react'
import { authService } from '../../services/authService'
import { Events, track } from '../../lib/analytics'

const STORAGE_KEY = 'profissional_onboarding_visto_v1'

interface OnboardingProfissionalProps {
  forcado?: boolean
  onFinalizado?: () => void
}

export default function OnboardingProfissional({ forcado = false, onFinalizado }: OnboardingProfissionalProps) {
  const [modalAberto, setModalAberto] = useState(false)
  const usuario = authService.getUsuario()

  useEffect(() => {
    if (forcado) {
      setModalAberto(true)
      return
    }
    if (typeof window === 'undefined') return
    const visto = window.localStorage.getItem(STORAGE_KEY)
    if (!visto) {
      const timer = window.setTimeout(() => setModalAberto(true), 400)
      return () => window.clearTimeout(timer)
    }
  }, [forcado])

  function marcarVisto() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, '1')
    }
  }

  function fecharModal(iniciarTour: boolean) {
    setModalAberto(false)
    marcarVisto()
    if (iniciarTour) {
      track(Events.ONBOARDING_TOUR_INICIADO, { perfil: 'PROFISSIONAL' })
      iniciarTourProfissional(() => {
        track(Events.ONBOARDING_TOUR_COMPLETO, { perfil: 'PROFISSIONAL' })
        onFinalizado?.()
      })
    } else {
      track(Events.ONBOARDING_TOUR_PULADO, { perfil: 'PROFISSIONAL' })
      onFinalizado?.()
    }
  }

  if (!modalAberto) return null

  const primeiroNome = usuario?.nome?.split(' ')[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
        <button
          type="button"
          onClick={() => fecharModal(false)}
          aria-label="Fechar"
          className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="bg-gradient-to-br from-violet-600 to-violet-700 px-6 py-8 text-white text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-3">
            <Sparkles className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="text-xl font-bold">
            {primeiroNome ? `Olá, ${primeiroNome}!` : 'Olá!'}
          </h2>
          <p className="text-sm text-violet-100 mt-1 leading-relaxed">
            Boas vindas à equipe. Sua agenda do dia está pronta. Vamos ver como usar?
          </p>
        </div>

        <div className="px-6 py-5 space-y-2.5">
          <button
            type="button"
            onClick={() => fecharModal(true)}
            className="w-full py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-all"
          >
            Iniciar tour
          </button>
          <button
            type="button"
            onClick={() => fecharModal(false)}
            className="w-full py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Pular por agora
          </button>
        </div>
      </div>
    </div>
  )
}

export function iniciarTourProfissional(onComplete?: () => void) {
  const drv = driver({
    showProgress: true,
    nextBtnText: 'Próximo',
    prevBtnText: 'Anterior',
    doneBtnText: 'Concluir',
    progressText: '{{current}} de {{total}}',
    overlayColor: 'rgba(15, 23, 42, 0.6)',
    onDestroyed: () => {
      onComplete?.()
    },
    steps: [
      {
        element: '[data-tour="header-dia"]',
        popover: {
          title: 'Sua data e resumo do dia',
          description: 'Veja qual dia está exibido, navegue entre dias e acompanhe os KPIs do dia.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="timeline"]',
        popover: {
          title: 'Linha do tempo',
          description: 'Cada card é um agendamento. A cor indica o status. Toque em um para abrir as ações.',
          side: 'top',
        },
      },
      {
        element: '[data-tour="bottom-nav-profissional"]',
        popover: {
          title: 'Navegação',
          description: 'Hoje (modo dia), Agenda (próximos 7 dias) e Perfil.',
          side: 'top',
        },
      },
    ],
  })
  drv.drive()
}

export function resetarOnboardingProfissional() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}
