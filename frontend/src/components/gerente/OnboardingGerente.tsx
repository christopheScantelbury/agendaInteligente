import { useEffect, useState } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { Sparkles, X } from 'lucide-react'
import { authService } from '../../services/authService'

const STORAGE_KEY = 'gerente_onboarding_visto_v1'

interface OnboardingGerenteProps {
  forcado?: boolean
  onFinalizado?: () => void
}

export default function OnboardingGerente({ forcado = false, onFinalizado }: OnboardingGerenteProps) {
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
      const timer = window.setTimeout(() => setModalAberto(true), 500)
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
      iniciarTourGerente(() => onFinalizado?.())
    } else {
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
            {primeiroNome ? `${primeiroNome}, vamos configurar seu negócio?` : 'Vamos configurar seu negócio?'}
          </h2>
          <p className="text-sm text-violet-100 mt-1 leading-relaxed">
            Em 5 minutos você já pode receber o primeiro agendamento online.
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

export function iniciarTourGerente(onComplete?: () => void) {
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
        element: '[data-tour="kpis"]',
        popover: {
          title: 'Seus números',
          description: 'Faturamento, ocupação, ticket médio e taxa de cancelamento — atualizados em tempo real.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="grafico-faturamento"]',
        popover: {
          title: 'Evolução do faturamento',
          description: 'Compare seu desempenho com o período anterior. Use os filtros 7d / 30d / 90d / 1 ano.',
          side: 'top',
        },
      },
      {
        element: '[data-tour="equipe"]',
        popover: {
          title: 'Sua equipe',
          description: 'Veja o status de cada profissional, próximo horário e faturamento do dia.',
          side: 'top',
        },
      },
      {
        element: '[data-tour="checklist"]',
        popover: {
          title: 'Comece aqui',
          description: 'Siga o checklist para deixar seu negócio pronto pra receber clientes.',
          side: 'bottom',
        },
      },
    ],
  })
  drv.drive()
}

export function resetarOnboardingGerente() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}
