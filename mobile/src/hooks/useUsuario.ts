import { useQuery } from '@tanstack/react-query'
import { authService, TokenResponse } from '../services/authService'

export function useUsuario(): { usuario: TokenResponse | null; isLoading: boolean } {
  const { data: usuario, isLoading } = useQuery({
    queryKey: ['usuario'],
    queryFn: () => authService.getUsuario(),
    staleTime: 5 * 60 * 1000,
  })
  return { usuario: usuario ?? null, isLoading }
}
