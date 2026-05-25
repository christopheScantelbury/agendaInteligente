import { useEffect, useState } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { Sparkles, X } from 'lucide-react'
import { clientePublicoService } from '../../services/clientePublicoService'
import { Events, track } from '../../lib/analytics'

const STORAGE_KEY = 'cliente_onboarding_visto_v1'

interface OnboardingClienteProps {
  /** Força exibição (usado pelo botão "Refazer tour" do perfil) */
  forcado?: boolean
  /** Callback quando o onboarding é finalizado/dispensado */
  onFinalizado?: () => void
}

export default function OnboardingCliente({ forcado = false, onFinalizado }: OnboardingClienteProps) {
  const [modalAberto, setModalAberto] = useState(false)
  const cliente = clientePublicoService.getCliente()

  useEffect(() => {
    if (forcado) {
      setModalAberto(true)
      return
    }
    if (typeof window === 'undefined') return
    const visto = window.localStorage.getItem(STORAGE_KEY)
    if (!visto) {
      // Aguarda render dos elementos do tour antes de mostrar modal
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
      track(Events.ONBOARDING_TOUR_INICIADO, { perfil: 'CLIENTE' })
      iniciarTourCliente(() => {
        track(Events.ONBOARDING_TOUR_COMPLETO, { perfil: 'CLIENTE' })
        onFinalizado?.()
      })
    } else {
      track(Events.ONBOARDING_TOUR_PULADO, { perfil: 'CLIENTE' })
      onFinalizado?.()
    }
  }

  if (!modalAberto) return null

  const primeiroNome = cliente?.nome?.split(' ')[0]

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
            {primeiroNome ? `Bem-vindo, ${primeiroNome}!` : 'Bem-vindo!'}
          </h2>
          <p className="text-sm text-violet-100 mt-1 leading-relaxed">
            Aqui você marca seus horários em segundos, sem precisar ligar ou mandar mensagem.
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

export function iniciarTourCliente(onComplete?: () => void) {
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
        element: '[data-tour="proximo-horario"]',
        popover: {
          title: 'Seu próximo horário',
          description: 'Aqui aparece seu próximo agendamento com data, hora e profissional.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="cta-marcar"]',
        popover: {
          title: 'Marcar novo horário',
          description: 'Toque aqui para escolher serviço, profissional e horário em 3 passos.',
          side: 'top',
        },
      },
      {
        element: '[data-tour="favoritos"]',
        popover: {
          title: 'Seus favoritos',
          description: 'Os serviços que você já fez ficam aqui para agendar de novo num toque.',
          side: 'top',
        },
      },
      {
        element: '[data-tour="bottom-nav"]',
        popover: {
          title: 'Navegação',
          description: 'Acesse seu histórico, perfil e a tela inicial por aqui.',
          side: 'top',
        },
      },
    ],
  })
  drv.drive()
}

export function resetarOnboarding() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}
