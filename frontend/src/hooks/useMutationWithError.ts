import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useCallback } from 'react'

interface ErrorResponse {
  message?: string
  errors?: Record<string, string>
}

export function useMutationWithError<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: AxiosError<ErrorResponse>, variables: TVariables) => void
    invalidateQueries?: string[]
    successMessage?: string
  }
) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey: [queryKey] })
        })
      }
      if (options?.successMessage) {
        // Aqui você pode integrar com um sistema de notificações
        console.log(options.successMessage)
      }
      options?.onSuccess?.(data, variables)
    },
    onError: (error: AxiosError<ErrorResponse>, variables) => {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Ocorreu um erro inesperado'
      
      console.error('Erro na mutação:', errorMessage)
      options?.onError?.(error, variables)
    },
  } as UseMutationOptions<TData, AxiosError<ErrorResponse>, TVariables>)

  const getErrorMessage = useCallback((error: AxiosError<ErrorResponse> | null): string => {
    if (!error) return ''
    return error.response?.data?.message || error.message || 'Ocorreu um erro inesperado'
  }, [])

  return {
    ...mutation,
    getErrorMessage,
  }
}

