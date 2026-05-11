import { useQuery } from '@tanstack/react-query'
import { authService } from '../services/authService'
import { unidadeService } from '../services/unidadeService'
import { empresaService } from '../services/empresaService'
import { getCategoriaDict, type CategoriaDict } from '../lib/categoria/dictionary'

/**
 * Resolve a categoria da empresa do usuário logado e devolve o dicionário
 * de terminologia correspondente.
 *
 * Estratégia: usuário tem `unidadeId` no token → carrega unidade → empresa →
 * categoria. Dois GETs cacheados pelo React Query, então só na primeira
 * navegação após login há custo extra.
 *
 * Enquanto carrega ou se falhar (usuário sem unidade, empresa sem categoria,
 * categoria desconhecida), retorna o fallback genérico — nunca quebra UI.
 */
export function useCategoria(): { dict: CategoriaDict; loading: boolean } {
  const usuario = authService.getUsuario()
  const unidadeId = usuario?.unidadeId

  const { data: unidade, isLoading: loadingUnidade } = useQuery({
    queryKey: ['unidade', unidadeId],
    queryFn: () => unidadeService.buscarPorId(unidadeId!),
    enabled: !!unidadeId,
    staleTime: 5 * 60 * 1000, // 5min — categoria não muda com frequência
  })

  const empresaId = unidade?.empresaId

  const { data: empresa, isLoading: loadingEmpresa } = useQuery({
    queryKey: ['empresa', empresaId],
    queryFn: () => empresaService.buscarPorId(empresaId!),
    enabled: !!empresaId,
    staleTime: 5 * 60 * 1000,
  })

  const loading = (!!unidadeId && loadingUnidade) || (!!empresaId && loadingEmpresa)
  const dict = getCategoriaDict(empresa?.categoria ?? null)

  return { dict, loading }
}
