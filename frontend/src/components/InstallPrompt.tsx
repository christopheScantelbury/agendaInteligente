import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { X, Download } from 'lucide-react'

// Rotas onde o prompt de instalação NÃO deve aparecer (formulários e fluxos críticos)
const ROTAS_BLOQUEADAS = [
  '/anamneses/nova',
  '/anamneses/templates',
  '/agendamentos/novo',
  '/clientes/novo',
  '/servicos/novo',
]

// Dias que o prompt fica oculto após o user clicar em "Depois" ou X
const DISMISS_COOLDOWN_DIAS = 7
const DISMISS_KEY = 'install-prompt-dismissed-at'

function rotaBloqueada(pathname: string) {
  if (ROTAS_BLOQUEADAS.some((r) => pathname.startsWith(r))) return true
  // Também bloqueia em rotas de edição (terminam com /editar ou têm ID numérico)
  if (/\/(editar|\d+)$/.test(pathname) && pathname !== '/dashboard') return true
  return false
}

function foiDispensadoRecente(): boolean {
  const dismissedAt = localStorage.getItem(DISMISS_KEY)
  if (!dismissedAt) return false
  const ts = Number(dismissedAt)
  if (Number.isNaN(ts)) return false
  const diasAtras = (Date.now() - ts) / (1000 * 60 * 60 * 24)
  return diasAtras < DISMISS_COOLDOWN_DIAS
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const location = useLocation()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  // Latch local — uma vez dispensado nesta sessão, não reaparece mesmo que
  // beforeinstallprompt dispare de novo
  const [dispensadoNestaSessao, setDispensadoNestaSessao] = useState(false)

  useEffect(() => {
    // Verificar se já está instalado
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://')

    setIsStandalone(isStandaloneMode)

    // Detectar iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(iOS)

    const hasInstalled = localStorage.getItem('pwa-installed')

    if (isStandaloneMode || hasInstalled || foiDispensadoRecente()) {
      return // Não mostrar se já está instalado ou dispensado recentemente
    }

    // Para Android/Chrome - capturar evento beforeinstallprompt com delay de 30s
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setTimeout(() => {
        // Re-checa o latch e o cooldown no momento de exibir
        setDeferredPrompt((curr) => {
          if (curr) return curr
          if (foiDispensadoRecente()) return null
          return e as BeforeInstallPromptEvent
        })
      }, 30000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Para iOS - mostrar prompt personalizado após 30s, respeitando cooldown
    if (iOS) {
      setTimeout(() => {
        if (!foiDispensadoRecente()) {
          setShowIOSPrompt(true)
        }
      }, 30000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        localStorage.setItem('pwa-installed', 'true')
      }
      setDeferredPrompt(null)
    }
  }

  const handleIOSInstall = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setShowIOSPrompt(false)
    setDispensadoNestaSessao(true)
  }, [])

  const handleDismiss = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    // Persiste em localStorage com timestamp — fica oculto por 7 dias
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setShowIOSPrompt(false)
    setDeferredPrompt(null)
    setDispensadoNestaSessao(true)
  }, [])

  // Não mostrar se já está instalado, dispensado recente, ou dispensado nesta sessão
  if (isStandalone || dispensadoNestaSessao) {
    return null
  }

  // Não mostrar em rotas de formulário para evitar interromper preenchimento
  if (rotaBloqueada(location.pathname)) {
    return null
  }

  // Mostrar prompt iOS
  if (showIOSPrompt && isIOS) {
    return (
      <div
        className="fixed left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom-5"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)', pointerEvents: 'auto' }}
      >
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <Download className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900">Instalar App</h3>
                <p className="text-sm text-gray-600 truncate">Adicione à tela inicial</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-shrink-0 -mr-1 -mt-1 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="bg-blue-50 rounded-lg p-3 mb-3">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Para instalar no iPhone/iPad:</strong>
            </p>
            <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
              <li>Toque no botão <strong>Compartilhar</strong> <span className="text-blue-600">□↑</span> na parte inferior</li>
              <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></li>
              <li>Toque em <strong>"Adicionar"</strong> no canto superior direito</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleIOSInstall}
              className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
            >
              Entendi
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
            >
              Depois
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Mostrar prompt Android/Chrome
  if (deferredPrompt) {
    return (
      <div
        className="fixed left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom-5"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)', pointerEvents: 'auto' }}
      >
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <Download className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900">Instalar App</h3>
                <p className="text-sm text-gray-600 truncate">Adicione à tela inicial para acesso rápido</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-shrink-0 -mr-1 -mt-1 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
            >
              Instalar Agora
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
            >
              Depois
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
