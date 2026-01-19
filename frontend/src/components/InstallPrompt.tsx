import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

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

    // Verificar se já mostrou o prompt antes (localStorage)
    const hasShownIOSPrompt = localStorage.getItem('ios-install-prompt-shown')
    const hasInstalled = localStorage.getItem('pwa-installed')

    if (isStandaloneMode || hasInstalled) {
      return // Não mostrar se já está instalado
    }

    // Para Android/Chrome - capturar evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Para iOS - mostrar prompt personalizado após alguns segundos
    if (iOS && !hasShownIOSPrompt) {
      setTimeout(() => {
        setShowIOSPrompt(true)
      }, 3000) // Mostrar após 3 segundos
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android/Chrome
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        localStorage.setItem('pwa-installed', 'true')
        setDeferredPrompt(null)
      }
    }
  }

  const handleIOSInstall = () => {
    // Marcar como mostrado
    localStorage.setItem('ios-install-prompt-shown', 'true')
    setShowIOSPrompt(false)
  }

  const handleDismiss = () => {
    if (isIOS) {
      localStorage.setItem('ios-install-prompt-shown', 'true')
      setShowIOSPrompt(false)
    } else {
      setDeferredPrompt(null)
    }
  }

  // Não mostrar se já está instalado
  if (isStandalone) {
    return null
  }

  // Mostrar prompt iOS
  if (showIOSPrompt && isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom-5">
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Download className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Instalar App</h3>
                <p className="text-sm text-gray-600">Adicione à tela inicial</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
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
              onClick={handleIOSInstall}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
            >
              Entendi
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
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
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom-5">
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Download className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Instalar App</h3>
                <p className="text-sm text-gray-600">Adicione à tela inicial para acesso rápido</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Instalar Agora
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
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
