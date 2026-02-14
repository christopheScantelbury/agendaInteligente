import { AxiosError } from 'axios'

export interface ApiErrorBody {
  message?: string
  errors?: Record<string, string | string[]>
}

/**
 * Extrai mensagem de erro de forma consistente a partir de AxiosError.
 * Uso: em onError de useQuery/useMutation e em interceptors.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado'): string {
  if (error == null) return fallback
  const axiosError = error as AxiosError<ApiErrorBody>
  const data = axiosError.response?.data
  if (data?.message && typeof data.message === 'string') return data.message
  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).flat()
    if (first.length > 0 && typeof first[0] === 'string') return first[0]
  }
  if (axiosError.message) return axiosError.message
  const status = axiosError.response?.status
  if (status === 403) return 'Você não tem permissão para esta ação.'
  if (status === 404) return 'Recurso não encontrado.'
  if (status && status >= 500) return 'Erro no servidor. Tente novamente em instantes.'
  return fallback
}

/**
 * Retorna o status HTTP do erro, se disponível.
 */
export function getApiErrorStatus(error: unknown): number | undefined {
  return (error as AxiosError)?.response?.status
}
