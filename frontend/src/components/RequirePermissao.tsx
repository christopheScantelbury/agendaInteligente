import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { authService } from '../services/authService'
import { perfilService } from '../services/perfilService'
import { temPermissaoMenu } from '../utils/permissions'
import { ORDEM_REDIRECT_SEM_INICIO } from '../constants/menusPermissoes'
import type { Perfil } from '../services/perfilService'

interface RequirePermissaoProps {
  /** Path do menu (ex: /unidades, /servicos). Para /agendamentos/novo use /agendamentos */
  path: string
  /** Paths alternativos aceitos para compatibilidade de permissões antigas */
  fallbackPaths?: string[]
  children: React.ReactNode
}

/**
 * Garante que apenas usuários com permissão (EDITAR ou VISUALIZAR) para o path acessem a tela.
 * CLIENTE sempre pode acessar /agendamentos. Redireciona para o primeiro menu permitido se não tiver acesso.
 */
export default function RequirePermissao({ path, fallbackPaths = [], children }: RequirePermissaoProps) {
  const usuario = authService.getUsuario()
  const { data: perfil, isLoading, isError } = useQuery({
    queryKey: ['perfil', 'meu'],
    queryFn: () => perfilService.buscarMeuPerfil(),
    enabled: !!usuario,
    retry: 1,
  })

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  if (authService.isPerfilCliente()) {
    if (path === '/agendamentos') return <>{children}</>
    return <Navigate to="/agendamentos" replace />
  }

  if (isError) {
    return <Navigate to="/login" replace />
  }

  if (isLoading || !perfil) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  const temAcessoPrimario = temPermissaoMenu(perfil, path)
  const temAcessoFallback = fallbackPaths.some((fallbackPath) => temPermissaoMenu(perfil, fallbackPath))
  if (!temAcessoPrimario && !temAcessoFallback) {
    const primeiroPermitido = getPrimeiroPathPermitido(perfil)
    return <Navigate to={primeiroPermitido} replace />
  }

  return <>{children}</>
}

/** Retorna o primeiro path permitido para o perfil (para redirecionamento) */
export function getPrimeiroPathPermitido(perfil: Perfil | undefined): string {
  if (!perfil) return '/agendamentos'
  if (perfil.permissoesGranulares?.['/'] === 'EDITAR' || perfil.permissoesGranulares?.['/'] === 'VISUALIZAR') return '/'
  const p = ORDEM_REDIRECT_SEM_INICIO.find(
    (path) => perfil.permissoesGranulares?.[path] === 'EDITAR' || perfil.permissoesGranulares?.[path] === 'VISUALIZAR'
  )
  return p ?? '/agendamentos'
}
