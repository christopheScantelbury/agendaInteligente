import { ReactNode } from 'react'
import { getApiErrorMessage } from '../utils/apiError'

interface QueryStateProps {
  /** Query está carregando */
  isLoading?: boolean
  /** Query falhou */
  isError?: boolean
  /** Objeto de erro (AxiosError ou similar) */
  error?: unknown
  /** Conteúdo quando loading/error; se não informado, usa mensagem padrão */
  children: ReactNode
  /** Conteúdo alternativo quando loading (opcional) */
  loadingContent?: ReactNode
  /** Conteúdo alternativo quando error (opcional); recebe a mensagem de erro */
  errorContent?: (message: string) => ReactNode
}

/**
 * Exibe estado de loading ou erro de uma query, ou o conteúdo filho.
 * Uso: envolver conteúdo que depende de useQuery; evita repetir spinner e mensagem de erro.
 */
export default function QueryState({
  isLoading,
  isError,
  error,
  children,
  loadingContent,
  errorContent,
}: QueryStateProps) {
  if (isLoading) {
    return (
      loadingContent ?? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <span>Carregando...</span>
        </div>
      )
    )
  }

  if (isError && error != null) {
    const message = getApiErrorMessage(error)
    return (
      errorContent?.(message) ?? (
        <div className="rounded-md bg-red-50 p-4 text-red-700 text-sm">
          Erro: {message}
        </div>
      )
    )
  }

  return <>{children}</>
}
