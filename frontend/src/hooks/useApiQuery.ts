import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { getApiErrorMessage } from '../utils/apiError'

/**
 * useQuery com padrões de boas práticas:
 * - retry: 1 (evita múltiplas tentativas em erros 5xx)
 * - Uso de getApiErrorMessage(error) em onError para mensagens consistentes
 *
 * Exemplo:
 *   const { data } = useApiQuery({
 *     queryKey: ['unidades'],
 *     queryFn: unidadeService.listarTodos,
 *     onError: (err) => showNotification('error', getApiErrorMessage(err)),
 *   })
 */
export function useApiQuery<TData = unknown, TError = unknown>(
  options: UseQueryOptions<TData, TError> & {
    /** Se true, não faz retry em falhas (útil para endpoints que podem 403/404 por perfil) */
    retryOnFail?: boolean
  }
) {
  const { retryOnFail = true, retry = 1, ...rest } = options
  return useQuery({
    retry: retryOnFail ? retry : 0,
    ...rest,
  })
}

export { getApiErrorMessage }
