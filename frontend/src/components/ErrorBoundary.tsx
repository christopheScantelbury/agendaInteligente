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
    const isChunkError = /Failed to fetch dynamically imported module|Loading chunk \d+ failed|Loading CSS chunk/i
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
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
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
            <button
              onClick={() => {
                sessionStorage.removeItem('chunk-reload-attempted')
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

