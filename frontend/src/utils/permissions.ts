import { Perfil } from '../services/perfilService'

export type TipoPermissao = 'EDITAR' | 'VISUALIZAR' | 'SEM_ACESSO'

/**
 * Verifica se o usuário tem permissão para acessar um menu
 */
export function temPermissaoMenu(perfil: Perfil | undefined, menuPath: string): boolean {
  if (!perfil) return false
  
  const permissao = perfil.permissoesGranulares?.[menuPath]
  return permissao === 'EDITAR' || permissao === 'VISUALIZAR'
}

/**
 * Verifica se o usuário tem permissão para editar em um menu
 */
export function podeEditar(perfil: Perfil | undefined, menuPath: string): boolean {
  if (!perfil) return false
  
  const permissao = perfil.permissoesGranulares?.[menuPath]
  return permissao === 'EDITAR'
}

/**
 * Obtém o tipo de permissão para um menu
 */
export function getPermissaoMenu(perfil: Perfil | undefined, menuPath: string): TipoPermissao {
  if (!perfil) return 'SEM_ACESSO'
  
  return (perfil.permissoesGranulares?.[menuPath] as TipoPermissao) || 'SEM_ACESSO'
}
