import { Component, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary capturou um erro:', error, errorInfo)

    // Auto-reload em erro de chunk JS (hash desatualizado após deploy do Vercel).
    // Recarrega no MÁXIMO uma vez por sessão para evitar loop infinito caso o erro
    // não seja realmente um chunk velho.
    const isChunkError = /Failed to fetch dynamically imported module|Loading chunk \d+ failed|Loading CSS chunk|Importing a module script failed|ChunkLoadError|MIME type|module script (load|did not pass)|net::ERR_ABORTED/i
      .test(error?.message ?? '')
    if (isChunkError && !sessionStorage.getItem('chunk-reload-attempted')) {
      sessionStorage.setItem('chunk-reload-attempted', String(Date.now()))
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isChunkError = /Failed to fetch dynamically imported module|Loading chunk \d+ failed|Loading CSS chunk/i
        .test(this.state.error?.message ?? '')

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
              {isChunkError ? 'Atualizando aplicação...' : 'Oops! Algo deu errado'}
            </h2>
            <p className="text-gray-600 text-center mb-4">
              {isChunkError
                ? 'Uma nova versão do app foi publicada. Recarregando automaticamente...'
                : (this.state.error?.message || 'Ocorreu um erro inesperado')}
            </p>
            {!isChunkError && this.state.error?.message && (
              <details className="text-xs text-gray-500 mb-4 bg-slate-50 rounded-lg p-3 border border-slate-100">
                <summary className="cursor-pointer font-semibold">Detalhes técnicos</summary>
                <pre className="whitespace-pre-wrap break-words mt-2 max-h-40 overflow-y-auto">
                  {this.state.error.message}
                  {this.state.error.stack && '\n\n' + this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                </pre>
              </details>
            )}
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  // Limpa SW caches e remove SWs antigos antes de recarregar — útil quando o
                  // browser tá servindo bundle antigo de uma PWA instalada.
                  try {
                    if ('caches' in window) {
                      const keys = await caches.keys()
                      await Promise.all(keys.map((k) => caches.delete(k)))
                    }
                    if ('serviceWorker' in navigator) {
                      const regs = await navigator.serviceWorker.getRegistrations()
                      await Promise.all(regs.map((r) => r.unregister()))
                    }
                  } catch {}
                  sessionStorage.removeItem('chunk-reload-attempted')
                  window.location.reload()
                }}
                className="flex-1 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition shadow-sm shadow-violet-200"
              >
                Limpar cache e recarregar
              </button>
              <button
                onClick={() => {
                  sessionStorage.removeItem('chunk-reload-attempted')
                  this.setState({ hasError: false, error: null })
                  window.location.reload()
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
              >
                Recarregar
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

